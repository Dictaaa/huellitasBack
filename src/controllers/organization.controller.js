// src/controllers/organization.controller.js
const { sequelize }  = require('../config/db');
const {
  Organization, OrganizationUser, PetClinicAccess,
  Pet, User, AuditLog,
} = require('../models');

/* ── POST /organizations ── crear organización ────────────── */
exports.createOrganization = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { name, slug, type, tax_id, phone, email, address, city } = req.body;

    const exists = await Organization.findOne({ where: { slug }, transaction: t });
    if (exists) {
      await t.rollback();
      return res.status(409).json({ message: 'El slug ya está en uso' });
    }

    const org = await Organization.create(
      { name, slug, type: type || 'clinic', tax_id, phone, email, address, city },
      { transaction: t }
    );

    // El creador queda como owner de la organización
    await OrganizationUser.create(
      { organization_id: org.id, user_id: req.user.id, role: 'owner' },
      { transaction: t }
    );

    await t.commit();
    return res.status(201).json({ data: org });
  } catch (err) {
    await t.rollback();
    console.error('createOrganization error:', err);
    return res.status(500).json({ message: 'Error al crear organización' });
  }
};

/* ── GET /organizations/me ── mis organizaciones ──────────── */
exports.getMyOrganizations = async (req, res) => {
  try {
    const links = await OrganizationUser.findAll({
      where:   { user_id: req.user.id, active: true },
      include: [{ model: Organization, as: 'organization' }],
    });
    return res.json({ data: links.map(l => ({ ...l.organization.toJSON(), my_role: l.role })) });
  } catch (err) {
    return res.status(500).json({ message: 'Error al obtener organizaciones' });
  }
};

/* ── POST /organizations/:orgId/members ── agregar miembro ── */
exports.addMember = async (req, res) => {
  try {
    const { user_id, role } = req.body;

    // Solo owner/admin puede agregar
    const myLink = await OrganizationUser.findOne({
      where: { organization_id: req.params.orgId, user_id: req.user.id, active: true },
    });
    if (!myLink || !['owner','admin'].includes(myLink.role)) {
      return res.status(403).json({ message: 'Sin permisos para agregar miembros' });
    }

    const [link, created] = await OrganizationUser.findOrCreate({
      where:    { organization_id: req.params.orgId, user_id },
      defaults: { role: role || 'staff', active: true },
    });

    if (!created) await link.update({ role: role || link.role, active: true });

    return res.json({ data: link });
  } catch (err) {
    return res.status(500).json({ message: 'Error al agregar miembro' });
  }
};

/* ── POST /pets/:petId/clinic-access ── dueño autoriza clínica */
exports.grantClinicAccess = async (req, res) => {
  try {
    const { organization_id, access_medical, access_vaccines, access_documents, expires_at } = req.body;

    const pet = await Pet.findOne({
      where: { id: req.params.petId, owner_user_id: req.user.id, deleted_at: null },
    });
    if (!pet) return res.status(404).json({ message: 'Mascota no encontrada' });

    const org = await Organization.findByPk(organization_id);
    if (!org) return res.status(404).json({ message: 'Organización no encontrada' });

    const [access, created] = await PetClinicAccess.findOrCreate({
      where:    { pet_id: pet.id, organization_id },
      defaults: {
        granted_by:       req.user.id,
        access_medical:   access_medical   ?? false,
        access_vaccines:  access_vaccines  ?? true,
        access_documents: access_documents ?? false,
        expires_at:       expires_at || null,
        active:           true,
      },
    });

    if (!created) {
      await access.update({
        access_medical:   access_medical   ?? access.access_medical,
        access_vaccines:  access_vaccines  ?? access.access_vaccines,
        access_documents: access_documents ?? access.access_documents,
        expires_at:       expires_at !== undefined ? expires_at : access.expires_at,
        revoked_at:       null,
        active:           true,
      });
    }

    await AuditLog.log({
      userId:     req.user.id,
      action:     'clinic_access.granted',
      entityType: 'pet_clinic_access',
      entityId:   access.id,
      newValues:  { organization_id, pet_id: pet.id, access_medical, access_vaccines },
    });

    return res.json({ message: `Acceso ${created ? 'otorgado' : 'actualizado'}`, data: access });
  } catch (err) {
    console.error('grantClinicAccess error:', err);
    return res.status(500).json({ message: 'Error al otorgar acceso' });
  }
};

/* ── DELETE /pets/:petId/clinic-access/:orgId ── revocar ────  */
exports.revokeClinicAccess = async (req, res) => {
  try {
    const pet = await Pet.findOne({
      where: { id: req.params.petId, owner_user_id: req.user.id, deleted_at: null },
    });
    if (!pet) return res.status(404).json({ message: 'Mascota no encontrada' });

    const access = await PetClinicAccess.findOne({
      where: { pet_id: pet.id, organization_id: req.params.orgId },
    });
    if (!access) return res.status(404).json({ message: 'Acceso no encontrado' });

    await access.update({ active: false, revoked_at: new Date() });

    await AuditLog.log({
      userId:     req.user.id,
      action:     'clinic_access.revoked',
      entityType: 'pet_clinic_access',
      entityId:   access.id,
    });

    return res.json({ message: 'Acceso revocado' });
  } catch (err) {
    return res.status(500).json({ message: 'Error al revocar acceso' });
  }
};

/* ── GET /pets/:petId/clinic-access ── ver accesos activos ── */
exports.listClinicAccess = async (req, res) => {
  try {
    const pet = await Pet.findOne({
      where: { id: req.params.petId, owner_user_id: req.user.id, deleted_at: null },
    });
    if (!pet) return res.status(404).json({ message: 'Mascota no encontrada' });

    const accesses = await PetClinicAccess.findAll({
      where:   { pet_id: pet.id, active: true },
      include: [{ model: Organization, as: 'organization' }],
    });
    return res.json({ data: accesses });
  } catch (err) {
    return res.status(500).json({ message: 'Error al obtener accesos' });
  }
};