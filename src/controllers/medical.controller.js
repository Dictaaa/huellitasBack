// src/controllers/medical.controller.js
const { sequelize } = require('../config/db');
const {
  Pet, MedicalRecord, Vaccination, Deworming, Medication,
  MedicalAlert, PetWeight, MedicalDocument, AuditLog,
} = require('../models');
const { uploadImage, deleteImage, uploadFile, deleteFile  } = require('../services/storage.service');

/* ── Guard: verificar acceso a la mascota ─────────────────── */
const findAccessiblePet = async (petId, userId) => {
  // Dueño directo
  const ownedPet = await Pet.findOne({
    where: { id: petId, owner_user_id: userId, deleted_at: null },
  });
  if (ownedPet) return ownedPet;

  // Clínica con acceso autorizado (veterinario/staff)
  const { PetClinicAccess, OrganizationUser } = require('../models');
  const orgUser = await OrganizationUser.findOne({ where: { user_id: userId, active: true } });
  if (!orgUser) return null;

  const access = await PetClinicAccess.findOne({
    where: {
      pet_id:          petId,
      organization_id: orgUser.organization_id,
      access_medical:  true,
      active:          true,
      revoked_at:      null,
    },
  });
  if (!access) return null;
  if (access.expires_at && new Date(access.expires_at) < new Date()) return null;

  return Pet.findOne({ where: { id: petId, deleted_at: null } });
};

/* ────────────────────────────────────────────────────────────
   HISTORIAL CLÍNICO
────────────────────────────────────────────────────────────── */

exports.listRecords = async (req, res) => {
  try {
    const pet = await findAccessiblePet(req.params.petId, req.user.id);
    if (!pet) return res.status(404).json({ message: 'Mascota no encontrada o sin acceso' });

    const records = await MedicalRecord.findAll({
      where: { pet_id: pet.id },
      order: [['record_date', 'DESC']],
    });
    return res.json({ data: records });
  } catch (err) {
    console.error('listRecords error:', err);
    return res.status(500).json({ message: 'Error al obtener registros' });
  }
};

exports.createRecord = async (req, res) => {
  try {
    const pet = await Pet.findOne({
      where: { id: req.params.petId, owner_user_id: req.user.id, deleted_at: null },
    });
    if (!pet) return res.status(404).json({ message: 'Mascota no encontrada' });

    const { record_date, record_type, chief_complaint, diagnosis, treatment, notes } = req.body;
    const record = await MedicalRecord.create({
      pet_id:      pet.id,
      record_date,
      record_type,
      chief_complaint: chief_complaint || null,
      diagnosis:       diagnosis       || null,
      treatment:       treatment       || null,
      notes:           notes           || null,
      created_by:      req.user.id,
    });
    return res.status(201).json({ data: record });
  } catch (err) {
    console.error('createRecord error:', err);
    return res.status(500).json({ message: 'Error al crear registro médico' });
  }
};

/* ────────────────────────────────────────────────────────────
   VACUNAS
────────────────────────────────────────────────────────────── */

exports.listVaccinations = async (req, res) => {
  try {
    const pet = await findAccessiblePet(req.params.petId, req.user.id);
    if (!pet) return res.status(404).json({ message: 'Sin acceso' });

    const vacc = await Vaccination.findAll({
      where: { pet_id: pet.id },
      order: [['applied_at', 'DESC']],
    });
    return res.json({ data: vacc });
  } catch (err) {
    return res.status(500).json({ message: 'Error al obtener vacunas' });
  }
};

exports.addVaccination = async (req, res) => {
  try {
    const pet = await Pet.findOne({
      where: { id: req.params.petId, owner_user_id: req.user.id, deleted_at: null },
    });
    if (!pet) return res.status(404).json({ message: 'Mascota no encontrada' });

    const { vaccine_name, batch_number, applied_at, next_due_at, notes } = req.body;
    const vacc = await Vaccination.create({
      pet_id:       pet.id,
      vaccine_name,
      batch_number: batch_number || null,
      applied_at,
      next_due_at:  next_due_at  || null,
      notes:        notes        || null,
    });
    return res.status(201).json({ data: vacc });
  } catch (err) {
    console.error('addVaccination error:', err);
    return res.status(500).json({ message: 'Error al agregar vacuna' });
  }
};

