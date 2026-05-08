const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const {
  listSemesters,
  createSemester,
  updateSemester,
  deleteSemester,
  generateMeetings,
  newSemester,
} = require('../controllers/semesterController');

router.get('/', listSemesters);
router.post('/', requireAuth, createSemester);
router.post('/new-semester', requireAuth, newSemester);
router.put('/:id', requireAuth, updateSemester);
router.delete('/:id', requireAuth, deleteSemester);
router.post('/:id/generate-meetings', requireAuth, generateMeetings);

module.exports = router;
