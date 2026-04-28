import React, { useState, useEffect } from 'react';
import { getTags } from '../services/api';

function PlanModal({ plan, onSave, onClose }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState('medium');
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    getTags().then((res) => setAllTags(res.data.tags)).catch(() => {});
  }, []);

  useEffect(() => {
    if (plan) {
      setTitle(plan.title || '');
      setDescription(plan.description || '');
      setDeadline(plan.deadline ? plan.deadline.slice(0, 16) : '');
      setPriority(plan.priority || 'medium');
      setSelectedTagIds((plan.tags || []).map((t) => t.id));
    }
  }, [plan]);

  const toggleTag = (tagId) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    onSave({
      title: title.trim(),
      description: description.trim() || null,
      deadline: deadline || null,
      priority,
      tagIds: selectedTagIds,
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{plan ? 'Edit Plan' : 'Create Plan'}</h2>
        {error && <div className="error-msg">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter plan title"
              autoFocus
            />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              rows={3}
            />
          </div>
          <div className="form-group">
            <label>Deadline</label>
            <input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Priority</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          {allTags.length > 0 && (
            <div className="form-group">
              <label>Tags</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {allTags.map((tag) => {
                  const selected = selectedTagIds.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      className="btn btn-sm"
                      style={{
                        background: selected ? tag.color : 'transparent',
                        color: selected ? 'white' : tag.color,
                        border: `1px solid ${tag.color}`,
                        fontSize: '0.8rem',
                        padding: '0.15rem 0.5rem',
                      }}
                      onClick={() => toggleTag(tag.id)}
                    >
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">{plan ? 'Save' : 'Create'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default PlanModal;
