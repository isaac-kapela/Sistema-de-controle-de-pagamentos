const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const {
  listAttendances,
  getStats,
  upsertAttendance,
  bulkUpsert,
  clearSemesterAttendances,
} = require('../controllers/attendanceController');

router.get('/', listAttendances);
router.get('/stats', getStats);
router.post('/', requireAuth, upsertAttendance);
router.post('/bulk', requireAuth, bulkUpsert);
router.delete('/semester/:semesterId', requireAuth, clearSemesterAttendances);

module.exports = router;
