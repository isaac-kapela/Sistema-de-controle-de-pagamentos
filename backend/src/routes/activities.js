const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activityController');

router.get('/', activityController.list);
router.post('/', activityController.create);
router.post('/sync-meetings', activityController.syncMeetings);
router.post('/check-tomorrow', activityController.checkTomorrow);
router.put('/:id', activityController.update);
router.patch('/:id/toggle-complete', activityController.toggleComplete);
router.post('/:id/send-reminder', activityController.sendManualReminder);
router.delete('/:id', activityController.remove);

module.exports = router;
