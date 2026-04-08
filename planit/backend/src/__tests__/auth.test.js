const request = require('supertest');
const express = require('express');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');

// Mock pg pool before requiring routes
jest.mock('../config/db', () => ({
  query: jest.fn(),
}));

const pool = require('../config/db');

// Build a minimal app for testing
const authRoutes = require('../routes/auth');
const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/auth', authRoutes);

process.env.JWT_SECRET = 'test-secret';

describe('POST /api/auth/signup', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 400 when fields are missing', async () => {
    const res = await request(app).post('/api/auth/signup').send({ email: 'a@b.com' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  it('returns 409 when email already exists', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 1 }] }); // existing user check

    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'a@b.com', password: 'secret123', fullName: 'Alice' });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already registered/i);
  });

  it('creates user and returns 201 with user data', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [] })           // no existing user
      .mockResolvedValueOnce({                        // INSERT user
        rows: [{ id: 1, email: 'a@b.com', full_name: 'Alice', phone_number: null }],
      });

    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'a@b.com', password: 'secret123', fullName: 'Alice' });

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('a@b.com');
    expect(res.body.user.fullName).toBe('Alice');
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 400 when fields are missing', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'a@b.com' });
    expect(res.status).toBe(400);
  });

  it('returns 401 for unknown email', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@b.com', password: 'pass' });

    expect(res.status).toBe(401);
  });

  it('returns 401 for wrong password', async () => {
    const hash = await bcrypt.hash('correctpass', 10);
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 1, email: 'a@b.com', full_name: 'Alice', password_hash: hash, phone_number: null }],
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'a@b.com', password: 'wrongpass' });

    expect(res.status).toBe(401);
  });

  it('returns 200 with user data for valid credentials', async () => {
    const hash = await bcrypt.hash('correctpass', 10);
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 1, email: 'a@b.com', full_name: 'Alice', password_hash: hash, phone_number: null }],
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'a@b.com', password: 'correctpass' });

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('a@b.com');
  });
});

describe('POST /api/auth/logout', () => {
  it('clears cookie and returns 200', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Logged out');
  });
});
