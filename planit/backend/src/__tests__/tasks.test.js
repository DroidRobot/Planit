const request = require('supertest');
const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');

jest.mock('../config/db', () => ({
  query: jest.fn(),
}));

const pool = require('../config/db');
const taskRoutes = require('../routes/tasks');

process.env.JWT_SECRET = 'test-secret';

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/tasks', taskRoutes);

function authCookie() {
  const token = jwt.sign({ userId: 1, email: 'a@b.com' }, 'test-secret');
  return `token=${token}`;
}

describe('GET /api/tasks', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 400 when plan_id is missing', async () => {
    const res = await request(app).get('/api/tasks').set('Cookie', authCookie());
    expect(res.status).toBe(400);
  });

  it('returns 404 when plan not found', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get('/api/tasks?plan_id=999')
      .set('Cookie', authCookie());

    expect(res.status).toBe(404);
  });

  it('returns tasks for valid plan', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 1, title: 'Plan A' }] })
      .mockResolvedValueOnce({
        rows: [
          { id: 1, title: 'Task 1', status: 'pending', subtasks: [] },
          { id: 2, title: 'Task 2', status: 'completed', subtasks: [] },
        ],
      });

    const res = await request(app)
      .get('/api/tasks?plan_id=1')
      .set('Cookie', authCookie());

    expect(res.status).toBe(200);
    expect(res.body.tasks).toHaveLength(2);
  });
});

describe('POST /api/tasks', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 400 when planId or title is missing', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Cookie', authCookie())
      .send({ title: 'Task A' });

    expect(res.status).toBe(400);
  });

  it('creates a task and returns 201', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 1 }] })
      .mockResolvedValueOnce({
        rows: [{ id: 2, title: 'New Task', status: 'pending', plan_id: 1 }],
      });

    const res = await request(app)
      .post('/api/tasks')
      .set('Cookie', authCookie())
      .send({ planId: 1, title: 'New Task' });

    expect(res.status).toBe(201);
    expect(res.body.task.title).toBe('New Task');
  });
});

describe('PUT /api/tasks/:id', () => {
  beforeEach(() => jest.clearAllMocks());

  it('updates task and returns 200', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 1, title: 'Updated Task', status: 'completed' }],
    });

    const res = await request(app)
      .put('/api/tasks/1')
      .set('Cookie', authCookie())
      .send({ title: 'Updated Task', status: 'completed' });

    expect(res.status).toBe(200);
  });

  it('returns 404 when task not found', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .put('/api/tasks/999')
      .set('Cookie', authCookie())
      .send({ title: 'Updated' });

    expect(res.status).toBe(404);
  });
});

describe('POST /api/tasks/reorder', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 400 when orderedIds is missing', async () => {
    const res = await request(app)
      .post('/api/tasks/reorder')
      .set('Cookie', authCookie())
      .send({});

    expect(res.status).toBe(400);
  });

  it('reorders tasks and returns 200', async () => {
    pool.query.mockResolvedValueOnce({});

    const res = await request(app)
      .post('/api/tasks/reorder')
      .set('Cookie', authCookie())
      .send({ orderedIds: [3, 1, 2] });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Tasks reordered');
  });
});

describe('DELETE /api/tasks/:id', () => {
  beforeEach(() => jest.clearAllMocks());

  it('deletes task and returns 200', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });

    const res = await request(app)
      .delete('/api/tasks/1')
      .set('Cookie', authCookie());

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Task deleted');
  });

  it('returns 404 when task not found', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .delete('/api/tasks/999')
      .set('Cookie', authCookie());

    expect(res.status).toBe(404);
  });
});