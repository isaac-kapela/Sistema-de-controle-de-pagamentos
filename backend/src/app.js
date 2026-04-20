require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const usersRouter = require('./routes/users');
const paymentsRouter = require('./routes/payments');
const authRouter = require('./routes/auth');

const app = express();

app.use(cors());
app.use(express.json());

// Rotas
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/payments', paymentsRouter);

// Health check
app.get('/api/health', (_, res) => res.json({ status: 'ok' }));

// Conexão com MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pagamentos';
const PORT = process.env.PORT || 3001;

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('Conectado ao MongoDB');
    app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
  })
  .catch((err) => {
    console.error('Erro ao conectar ao MongoDB:', err.message);
    process.exit(1);
  });
