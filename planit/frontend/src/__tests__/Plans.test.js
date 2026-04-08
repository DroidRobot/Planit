import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';

// Mock API module
jest.mock('../services/api', () => ({
  getPlans: jest.fn(),
  getTags: jest.fn(),
  createPlan: jest.fn(),
  updatePlan: jest.fn(),
  deletePlan: jest.fn(),
  createTag: jest.fn(),
  addTagToPlan: jest.fn(),
  removeTagFromPlan: jest.fn(),
}));

const api = require('../services/api');

import Plans from '../pages/Plans';

const mockPlans = [
  {
    id: 1, title: 'Study React', description: 'Learn hooks', status: 'active',
    priority: 'high', deadline: null, total_tasks: 2, completed_tasks: 1,
    is_owner: true, tags: [],
  },
  {
    id: 2, title: 'Exercise', description: null, status: 'completed',
    priority: 'medium', deadline: null, total_tasks: 0, completed_tasks: 0,
    is_owner: true, tags: [],
  },
];

function renderPlans() {
  return render(
    <MemoryRouter>
      <Plans />
    </MemoryRouter>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  api.getPlans.mockResolvedValue({ data: { plans: mockPlans } });
  api.getTags.mockResolvedValue({ data: { tags: [] } });
});

test('renders plan titles after loading', async () => {
  renderPlans();
  expect(await screen.findByText('Study React')).toBeInTheDocument();
  expect(screen.getByText('Exercise')).toBeInTheDocument();
});

test('shows empty state when no plans match filters', async () => {
  api.getPlans.mockResolvedValue({ data: { plans: [] } });
  renderPlans();
  expect(await screen.findByText(/no plans yet/i)).toBeInTheDocument();
});

test('opens new plan modal on button click', async () => {
  renderPlans();
  await screen.findByText('Study React'); // wait for load
  fireEvent.click(screen.getByText(/\+ New Plan/i));
  expect(screen.getByText(/create plan/i, { selector: 'h2' })).toBeInTheDocument();
});

test('calls deletePlan on confirm', async () => {
  api.deletePlan.mockResolvedValue({ data: {} });
  window.confirm = jest.fn(() => true);
  renderPlans();
  await screen.findByText('Study React');

  const deleteButtons = screen.getAllByText('Delete');
  fireEvent.click(deleteButtons[0]);

  await waitFor(() => expect(api.deletePlan).toHaveBeenCalledWith(1));
});

test('search filter re-fetches with query param', async () => {
  renderPlans();
  await screen.findByText('Study React');

  const searchInput = screen.getByPlaceholderText(/search plans/i);
  fireEvent.change(searchInput, { target: { value: 'React' } });

  await waitFor(() => {
    expect(api.getPlans).toHaveBeenCalledWith(expect.objectContaining({ search: 'React' }));
  });
});