exports.deleteVaccination = async (req, res) => {
  try {
    const vacc = await Vaccination.findOne({
      where:   { id: req.params.vaccId },
      include: [{ model: Pet, as: 'pet', where: { owner_user_id: req.user.id } }],
    });
    if (!vacc) return res.status(404).json({ message: 'Vacuna no encontrada' });
    await vacc.destroy();
    return res.json({ message: 'Vacuna eliminada' });
  } catch (err) {
    return res.status(500).json({ message: 'Error al eliminar vacuna' });
  }
};

/* ────────────────────────────────────────────────────────────
   ALERTAS MÉDICAS
────────────────────────────────────────────────────────────── */

exports.listAlerts = async (req, res) => {
  try {
    const pet = await findAccessiblePet(req.params.petId, req.user.id);
    if (!pet) return res.status(404).json({ message: 'Sin acceso' });

    const alerts = await MedicalAlert.findAll({
      where: { pet_id: pet.id, active: true },
      order: [['created_at', 'DESC']],
    });
    return res.json({ data: alerts });
  } catch (err) {
    return res.status(500).json({ message: 'Error al obtener alertas' });
  }
};

exports.addAlert = async (req, res) => {
  try {
    const pet = await Pet.findOne({
      where: { id: req.params.petId, owner_user_id: req.user.id, deleted_at: null },
    });
    if (!pet) return res.status(404).json({ message: 'Mascota no encontrada' });

    const { alert_type, title, description, severity, show_on_public_profile } = req.body;
    const alert = await MedicalAlert.create({
      pet_id:                pet.id,
      alert_type,
      title,
      description:           description           || null,
      severity:              severity              || 'medium',
      show_on_public_profile:show_on_public_profile || false,
    });
    return res.status(201).json({ data: alert });
  } catch (err) {
    return res.status(500).json({ message: 'Error al agregar alerta' });
  }
};

exports.deleteAlert = async (req, res) => {
  try {
    const alert = await MedicalAlert.findOne({
      where:   { id: req.params.alertId },
      include: [{ model: Pet, as: 'pet', where: { owner_user_id: req.user.id } }],
    });
    if (!alert) return res.status(404).json({ message: 'Alerta no encontrada' });
    await alert.update({ active: false });
    return res.json({ message: 'Alerta eliminada' });
  } catch (err) {
    return res.status(500).json({ message: 'Error al eliminar alerta' });
  }
};

/* ────────────────────────────────────────────────────────────
   HISTORIAL DE PESO
────────────────────────────────────────────────────────────── */

exports.listWeights = async (req, res) => {
  try {
    const pet = await findAccessiblePet(req.params.petId, req.user.id);
    if (!pet) return res.status(404).json({ message: 'Sin acceso' });

    const weights = await PetWeight.findAll({
      where: { pet_id: pet.id },
      order: [['measured_at', 'DESC']],
    });
    return res.json({ data: weights });
  } catch (err) {
    return res.status(500).json({ message: 'Error al obtener pesos' });
  }
};

exports.addWeight = async (req, res) => {
  try {
    const pet = await Pet.findOne({
      where: { id: req.params.petId, owner_user_id: req.user.id, deleted_at: null },
    });
    if (!pet) return res.status(404).json({ message: 'Mascota no encontrada' });

    const { weight, weight_unit, measured_at, notes } = req.body;
    const w = await PetWeight.create({
      pet_id:      pet.id,
      weight,
      weight_unit: weight_unit || 'kg',
      measured_at,
      notes:       notes || null,
    });
    return res.status(201).json({ data: w });
  } catch (err) {
    return res.status(500).json({ message: 'Error al registrar peso' });
  }
};

/* ────────────────────────────────────────────────────────────
   DOCUMENTOS MÉDICOS
────────────────────────────────────────────────────────────── */

exports.listDocuments = async (req, res) => {
  try {
    const pet = await findAccessiblePet(req.params.petId, req.user.id);
    if (!pet) return res.status(404).json({ message: 'Sin acceso' });

    const docs = await MedicalDocument.findAll({
      where: { pet_id: pet.id },
      order: [['uploaded_at', 'DESC']],
    });
    return res.json({ data: docs });
  } catch (err) {
    return res.status(500).json({ message: 'Error al obtener documentos' });
  }
};

