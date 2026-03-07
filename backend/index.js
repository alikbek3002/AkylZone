const express = require('express');
const cors = require('cors');

if (!process.env.RAILWAY_ENVIRONMENT) {
  require('dotenv').config();
}

const app = express();
const port = process.env.PORT || 5050;

const localOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
];

const envOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const allowedOrigins = new Set([...localOrigins, ...envOrigins]);

app.use(
  cors({
    origin(origin, cb) {
      if (!origin || allowedOrigins.has(origin)) return cb(null, true);
      cb(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

app.use(express.json());

app.use('/api/tests', require('./routes/testRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

app.get('/api/ping', (_req, res) => res.json({ message: 'pong' }));

app.listen(port, '0.0.0.0', () => {
  console.log(`Backend is running on port ${port}`);
});
