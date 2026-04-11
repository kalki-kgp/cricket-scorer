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

const io = new Server(server, {
  cors: {
    origin: FRONTEND_URL,
    methods: ['GET', 'POST'],
  },
});

app.use(cors({ origin: FRONTEND_URL }));
app.use(express.json());

app.get('/health', (_, res) => res.json({ status: 'ok' }));
app.use('/api', authRoutes);
app.use('/api', matchRoutes(io));

setupSocket(io);

server.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
