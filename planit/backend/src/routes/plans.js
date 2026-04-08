const express = require('express');
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

// Helper: check if a user can access a plan (owner or collaborator)
async function canAccessPlan(planId, userId) {
  const result = await pool.query(
    `SELECT p.id, p.user_id,
            CASE WHEN p.user_id = $2 THEN 'owner'
                 ELSE pc.role END AS access_role
     FROM plans p
     LEFT JOIN plan_collaborators pc ON pc.plan_id = p.id AND pc.user_id = $2
     WHERE p.id = $1 AND (p.user_id = $2 OR pc.user_id = $2)`,
    [planId, userId]
  );
  return result.rows[0] || null;
}

// GET /api/plans — list plans (owned + shared), with optional filtering/search/sort
router.get('/', async (req, res) => {
  const { status, search, sort } = req.query;

  // Build dynamic WHERE clause
  const conditions = ['(p.user_id = $1 OR pc.user_id = $1)'];
  const params = [req.user.id];

  if (status && status !== 'all') {
    params.push(status);
    conditions.push(`p.status = $${params.length}`);
  }

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(p.title ILIKE $${params.length} OR p.description ILIKE $${params.length})`);
  }

  const sortClause = sort === 'priority'
    ? `CASE p.priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END ASC`
    : sort === 'created_at'
    ? 'p.created_at DESC'
    : 'p.deadline ASC NULLS LAST, p.created_at DESC';

  try {
    const result = await pool.query(
      `SELECT DISTINCT p.*,
          p.user_id = $1 AS is_owner,
          COALESCE(pc_self.role, 'owner') AS access_role,
          COUNT(t.id) FILTER (WHERE t.status = 'completed') AS completed_tasks,
          COUNT(t.id) AS total_tasks,
          COALESCE(
            json_agg(DISTINCT jsonb_build_object('id', tg.id, 'name', tg.name, 'color', tg.color))
            FILTER (WHERE tg.id IS NOT NULL),
            '[]'
          ) AS tags
       FROM plans p
       LEFT JOIN plan_collaborators pc   ON pc.plan_id = p.id AND pc.user_id = $1
       LEFT JOIN plan_collaborators pc_self ON pc_self.plan_id = p.id AND pc_self.user_id = $1
       LEFT JOIN tasks t                 ON t.plan_id = p.id
       LEFT JOIN plan_tags pt            ON pt.plan_id = p.id
       LEFT JOIN tags tg                 ON tg.id = pt.tag_id
       WHERE ${conditions.join(' AND ')}
       GROUP BY p.id, pc_self.role
       ORDER BY ${sortClause}`,
      params
    );
    res.json({ plans: result.rows });
  } catch (err) {
    console.error('Get plans error:', err.message);
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
});

// GET /api/plans/:id — get a single plan with its tasks and tags
router.get('/:id', async (req, res) => {
  try {
    const access = await canAccessPlan(req.params.id, req.user.id);
    if (!access) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    const planResult = await pool.query(
      `SELECT p.*,
              COALESCE(
                json_agg(DISTINCT jsonb_build_object('id', tg.id, 'name', tg.name, 'color', tg.color))
                FILTER (WHERE tg.id IS NOT NULL),
                '[]'
              ) AS tags
       FROM plans p
       LEFT JOIN plan_tags pt ON pt.plan_id = p.id
       LEFT JOIN tags tg      ON tg.id = pt.tag_id
       WHERE p.id = $1
       GROUP BY p.id`,
      [req.params.id]
    );

    const tasksResult = await pool.query(
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
      [req.params.id]
    );

    res.json({
      plan: planResult.rows[0],
      tasks: tasksResult.rows,
      accessRole: access.access_role,
    });
  } catch (err) {
    console.error('Get plan error:', err.message);
    res.status(500).json({ error: 'Failed to fetch plan' });
  }
});

// POST /api/plans — create a new plan
router.post('/', async (req, res) => {
  const { title, description, deadline, priority } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO plans (user_id, title, description, deadline, priority)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [req.user.id, title, description || null, deadline || null, priority || 'medium']
    );

    res.status(201).json({ plan: { ...result.rows[0], tags: [] } });
  } catch (err) {
    console.error('Create plan error:', err.message);
    res.status(500).json({ error: 'Failed to create plan' });
  }
});

// PUT /api/plans/:id — update a plan (owner or editor only)
router.put('/:id', async (req, res) => {
  const { title, description, deadline, priority, status } = req.body;

  try {
    const access = await canAccessPlan(req.params.id, req.user.id);
    if (!access || access.access_role === 'viewer') {
      return res.status(403).json({ error: 'Not authorized to edit this plan' });
    }

    const result = await pool.query(
      `UPDATE plans
       SET title       = COALESCE($1, title),
           description = COALESCE($2, description),
           deadline    = COALESCE($3, deadline),
           priority    = COALESCE($4, priority),
           status      = COALESCE($5, status),
           updated_at  = NOW()
       WHERE id = $6
       RETURNING *`,
      [title, description, deadline, priority, status, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    res.json({ plan: result.rows[0] });
  } catch (err) {
    console.error('Update plan error:', err.message);
    res.status(500).json({ error: 'Failed to update plan' });
  }
});

// DELETE /api/plans/:id — delete a plan (owner only)
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM plans WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    res.json({ message: 'Plan deleted' });
  } catch (err) {
    console.error('Delete plan error:', err.message);
    res.status(500).json({ error: 'Failed to delete plan' });
  }
});

module.exports = router;
