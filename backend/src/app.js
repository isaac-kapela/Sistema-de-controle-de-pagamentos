require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { startBirthdayCron } = require('./services/birthday');

const app = express();

app.use(cors());
app.use(express.json());

// Conexão com MongoDB com cache (funciona em ambiente serverless)
let cachedConn = null;

async function connectDB() {
  if (cachedConn) return cachedConn;
  cachedConn = await mongoose.connect(process.env.MONGODB_URI);
  return cachedConn;
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
app.use('/api/members', require('./routes/members'));

// Health check
app.get('/api/health', (_, res) => res.json({ status: 'ok' }));

// Inicia cron de aniversarios
startBirthdayCron();

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
