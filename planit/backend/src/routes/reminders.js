const express = require('express');
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

// GET /api/reminders — list upcoming reminders for the current user
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.*, p.title AS plan_title, t.title AS task_title
       FROM reminders r
       LEFT JOIN plans p ON r.plan_id = p.id
       LEFT JOIN tasks t ON r.task_id = t.id
       WHERE r.user_id = $1 AND r.is_sent = FALSE
       ORDER BY r.remind_at ASC`,
      [req.user.id]
    );

    res.json({ reminders: result.rows });
  } catch (err) {
    console.error('Get reminders error:', err.message);
    res.status(500).json({ error: 'Failed to fetch reminders' });
  }
});

// POST /api/reminders — create a reminder
router.post('/', async (req, res) => {
  const { planId, taskId, remindAt, message } = req.body;

  if (!remindAt || !message) {
    return res.status(400).json({ error: 'remindAt and message are required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO reminders (user_id, plan_id, task_id, remind_at, message)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [req.user.id, planId || null, taskId || null, remindAt, message]
    );

    res.status(201).json({ reminder: result.rows[0] });
  } catch (err) {
    console.error('Create reminder error:', err.message);
    res.status(500).json({ error: 'Failed to create reminder' });
  }
});

// DELETE /api/reminders/:id — delete a reminder
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM reminders WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Reminder not found' });
    }

    res.json({ message: 'Reminder deleted' });
  } catch (err) {
    console.error('Delete reminder error:', err.message);
    res.status(500).json({ error: 'Failed to delete reminder' });
  }
});

module.exports = router;
