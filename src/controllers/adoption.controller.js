// src/controllers/adoption.controller.js
const { Op }        = require('sequelize');
const { sequelize } = require('../config/db');
const {
  AdoptionListing, AdoptionApplication, AdoptionStatus,
  Species, Breed, Organization, User, AuditLog,
} = require('../models');
const { uploadImage } = require('../services/storage.service');

/* ── GET /adoptions ── lista pública ─────────────────────── */
exports.listListings = async (req, res) => {
  try {
    const { species_id, city, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const where = { status_id: 1 }; // available
    if (species_id) where.species_id = species_id;
    if (city)       where.city       = { [Op.iLike]: `%${city}%` };

    const { count, rows } = await AdoptionListing.findAndCountAll({
      where,
      include: [
        { model: Species,      as: 'species',      required: false },
        { model: Organization, as: 'organization', required: false, attributes: ['name','city'] },
      ],
      limit:  Number(limit),
      offset,
      order:  [['published_at', 'DESC']],
    });

    return res.json({ total: count, page: Number(page), pages: Math.ceil(count / Number(limit)), data: rows });
  } catch (err) {
    console.error('listListings error:', err);
    return res.status(500).json({ message: 'Error al obtener adopciones' });
  }
};

/* ── GET /adoptions/:id ── detalle ───────────────────────── */
exports.getListing = async (req, res) => {
  try {
    const listing = await AdoptionListing.findByPk(req.params.id, {
      include: [
        { model: Species,      as: 'species',      required: false },
        { model: Breed,        as: 'breed',        required: false },  // Nota: agregar breed assoc si se requiere
        { model: Organization, as: 'organization', required: false },
        { model: AdoptionStatus, as: 'status' },
      ],
    });
    if (!listing) return res.status(404).json({ message: 'Publicación no encontrada' });
    return res.json({ data: listing });
  } catch (err) {
    return res.status(500).json({ message: 'Error al obtener publicación' });
  }
};

/* ── POST /adoptions ── crear publicación ────────────────── */
exports.createListing = async (req, res) => {
  try {
    const {
      pet_name, species_id, pet_sex, pet_age_months,
      pet_description, vaccinated, sterilized, city,
    } = req.body;

    let photo_urls = [];
    if (req.file) {
      const url = await uploadImage(req.file, `adoptions/${req.user.id}`);
      photo_urls = [url];
    }

    const listing = await AdoptionListing.create({
      listed_by:       req.user.id,
      pet_name,
      species_id,
      pet_sex:         pet_sex         || 'unknown',
      pet_age_months:  pet_age_months  || null,
      pet_description: pet_description || null,
      vaccinated:      vaccinated      || false,
      sterilized:      sterilized      || false,
      city:            city            || null,
      photo_urls:      photo_urls.length ? photo_urls : null,
      status_id:       1,              // available
      published_at:    new Date(),
    });

    return res.status(201).json({ data: listing });
  } catch (err) {
    console.error('createListing error:', err);
    return res.status(500).json({ message: 'Error al crear publicación' });
  }
};

/* ── PATCH /adoptions/:id ── actualizar ──────────────────── */
exports.updateListing = async (req, res) => {
  try {
    const listing = await AdoptionListing.findOne({
      where: { id: req.params.id, listed_by: req.user.id },
    });
    if (!listing) return res.status(404).json({ message: 'Publicación no encontrada' });

    const allowed = ['pet_name','species_id','pet_sex','pet_age_months','pet_description',
                     'vaccinated','sterilized','city','status_id'];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    if (req.body.status_id === 2) updates.closed_at = new Date(); // on_hold → closed

    await listing.update(updates);
    return res.json({ data: listing });
  } catch (err) {
    return res.status(500).json({ message: 'Error al actualizar publicación' });
  }
};

/* ── DELETE /adoptions/:id ── retirar publicación ────────── */
exports.deleteListing = async (req, res) => {
  try {
    const listing = await AdoptionListing.findOne({
      where: { id: req.params.id, listed_by: req.user.id },
    });
    if (!listing) return res.status(404).json({ message: 'Publicación no encontrada' });
    await listing.update({ status_id: 4, closed_at: new Date() }); // 4 = withdrawn
    return res.json({ message: 'Publicación retirada' });
  } catch (err) {
    return res.status(500).json({ message: 'Error al retirar publicación' });
  }
};

/* ── POST /adoptions/:id/apply ── solicitar adopción ──────── */
exports.applyToAdopt = async (req, res) => {
  try {
    const listing = await AdoptionListing.findOne({
      where: { id: req.params.id, status_id: 1 },
    });
    if (!listing) return res.status(404).json({ message: 'Publicación no disponible' });

    const existing = await AdoptionApplication.findOne({
      where: { listing_id: listing.id, applicant_id: req.user.id },
    });
    if (existing) return res.status(409).json({ message: 'Ya enviaste una solicitud para esta mascota' });

    const app = await AdoptionApplication.create({
      listing_id:   listing.id,
      applicant_id: req.user.id,
      message:      req.body.message || null,
    });
    return res.status(201).json({ message: 'Solicitud enviada', data: app });
  } catch (err) {
    console.error('applyToAdopt error:', err);
    return res.status(500).json({ message: 'Error al enviar solicitud' });
  }
};

/* ── GET /adoptions/:id/applications ── ver solicitudes ────── */
exports.getApplications = async (req, res) => {
  try {
    const listing = await AdoptionListing.findOne({
      where: { id: req.params.id, listed_by: req.user.id },
    });
    if (!listing) return res.status(404).json({ message: 'Publicación no encontrada' });

    const apps = await AdoptionApplication.findAll({
      where:   { listing_id: listing.id },
      include: [{ model: User, as: 'applicant', attributes: ['id','first_name','last_name','email','phone'] }],
      order:   [['created_at', 'DESC']],
    });
    return res.json({ data: apps });
  } catch (err) {
    return res.status(500).json({ message: 'Error al obtener solicitudes' });
  }
};

/* ── PATCH /adoptions/:id/applications/:appId ── revisar ─── */
exports.reviewApplication = async (req, res) => {
  try {
    const { status } = req.body;
    const listing = await AdoptionListing.findOne({
      where: { id: req.params.id, listed_by: req.user.id },
    });
    if (!listing) return res.status(404).json({ message: 'Publicación no encontrada' });

    const app = await AdoptionApplication.findOne({
      where: { id: req.params.appId, listing_id: listing.id },
    });
    if (!app) return res.status(404).json({ message: 'Solicitud no encontrada' });

    await app.update({ status, reviewed_at: new Date(), reviewed_by: req.user.id });

    // Si se aprueba, cerrar la publicación
    if (status === 'approved') {
      await listing.update({ status_id: 3, closed_at: new Date() }); // 3 = adopted
    }

    return res.json({ data: app });
  } catch (err) {
    return res.status(500).json({ message: 'Error al revisar solicitud' });
  }
};