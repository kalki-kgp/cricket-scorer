require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const matchRoutes = require('./routes/match');
const setupSocket = require('./socket');

const app = express();
const server = http.createServer(app);

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const PORT = process.env.PORT || 3001;

// Allow both the configured frontend URL and common localhost dev origins
const allowedOrigins = [
  FRONTEND_URL,
  'http://localhost:3000',
  'http://localhost:3005',
  'http://localhost:3001',
];

const corsOptions = {
  origin: (origin, cb) => {
    // Allow requests with no origin (curl, Postman, SSR server-side fetch)
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
};

const io = new Server(server, {
  cors: { origin: corsOptions.origin, methods: corsOptions.methods },
});

app.use(cors(corsOptions));
app.use(express.json());

// Root URL is the API only; send humans to the Next.js app (port 3000 by default).
app.get('/', (_, res) => {
  res.redirect(302, FRONTEND_URL);
});

app.get('/health', (_, res) => res.json({ status: 'ok' }));
app.use('/api', authRoutes);
app.use('/api', matchRoutes(io));

setupSocket(io);

server.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
