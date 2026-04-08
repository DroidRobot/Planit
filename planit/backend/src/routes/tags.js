const express = require('express');
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

// GET /api/tags — list all tags for the current user
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM tags WHERE user_id = $1 ORDER BY name ASC',
      [req.user.id]
    );
    res.json({ tags: result.rows });
  } catch (err) {
    console.error('Get tags error:', err.message);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
});

// POST /api/tags — create a tag
router.post('/', async (req, res) => {
  const { name, color } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Tag name is required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO tags (user_id, name, color)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, name) DO UPDATE SET color = EXCLUDED.color
       RETURNING *`,
      [req.user.id, name.trim(), color || '#4f46e5']
    );
    res.status(201).json({ tag: result.rows[0] });
  } catch (err) {
    console.error('Create tag error:', err.message);
    res.status(500).json({ error: 'Failed to create tag' });
  }
});

// PUT /api/tags/:id — update a tag
router.put('/:id', async (req, res) => {
  const { name, color } = req.body;
  try {
    const result = await pool.query(
      `UPDATE tags
       SET name  = COALESCE($1, name),
           color = COALESCE($2, color)
       WHERE id = $3 AND user_id = $4
       RETURNING *`,
      [name?.trim(), color, req.params.id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tag not found' });
    }
    res.json({ tag: result.rows[0] });
  } catch (err) {
    console.error('Update tag error:', err.message);
    res.status(500).json({ error: 'Failed to update tag' });
  }
});

// DELETE /api/tags/:id — delete a tag
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM tags WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tag not found' });
    }
    res.json({ message: 'Tag deleted' });
  } catch (err) {
    console.error('Delete tag error:', err.message);
    res.status(500).json({ error: 'Failed to delete tag' });
  }
});

// POST /api/tags/plans/:planId — add a tag to a plan
router.post('/plans/:planId', async (req, res) => {
  const { tagId } = req.body;
  if (!tagId) {
    return res.status(400).json({ error: 'tagId is required' });
  }

  try {
    // Verify plan ownership
    const planCheck = await pool.query(
      'SELECT id FROM plans WHERE id = $1 AND user_id = $2',
      [req.params.planId, req.user.id]
    );
    if (planCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    // Verify tag ownership
    const tagCheck = await pool.query(
      'SELECT id FROM tags WHERE id = $1 AND user_id = $2',
      [tagId, req.user.id]
    );
    if (tagCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    await pool.query(
      'INSERT INTO plan_tags (plan_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.params.planId, tagId]
    );
    res.status(201).json({ message: 'Tag added to plan' });
  } catch (err) {
    console.error('Add plan tag error:', err.message);
    res.status(500).json({ error: 'Failed to add tag to plan' });
  }
});

// DELETE /api/tags/plans/:planId/:tagId — remove a tag from a plan
router.delete('/plans/:planId/:tagId', async (req, res) => {
  try {
    const planCheck = await pool.query(
      'SELECT id FROM plans WHERE id = $1 AND user_id = $2',
      [req.params.planId, req.user.id]
    );
    if (planCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    await pool.query(
      'DELETE FROM plan_tags WHERE plan_id = $1 AND tag_id = $2',
      [req.params.planId, req.params.tagId]
    );
    res.json({ message: 'Tag removed from plan' });
  } catch (err) {
    console.error('Remove plan tag error:', err.message);
    res.status(500).json({ error: 'Failed to remove tag from plan' });
  }
});

module.exports = router;
