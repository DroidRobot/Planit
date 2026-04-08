import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001/api',
  withCredentials: true,
});

// Auth
export const signup = (data) => api.post('/auth/signup', data);
export const login = (data) => api.post('/auth/login', data);
export const googleLogin = (credential) => api.post('/auth/google', { credential });
export const logout = () => api.post('/auth/logout');
export const getMe = () => api.get('/auth/me');
export const updateProfile = (data) => api.put('/auth/me', data);

// Plans
export const getPlans = (params) => api.get('/plans', { params });
export const getPlan = (id) => api.get(`/plans/${id}`);
export const createPlan = (data) => api.post('/plans', data);
export const updatePlan = (id, data) => api.put(`/plans/${id}`, data);
export const deletePlan = (id) => api.delete(`/plans/${id}`);

// Tasks
export const getTasks = (planId) => api.get(`/tasks?plan_id=${planId}`);
export const createTask = (data) => api.post('/tasks', data);
export const updateTask = (id, data) => api.put(`/tasks/${id}`, data);
export const reorderTasks = (orderedIds) => api.post('/tasks/reorder', { orderedIds });
export const deleteTask = (id) => api.delete(`/tasks/${id}`);

// Subtasks
export const getSubtasks = (taskId) => api.get(`/subtasks?task_id=${taskId}`);
export const createSubtask = (data) => api.post('/subtasks', data);
export const updateSubtask = (id, data) => api.put(`/subtasks/${id}`, data);
export const deleteSubtask = (id) => api.delete(`/subtasks/${id}`);

// Reminders
export const getReminders = () => api.get('/reminders');
export const createReminder = (data) => api.post('/reminders', data);
export const deleteReminder = (id) => api.delete(`/reminders/${id}`);

// Dashboard
export const getDashboard = () => api.get('/dashboard');

// Tags
export const getTags = () => api.get('/tags');
export const createTag = (data) => api.post('/tags', data);
export const updateTag = (id, data) => api.put(`/tags/${id}`, data);
export const deleteTag = (id) => api.delete(`/tags/${id}`);
export const addTagToPlan = (planId, tagId) => api.post(`/tags/plans/${planId}`, { tagId });
export const removeTagFromPlan = (planId, tagId) => api.delete(`/tags/plans/${planId}/${tagId}`);

// Collaborators
export const getCollaborators = (planId) => api.get(`/collaborators/${planId}`);
export const addCollaborator = (planId, data) => api.post(`/collaborators/${planId}`, data);
export const removeCollaborator = (planId, userId) => api.delete(`/collaborators/${planId}/${userId}`);

export default api;
