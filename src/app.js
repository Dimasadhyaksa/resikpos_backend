
const express = require('express');
const cors = require('cors');
const pool = require('./config/db');

// Import routes dan middleware autentikasi
const authRoutes = require('./routes/auth.routes');
const {
  authenticateToken,
  allowRoles,
} = require('./middleware/auth.middleware');

const app = express();

// Middleware utama
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
}));

app.use(express.json());

// Endpoint utama
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'ResikPos Backend API is running',
  });
});

// Endpoint pemeriksaan koneksi database
app.get('/api/v1/health', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT DATABASE() AS database_name, 1 AS connected'
    );

    res.json({
      success: true,
      message: 'Backend and database are connected',
      data: rows[0],
    });
  } catch (error) {
    console.error('Database error:', error.message);

    res.status(500).json({
      success: false,
      message: 'Database connection failed',
    });
  }
});

// Endpoint autentikasi: login
app.use('/api/v1/auth', authRoutes);

// Endpoint untuk memeriksa pengguna yang sedang login
app.get(
  '/api/v1/auth/me',
  authenticateToken,
  (req, res) => {
    res.json({
      success: true,
      message: 'Authentication valid',
      data: {
        user: req.user,
      },
    });
  }
);

// Endpoint khusus Owner untuk pengujian role
app.get(
  '/api/v1/auth/owner-only',
  authenticateToken,
  allowRoles('Owner'),
  (req, res) => {
    res.json({
      success: true,
      message: 'Owner access granted',
    });
  }
);

module.exports = app;
