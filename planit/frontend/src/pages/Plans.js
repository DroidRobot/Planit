import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getPlans, createPlan, updatePlan, deletePlan, getTags, createTag, addTagToPlan, removeTagFromPlan } from '../services/api';
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

  const handleCreate = async (data) => {
    try {
      await createPlan(data);
      setShowModal(false);
      fetchAll();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create plan');
    }
  };

  const handleEdit = async (data) => {
    try {
      await updatePlan(editingPlan.id, data);
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

  const handleToggleTag = async (plan, tag) => {
    const hasTag = plan.tags?.some((t) => t.id === tag.id);
    try {
      if (hasTag) {
        await removeTagFromPlan(plan.id, tag.id);
      } else {
        await addTagToPlan(plan.id, tag.id);
      }
      fetchAll();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update tag');
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
                  </h3>
                  {plan.description && (
                    <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                      {plan.description}
                    </p>
                  )}

                  {/* Tags */}
                  {plan.tags && plan.tags.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginBottom: '0.4rem' }}>
                      {plan.tags.map((tag) => (
                        <span
                          key={tag.id}
                          className="tag-badge"
                          style={{ background: tag.color + '22', color: tag.color, borderColor: tag.color + '44' }}
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="plan-meta">
                    <span className={`badge badge-${plan.priority}`}>{plan.priority}</span>
                    <span className={`badge badge-${plan.status}`}>{plan.status}</span>
                    {formatDeadline(plan.deadline)}
                    {plan.total_tasks > 0 && (
                      <span>{plan.completed_tasks}/{plan.total_tasks} tasks</span>
                    )}
                  </div>
                  {plan.total_tasks > 0 && (
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${(plan.completed_tasks / plan.total_tasks) * 100}%` }}
                      />
                    </div>
                  )}

                  {/* Tag toggles (show when tag manager is open) */}
                  {showTagManager && allTags.length > 0 && plan.is_owner && (
                    <div style={{ marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                      {allTags.map((tag) => {
                        const hasTag = plan.tags?.some((t) => t.id === tag.id);
                        return (
                          <button
                            key={tag.id}
                            className="btn btn-sm"
                            style={{
                              background: hasTag ? tag.color : 'transparent',
                              color: hasTag ? 'white' : tag.color,
                              border: `1px solid ${tag.color}`,
                              fontSize: '0.7rem',
                              padding: '0.1rem 0.4rem',
                            }}
                            onClick={() => handleToggleTag(plan, tag)}
                          >
                            {tag.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="plan-actions">
                  {plan.is_owner && plan.status !== 'archived' && (
                    <button
                      className="btn btn-sm btn-outline"
                      onClick={() => handleStatusChange(plan, plan.status === 'completed' ? 'active' : 'completed')}
                    >
                      {plan.status === 'completed' ? 'Reopen' : 'Complete'}
                    </button>
                  )}
                  {plan.is_owner && (
                    <button
                      className="btn btn-sm btn-outline"
                      onClick={() => handleStatusChange(plan, plan.status === 'archived' ? 'active' : 'archived')}
                    >
                      {plan.status === 'archived' ? 'Unarchive' : 'Archive'}
                    </button>
                  )}
                  {plan.is_owner && (
                    <button className="btn btn-sm btn-secondary" onClick={() => setEditingPlan(plan)}>Edit</button>
                  )}
                  {plan.is_owner && (
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(plan.id)}>Delete</button>
                  )}
                </div>
              </div>
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
