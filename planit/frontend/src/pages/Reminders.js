import React, { useState, useEffect } from 'react';
import { getReminders, createReminder, deleteReminder, getPlans, getTasks } from '../services/api';

function Reminders() {
  const [reminders, setReminders] = useState([]);
  const [plans, setPlans] = useState([]);
  const [planTasks, setPlanTasks] = useState([]); // tasks for the selected plan
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  // Form fields
  const [message, setMessage] = useState('');
  const [remindAt, setRemindAt] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState('');

  const fetchData = () => {
    Promise.all([getReminders(), getPlans()])
      .then(([remRes, planRes]) => {
        setReminders(remRes.data.reminders);
        setPlans(planRes.data.plans);
      })
      .catch((err) => setError(err.response?.data?.error || 'Failed to load data'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  // When a plan is selected, load its tasks for the task dropdown
  useEffect(() => {
    if (selectedPlanId) {
      getTasks(selectedPlanId)
        .then((res) => setPlanTasks(res.data.tasks))
        .catch(() => setPlanTasks([]));
    } else {
      setPlanTasks([]);
      setSelectedTaskId('');
    }
  }, [selectedPlanId]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!message.trim() || !remindAt) return;
    try {
      await createReminder({
        message: message.trim(),
        remindAt,
        planId: selectedPlanId || null,
        taskId: selectedTaskId || null,
      });
      setMessage('');
      setRemindAt('');
      setSelectedPlanId('');
      setSelectedTaskId('');
      setShowForm(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create reminder');
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteReminder(id);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete reminder');
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '2rem' }}>Loading reminders...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1>Reminders</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            SMS notifications are sent via Twilio when a reminder fires.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ New Reminder'}
        </button>
      </div>

      {error && <div className="error-msg">{error}</div>}

      {showForm && (
        <form onSubmit={handleCreate} className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="form-group">
            <label>Message</label>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What should we remind you about?"
              required
            />
          </div>
          <div className="form-group">
            <label>Remind At</label>
            <input
              type="datetime-local"
              value={remindAt}
              onChange={(e) => setRemindAt(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Linked Plan <span style={{ color: '#94a3b8', fontWeight: 400 }}>(optional)</span></label>
            <select
              value={selectedPlanId}
              onChange={(e) => {
                setSelectedPlanId(e.target.value);
                setSelectedTaskId('');
              }}
            >
              <option value="">None</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>
          {selectedPlanId && (
            <div className="form-group">
              <label>Linked Task <span style={{ color: '#94a3b8', fontWeight: 400 }}>(optional)</span></label>
              <select
                value={selectedTaskId}
                onChange={(e) => setSelectedTaskId(e.target.value)}
              >
                <option value="">None (plan-level reminder)</option>
                {planTasks.map((t) => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            </div>
          )}
          <button type="submit" className="btn btn-primary">Create Reminder</button>
        </form>
      )}

      {reminders.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: '#64748b' }}>No upcoming reminders.</p>
        </div>
      ) : (
        reminders.map((r) => (
          <div key={r.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 500 }}>{r.message}</div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.25rem' }}>
                {new Date(r.remind_at).toLocaleString()}
                {r.plan_title && ` — Plan: ${r.plan_title}`}
                {r.task_title && ` — Task: ${r.task_title}`}
              </div>
            </div>
            <button className="btn btn-sm btn-outline" onClick={() => handleDelete(r.id)}>Delete</button>
          </div>
        ))
      )}
    </div>
  );
}

export default Reminders;
