const express = require('express');
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

// dashboard endpoint - returns all the stuff the dashboard page needs
// used to do 6 separate queries one after another which was kinda slow
// now it's 3 queries that run at the same time with Promise.all
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;

    // grab plan stuff in one query: counts, upcoming deadlines, overdue ones
    // using CTEs so we only hit the plans table once
    const plansQuery = pool.query(
      `WITH summary AS (
         SELECT
           COUNT(*) FILTER (WHERE status = 'active')    AS active_plans,
           COUNT(*) FILTER (WHERE status = 'completed') AS completed_plans,
           COUNT(*) FILTER (WHERE status = 'archived')  AS archived_plans,
           COUNT(*)                                     AS total_plans
         FROM plans
         WHERE user_id = $1
       ),
       upcoming AS (
         SELECT id, title, deadline, priority, status
         FROM plans
         WHERE user_id = $1
           AND status = 'active'
           AND deadline IS NOT NULL
           AND deadline >= NOW()
           AND deadline <= NOW() + INTERVAL '7 days'
         ORDER BY deadline ASC
         LIMIT 10
       ),
       overdue AS (
         SELECT id, title, deadline, priority
         FROM plans
         WHERE user_id = $1
           AND status = 'active'
           AND deadline IS NOT NULL
           AND deadline < NOW()
         ORDER BY deadline ASC
       )
       SELECT
         (SELECT row_to_json(s)        FROM summary  s)                          AS summary,
         COALESCE((SELECT json_agg(row_to_json(u)) FROM upcoming u), '[]'::json) AS upcoming,
         COALESCE((SELECT json_agg(row_to_json(o)) FROM overdue  o), '[]'::json) AS overdue`,
      [userId]
    );

    // same idea for tasks - status counts + the past week trend in one query
    const tasksQuery = pool.query(
      `WITH stats AS (
         SELECT
           COUNT(*) FILTER (WHERE status = 'completed')   AS completed_tasks,
           COUNT(*) FILTER (WHERE status = 'pending')     AS pending_tasks,
           COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress_tasks,
           COUNT(*)                                       AS total_tasks
         FROM tasks
         WHERE user_id = $1
       ),
       weekly AS (
         SELECT
           TO_CHAR(DATE(updated_at), 'YYYY-MM-DD') AS date,
           COUNT(*) AS completed
         FROM tasks
         WHERE user_id = $1
           AND status = 'completed'
           AND updated_at >= NOW() - INTERVAL '7 days'
         GROUP BY DATE(updated_at)
         ORDER BY date ASC
       )
       SELECT
         (SELECT row_to_json(s)        FROM stats  s)                          AS stats,
         COALESCE((SELECT json_agg(row_to_json(w)) FROM weekly w), '[]'::json) AS weekly`,
      [userId]
    );

    // reminders is a different table so leaving it as its own query
    const remindersQuery = pool.query(
      `SELECT r.id, r.remind_at, r.message, p.title AS plan_title
       FROM reminders r
       LEFT JOIN plans p ON r.plan_id = p.id
       WHERE r.user_id = $1 AND r.is_sent = FALSE AND r.remind_at > NOW()
       ORDER BY r.remind_at ASC
       LIMIT 5`,
      [userId]
    );

    const [plansResult, tasksResult, remindersResult] = await Promise.all([
      plansQuery,
      tasksQuery,
      remindersQuery,
    ]);

    const plansRow = plansResult.rows[0] || {};
    const tasksRow = tasksResult.rows[0] || {};

    // fill in missing days with 0 so the chart always shows 7 bars
    const weeklyRows = tasksRow.weekly || [];
    const weeklyMap = {};
    for (const row of weeklyRows) {
      weeklyMap[row.date] = parseInt(row.completed, 10);
    }
    const weeklyTrend = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      weeklyTrend.push({ date: key, completed: weeklyMap[key] || 0 });
    }

    res.json({
      summary: plansRow.summary || {
        active_plans: '0',
        completed_plans: '0',
        archived_plans: '0',
        total_plans: '0',
      },
      taskStats: tasksRow.stats || {
        completed_tasks: '0',
        pending_tasks: '0',
        in_progress_tasks: '0',
        total_tasks: '0',
      },
      upcomingDeadlines: plansRow.upcoming || [],
      overduePlans: plansRow.overdue || [],
      upcomingReminders: remindersResult.rows,
      weeklyTrend,
    });
  } catch (err) {
    console.error('Dashboard error:', err.message);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

module.exports = router;
