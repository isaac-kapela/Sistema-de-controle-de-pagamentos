const express = require('express');
const router = express.Router();
const { listUsers, createUser, updateUser, deleteUser } = require('../controllers/userController');
const { requireAuth } = require('../middleware/auth');

router.get('/', listUsers);
router.post('/', requireAuth, createUser);
router.put('/:id', requireAuth, updateUser);
router.delete('/:id', requireAuth, deleteUser);

module.exports = router;
