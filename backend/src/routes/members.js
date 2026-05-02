const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const {
  listMembers,
  getMember,
  createMember,
  updateMember,
  deleteMember,
} = require('../controllers/memberController');

router.get('/', listMembers);
router.get('/:id', getMember);
router.post('/', createMember);
router.put('/:id', requireAuth, updateMember);
router.delete('/:id', requireAuth, deleteMember);

module.exports = router;
