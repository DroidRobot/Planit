import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getPlans, createPlan, updatePlan, deletePlan, getTags, createTag, deleteTag, addTagToPlan, removeTagFromPlan } from '../services/api';
import PlanModal from '../components/PlanModal';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
];

const SORT_OPTIONS = [
  { value: 'deadline', label: 'Deadline' },
  { value: 'priority', label: 'Priority' },
  { value: 'created_at', label: 'Date Created' },
];

function Plans() {
  const [plans, setPlans] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);

  // Filter / sort / search state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sort, setSort] = useState('deadline');

  // Tag management
  const [showTagManager, setShowTagManager] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#4f46e5');

  const fetchAll = useCallback(() => {
    const params = {};
    if (statusFilter !== 'all') params.status = statusFilter;
    if (search.trim()) params.search = search.trim();
    if (sort) params.sort = sort;

    Promise.all([getPlans(params), getTags()])
      .then(([planRes, tagRes]) => {
        setPlans(planRes.data.plans);
        setAllTags(tagRes.data.tags);
      })
      .catch((err) => setError(err.response?.data?.error || 'Failed to load plans'))
      .finally(() => setLoading(false));
  }, [statusFilter, search, sort]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Keyboard shortcut: 'n' to open new plan modal
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'n' && !e.target.matches('input, textarea, select')) {
        setShowModal(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const syncTags = async (planId, tagIds, existingTagIds = []) => {
    const toAdd = tagIds.filter((id) => !existingTagIds.includes(id));
    const toRemove = existingTagIds.filter((id) => !tagIds.includes(id));
    await Promise.all([
      ...toAdd.map((tagId) => addTagToPlan(planId, tagId)),
      ...toRemove.map((tagId) => removeTagFromPlan(planId, tagId)),
    ]);
  };

  const handleCreate = async (data) => {
    try {
      const { tagIds, ...planData } = data;
      const res = await createPlan(planData);
      if (tagIds && tagIds.length > 0) {
        await syncTags(res.data.plan.id, tagIds);
      }
      setShowModal(false);
      fetchAll();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create plan');
    }
  };

  const handleEdit = async (data) => {
    try {
      const { tagIds, ...planData } = data;
      await updatePlan(editingPlan.id, planData);
      const existingTagIds = (editingPlan.tags || []).map((t) => t.id);
      await syncTags(editingPlan.id, tagIds || [], existingTagIds);
      setEditingPlan(null);
      fetchAll();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update plan');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this plan and all its tasks?')) return;
    try {
      await deletePlan(id);
      fetchAll();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete plan');
    }
  };

  const handleStatusChange = async (plan, newStatus) => {
    try {
      await updatePlan(plan.id, { status: newStatus });
      fetchAll();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update plan');
    }
  };

  const handleCreateTag = async (e) => {
    e.preventDefault();
    if (!newTagName.trim()) return;
    try {
      await createTag({ name: newTagName.trim(), color: newTagColor });
      setNewTagName('');
      setNewTagColor('#4f46e5');
      fetchAll();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create tag');
    }
  };

  const handleDeleteTag = async (tagId) => {
    try {
      await deleteTag(tagId);
      fetchAll();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete tag');
    }
  };

  const handleRemoveTagFromPlan = async (planId, tagId) => {
    try {
      await removeTagFromPlan(planId, tagId);
      fetchAll();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to remove tag');
    }
  };

  const formatDeadline = (deadline) => {
    if (!deadline) return null;
    const d = new Date(deadline);
    const now = new Date();
    const isOverdue = d < now;
    return (
      <span className={isOverdue ? 'badge badge-overdue' : 'badge badge-active'}>
        {isOverdue ? 'Overdue' : 'Due'} {d.toLocaleDateString()}
      </span>
    );
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '2rem' }}>Loading plans...</div>;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h1>My Plans</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary" onClick={() => setShowTagManager(!showTagManager)}>
            Tags
          </button>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            + New Plan <kbd style={{ fontSize: '0.7rem', opacity: 0.7, marginLeft: '0.25rem' }}>N</kbd>
          </button>
        </div>
      </div>

      {error && <div className="error-msg">{error}</div>}

      {/* Tag manager */}
      {showTagManager && (
        <div className="card" style={{ marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Manage Tags</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
            {allTags.map((tag) => (
              <span
                key={tag.id}
                className="tag-badge"
                style={{ background: tag.color + '22', color: tag.color, borderColor: tag.color + '44' }}
              >
                {tag.name}
                <button className="tag-remove" onClick={() => handleDeleteTag(tag.id)}>✕</button>
              </span>
            ))}
            {allTags.length === 0 && <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>No tags yet.</span>}
          </div>
          <form onSubmit={handleCreateTag} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input
              type="text"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="Tag name"
              style={{ padding: '0.4rem 0.6rem', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.875rem', flex: 1 }}
            />
            <input
              type="color"
              value={newTagColor}
              onChange={(e) => setNewTagColor(e.target.value)}
              style={{ width: 36, height: 34, border: '1px solid #cbd5e1', borderRadius: 6, cursor: 'pointer', padding: 2 }}
            />
            <button type="submit" className="btn btn-primary btn-sm">Add Tag</button>
          </form>
        </div>
      )}

      {/* Search + filter bar */}
      <div className="filter-bar">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search plans..."
          className="search-input"
        />
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={`btn btn-sm ${statusFilter === opt.value ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setStatusFilter(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="sort-select"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>Sort: {opt.label}</option>
          ))}
        </select>
      </div>

      {plans.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: '#64748b', marginBottom: '1rem' }}>
            {search || statusFilter !== 'all' ? 'No plans match your filters.' : 'No plans yet. Create your first one!'}
          </p>
          {!search && statusFilter === 'all' && (
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>Create Plan</button>
          )}
        </div>
      ) : (
        <div className="plan-list">
          {plans.map((plan) => (
            <div key={plan.id} className={`card ${plan.status === 'archived' ? 'plan-archived' : ''}`}>
              <div className="plan-card">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3>
                    <Link to={`/plans/${plan.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                      {plan.title}
                    </Link>
                    {!plan.is_owner && (
                      <span className="badge badge-shared" style={{ marginLeft: '0.5rem', fontSize: '0.65rem' }}>shared</span>
                    )}
                    {plan.tags && plan.tags.length > 0 && (
                      <span style={{ marginLeft: '0.5rem', display: 'inline-flex', gap: '0.25rem' }}>
                        {plan.tags.map((tag) => (
                          <span
                            key={tag.id}
                            className="tag-badge"
                            style={{ background: tag.color + '22', color: tag.color, borderColor: tag.color + '44' }}
                          >
                            {tag.name}
                            {plan.is_owner && (
                              <button className="tag-remove" onClick={() => handleRemoveTagFromPlan(plan.id, tag.id)}>✕</button>
                            )}
                          </span>
                        ))}
                      </span>
                    )}
                  </h3>
                  {plan.description && (
                    <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                      {plan.description}
                    </p>
                  )}

                  <div className="plan-meta">
                    <span className={`badge badge-${plan.priority}`}>{plan.priority}</span>
                    <span className={`badge badge-${plan.status}`}>{plan.status}</span>
                    {formatDeadline(plan.deadline)}
                    {(plan.total_tasks || 0) > 0 && (
                      <span>{plan.completed_tasks || 0}/{(plan.total_tasks || 0)} tasks</span>
                    )}
                  </div>
                </div>

                <div className="plan-actions">
                  {plan.is_owner && plan.status !== 'archived' && (
                    <button
                      className="action-btn"
                      onClick={() => handleStatusChange(plan, plan.status === 'completed' ? 'active' : 'completed')}
                      title={plan.status === 'completed' ? 'Reopen' : 'Complete'}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </button>
                  )}
                  {plan.is_owner && (
                    <button
                      className="action-btn"
                      onClick={() => handleStatusChange(plan, plan.status === 'archived' ? 'active' : 'archived')}
                      title={plan.status === 'archived' ? 'Unarchive' : 'Archive'}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                      </svg>
                    </button>
                  )}
                  {plan.is_owner && (
                    <button
                      className="action-btn"
                      onClick={() => setEditingPlan(plan)}
                      title="Edit"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.75A2.25 2.25 0 0 1 5.25 6H10" />
                      </svg>
                    </button>
                  )}
                  {plan.is_owner && (
                    <button
                      className="action-btn action-btn-delete"
                      onClick={() => handleDelete(plan.id)}
                      title="Delete"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {(plan.total_tasks || 0) > 0 && (
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${((plan.completed_tasks || 0) / (plan.total_tasks || 1)) * 100}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <PlanModal onSave={handleCreate} onClose={() => setShowModal(false)} />
      )}
      {editingPlan && (
        <PlanModal plan={editingPlan} onSave={handleEdit} onClose={() => setEditingPlan(null)} />
      )}
    </div>
  );
}

export default Plans;
