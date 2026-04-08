import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { getDashboard } from '../services/api';

const PLAN_STATUS_COLORS = {
  active: '#4f46e5',
  completed: '#10b981',
  archived: '#94a3b8',
};

function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getDashboard()
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.error || 'Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: '2rem' }}>Loading dashboard...</div>;
  if (error) return <div className="error-msg">{error}</div>;

  const { summary, taskStats, upcomingDeadlines, overduePlans, upcomingReminders, weeklyTrend } = data;

  // Pie chart data for plan statuses
  const planPieData = [
    { name: 'Active', value: parseInt(summary.active_plans, 10) },
    { name: 'Completed', value: parseInt(summary.completed_plans, 10) },
    { name: 'Archived', value: parseInt(summary.archived_plans || 0, 10) },
  ].filter((d) => d.value > 0);

  // Format date label for the bar chart
  const fmtDate = (iso) => {
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString(undefined, { weekday: 'short' });
  };

  return (
    <div>
      <h1 style={{ marginBottom: '0.5rem' }}>Welcome back, {user?.fullName?.split(' ')[0]}</h1>
      <p style={{ color: '#64748b', marginBottom: '2rem' }}>Here's your planning overview.</p>

      {/* Stats grid */}
      <div className="dashboard-grid">
        <div className="stat-card">
          <div className="stat-number">{summary.active_plans}</div>
          <div className="stat-label">Active Plans</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{summary.completed_plans}</div>
          <div className="stat-label">Completed</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{taskStats.completed_tasks}</div>
          <div className="stat-label">Tasks Done</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{taskStats.pending_tasks}</div>
          <div className="stat-label">Pending Tasks</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{taskStats.in_progress_tasks}</div>
          <div className="stat-label">In Progress</div>
        </div>
      </div>

      {/* Charts row */}
      {(weeklyTrend || planPieData.length > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
          {/* Weekly task completion bar chart */}
          {weeklyTrend && (
            <div className="card">
              <h2 style={{ fontSize: '1rem', marginBottom: '1rem', color: '#475569' }}>Tasks Completed — Last 7 Days</h2>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={weeklyTrend.map((d) => ({ ...d, label: fmtDate(d.date) }))}>
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} width={24} />
                  <Tooltip
                    formatter={(val) => [val, 'Tasks']}
                    labelFormatter={(l) => l}
                  />
                  <Bar dataKey="completed" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Plan status pie chart */}
          {planPieData.length > 0 && (
            <div className="card">
              <h2 style={{ fontSize: '1rem', marginBottom: '0.5rem', color: '#475569' }}>Plan Status</h2>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={planPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {planPieData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={PLAN_STATUS_COLORS[entry.name.toLowerCase()] || '#94a3b8'}
                      />
                    ))}
                  </Pie>
                  <Legend iconType="circle" iconSize={10} />
                  <Tooltip formatter={(val, name) => [val, name]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Overdue plans */}
        <div>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Overdue</h2>
          {overduePlans.length === 0 ? (
            <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Nothing overdue. Great job!</p>
          ) : (
            overduePlans.map((plan) => (
              <div key={plan.id} className="card" style={{ borderLeft: '3px solid #ef4444' }}>
                <Link to={`/plans/${plan.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <strong>{plan.title}</strong>
                  <div style={{ fontSize: '0.8rem', color: '#ef4444' }}>
                    Due {new Date(plan.deadline).toLocaleDateString()}
                  </div>
                </Link>
              </div>
            ))
          )}
        </div>

        {/* Upcoming deadlines */}
        <div>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Upcoming (7 days)</h2>
          {upcomingDeadlines.length === 0 ? (
            <p style={{ color: '#64748b', fontSize: '0.875rem' }}>No upcoming deadlines.</p>
          ) : (
            upcomingDeadlines.map((plan) => (
              <div key={plan.id} className="card">
                <Link to={`/plans/${plan.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <strong>{plan.title}</strong>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    Due {new Date(plan.deadline).toLocaleDateString()} &middot;{' '}
                    <span className={`badge badge-${plan.priority}`}>{plan.priority}</span>
                  </div>
                </Link>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Upcoming reminders */}
      {upcomingReminders.length > 0 && (
        <div style={{ marginTop: '1.5rem' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Upcoming Reminders</h2>
          {upcomingReminders.map((r) => (
            <div key={r.id} className="card">
              <div>{r.message}</div>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                {new Date(r.remind_at).toLocaleString()}
                {r.plan_title && ` — ${r.plan_title}`}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Dashboard;
