const express = require('express');
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

// GET /api/dashboard — summary stats + chart data
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;

    // Active / completed / total plans
    const plansResult = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'active')    AS active_plans,
         COUNT(*) FILTER (WHERE status = 'completed') AS completed_plans,
         COUNT(*) FILTER (WHERE status = 'archived')  AS archived_plans,
         COUNT(*)                                      AS total_plans
       FROM plans WHERE user_id = $1`,
      [userId]
    );

    // Upcoming deadlines (next 7 days, active only, excludes overdue)
    const upcomingResult = await pool.query(
      `SELECT id, title, deadline, priority, status
       FROM plans
       WHERE user_id = $1
         AND status = 'active'
         AND deadline IS NOT NULL
         AND deadline >= NOW()
         AND deadline <= NOW() + INTERVAL '7 days'
       ORDER BY deadline ASC
       LIMIT 10`,
      [userId]
    );

    // Overdue plans
    const overdueResult = await pool.query(
      `SELECT id, title, deadline, priority
       FROM plans
       WHERE user_id = $1
         AND status = 'active'
         AND deadline IS NOT NULL
         AND deadline < NOW()
       ORDER BY deadline ASC`,
      [userId]
    );

    // Task completion stats
    const tasksResult = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'completed')  AS completed_tasks,
         COUNT(*) FILTER (WHERE status = 'pending')    AS pending_tasks,
         COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress_tasks,
         COUNT(*)                                       AS total_tasks
       FROM tasks WHERE user_id = $1`,
      [userId]
    );

    // Upcoming reminders
    const remindersResult = await pool.query(
      `SELECT r.id, r.remind_at, r.message, p.title AS plan_title
       FROM reminders r
       LEFT JOIN plans p ON r.plan_id = p.id
       WHERE r.user_id = $1 AND r.is_sent = FALSE AND r.remind_at > NOW()
       ORDER BY r.remind_at ASC
       LIMIT 5`,
      [userId]
    );

    // Weekly task-completion trend: tasks completed per day for the past 7 days
    const weeklyResult = await pool.query(
      `SELECT
         TO_CHAR(DATE(updated_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS date,
         COUNT(*) AS completed
       FROM tasks
       WHERE user_id = $1
         AND status = 'completed'
         AND updated_at >= NOW() - INTERVAL '7 days'
       GROUP BY DATE(updated_at AT TIME ZONE 'UTC')
       ORDER BY date ASC`,
      [userId]
    );

    // Build a full 7-day array (fill zeros for missing days)
    const weeklyMap = {};
    for (const row of weeklyResult.rows) {
      weeklyMap[row.date] = parseInt(row.completed, 10);
    }
    const weeklyTrend = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      weeklyTrend.push({ date: key, completed: weeklyMap[key] || 0 });
    }

    res.json({
      summary: plansResult.rows[0],
      taskStats: tasksResult.rows[0],
      upcomingDeadlines: upcomingResult.rows,
      overduePlans: overdueResult.rows,
      upcomingReminders: remindersResult.rows,
      weeklyTrend,
    });
  } catch (err) {
    console.error('Dashboard error:', err.message);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

module.exports = router;
