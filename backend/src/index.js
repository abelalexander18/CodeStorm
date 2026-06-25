// src/index.js — CampusFlow Express entry point
require('dotenv').config();

const express = require('express');
const cors = require('cors');

const studentsRouter = require('./routes/students');
const tasksRouter = require('./routes/tasks');
const attendanceRouter = require('./routes/attendance');

const app = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ──────────────────────────────────────────────
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// ── Health check ────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'CampusFlow API' }));

// ── API Routes ──────────────────────────────────────────────
app.use('/api/students', studentsRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/attendance', attendanceRouter);

// ── 404 catch-all ───────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

// ── Global error handler ────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[Unhandled error]', err);
  res.status(500).json({ error: 'Internal server error.' });
});

// ── Start ───────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 CampusFlow API running at http://localhost:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
  console.log(`   Supabase URL: ${process.env.SUPABASE_URL || '(not set)'}`);
  console.log(`   Groq key set: ${!!process.env.GROQ_API_KEY}`);
  console.log(`   Deadline webhook: ${process.env.N8N_DEADLINE_WEBHOOK}`);
  console.log(`   Attendance webhook: ${process.env.N8N_ATTENDANCE_WEBHOOK}\n`);
});
