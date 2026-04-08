const express = require('express');
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

// GET /api/subtasks?task_id=:id — list subtasks for a task
router.get('/', async (req, res) => {
  const { task_id } = req.query;

  if (!task_id) {
    return res.status(400).json({ error: 'task_id is required' });
  }

  try {
    // Verify the parent task belongs to the user
    const taskCheck = await pool.query(
      'SELECT id FROM tasks WHERE id = $1 AND user_id = $2',
      [task_id, req.user.id]
    );
    if (taskCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const result = await pool.query(
      'SELECT * FROM subtasks WHERE task_id = $1 ORDER BY sort_order ASC, created_at ASC',
      [task_id]
    );
    res.json({ subtasks: result.rows });
  } catch (err) {
    console.error('Get subtasks error:', err.message);
    res.status(500).json({ error: 'Failed to fetch subtasks' });
  }
});

// POST /api/subtasks — create a subtask
router.post('/', async (req, res) => {
  const { taskId, title } = req.body;

  if (!taskId || !title) {
    return res.status(400).json({ error: 'taskId and title are required' });
  }

  try {
    const taskCheck = await pool.query(
      'SELECT id FROM tasks WHERE id = $1 AND user_id = $2',
      [taskId, req.user.id]
    );
    if (taskCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const result = await pool.query(
      `INSERT INTO subtasks (task_id, user_id, title)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [taskId, req.user.id, title.trim()]
    );
    res.status(201).json({ subtask: result.rows[0] });
  } catch (err) {
    console.error('Create subtask error:', err.message);
    res.status(500).json({ error: 'Failed to create subtask' });
  }
});

// PUT /api/subtasks/:id — update a subtask (toggle complete, rename, reorder)
router.put('/:id', async (req, res) => {
  const { title, isCompleted, sortOrder } = req.body;

  try {
    const result = await pool.query(
      `UPDATE subtasks
       SET title        = COALESCE($1, title),
           is_completed = COALESCE($2, is_completed),
           sort_order   = COALESCE($3, sort_order),
           updated_at   = NOW()
       WHERE id = $4 AND user_id = $5
       RETURNING *`,
      [title?.trim(), isCompleted, sortOrder, req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Subtask not found' });
    }
    res.json({ subtask: result.rows[0] });
  } catch (err) {
    console.error('Update subtask error:', err.message);
    res.status(500).json({ error: 'Failed to update subtask' });
  }
});

// DELETE /api/subtasks/:id — delete a subtask
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM subtasks WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Subtask not found' });
    }
    res.json({ message: 'Subtask deleted' });
  } catch (err) {
    console.error('Delete subtask error:', err.message);
    res.status(500).json({ error: 'Failed to delete subtask' });
  }
});

module.exports = router;
