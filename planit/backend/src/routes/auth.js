const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const pool = require('../config/db');

const router = express.Router();

function generateToken(user) {
  return jwt.sign(
    { userId: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function setTokenCookie(res, token) {
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  const { email, password, fullName, phoneNumber } = req.body;

  if (!email || !password || !fullName) {
    return res.status(400).json({ error: 'Email, password, and full name are required' });
  }

  try {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, full_name, phone_number)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, full_name, phone_number`,
      [email, passwordHash, fullName, phoneNumber || null]
    );

    const user = result.rows[0];
    const token = generateToken(user);
    setTokenCookie(res, token);

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        phoneNumber: user.phone_number,
      },
    });
  } catch (err) {
    console.error('Signup error:', err.message);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const result = await pool.query(
      'SELECT id, email, full_name, password_hash, phone_number FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];

    if (!user.password_hash) {
      return res.status(401).json({ error: 'Please sign in with Google' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(user);
    setTokenCookie(res, token);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        phoneNumber: user.phone_number,
      },
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Failed to log in' });
  }
});

// POST /api/auth/google
router.post('/google', async (req, res) => {
  const { credential } = req.body;

  if (!credential) {
    return res.status(400).json({ error: 'Google credential is required' });
  }

  try {
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    let result = await pool.query(
      'SELECT id, email, full_name, phone_number FROM users WHERE google_id = $1 OR email = $2',
      [googleId, email]
    );

    let user;
    if (result.rows.length > 0) {
      user = result.rows[0];
      await pool.query(
        'UPDATE users SET google_id = $1, avatar_url = $2, updated_at = NOW() WHERE id = $3',
        [googleId, picture, user.id]
      );
    } else {
      result = await pool.query(
        `INSERT INTO users (email, full_name, google_id, avatar_url)
         VALUES ($1, $2, $3, $4)
         RETURNING id, email, full_name, phone_number`,
        [email, name, googleId, picture]
      );
      user = result.rows[0];
    }

    const token = generateToken(user);
    setTokenCookie(res, token);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        phoneNumber: user.phone_number,
        avatarUrl: picture,
      },
    });
  } catch (err) {
    console.error('Google auth error:', err.message);
    res.status(500).json({ error: 'Google authentication failed' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out' });
});

// GET /api/auth/me
router.get('/me', async (req, res) => {
  const token = req.cookies.token || req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const result = await pool.query(
      'SELECT id, email, full_name, avatar_url, phone_number, password_hash FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    res.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        avatarUrl: user.avatar_url,
        phoneNumber: user.phone_number,
        hasPassword: !!user.password_hash,
      },
    });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
});

// PUT /api/auth/me — update profile (name, phone, password)
router.put('/me', async (req, res) => {
  const token = req.cookies.token || req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { fullName, phoneNumber, currentPassword, newPassword } = req.body;

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password is required to set a new password' });
      }
      const userCheck = await pool.query('SELECT password_hash FROM users WHERE id = $1', [decoded.userId]);
      if (userCheck.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      if (!userCheck.rows[0].password_hash) {
        return res.status(400).json({ error: 'Google accounts cannot set a password here' });
      }
      const valid = await bcrypt.compare(currentPassword, userCheck.rows[0].password_hash);
      if (!valid) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }
      const newHash = await bcrypt.hash(newPassword, 10);
      await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [newHash, decoded.userId]);
    }

    const result = await pool.query(
      `UPDATE users
       SET full_name = COALESCE($1, full_name),
           phone_number = COALESCE($2, phone_number),
           updated_at = NOW()
       WHERE id = $3
       RETURNING id, email, full_name, avatar_url, phone_number`,
      [fullName || null, phoneNumber || null, decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    res.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        avatarUrl: user.avatar_url,
        phoneNumber: user.phone_number,
      },
    });
  } catch (err) {
    console.error('Update profile error:', err.message);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

module.exports = router;
