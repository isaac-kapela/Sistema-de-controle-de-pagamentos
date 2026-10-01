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

// Rotas públicas de gerenciamento de horários (qualquer membro pode cadastrar, atualizar ou excluir)
router.get('/', ctrl.listSchedules);
router.post('/', ctrl.createSchedule);
router.put('/:id', ctrl.updateSchedule);
router.delete('/:id', ctrl.deleteSchedule);

// Rota restrita (admin) - limpar todos os horários
router.delete('/', requireAuth, ctrl.clearAllSchedules);

module.exports = router;
