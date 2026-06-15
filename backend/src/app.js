require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { startBirthdayCron } = require('./services/birthday');
const { seedCategories }   = require('./models/StockCategory');
const { seedDefaults: seedChargeTypes } = require('./controllers/chargeTypeController');

const app = express();

app.use(cors());
app.use(express.json());

// Conexão com MongoDB com cache (funciona em ambiente serverless)
// Armazena a Promise para evitar múltiplas conexões paralelas
let connectionPromise = null;

async function connectDB() {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (!connectionPromise) {
    connectionPromise = mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      maxPoolSize: 1,
      bufferTimeoutMS: 30000,
    }).catch((err) => {
      connectionPromise = null; // permite nova tentativa se falhar
      throw err;
    });
  }
  return connectionPromise;
}

// Garante conexão com MongoDB antes de cada request
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('Erro ao conectar ao MongoDB:', err.message);
    res.status(500).json({ error: 'Erro de conexão com banco de dados' });
  }
});

// Rotas
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/email', require('./routes/email'));
app.use('/api/members',     require('./routes/members'));
app.use('/api/schedules',   require('./routes/schedules'));
app.use('/api/semesters',   require('./routes/semesters'));
app.use('/api/meetings',    require('./routes/meetings'));
app.use('/api/attendances', require('./routes/attendances'));
app.use('/api/cantina',    require('./routes/cantina'));
app.use('/api/stock',      require('./routes/stock'));
app.use('/api/feedbacks',  require('./routes/feedbacks'));
app.use('/api/logins',       require('./routes/platformCredentials'));
app.use('/api/charge-types', require('./routes/chargeTypes'));

// Health check
app.get('/api/health', (_, res) => res.json({ status: 'ok' }));

// Inicia cron de aniversarios
startBirthdayCron();

// Seeds na primeira vez
connectDB().then(seedCategories).catch(() => {});
connectDB().then(seedChargeTypes).catch(() => {});

// Inicia servidor apenas em desenvolvimento local
if (require.main === module) {
  const PORT = process.env.PORT || 3001;
  connectDB()
    .then(() => {
      console.log('Conectado ao MongoDB');
      app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
    })
    .catch((err) => {
      console.error('Erro ao conectar ao MongoDB:', err.message);
      process.exit(1);
    });
}

module.exports = app;
