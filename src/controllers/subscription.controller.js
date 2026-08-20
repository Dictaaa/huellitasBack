// src/controllers/subscription.controller.js
const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const {
  Plan, Subscription, SubscriptionStatus,
  Payment, Pet, AuditLog,
} = require('../models');

/* ── Calcular prorrateo ─────────────────────────────────── */
// DEBE estar aquí arriba, antes de cualquier export
const calcProrrateoCobro = (subActual, planNuevo) => {
  if (!subActual || !subActual.ends_at) return planNuevo.price;

  const ahora = new Date();
  const fin = new Date(subActual.ends_at);
  const inicio = new Date(subActual.starts_at);
  const diasTotales = Math.ceil((fin - inicio) / (1000 * 60 * 60 * 24));
  const diasRestantes = Math.ceil((fin - ahora) / (1000 * 60 * 60 * 24));

  if (diasRestantes <= 0) return planNuevo.price;

  const valorRestantePlanActual = (subActual.plan.price / diasTotales) * diasRestantes;
  const valorNuevoPorDiasRestantes = (planNuevo.price / diasTotales) * diasRestantes;
  const diferencia = valorNuevoPorDiasRestantes - valorRestantePlanActual;

  return Math.max(0, Math.round(diferencia));
};

/* ── GET /plans ─────────────────────────────────────────── */
exports.listPlans = async (req, res, next) => {
  try {
    const plans = await Plan.findAll({
      where: { active: true },
      order: [['max_pets', 'ASC'], ['billing_period', 'ASC']],
    });
    return res.json({ data: plans });
  } catch (err) {
    next(err);
  }
};

/* ── GET /subscriptions/me ──────────────────────────────── */
exports.getMySubscription = async (req, res, next) => {
  try {
    const sub = await Subscription.findOne({
      where: { user_id: req.user.id, status_id: 1 },
      include: [
        { model: Plan, as: 'plan' },
        { model: SubscriptionStatus, as: 'status' },
      ],
      order: [['created_at', 'DESC']],
    });

    if (!sub) return res.status(404).json({ message: 'No tienes una suscripción activa' });

    // Contar mascotas del usuario (no de la suscripción)
    const petsUsed = await Pet.count({
      where: { owner_user_id: req.user.id, active: true, deleted_at: null },
    });

    return res.json({
      data: {
        ...sub.toJSON(),
        days_remaining: sub.daysRemaining(),
        pets_used: petsUsed,
        pets_available: sub.plan.max_pets - petsUsed,
      },
    });
  } catch (err) {
    next(err);
  }
};

