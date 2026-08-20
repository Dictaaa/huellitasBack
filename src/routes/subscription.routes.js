// src/routes/subscription.routes.js
const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/subscription.controller');
const { verifyToken, isAdmin } = require('../middlewares/auth.middleware');

// Planes — público
router.get('/plans', controller.listPlans);

// Suscripciones — requieren auth
router.use(verifyToken);

router.get ('/subscriptions/me',     controller.getMySubscription);
router.post('/subscriptions',        controller.createSubscription);
router.post('/subscriptions/cancel', controller.cancelSubscription);

// Admin
router.get('/admin/subscriptions', isAdmin, controller.listSubscriptions);

module.exports = router;