const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { listMeetings, createMeeting, updateMeeting, deleteMeeting } = require('../controllers/meetingController');

router.get('/', listMeetings);
router.post('/', requireAuth, createMeeting);
router.put('/:id', requireAuth, updateMeeting);
router.delete('/:id', requireAuth, deleteMeeting);

module.exports = router;
