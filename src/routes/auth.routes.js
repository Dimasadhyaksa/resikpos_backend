
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { merchant_email, username, password } = req.body;

    if (
      typeof merchant_email !== 'string' ||
      typeof username !== 'string' ||
      typeof password !== 'string' ||
      !merchant_email.trim() ||
      !username.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: 'Merchant email, username, and password are required',
      });
    }

    const [users] = await pool.execute(
      `SELECT
        u.id,
        u.merchant_id,
        u.outlet_id,
        u.role,
        u.name,
        u.username,
        u.password_hash,
        m.email AS merchant_email,
        m.is_active AS merchant_is_active,
        m.subscription_valid_until
      FROM users u
      INNER JOIN merchants m ON m.id = u.merchant_id
      WHERE m.email = ? AND u.username = ?
      LIMIT 1`,
      [merchant_email.trim(), username.trim()]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    const user = users[0];

    const passwordValid = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!passwordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    if (!user.merchant_is_active) {
      return res.status(403).json({
        success: false,
        message: 'This merchant account is inactive',
      });
    }

    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not configured');
    }

    const token = jwt.sign(
      {
        merchantId: user.merchant_id,
        outletId: user.outlet_id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        subject: String(user.id),
        expiresIn: process.env.JWT_EXPIRES_IN || '8h',
      }
    );

    return res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user.id,
          merchant_id: user.merchant_id,
          outlet_id: user.outlet_id,
          role: user.role,
          name: user.name,
          username: user.username,
        },
      },
    });
  } catch (error) {
    console.error('Login error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

module.exports = router;