/* ── POST /subscriptions ────────────────────────────────── */
exports.createSubscription = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const {
      plan_id,
      payment_provider,
      external_transaction_id,
      amount,
      currency,
      payment_metadata,
    } = req.body;

    const plan = await Plan.findOne({
      where: { id: plan_id, active: true },
      transaction: t,
    });
    if (!plan) {
      await t.rollback();
      return res.status(404).json({ message: 'Plan no encontrado' });
    }

    // Buscar suscripción activa actual
    const subActual = await Subscription.findOne({
      where: { user_id: req.user.id, status_id: 1 },
      include: [{ model: Plan, as: 'plan' }],
      transaction: t,
    });

    // Si hay plan activo y es diferente → calcular prorrateo
    // En createSubscription, reemplaza el bloque del prorrateo:

    if (subActual && subActual.plan.id !== plan.id) {
      const montoProrrateo = calcProrrateoCobro(subActual, plan);
      const esUpgrade = plan.price > subActual.plan.price;

      if (!external_transaction_id) {
        // Verificar que las mascotas actuales no superen el límite del nuevo plan
        const petsActuales = await Pet.count({
          where: { owner_user_id: req.user.id, active: true, deleted_at: null },
          transaction: t,
        });

        if (petsActuales > plan.max_pets) {
          await t.rollback();
          return res.status(402).json({
            code: 'DOWNGRADE_PET_LIMIT',
            message: `Tu plan actual tiene ${petsActuales} mascotas registradas. El plan ${plan.name} solo permite ${plan.max_pets}. Elimina ${petsActuales - plan.max_pets} mascota(s) antes de cambiar.`,
            data: {
              pets_actuales: petsActuales,
              max_nuevo_plan: plan.max_pets,
              diferencia: petsActuales - plan.max_pets,
            },
          });
        }
        await t.rollback();

        // ── Downgrade — no se cobra, solo confirmar ──────────
        if (!esUpgrade || montoProrrateo === 0) {
          return res.status(402).json({
            code: 'DOWNGRADE_CONFIRM',
            message: 'Cambio de plan sin costo adicional',
            prorrateo: {
              monto: 0,
              currency: plan.currency,
              plan_actual: subActual.plan.name,
              plan_nuevo: plan.name,
              dias_restantes: Math.ceil(
                (new Date(subActual.ends_at) - new Date()) / (1000 * 60 * 60 * 24)
              ),
              es_downgrade: true,
            },
          });
        }

        // ── Upgrade — cobrar diferencia ──────────────────────
        return res.status(402).json({
          code: 'PRORRATEO_REQUIRED',
          message: 'Se requiere pago de diferencia para cambiar de plan',
          prorrateo: {
            monto: montoProrrateo,
            currency: plan.currency,
            plan_actual: subActual.plan.name,
            plan_nuevo: plan.name,
            dias_restantes: Math.ceil(
              (new Date(subActual.ends_at) - new Date()) / (1000 * 60 * 60 * 24)
            ),
            es_downgrade: false,
          },
        });
      }
    }

    // Cancelar suscripción anterior
    if (subActual) {
      await subActual.update(
        { status_id: 3, cancelled_at: new Date() },
        { transaction: t }
      );
    }

    // Calcular fechas
    const starts_at = new Date();
    const ends_at = plan.billing_period === 'one_time'
      ? null
      : plan.getEndDate(starts_at);

    const sub = await Subscription.create(
      {
        user_id: req.user.id,
        plan_id: plan.id,
        status_id: 1,
        starts_at,
        ends_at,
        renews_at: ends_at ? new Date(ends_at) : null,
        payment_provider: payment_provider || null,
      },
      { transaction: t }
    );

    // Registrar pago
    const montoFinal = amount ?? plan.price;
    await Payment.create(
      {
        user_id: req.user.id,
        subscription_id: sub.id,
        amount: montoFinal,
        currency: currency || plan.currency,
        payment_provider: payment_provider || 'manual',
        external_transaction_id: external_transaction_id || null,
        status_id: 2,
        paid_at: new Date(),
        metadata: payment_metadata || null,
      },
      { transaction: t }
    );

    await t.commit();

    AuditLog.log({
      userId: req.user.id,
      action: 'subscription.created',
      entityType: 'subscriptions',
      entityId: sub.id,
      newValues: { plan_id, ends_at, monto: montoFinal },
    }).catch(e => console.error('AuditLog error:', e));

    return res.status(201).json({
      message: `Plan ${plan.name} activado correctamente`,
      data: { subscription: sub },
    });

  } catch (err) {
    if (t && !t.finished) await t.rollback().catch(() => { });
    next(err);
  }
};

/* ── POST /subscriptions/cancel ─────────────────────────── */
exports.cancelSubscription = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const sub = await Subscription.findOne({
      where: { user_id: req.user.id, status_id: 1 },
      transaction: t,
    });
    if (!sub) {
      await t.rollback();
      return res.status(404).json({ message: 'Sin suscripción activa' });
    }

    await sub.update(
      { status_id: 3, cancelled_at: new Date() },
      { transaction: t }
    );

    await t.commit();

    AuditLog.log({
      userId: req.user.id,
      action: 'subscription.cancelled',
      entityType: 'subscriptions',
      entityId: sub.id,
    }).catch(e => console.error('AuditLog error:', e));

    return res.json({
      message: 'Suscripción cancelada. Seguirá activa hasta el fin del período pagado.',
    });
  } catch (err) {
    if (t && !t.finished) await t.rollback().catch(() => { });
    next(err);
  }
};

/* ── GET /admin/subscriptions ───────────────────────────── */
exports.listSubscriptions = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status_id, plan_id } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const where  = {};
    if (status_id) where.status_id = status_id;
    if (plan_id)   where.plan_id   = plan_id;

    const { User } = require('../models');

    const { count, rows } = await Subscription.findAndCountAll({
      where,
      include: [
        { model: Plan,               as: 'plan'   },
        { model: SubscriptionStatus, as: 'status' },
        {
          model:      User,
          as:         'user',
          attributes: ['id','first_name','last_name','email','city'],
        },
      ],
      limit:  Number(limit),
      offset,
      order:  [['created_at', 'DESC']],
    });

    return res.json({
      total: count,
      page:  Number(page),
      pages: Math.ceil(count / Number(limit)),
      data:  rows,
    });
  } catch (err) {
    next(err);
  }
};