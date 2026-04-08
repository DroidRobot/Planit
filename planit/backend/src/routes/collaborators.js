const express = require('express');
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

// GET /api/collaborators/:planId — list collaborators for a plan
router.get('/:planId', async (req, res) => {
  try {
    const planCheck = await pool.query(
      'SELECT id FROM plans WHERE id = $1 AND user_id = $2',
      [req.params.planId, req.user.id]
    );
    if (planCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Plan not found or not authorized' });
    }

    const result = await pool.query(
      `SELECT u.id, u.email, u.full_name, u.avatar_url, pc.role, pc.created_at
       FROM plan_collaborators pc
       JOIN users u ON pc.user_id = u.id
       WHERE pc.plan_id = $1
       ORDER BY pc.created_at ASC`,
      [req.params.planId]
    );
    res.json({ collaborators: result.rows });
  } catch (err) {
    console.error('Get collaborators error:', err.message);
    res.status(500).json({ error: 'Failed to fetch collaborators' });
  }
});

// POST /api/collaborators/:planId — invite a user by email
router.post('/:planId', async (req, res) => {
  const { email, role } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'email is required' });
  }

  const validRole = ['viewer', 'editor'].includes(role) ? role : 'viewer';

  try {
    // Verify the current user owns the plan
    const planCheck = await pool.query(
      'SELECT id FROM plans WHERE id = $1 AND user_id = $2',
      [req.params.planId, req.user.id]
    );
    if (planCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Plan not found or not authorized' });
    }

    // Find the invited user
    const invitedUser = await pool.query(
      'SELECT id, email, full_name FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );
    if (invitedUser.rows.length === 0) {
      return res.status(404).json({ error: 'No account found for that email address' });
    }

    const invitedId = invitedUser.rows[0].id;

    // Cannot invite yourself
    if (invitedId === req.user.id) {
      return res.status(400).json({ error: 'You cannot invite yourself' });
    }

    await pool.query(
      `INSERT INTO plan_collaborators (plan_id, user_id, role, invited_by)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (plan_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
      [req.params.planId, invitedId, validRole, req.user.id]
    );

    res.status(201).json({
      message: `${invitedUser.rows[0].full_name} added as ${validRole}`,
      collaborator: { ...invitedUser.rows[0], role: validRole },
    });
  } catch (err) {
    console.error('Add collaborator error:', err.message);
    res.status(500).json({ error: 'Failed to add collaborator' });
  }
});

// DELETE /api/collaborators/:planId/:userId — remove a collaborator
router.delete('/:planId/:userId', async (req, res) => {
  try {
    // Must be the plan owner to remove others
    const planCheck = await pool.query(
      'SELECT id FROM plans WHERE id = $1 AND user_id = $2',
      [req.params.planId, req.user.id]
    );
    if (planCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Plan not found or not authorized' });
    }

    await pool.query(
      'DELETE FROM plan_collaborators WHERE plan_id = $1 AND user_id = $2',
      [req.params.planId, req.params.userId]
    );
    res.json({ message: 'Collaborator removed' });
  } catch (err) {
    console.error('Remove collaborator error:', err.message);
    res.status(500).json({ error: 'Failed to remove collaborator' });
  }
});

module.exports = router;
