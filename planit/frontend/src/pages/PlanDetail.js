import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
  getPlan, createTask, updateTask, deleteTask, deletePlan, reorderTasks,
  createSubtask, updateSubtask, deleteSubtask,
  getCollaborators, addCollaborator, removeCollaborator,
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import TaskModal from '../components/TaskModal';

function PlanDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [plan, setPlan] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [accessRole, setAccessRole] = useState('owner');
  const [collaborators, setCollaborators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Add task form
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDeadline, setNewTaskDeadline] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');

  // Edit task modal
  const [editingTask, setEditingTask] = useState(null);

  // Subtask inputs: { [taskId]: string }
  const [subtaskInputs, setSubtaskInputs] = useState({});
  const [expandedSubtasks, setExpandedSubtasks] = useState({});

  // Share panel
  const [showShare, setShowShare] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('viewer');
  const [shareMsg, setShareMsg] = useState('');

  const fetchPlan = useCallback(() => {
    getPlan(id)
      .then((res) => {
        setPlan(res.data.plan);
        setTasks(res.data.tasks);
        setAccessRole(res.data.accessRole);
      })
      .catch((err) => setError(err.response?.data?.error || 'Failed to load plan'))
      .finally(() => setLoading(false));
  }, [id]);

  const fetchCollaborators = useCallback(() => {
    if (accessRole === 'owner') {
      getCollaborators(id)
        .then((res) => setCollaborators(res.data.collaborators))
        .catch(() => {});
    }
  }, [id, accessRole]);

  useEffect(() => { fetchPlan(); }, [fetchPlan]);
  useEffect(() => { fetchCollaborators(); }, [fetchCollaborators]);

  // Keyboard shortcut: Escape closes modals
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setEditingTask(null);
        setShowShare(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const canEdit = accessRole === 'owner' || accessRole === 'editor';

  /* ---- Tasks ---- */

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    try {
      await createTask({
        planId: plan.id,
        title: newTaskTitle.trim(),
        description: newTaskDesc.trim() || null,
        deadline: newTaskDeadline || null,
      });
      setNewTaskTitle('');
      setNewTaskDeadline('');
      setNewTaskDesc('');
      fetchPlan();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add task');
    }
  };

  const handleEditTask = async (data) => {
    try {
      await updateTask(editingTask.id, data);
      setEditingTask(null);
      fetchPlan();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update task');
    }
  };

  const handleToggleTask = async (task) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    try {
      await updateTask(task.id, { status: newStatus });
      fetchPlan();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update task');
    }
  };

  const handleSetInProgress = async (task) => {
    const newStatus = task.status === 'in_progress' ? 'pending' : 'in_progress';
    try {
      await updateTask(task.id, { status: newStatus });
      fetchPlan();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update task');
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await deleteTask(taskId);
      fetchPlan();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete task');
    }
  };

  const handleDeletePlan = async () => {
    if (!window.confirm('Delete this plan and all its tasks?')) return;
    try {
      await deletePlan(id);
      navigate('/plans');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete plan');
    }
  };

  // Bulk actions
  const handleMarkAllComplete = async () => {
    const pending = tasks.filter((t) => t.status !== 'completed');
    try {
      await Promise.all(pending.map((t) => updateTask(t.id, { status: 'completed' })));
      fetchPlan();
    } catch (err) {
      setError('Failed to mark all complete');
    }
  };

  const handleMarkAllPending = async () => {
    const done = tasks.filter((t) => t.status === 'completed');
    try {
      await Promise.all(done.map((t) => updateTask(t.id, { status: 'pending' })));
      fetchPlan();
    } catch (err) {
      setError('Failed to reset tasks');
    }
  };

  /* ---- Drag-and-drop ---- */

  const handleDragEnd = async (result) => {
    if (!result.destination) return;
    const reordered = Array.from(tasks);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    setTasks(reordered); // optimistic update
    try {
      await reorderTasks(reordered.map((t) => t.id));
    } catch {
      fetchPlan(); // revert on failure
    }
  };

  /* ---- Subtasks ---- */

  const toggleSubtaskExpand = (taskId) => {
    setExpandedSubtasks((prev) => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  const handleAddSubtask = async (taskId) => {
    const title = (subtaskInputs[taskId] || '').trim();
    if (!title) return;
    try {
      await createSubtask({ taskId, title });
      setSubtaskInputs((prev) => ({ ...prev, [taskId]: '' }));
      fetchPlan();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add subtask');
    }
  };

  const handleToggleSubtask = async (subtask) => {
    try {
      await updateSubtask(subtask.id, { isCompleted: !subtask.is_completed });
      fetchPlan();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update subtask');
    }
  };

  const handleDeleteSubtask = async (subtaskId) => {
    try {
      await deleteSubtask(subtaskId);
      fetchPlan();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete subtask');
    }
  };

  /* ---- Sharing ---- */

  const handleInvite = async (e) => {
    e.preventDefault();
    setShareMsg('');
    try {
      const res = await addCollaborator(id, { email: inviteEmail, role: inviteRole });
      setShareMsg(res.data.message);
      setInviteEmail('');
      fetchCollaborators();
    } catch (err) {
      setShareMsg(err.response?.data?.error || 'Failed to invite collaborator');
    }
  };

  const handleRemoveCollaborator = async (userId) => {
    try {
      await removeCollaborator(id, userId);
      fetchCollaborators();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to remove collaborator');
    }
  };

  /* ---- Render ---- */

  if (loading) return <div style={{ textAlign: 'center', padding: '2rem' }}>Loading...</div>;
  if (!plan) return <div className="error-msg">Plan not found</div>;

  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const inProgressCount = tasks.filter((t) => t.status === 'in_progress').length;

  const statusColor = { pending: '#94a3b8', in_progress: '#f59e0b', completed: '#10b981' };

  return (
    <div>
      <button className="btn btn-outline" onClick={() => navigate('/plans')} style={{ marginBottom: '1rem' }}>
        &larr; Back to Plans
      </button>

      {error && <div className="error-msg">{error}</div>}

      {/* Plan header card */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h1>{plan.title}</h1>
            {plan.description && <p style={{ color: '#64748b', marginTop: '0.25rem' }}>{plan.description}</p>}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '0.75rem', alignItems: 'center' }}>
              <span className={`badge badge-${plan.priority}`}>{plan.priority}</span>
              <span className={`badge badge-${plan.status}`}>{plan.status}</span>
              {plan.deadline && (
                <span style={{ fontSize: '0.875rem', color: '#64748b' }}>
                  Due {new Date(plan.deadline).toLocaleDateString()}
                </span>
              )}
              {plan.tags && plan.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="tag-badge"
                  style={{ background: tag.color + '22', color: tag.color, borderColor: tag.color + '44' }}
                >
                  {tag.name}
                </span>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {accessRole === 'owner' && (
              <button className="btn btn-sm btn-secondary" onClick={() => setShowShare(!showShare)}>
                Share
              </button>
            )}
            {accessRole === 'owner' && (
              <button className="btn btn-sm btn-danger" onClick={handleDeletePlan}>Delete Plan</button>
            )}
          </div>
        </div>

        {tasks.length > 0 && (
          <div style={{ marginTop: '1rem' }}>
            <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.25rem' }}>
              {completedCount} completed &middot; {inProgressCount} in progress &middot; {tasks.length - completedCount - inProgressCount} pending
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${(completedCount / tasks.length) * 100}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* Share panel */}
      {showShare && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Share this Plan</h3>
          {shareMsg && (
            <div style={{ marginBottom: '0.5rem', padding: '0.4rem 0.6rem', borderRadius: 6, background: '#d1fae5', color: '#065f46', fontSize: '0.875rem' }}>
              {shareMsg}
            </div>
          )}
          <form onSubmit={handleInvite} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ flex: 2, minWidth: 180, marginBottom: 0 }}>
              <label>Email address</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="collaborator@example.com"
                required
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Role</label>
              <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
                <option value="viewer">Viewer</option>
                <option value="editor">Editor</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary" style={{ height: 38 }}>Invite</button>
          </form>

          {collaborators.length > 0 && (
            <div style={{ marginTop: '0.75rem' }}>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.3rem' }}>Collaborators</div>
              {collaborators.map((c) => (
                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.3rem 0', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: '0.875rem' }}>
                    {c.full_name} <span style={{ color: '#94a3b8' }}>({c.email})</span>
                    <span className={`badge badge-${c.role === 'editor' ? 'active' : 'medium'}`} style={{ marginLeft: '0.4rem', fontSize: '0.65rem' }}>{c.role}</span>
                  </div>
                  <button className="btn btn-sm btn-outline" onClick={() => handleRemoveCollaborator(c.id)}>Remove</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Task list header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '1.5rem 0 0.75rem' }}>
        <h2 style={{ fontSize: '1.1rem' }}>Tasks</h2>
        {canEdit && tasks.length > 0 && (
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button className="btn btn-sm btn-secondary" onClick={handleMarkAllComplete}>
              Mark All Complete
            </button>
            <button className="btn btn-sm btn-outline" onClick={handleMarkAllPending}>
              Reset All
            </button>
          </div>
        )}
      </div>

      {/* Add task form */}
      {canEdit && (
        <form onSubmit={handleAddTask} className="card" style={{ marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ flex: 2, minWidth: 160, marginBottom: 0 }}>
              <label>New Task</label>
              <input
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Task title"
              />
            </div>
            <div className="form-group" style={{ flex: 2, minWidth: 160, marginBottom: 0 }}>
              <label>Description</label>
              <input
                type="text"
                value={newTaskDesc}
                onChange={(e) => setNewTaskDesc(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Deadline</label>
              <input
                type="datetime-local"
                value={newTaskDeadline}
                onChange={(e) => setNewTaskDeadline(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ height: 38 }}>Add</button>
          </div>
        </form>
      )}

      {tasks.length === 0 ? (
        <p style={{ color: '#64748b', textAlign: 'center', padding: '2rem' }}>
          No tasks yet.{canEdit ? ' Add one above.' : ''}
        </p>
      ) : (
        <DragDropContext onDragEnd={canEdit ? handleDragEnd : () => {}}>
          <Droppable droppableId="tasks">
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps}>
                {tasks.map((task, index) => {
                  const subtasks = task.subtasks || [];
                  const completedSubs = subtasks.filter((s) => s.is_completed).length;
                  const isExpanded = expandedSubtasks[task.id];

                  return (
                    <Draggable
                      key={task.id}
                      draggableId={String(task.id)}
                      index={index}
                      isDragDisabled={!canEdit}
                    >
                      {(draggableProvided, snapshot) => (
                        <div
                          ref={draggableProvided.innerRef}
                          {...draggableProvided.draggableProps}
                          className="card task-card"
                          style={{
                            opacity: task.status === 'completed' ? 0.65 : 1,
                            borderLeft: `3px solid ${statusColor[task.status] || '#e2e8f0'}`,
                            boxShadow: snapshot.isDragging ? '0 4px 12px rgba(0,0,0,0.15)' : undefined,
                            ...draggableProvided.draggableProps.style,
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', flex: 1 }}>
                              {canEdit && (
                                <span
                                  {...draggableProvided.dragHandleProps}
                                  className="drag-handle"
                                  title="Drag to reorder"
                                >
                                  ⠿
                                </span>
                              )}
                              <input
                                type="checkbox"
                                checked={task.status === 'completed'}
                                onChange={() => canEdit && handleToggleTask(task)}
                                style={{ width: 18, height: 18, cursor: 'pointer', marginTop: 2, flexShrink: 0 }}
                              />
                              <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                  <span style={{
                                    textDecoration: task.status === 'completed' ? 'line-through' : 'none',
                                    fontWeight: 500,
                                  }}>
                                    {task.title}
                                  </span>
                                  {task.status === 'in_progress' && (
                                    <span className="badge" style={{ background: '#fef3c7', color: '#92400e', fontSize: '0.65rem' }}>in progress</span>
                                  )}
                                </div>
                                {task.description && (
                                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.2rem' }}>
                                    {task.description}
                                  </div>
                                )}
                                {task.deadline && (
                                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.1rem' }}>
                                    Due {new Date(task.deadline).toLocaleString()}
                                  </div>
                                )}
                                {subtasks.length > 0 && (
                                  <button
                                    className="btn btn-sm btn-outline"
                                    style={{ marginTop: '0.4rem', fontSize: '0.75rem', padding: '0.1rem 0.4rem' }}
                                    onClick={() => toggleSubtaskExpand(task.id)}
                                  >
                                    {completedSubs}/{subtasks.length} subtasks {isExpanded ? '▲' : '▼'}
                                  </button>
                                )}
                              </div>
                            </div>

                            {canEdit && (
                              <div style={{ display: 'flex', gap: '0.3rem', flexShrink: 0, marginLeft: '0.5rem' }}>
                                <button
                                  className="btn btn-sm btn-outline"
                                  style={{ fontSize: '0.75rem' }}
                                  onClick={() => handleSetInProgress(task)}
                                  title={task.status === 'in_progress' ? 'Mark pending' : 'Mark in progress'}
                                >
                                  {task.status === 'in_progress' ? '⏸' : '▶'}
                                </button>
                                <button
                                  className="btn btn-sm btn-secondary"
                                  style={{ fontSize: '0.75rem' }}
                                  onClick={() => setEditingTask(task)}
                                >
                                  Edit
                                </button>
                                <button
                                  className="btn btn-sm btn-outline"
                                  style={{ fontSize: '0.75rem' }}
                                  onClick={() => handleDeleteTask(task.id)}
                                >
                                  ✕
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Subtasks */}
                          {(isExpanded || subtasks.length === 0) && canEdit && (
                            <div style={{ marginTop: '0.5rem', paddingLeft: '2.5rem' }}>
                              {isExpanded && subtasks.map((sub) => (
                                <div key={sub.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.2rem 0' }}>
                                  <input
                                    type="checkbox"
                                    checked={sub.is_completed}
                                    onChange={() => handleToggleSubtask(sub)}
                                    style={{ width: 15, height: 15, cursor: 'pointer' }}
                                  />
                                  <span style={{
                                    fontSize: '0.875rem',
                                    textDecoration: sub.is_completed ? 'line-through' : 'none',
                                    color: sub.is_completed ? '#94a3b8' : 'inherit',
                                    flex: 1,
                                  }}>
                                    {sub.title}
                                  </span>
                                  <button
                                    className="btn btn-sm"
                                    style={{ padding: '0 0.25rem', background: 'transparent', color: '#94a3b8', fontSize: '0.8rem' }}
                                    onClick={() => handleDeleteSubtask(sub.id)}
                                  >
                                    ✕
                                  </button>
                                </div>
                              ))}
                              <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.4rem' }}>
                                <input
                                  type="text"
                                  value={subtaskInputs[task.id] || ''}
                                  onChange={(e) => setSubtaskInputs((prev) => ({ ...prev, [task.id]: e.target.value }))}
                                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSubtask(task.id))}
                                  placeholder="Add subtask..."
                                  style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem', border: '1px solid #e2e8f0', borderRadius: 4, flex: 1 }}
                                />
                                <button
                                  className="btn btn-sm btn-outline"
                                  style={{ fontSize: '0.75rem' }}
                                  onClick={() => handleAddSubtask(task.id)}
                                >
                                  Add
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}

      {editingTask && (
        <TaskModal task={editingTask} onSave={handleEditTask} onClose={() => setEditingTask(null)} />
      )}
    </div>
  );
}

export default PlanDetail;
