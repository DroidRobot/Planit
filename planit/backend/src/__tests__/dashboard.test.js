const request = require('supertest');
const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');

jest.mock('../config/db', () => ({
  query: jest.fn(),
}));

const pool = require('../config/db');
const dashboardRoutes = require('../routes/dashboard');

process.env.JWT_SECRET = 'test-secret';

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/dashboard', dashboardRoutes);

function authCookie() {
  const token = jwt.sign({ userId: 1, email: 'a@b.com' }, 'test-secret');
  return `token=${token}`;
}

// helper to mock the 3 queries the dashboard does now
// order matters: plans stuff, then tasks stuff, then reminders
function mockDashboard({ summary, upcoming = [], overdue = [], stats, weekly = [], reminders = [] }) {
  pool.query
    .mockResolvedValueOnce({ rows: [{ summary, upcoming, overdue }] })
    .mockResolvedValueOnce({ rows: [{ stats, weekly }] })
    .mockResolvedValueOnce({ rows: reminders });
}

describe('GET /api/dashboard', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/dashboard');
    expect(res.status).toBe(401);
  });

  it('returns dashboard data for authenticated user', async () => {
    mockDashboard({
      summary: { active_plans: '2', completed_plans: '1', archived_plans: '0', total_plans: '3' },
      stats: { completed_tasks: '5', pending_tasks: '3', in_progress_tasks: '1', total_tasks: '9' },
    });

    const res = await request(app)
      .get('/api/dashboard')
      .set('Cookie', authCookie());

    expect(res.status).toBe(200);
    expect(res.body.summary.active_plans).toBe('2');
    expect(res.body.taskStats.completed_tasks).toBe('5');
  });

  it('includes upcoming deadlines in response', async () => {
    mockDashboard({
      summary: { active_plans: '1', completed_plans: '0', archived_plans: '0', total_plans: '1' },
      upcoming: [{ id: 1, title: 'Test Plan', deadline: '2026-04-25T12:00:00Z', priority: 'high' }],
      stats: { completed_tasks: '0', pending_tasks: '1', in_progress_tasks: '0', total_tasks: '1' },
    });

    const res = await request(app)
      .get('/api/dashboard')
      .set('Cookie', authCookie());

    expect(res.status).toBe(200);
    expect(res.body.upcomingDeadlines).toHaveLength(1);
    expect(res.body.upcomingDeadlines[0].title).toBe('Test Plan');
  });

  it('includes overdue plans in response', async () => {
    mockDashboard({
      summary: { active_plans: '1', completed_plans: '0', archived_plans: '0', total_plans: '1' },
      overdue: [{ id: 2, title: 'Overdue Plan', deadline: '2026-01-01T12:00:00Z', priority: 'high' }],
      stats: { completed_tasks: '0', pending_tasks: '1', in_progress_tasks: '0', total_tasks: '1' },
    });

    const res = await request(app)
      .get('/api/dashboard')
      .set('Cookie', authCookie());

    expect(res.status).toBe(200);
    expect(res.body.overduePlans).toHaveLength(1);
    expect(res.body.overduePlans[0].title).toBe('Overdue Plan');
  });

  it('issues exactly 3 database queries (down from 6)', async () => {
    mockDashboard({
      summary: { active_plans: '0', completed_plans: '0', archived_plans: '0', total_plans: '0' },
      stats: { completed_tasks: '0', pending_tasks: '0', in_progress_tasks: '0', total_tasks: '0' },
    });

    const res = await request(app)
      .get('/api/dashboard')
      .set('Cookie', authCookie());

    expect(res.status).toBe(200);
    expect(pool.query).toHaveBeenCalledTimes(3);
  });
});
