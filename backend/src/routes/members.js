const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const {
  listMembers,
  getMember,
  createMember,
  updateMember,
  deleteMember,
  generateAccessCode,
  validateAccessCode,
} = require('../controllers/memberController');

router.post('/validate-code', validateAccessCode);

router.get('/', listMembers);
router.get('/:id', getMember);
router.post('/', createMember);
router.put('/:id', requireAuth, updateMember);
router.delete('/:id', requireAuth, deleteMember);
router.post('/:id/generate-code', requireAuth, generateAccessCode);

module.exports = router;
