const request = require('supertest');
const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

jest.mock('../config/db', () => ({
  query: jest.fn(),
}));

const pool = require('../config/db');

process.env.JWT_SECRET = 'test-secret';

const authRoutes = require('../routes/auth');
const planRoutes = require('../routes/plans');
const taskRoutes = require('../routes/tasks');

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/auth', authRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/tasks', taskRoutes);

function authCookie() {
  const token = jwt.sign({ userId: 1, email: 'test@example.com' }, 'test-secret');
  return `token=${token}`;
}

describe('Integration: User workflow - signup, create plan, add tasks', () => {
  beforeEach(() => jest.clearAllMocks());

  it('complete workflow: signup -> create plan -> add task -> mark complete', async () => {
    // Step 1: User signup
    pool.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{ id: 1, email: 'test@example.com', full_name: 'Test User', phone_number: null }],
      });

    const signupRes = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'test@example.com', password: 'password123', fullName: 'Test User' });

    expect(signupRes.status).toBe(201);
    expect(signupRes.body.user.email).toBe('test@example.com');

    // Step 2: Create a plan
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 10, title: 'My New Plan', user_id: 1, status: 'active', priority: 'medium' }],
    });

    const planRes = await request(app)
      .post('/api/plans')
      .set('Cookie', authCookie())
      .send({ title: 'My New Plan', description: 'A test plan', priority: 'high' });

    expect(planRes.status).toBe(201);
    expect(planRes.body.plan.title).toBe('My New Plan');

    // Step 3: Add a task to the plan
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 10 }] })
      .mockResolvedValueOnce({
        rows: [{ id: 20, title: 'Task 1', status: 'pending', plan_id: 10 }],
      });

    const taskRes = await request(app)
      .post('/api/tasks')
      .set('Cookie', authCookie())
      .send({ planId: 10, title: 'Task 1' });

    expect(taskRes.status).toBe(201);
    expect(taskRes.body.task.title).toBe('Task 1');

    // Step 4: Mark task as completed
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 20, title: 'Task 1', status: 'completed' }],
    });

    const updateRes = await request(app)
      .put('/api/tasks/20')
      .set('Cookie', authCookie())
      .send({ status: 'completed' });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.task.status).toBe('completed');
  });

  it('complete workflow: login -> list plans -> delete plan -> verify deletion', async () => {
    // Step 1: User login
    const hash = await bcrypt.hash('password123', 10);
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 1, email: 'test@example.com', full_name: 'Test User', password_hash: hash, phone_number: null }],
    });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password123' });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.user.email).toBe('test@example.com');

    // Step 2: List user's plans
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 10, title: 'My New Plan', tags: [] }],
    });

    const listRes = await request(app)
      .get('/api/plans')
      .set('Cookie', authCookie());

    expect(listRes.status).toBe(200);
    expect(listRes.body.plans).toHaveLength(1);

    // Step 3: Delete the plan
    pool.query.mockResolvedValueOnce({ rows: [{ id: 10 }] });

    const deleteRes = await request(app)
      .delete('/api/plans/10')
      .set('Cookie', authCookie());

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.message).toBe('Plan deleted');
  });

  it('workflow: create multiple tasks and reorder them', async () => {
    // Create a plan first
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 10, title: 'Plan A', user_id: 1, status: 'active', priority: 'medium' }],
    });

    await request(app)
      .post('/api/plans')
      .set('Cookie', authCookie())
      .send({ title: 'Plan A' });

    // Add 3 tasks
    for (let i = 1; i <= 3; i++) {
      pool.query
        .mockResolvedValueOnce({ rows: [{ id: 10 }] })
        .mockResolvedValueOnce({
          rows: [{ id: 10 + i, title: `Task ${i}`, status: 'pending', plan_id: 10 }],
        });

      const taskRes = await request(app)
        .post('/api/tasks')
        .set('Cookie', authCookie())
        .send({ planId: 10, title: `Task ${i}` });

      expect(taskRes.status).toBe(201);
    }

    // Reorder tasks: [3, 1, 2]
    pool.query.mockResolvedValueOnce({});

    const reorderRes = await request(app)
      .post('/api/tasks/reorder')
      .set('Cookie', authCookie())
      .send({ orderedIds: [13, 11, 12] });

    expect(reorderRes.status).toBe(200);
    expect(reorderRes.body.message).toBe('Tasks reordered');
  });
});
// Ahmad Harb - PR #47 integration tests
