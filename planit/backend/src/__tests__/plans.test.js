const request = require('supertest');
const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');

jest.mock('../config/db', () => ({
  query: jest.fn(),
}));

const pool = require('../config/db');
const planRoutes = require('../routes/plans');

process.env.JWT_SECRET = 'test-secret';

// Build test app
const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/plans', planRoutes);

function authCookie() {
  const token = jwt.sign({ userId: 1, email: 'a@b.com' }, 'test-secret');
  return `token=${token}`;
}

describe('GET /api/plans', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/plans');
    expect(res.status).toBe(401);
  });

  it('returns plans list for authenticated user', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1, title: 'Plan A', tags: [] }] });

    const res = await request(app)
      .get('/api/plans')
      .set('Cookie', authCookie());

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.plans)).toBe(true);
  });
});

describe('POST /api/plans', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 400 when title is missing', async () => {
    const res = await request(app)
      .post('/api/plans')
      .set('Cookie', authCookie())
      .send({ description: 'No title' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/title/i);
  });

  it('creates a plan and returns 201', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 2, title: 'New Plan', user_id: 1, status: 'active', priority: 'medium' }],
    });

    const res = await request(app)
      .post('/api/plans')
      .set('Cookie', authCookie())
      .send({ title: 'New Plan' });

    expect(res.status).toBe(201);
    expect(res.body.plan.title).toBe('New Plan');
  });
});

describe('DELETE /api/plans/:id', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 404 when plan not found', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .delete('/api/plans/999')
      .set('Cookie', authCookie());

    expect(res.status).toBe(404);
  });

  it('deletes a plan and returns 200', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });

    const res = await request(app)
      .delete('/api/plans/1')
      .set('Cookie', authCookie());

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Plan deleted');
  });
});
