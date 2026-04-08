const request = require('supertest');
const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');

jest.mock('../config/db', () => ({
  query: jest.fn(),
}));

const pool = require('../config/db');
const reminderRoutes = require('../routes/reminders');

process.env.JWT_SECRET = 'test-secret';

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/reminders', reminderRoutes);

function authCookie() {
  const token = jwt.sign({ userId: 1, email: 'a@b.com' }, 'test-secret');
  return `token=${token}`;
}

describe('GET /api/reminders', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/reminders');
    expect(res.status).toBe(401);
  });

  it('returns reminders list', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1, message: 'Test', remind_at: new Date() }] });

    const res = await request(app)
      .get('/api/reminders')
      .set('Cookie', authCookie());

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.reminders)).toBe(true);
  });
});

describe('POST /api/reminders', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 400 when required fields are missing', async () => {
    const res = await request(app)
      .post('/api/reminders')
      .set('Cookie', authCookie())
      .send({ message: 'No time' });

    expect(res.status).toBe(400);
  });

  it('creates a reminder', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 1, message: 'Hello', remind_at: '2026-01-01T10:00:00Z', user_id: 1 }],
    });

    const res = await request(app)
      .post('/api/reminders')
      .set('Cookie', authCookie())
      .send({ message: 'Hello', remindAt: '2026-01-01T10:00:00' });

    expect(res.status).toBe(201);
    expect(res.body.reminder.message).toBe('Hello');
  });
});

describe('DELETE /api/reminders/:id', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 404 when not found', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .delete('/api/reminders/999')
      .set('Cookie', authCookie());

    expect(res.status).toBe(404);
  });

  it('deletes reminder', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });

    const res = await request(app)
      .delete('/api/reminders/1')
      .set('Cookie', authCookie());

    expect(res.status).toBe(200);
  });
});
