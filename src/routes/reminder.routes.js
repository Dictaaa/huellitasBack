// src/routes/reminder.routes.js
const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/reminder.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

router.use(verifyToken);

router.get   ('/',                controller.listReminders);
router.post  ('/',                controller.createReminder);
router.patch ('/:id',             controller.updateReminder);
router.delete('/:id',             controller.deleteReminder);
router.patch ('/:id/dismiss',     controller.dismissReminder);

module.exports = router;