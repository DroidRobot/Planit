const express = require('express');
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

// GET /api/tasks?plan_id=:planId — list tasks for a plan
router.get('/', async (req, res) => {
  const { plan_id } = req.query;

  if (!plan_id) {
    return res.status(400).json({ error: 'plan_id is required' });
  }

  try {
    // Allow plan owner or collaborator to read tasks
    const planCheck = await pool.query(
      `SELECT p.id FROM plans p
       LEFT JOIN plan_collaborators pc ON pc.plan_id = p.id AND pc.user_id = $2
       WHERE p.id = $1 AND (p.user_id = $2 OR pc.user_id = $2)`,
      [plan_id, req.user.id]
    );
    if (planCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    const result = await pool.query(
      `SELECT t.*,
              COALESCE(
                json_agg(
                  jsonb_build_object(
                    'id', s.id, 'title', s.title,
                    'is_completed', s.is_completed, 'sort_order', s.sort_order
                  ) ORDER BY s.sort_order ASC, s.created_at ASC
                ) FILTER (WHERE s.id IS NOT NULL),
                '[]'
              ) AS subtasks
       FROM tasks t
       LEFT JOIN subtasks s ON s.task_id = t.id
       WHERE t.plan_id = $1
       GROUP BY t.id
       ORDER BY t.sort_order ASC, t.created_at ASC`,
      [plan_id]
    );

    res.json({ tasks: result.rows });
  } catch (err) {
    console.error('Get tasks error:', err.message);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// POST /api/tasks — create a task
router.post('/', async (req, res) => {
  const { planId, title, description, deadline } = req.body;

  if (!planId || !title) {
    return res.status(400).json({ error: 'planId and title are required' });
  }

  try {
    // Allow owner or editor to create tasks
    const planCheck = await pool.query(
      `SELECT p.id FROM plans p
       LEFT JOIN plan_collaborators pc ON pc.plan_id = p.id AND pc.user_id = $2
       WHERE p.id = $1 AND (p.user_id = $2 OR (pc.user_id = $2 AND pc.role = 'editor'))`,
      [planId, req.user.id]
    );
    if (planCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Plan not found or not authorized' });
    }

    const result = await pool.query(
      `INSERT INTO tasks (plan_id, user_id, title, description, deadline)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [planId, req.user.id, title, description || null, deadline || null]
    );

    res.status(201).json({ task: { ...result.rows[0], subtasks: [] } });
  } catch (err) {
    console.error('Create task error:', err.message);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// PUT /api/tasks/:id — update a task
router.put('/:id', async (req, res) => {
  const { title, description, deadline, status, sortOrder } = req.body;

  try {
    const result = await pool.query(
      `UPDATE tasks
       SET title      = COALESCE($1, title),
           description = COALESCE($2, description),
           deadline   = COALESCE($3, deadline),
           status     = COALESCE($4, status),
           sort_order = COALESCE($5, sort_order),
           updated_at = NOW()
       WHERE id = $6 AND user_id = $7
       RETURNING *`,
      [title, description, deadline, status, sortOrder, req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ task: result.rows[0] });
  } catch (err) {
    console.error('Update task error:', err.message);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// POST /api/tasks/reorder — bulk update sort_order for drag-and-drop
router.post('/reorder', async (req, res) => {
  const { orderedIds } = req.body; // array of task IDs in new order

  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    return res.status(400).json({ error: 'orderedIds array is required' });
  }

  try {
    // Build a single UPDATE ... FROM VALUES statement
    const values = orderedIds.map((id, idx) => `(${parseInt(id, 10)}, ${idx})`).join(', ');
    await pool.query(
      `UPDATE tasks AS t
       SET sort_order = v.sort_order, updated_at = NOW()
       FROM (VALUES ${values}) AS v(id, sort_order)
       WHERE t.id = v.id AND t.user_id = $1`,
      [req.user.id]
    );
    res.json({ message: 'Tasks reordered' });
  } catch (err) {
    console.error('Reorder tasks error:', err.message);
    res.status(500).json({ error: 'Failed to reorder tasks' });
  }
});

// DELETE /api/tasks/:id — delete a task
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM tasks WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ message: 'Task deleted' });
  } catch (err) {
    console.error('Delete task error:', err.message);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

module.exports = router;