exports.uploadDocument = async (req, res) => {
  try {
    const pet = await Pet.findOne({
      where: { id: req.params.petId, owner_user_id: req.user.id, deleted_at: null },
    });
    if (!pet) return res.status(404).json({ message: 'Mascota no encontrada' });
    if (!req.file) return res.status(400).json({ message: 'Archivo requerido' });

    const { document_type, title, record_id } = req.body;
    const file_url = await uploadImage(req.file, `medical/${pet.id}`);

    const doc = await MedicalDocument.create({
      pet_id:       pet.id,
      record_id:    record_id || null,
      document_type,
      title,
      file_url,
      file_size_kb: Math.round(req.file.size / 1024),
      uploaded_by:  req.user.id,
    });
    return res.status(201).json({ data: doc });
  } catch (err) {
    console.error('uploadDocument error:', err);
    return res.status(500).json({ message: 'Error al subir documento' });
  }
};

exports.deleteDocument = async (req, res) => {
  try {
    const doc = await MedicalDocument.findOne({
      where:   { id: req.params.docId },
      include: [{ model: Pet, as: 'pet', where: { owner_user_id: req.user.id } }],
    });
    if (!doc) return res.status(404).json({ message: 'Documento no encontrado' });

    await deleteImage(doc.file_url);
    await doc.destroy();
    return res.json({ message: 'Documento eliminado' });
  } catch (err) {
    return res.status(500).json({ message: 'Error al eliminar documento' });
  }
};

/* ── GET /pets/:petId/medical-documents ─────────────────── */
exports.listDocuments = async (req, res, next) => {
  try {
    const pet = await Pet.findOne({
      where: { id: req.params.petId, owner_user_id: req.user.id, deleted_at: null },
    });
    if (!pet) return res.status(404).json({ message: 'Mascota no encontrada' });
 
    const docs = await MedicalDocument.findAll({
      where: { pet_id: pet.id },
      order: [['uploaded_at', 'DESC']],
    });
 
    return res.json({ data: docs });
  } catch (err) {
    next(err);
  }
};
 
/* ── POST /pets/:petId/medical-documents ────────────────── */
exports.uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Archivo requerido' });
 
    const pet = await Pet.findOne({
      where: { id: req.params.petId, owner_user_id: req.user.id, deleted_at: null },
    });
    if (!pet) return res.status(404).json({ message: 'Mascota no encontrada' });
 
    const { title, document_type, document_date, notes } = req.body;
 
    // Subir a Supabase Storage
    const fileUrl = await uploadFile(
      req.file,
      `documents/${req.user.id}/${pet.id}`
    );
 
    // file_size_kb: convertir bytes a KB
    const fileSizeKb = req.file.size ? Math.ceil(req.file.size / 1024) : null;
 
    const doc = await MedicalDocument.create({
      pet_id:        pet.id,
      record_id:     null,
      title:         title || req.file.originalname,
      document_type: document_type || 'other',
      file_url:      fileUrl,
      file_size_kb:  fileSizeKb,
      uploaded_at:   new Date(),
      uploaded_by:   req.user.id,
      // columnas nuevas
      document_date: document_date || null,
      mime_type:     req.file.mimetype,
      file_name:     req.file.originalname,
      notes:         notes || null,
    });
 
    return res.status(201).json({
      message: 'Documento subido correctamente',
      data:    doc,
    });
  } catch (err) {
    next(err);
  }
};
 
/* ── DELETE /pets/:petId/medical-documents/:docId ───────── */
exports.deleteDocument = async (req, res, next) => {
  try {
    const pet = await Pet.findOne({
      where: { id: req.params.petId, owner_user_id: req.user.id, deleted_at: null },
    });
    if (!pet) return res.status(404).json({ message: 'Mascota no encontrada' });
 
    const doc = await MedicalDocument.findOne({
      where: { id: req.params.docId, pet_id: pet.id },
    });
    if (!doc) return res.status(404).json({ message: 'Documento no encontrado' });
 
    // Eliminar de Supabase
    await deleteFile(doc.file_url).catch(e => console.error('storage delete:', e));
 
    await doc.destroy();
 
    return res.json({ message: 'Documento eliminado' });
  } catch (err) {
    next(err);
  }
};