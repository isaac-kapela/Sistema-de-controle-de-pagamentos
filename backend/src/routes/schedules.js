const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const { requireAuth } = require('../middleware/auth');
const ctrl    = require('../controllers/scheduleController');

const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 15 * 1024 * 1024 }, // 15 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Apenas arquivos PDF são aceitos.'));
  },
});

// Rota pública: analisa PDF e retorna a grade (não salva)
router.post('/parse-pdf', upload.single('pdf'), ctrl.parsePDF);

// Rota pública: visão agregada (contagem por slot)
router.get('/aggregate', ctrl.aggregateSchedules);

// Rotas públicas de listagem e cadastro (qualquer membro pode cadastrar)
router.get('/', ctrl.listSchedules);
router.post('/', ctrl.createSchedule);

// Rotas restritas (admin)
router.delete('/',    requireAuth, ctrl.clearAllSchedules);
router.put('/:id',    requireAuth, ctrl.updateSchedule);
router.delete('/:id', requireAuth, ctrl.deleteSchedule);

module.exports = router;
