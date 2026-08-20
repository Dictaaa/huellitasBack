// src/routes/adoption.routes.js
const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/adoption.controller');
const { verifyToken } = require('../middlewares/auth.middleware');
const { upload }      = require('../middlewares/upload.middleware');

// Públicas
router.get('/',    controller.listListings);
router.get('/:id', controller.getListing);

// Protegidas
router.use(verifyToken);

router.post('/',    upload.single('photo'), controller.createListing);
router.patch('/:id',                        controller.updateListing);
router.delete('/:id',                       controller.deleteListing);

// Solicitudes de adopción
router.post ('/:id/apply',                    controller.applyToAdopt);
router.get  ('/:id/applications',             controller.getApplications);
router.patch('/:id/applications/:appId',      controller.reviewApplication);

module.exports = router;