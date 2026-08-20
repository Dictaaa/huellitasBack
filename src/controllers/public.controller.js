// src/controllers/public.controller.js
// Rutas SIN autenticación — accesibles desde el QR del collar
const {
  PetTag, Pet, PetPrivacySetting, PetStatus,
  Species, Breed, User, MedicalAlert, Subscription,
  LostPetReport, FoundPetReport, PetTagScan,
} = require('../models');

/* ── Helpers ──────────────────────────────────────────────── */

/** Construye el perfil público respetando la configuración de privacidad */
const buildPublicProfile = (pet, settings, lostReport) => {
  const profile = {
    is_lost: pet.status_id === 2,
    lost_report: lostReport
      ? {
        lost_at: lostReport.lost_at,
        last_seen_location: lostReport.last_seen_location,
        contact_name: lostReport.contact_name,
        contact_phone: lostReport.contact_phone,
      }
      : null,
  };

  if (settings.show_pet_name) profile.name = pet.name;
  if (settings.show_photo) profile.photo = pet.photo_url;
  if (settings.show_breed) profile.species = pet.species?.name;
  if (settings.show_breed) profile.breed = pet.breed?.name;
  if (settings.show_age) profile.age = pet.getAgeLabel();
  if (settings.show_weight) profile.weight = pet.weight ? `${pet.weight} ${pet.weight_unit}` : null;

  if (settings.show_owner_name) profile.owner_name = pet.owner?.first_name;
  if (settings.show_phone) profile.owner_phone = pet.owner?.phone;
  if (settings.show_city) profile.city = pet.owner?.city;

  profile.allow_whatsapp = settings.allow_whatsapp;
  profile.allow_call = settings.allow_call;
  profile.allow_location_report = settings.allow_location_report;

  // Alertas médicas marcadas para mostrarse en público
  if (settings.show_medical_alerts && pet.medicalAlerts?.length) {
    profile.medical_alerts = pet.medicalAlerts
      .filter(a => a.show_on_public_profile && a.active)
      .map(a => ({ title: a.title, severity: a.severity }));
  }

  // WhatsApp link prearmado
  if (settings.allow_whatsapp && pet.owner?.phone) {
    const msg = encodeURIComponent(
      `Hola, encontré a ${pet.name || 'tu mascota'} 🐾. Vi su perfil en Huellita.`
    );
    profile.whatsapp_url = `https://wa.me/${pet.owner.phone}?text=${msg}`;
  }

  return profile;
};

/* ── GET /p/:code ── perfil público por public_code ──────── */
exports.getPublicProfile = async (req, res) => {
  try {
    const { code } = req.params;

    // 1. Buscar la placa por public_code
    const tag = await PetTag.findOne({
      where: { public_code: code.toUpperCase(), status_id: 2 }, // 2 = assigned
    });

    if (!tag) {
      return res.status(404).json({ message: 'Perfil no encontrado' });
    }

    // 2. Cargar la mascota con relaciones
    const pet = await Pet.findOne({
      where: { id: tag.pet_id, deleted_at: null },
      include: [
        { model: Species, as: 'species' },
        { model: Breed, as: 'breed', required: false },
        { model: PetStatus, as: 'status' },
        { model: MedicalAlert, as: 'medicalAlerts', where: { active: true }, required: false },
        {
          model: User,
          as: 'owner',
          attributes: ['first_name', 'phone', 'city'],
        },
      ],
    });

    if (!pet) {
      return res.status(404).json({ message: 'Perfil no disponible' });
    }

    // 3. Verificar suscripción activa del dueño
    const sub = await Subscription.findOne({
      where: {
        user_id: pet.owner_user_id,
        status_id: 1,
      },
      order: [['created_at', 'DESC']],
    });

    if (!sub || (sub.ends_at && new Date(sub.ends_at) < new Date())) {
      return res.status(402).json({
        message: 'El perfil de esta mascota no está disponible en este momento'
      });
    }

    if (!sub || (sub.ends_at && new Date(sub.ends_at) < new Date())) {
      return res.status(402).json({ message: 'El perfil de esta mascota no está activo' });
    }

    // 4. Configuración de privacidad
    const settings = await PetPrivacySetting.findOne({ where: { pet_id: pet.id } });
    if (!settings) {
      return res.status(404).json({ message: 'Perfil no configurado' });
    }

    // 5. Reporte activo de pérdida
    const lostReport = pet.status_id === 2
      ? await LostPetReport.findOne({
        where: { pet_id: pet.id, status: 'active' },
        order: [['created_at', 'DESC']],
      })
      : null;

    // 6. Registrar escaneo (async, no bloquea la respuesta)
    PetTagScan.create({
      pet_tag_id: tag.id,
      pet_id: pet.id,
      device_type: detectDevice(req.headers['user-agent']),
      user_agent: req.headers['user-agent']?.slice(0, 300),
      action_taken: 'viewed',
    }).catch(e => console.error('scan log error:', e));

    // 7. Construir y devolver perfil
    const profile = buildPublicProfile(pet, settings, lostReport);

    return res.json({ data: profile });
  } catch (err) {
    console.error('getPublicProfile error:', err);
    return res.status(500).json({ message: 'Error al cargar el perfil' });
  }
};

/* ── POST /p/:code/found ── "encontré esta mascota" ─────── */
exports.reportFound = async (req, res) => {
  try {
    const { code } = req.params;
    const {
      finder_name, finder_phone, finder_message,
      found_location, found_lat, found_lng,
    } = req.body;

    const tag = await PetTag.findOne({
      where: { public_code: code.toUpperCase(), status_id: 2 },
    });
    if (!tag) return res.status(404).json({ message: 'Placa no encontrada' });

    // Reporte de pérdida activo (si existe)
    const lostReport = await LostPetReport.findOne({
      where: { pet_id: tag.pet_id, status: 'active' },
    });

    const found = await FoundPetReport.create({
      pet_tag_id: tag.id,
      pet_id: tag.pet_id,
      lost_report_id: lostReport?.id || null,
      finder_name,
      finder_phone,
      finder_message,
      found_location,
      found_lat: found_lat || null,
      found_lng: found_lng || null,
    });

    // Registrar que el escaneo generó un found_report
    await PetTagScan.create({
      pet_tag_id: tag.id,
      pet_id: tag.pet_id,
      action_taken: 'found_report',
      found_report_id: found.id,
    });

    // TODO: enviar notificación push/email al dueño

    return res.status(201).json({
      message: '¡Gracias! Le avisamos al dueño. Si puedes, intenta contactarlo por WhatsApp.',
      data: { id: found.id },
    });
  } catch (err) {
    console.error('reportFound error:', err);
    return res.status(500).json({ message: 'Error al enviar reporte' });
  }
};

/* ── Helper: detectar tipo de dispositivo ─────────────────── */
const detectDevice = (ua = '') => {
  if (!ua) return 'unknown';
  if (/mobile|android|iphone|ipad/i.test(ua)) return 'mobile';
  if (/tablet/i.test(ua)) return 'tablet';
  return 'desktop';
};