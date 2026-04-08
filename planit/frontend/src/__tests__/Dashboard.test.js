import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';

jest.mock('../services/api', () => ({
  getDashboard: jest.fn(),
}));

jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { fullName: 'Alice Tester', email: 'a@b.com' } }),
}));

// Recharts needs a container with dimensions; stub ResizeObserver
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const api = require('../services/api');
import Dashboard from '../pages/Dashboard';

const mockData = {
  summary: { active_plans: 3, completed_plans: 1, archived_plans: 0, total_plans: 4 },
  taskStats: { completed_tasks: 5, pending_tasks: 2, in_progress_tasks: 1, total_tasks: 8 },
  upcomingDeadlines: [],
  overduePlans: [{ id: 10, title: 'Overdue Plan', deadline: '2025-01-01T00:00:00Z', priority: 'high' }],
  upcomingReminders: [],
  weeklyTrend: [
    { date: '2026-03-23', completed: 0 },
    { date: '2026-03-24', completed: 2 },
    { date: '2026-03-25', completed: 1 },
    { date: '2026-03-26', completed: 0 },
    { date: '2026-03-27', completed: 3 },
    { date: '2026-03-28', completed: 0 },
    { date: '2026-03-29', completed: 1 },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
  api.getDashboard.mockResolvedValue({ data: mockData });
});

function renderDashboard() {
  return render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>
  );
}

test('greets the user by first name', async () => {
  renderDashboard();
  expect(await screen.findByText(/welcome back, alice/i)).toBeInTheDocument();
});

test('shows stat cards', async () => {
  renderDashboard();
  expect(await screen.findByText('Active Plans')).toBeInTheDocument();
  expect(screen.getByText('Tasks Done')).toBeInTheDocument();
});

test('shows overdue plan', async () => {
  renderDashboard();
  expect(await screen.findByText('Overdue Plan')).toBeInTheDocument();
});

test('shows no upcoming deadlines message', async () => {
  renderDashboard();
  expect(await screen.findByText(/no upcoming deadlines/i)).toBeInTheDocument();
});
