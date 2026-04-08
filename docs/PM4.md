# Project Milestone 4: Implementation

**CS 3754 Cloud Software Development**
**Team:** Ahmad Harb, Yousif Abuhaija, Zann Khawaja, Andrew Wulff, Carson Breslow
**Project:** Planit — A Modern Planning Application
**Due:** April 10, 2026

---

## Table of Contents

1. [Implementation](#implementation)
2. [IMPLEMENTATION.md (AI Disclosure)](#implementationmd-ai-disclosure)
3. [Black Box Test Plan](#black-box-test-plan)
4. [Process Deliverable IV](#process-deliverable-iv)

---

## Implementation

### Overview

Planit is a full-stack web application that helps users organize personal and professional goals through plans, tasks, reminders, and collaboration features. The implementation follows the design established in PM3 and covers the core functionality of the system across both the backend API and frontend UI.

### Repository

All source code is available at: [https://github.com/DroidRobot/StudyAI](https://github.com/DroidRobot/StudyAI)

### Features Implemented

The following features have been implemented across the backend and frontend:

#### 1. User Authentication (`backend/src/routes/auth.js`, `frontend/src/pages/Login.js`, `frontend/src/pages/Signup.js`)
- Email/password registration with bcrypt password hashing
- Email/password login with JWT token generation
- Google OAuth (OpenID Connect) login via `google-auth-library`
- JWT stored in httpOnly cookies (not localStorage) for security
- Session persistence via `GET /api/auth/me` endpoint
- Logout with cookie clearing
- Phone number profile updates via `PUT /api/auth/me`

#### 2. Plans Management (`backend/src/routes/plans.js`, `frontend/src/pages/Plans.js`)
- Full CRUD operations for plans (create, read, update, delete)
- Plans include title, description, deadline, priority (low/medium/high), and status (active/completed/archived)
- List view with filtering by status (all/active/completed/archived)
- Search functionality (title and description ILIKE search)
- Sorting by deadline, priority, or creation date
- Progress bar showing task completion percentage per plan
- Keyboard shortcut (`N` key) to quickly open the new plan modal

#### 3. Task Management (`backend/src/routes/tasks.js`, `frontend/src/pages/PlanDetail.js`)
- Full CRUD operations for tasks within a plan
- Tasks include title, description, deadline, and status (pending/in_progress/completed)
- Checkbox toggle to mark tasks as completed
- In-progress status toggle
- Drag-and-drop reordering via `@hello-pangea/dnd` library
- Bulk actions: "Mark All Complete" and "Reset All"
- Inline task creation form within the plan detail view

#### 4. Subtasks (`backend/src/routes/subtasks.js`, `frontend/src/pages/PlanDetail.js`)
- Nested subtasks within each task
- Create, toggle completion, and delete subtasks
- Expandable/collapsible subtask lists
- Subtask completion counter displayed on parent task

#### 5. Reminders (`backend/src/routes/reminders.js`, `frontend/src/pages/Reminders.js`)
- Create reminders linked to plans and/or tasks
- List upcoming (unsent) reminders sorted by time
- Delete reminders
- Cron-based reminder service (`backend/src/services/reminderService.js`) that checks every minute for due reminders
- SMS notification support via Twilio integration (optional; logs to console when Twilio is not configured)

#### 6. Dashboard (`backend/src/routes/dashboard.js`, `frontend/src/pages/Dashboard.js`)
- Summary statistics: active plans, completed plans, archived plans, total plans
- Task statistics: completed, pending, in-progress, total tasks
- Weekly task completion trend (bar chart via Recharts)
- Plan status breakdown (pie chart via Recharts)
- Overdue plans list with links to plan detail
- Upcoming deadlines (next 7 days)
- Upcoming reminders preview

#### 7. Tags (`backend/src/routes/tags.js`, `frontend/src/pages/Plans.js`)
- Create, update, and delete user-owned tags with custom colors
- Assign and remove tags from plans via `plan_tags` junction table
- Tags displayed as color-coded badges on plan cards
- Tag management panel toggleable from the plans list

#### 8. Plan Collaboration (`backend/src/routes/collaborators.js`, `frontend/src/pages/PlanDetail.js`)
- Invite collaborators by email address
- Role-based access: owner, editor, viewer
- Editors can create and edit tasks; viewers can only read
- Plan owners can list collaborators and remove them
- Shared plans appear in collaborators' plan lists with a "shared" badge
- Self-invite prevention

#### 9. Authentication Middleware (`backend/src/middleware/auth.js`)
- JWT verification middleware applied to all protected routes
- Token extracted from httpOnly cookies or Authorization header
- User ID injected into `req.user` for downstream route handlers

#### 10. Database Schema and Migrations (`backend/migrations/`)
- `001_initial_schema.sql`: Core tables (users, plans, tasks, reminders) with indexes
- `002_phone_tags_subtasks_collaborators.sql`: Extended schema for phone numbers, tags, subtasks, and collaborators
- Migration runner (`backend/migrations/run.js`) for sequential SQL execution

#### 11. Frontend Infrastructure
- **Auth Context** (`frontend/src/context/AuthContext.js`): React context provider managing authentication state across the app
- **API Service** (`frontend/src/services/api.js`): Centralized Axios client with `withCredentials` for cookie-based auth
- **Protected Routes** (`frontend/src/components/ProtectedRoute.js`): Route guard redirecting unauthenticated users to login
- **Navigation** (`frontend/src/components/Navbar.js`): Responsive navbar with auth-aware links
- **Modals** (`frontend/src/components/PlanModal.js`, `frontend/src/components/TaskModal.js`): Reusable modal components for creating/editing plans and tasks

### Tech Stack

| Layer          | Technology                              |
|----------------|-----------------------------------------|
| Frontend       | React.js 18 (Create React App)          |
| Backend        | Node.js / Express                       |
| Database       | PostgreSQL (raw SQL via `pg`)           |
| Authentication | JWT (httpOnly cookies) + Google OAuth   |
| Charts         | Recharts                                |
| Drag & Drop    | @hello-pangea/dnd                       |
| SMS            | Twilio (optional)                       |
| Scheduling     | node-cron                               |

### Team Contributions

All team members have contributed to the repository through commits, issue creation/resolution, pull requests, and documentation. See the GitHub repository commit history and pull request log for detailed attribution.

---

## IMPLEMENTATION.md (AI Disclosure)

### AI Usage Disclosure

AI tools were used during the development of Planit. In accordance with the course AI policy, the following disclosure is provided.

### AI Tool(s) Used

- **Claude Code** (Anthropic) — an AI-powered coding assistant used for code generation, debugging, and implementation guidance.

### Features Implemented with AI Assistance

The following features were implemented with AI assistance.

| Feature | Files | AI-Generated? |
|---------|-------|---------------|
| Backend API routes (auth, plans, tasks, reminders, dashboard, tags, subtasks, collaborators) | `backend/src/routes/*.js` | Yes |
| Database schema and migrations | `backend/migrations/*.sql` | Yes |
| Reminder cron service with Twilio integration | `backend/src/services/reminderService.js` | Yes |
| Frontend pages (Login, Signup, Dashboard, Plans, PlanDetail, Reminders) | `frontend/src/pages/*.js` | Yes |
| Frontend components (Navbar, ProtectedRoute, PlanModal, TaskModal) | `frontend/src/components/*.js` | Yes |
| Auth context and API service | `frontend/src/context/AuthContext.js`, `frontend/src/services/api.js` | Yes |
| CSS styling | `frontend/src/styles/App.css` | Yes |
| Unit tests | `backend/src/__tests__/*.test.js`, `frontend/src/__tests__/*.test.js` | Yes |

### Explanation of AI-Generated Code

**Backend:**
The Express.js backend consists of RESTful route handlers for each resource (auth, plans, tasks, reminders, dashboard, tags, subtasks, collaborators). Each route file follows a consistent pattern: import dependencies, create a router, apply authentication middleware, and define route handlers with parameterized SQL queries via the `pg` library. All async operations use try/catch for error handling. The code does what was expected — it provides a complete REST API matching the design specification from PM3.

**Frontend:**
The React frontend uses functional components with hooks (`useState`, `useEffect`, `useCallback`) to manage state and side effects. Pages communicate with the backend through an Axios-based API service configured with `withCredentials: true` for cookie-based authentication. The Dashboard page uses Recharts for data visualization (bar and pie charts). The PlanDetail page integrates `@hello-pangea/dnd` for drag-and-drop task reordering. The code implements the UI as designed.

**Database:**
The PostgreSQL schema defines normalized tables with appropriate foreign key constraints, cascading deletes, check constraints for enum fields, and performance indexes. The migration files are run sequentially by a Node.js migration runner.

### Prompt and Code Modifications

- Initial prompts described the project requirements, tech stack, and database schema. The AI generated a complete initial implementation.
- Subsequent prompts requested specific feature additions (tags, subtasks, collaborators, SMS reminders, drag-and-drop) and bug fixes (Google OAuth, CI configuration).
- Minor manual modifications were made to resolve integration issues and adjust styling.
- All prompts and AI interactions are logged in the Claude Code session history.

---

## Black Box Test Plan

The following black box test cases verify the core functionality of Planit against the acceptance criteria from PM2 and design constraints from PM3.

### Test Case 1: User Registration

| Field | Details |
|-------|---------|
| **Test Case ID** | TC-001 |
| **Title** | User Registration with Valid Credentials |
| **Description** | Verify that a new user can register with a valid email, password, and full name. |
| **Preconditions** | The application is running. The email is not already registered. |
| **Test Steps** | 1. Navigate to the Signup page. 2. Enter a valid full name (e.g., "Test User"). 3. Enter a valid email (e.g., "testuser@example.com"). 4. Enter a valid password (at least 6 characters). 5. Click the "Sign Up" button. |
| **Expected Result** | The user is redirected to the Dashboard. The navbar displays the user's name. A welcome message is shown. |
| **Actual Result** | |

### Test Case 2: User Login

| Field | Details |
|-------|---------|
| **Test Case ID** | TC-002 |
| **Title** | User Login with Valid Credentials |
| **Description** | Verify that an existing user can log in with their email and password. |
| **Preconditions** | A user account with email "testuser@example.com" and a known password exists. |
| **Test Steps** | 1. Navigate to the Login page. 2. Enter the registered email address. 3. Enter the correct password. 4. Click the "Log In" button. |
| **Expected Result** | The user is redirected to the Dashboard. The dashboard displays the user's name and plan statistics. |
| **Actual Result** | |

### Test Case 3: Login with Invalid Credentials

| Field | Details |
|-------|---------|
| **Test Case ID** | TC-003 |
| **Title** | Login Rejected for Invalid Password |
| **Description** | Verify that login is denied when an incorrect password is provided. |
| **Preconditions** | A user account with email "testuser@example.com" exists. |
| **Test Steps** | 1. Navigate to the Login page. 2. Enter the registered email. 3. Enter an incorrect password. 4. Click "Log In". |
| **Expected Result** | An error message "Invalid email or password" is displayed. The user remains on the Login page. |
| **Actual Result** | |

### Test Case 4: Create a New Plan

| Field | Details |
|-------|---------|
| **Test Case ID** | TC-004 |
| **Title** | Create a New Plan with All Fields |
| **Description** | Verify that a logged-in user can create a new plan with title, description, deadline, and priority. |
| **Preconditions** | The user is logged in and on the Plans page. |
| **Test Steps** | 1. Click the "+ New Plan" button. 2. Enter a title: "Study for Final Exam". 3. Enter a description: "Review all lecture notes and practice problems." 4. Set a deadline date. 5. Select priority: "High". 6. Click "Save". |
| **Expected Result** | The plan appears in the plans list with the correct title, description, high priority badge, and deadline. The plan status is "active". |
| **Actual Result** | |

### Test Case 5: Add a Task to a Plan

| Field | Details |
|-------|---------|
| **Test Case ID** | TC-005 |
| **Title** | Add a Task to an Existing Plan |
| **Description** | Verify that a user can add a task within a plan's detail view. |
| **Preconditions** | The user is logged in and has at least one plan. The user is viewing the plan detail page. |
| **Test Steps** | 1. In the "New Task" form, enter the title: "Review Chapter 1". 2. Enter a description: "Read and take notes on Chapter 1." 3. Set a deadline. 4. Click "Add". |
| **Expected Result** | The task appears in the task list below the form. The task status is "pending". The plan's progress bar updates to show the new task. |
| **Actual Result** | |

### Test Case 6: Mark a Task as Completed

| Field | Details |
|-------|---------|
| **Test Case ID** | TC-006 |
| **Title** | Toggle Task Completion |
| **Description** | Verify that checking a task's checkbox marks it as completed and updates the progress bar. |
| **Preconditions** | The user is viewing a plan detail page with at least one pending task. |
| **Test Steps** | 1. Click the checkbox next to a pending task. |
| **Expected Result** | The task text shows a strikethrough. The task status changes to "completed". The plan's progress bar percentage increases. The completed task count increments. |
| **Actual Result** | |

### Test Case 7: Delete a Plan

| Field | Details |
|-------|---------|
| **Test Case ID** | TC-007 |
| **Title** | Delete a Plan and Its Tasks |
| **Description** | Verify that deleting a plan removes it and all associated tasks. |
| **Preconditions** | The user is logged in and has a plan with at least one task. |
| **Test Steps** | 1. Navigate to the Plans page. 2. Click "Delete" on a plan. 3. Confirm the deletion in the confirmation dialog. |
| **Expected Result** | The plan is removed from the plans list. Navigating to the plan's URL returns "Plan not found". All associated tasks are also deleted. |
| **Actual Result** | |

### Test Case 8: Create a Reminder

| Field | Details |
|-------|---------|
| **Test Case ID** | TC-008 |
| **Title** | Create a Reminder Linked to a Plan |
| **Description** | Verify that a user can create a reminder with a message and a future date/time, linked to a plan. |
| **Preconditions** | The user is logged in and has at least one plan. |
| **Test Steps** | 1. Navigate to the Reminders page. 2. Select a plan from the dropdown. 3. Enter a message: "Review notes before class". 4. Set a future date/time for the reminder. 5. Click "Create Reminder". |
| **Expected Result** | The reminder appears in the upcoming reminders list with the correct message, date/time, and linked plan title. |
| **Actual Result** | |

### Test Case 9: Dashboard Displays Summary Statistics

| Field | Details |
|-------|---------|
| **Test Case ID** | TC-009 |
| **Title** | Dashboard Shows Accurate Plan and Task Counts |
| **Description** | Verify that the dashboard accurately reflects the user's plan and task statistics. |
| **Preconditions** | The user is logged in and has at least 2 plans (1 active with 3 tasks, 1 completed). |
| **Test Steps** | 1. Navigate to the Dashboard. 2. Observe the stat cards at the top. |
| **Expected Result** | The "Active Plans" card shows the correct count. The "Completed" card shows the correct count. The "Tasks Done" and "Pending Tasks" cards reflect the correct task statuses. The bar chart and pie chart render with data. |
| **Actual Result** | |

### Test Case 10: Share a Plan with a Collaborator

| Field | Details |
|-------|---------|
| **Test Case ID** | TC-010 |
| **Title** | Invite a Collaborator as Viewer |
| **Description** | Verify that a plan owner can share a plan with another registered user as a viewer. |
| **Preconditions** | Two user accounts exist. The first user owns a plan. Both users are registered. |
| **Test Steps** | 1. Log in as the plan owner. 2. Navigate to the plan detail page. 3. Click "Share". 4. Enter the collaborator's email address. 5. Select role: "Viewer". 6. Click "Invite". 7. Log out and log in as the invited user. 8. Navigate to the Plans page. |
| **Expected Result** | A success message confirms the invitation. The collaborator appears in the collaborators list. When the invited user logs in, the shared plan appears in their plans list with a "shared" badge. The viewer cannot add, edit, or delete tasks. |
| **Actual Result** | |

### Test Case 11: Search and Filter Plans

| Field | Details |
|-------|---------|
| **Test Case ID** | TC-011 |
| **Title** | Search Plans by Title and Filter by Status |
| **Description** | Verify that the search bar and status filter work correctly on the Plans page. |
| **Preconditions** | The user has at least 3 plans: one active titled "Study Math", one completed titled "Study History", and one active titled "Gym Routine". |
| **Test Steps** | 1. Navigate to the Plans page. 2. Type "Study" in the search bar. 3. Observe the filtered results. 4. Click the "Active" status filter button. |
| **Expected Result** | After step 2: Only "Study Math" and "Study History" are shown. After step 4: Only "Study Math" is shown (active status and matching "Study" search). |
| **Actual Result** | |

### Test Case 12: Drag-and-Drop Task Reordering

| Field | Details |
|-------|---------|
| **Test Case ID** | TC-012 |
| **Title** | Reorder Tasks via Drag-and-Drop |
| **Description** | Verify that tasks can be reordered using drag-and-drop, and the new order persists after refresh. |
| **Preconditions** | The user has a plan with at least 3 tasks. |
| **Test Steps** | 1. Navigate to the plan detail page. 2. Drag the third task to the first position using the drag handle. 3. Refresh the page. |
| **Expected Result** | After step 2: The tasks are visually reordered immediately. After step 3: The new order is preserved (persisted to the database). |
| **Actual Result** | |

---

## Process Deliverable IV

### Process Model: Kanban

The team follows a Kanban-based workflow using GitHub Issues and Pull Requests to track work items through their lifecycle.

---

### Retrospective (PM4)

#### What Went Well
- Core functionality (auth, plans, tasks, reminders, dashboard) was implemented end-to-end.
- AI tooling (Claude Code) accelerated development and allowed the team to implement more features than originally scoped (tags, subtasks, collaborators, drag-and-drop).
- Code follows consistent patterns across all routes and components, making it easy for any team member to understand and modify.
- Security best practices were followed: httpOnly cookies, parameterized SQL queries, bcrypt hashing, CORS configuration.

#### What Could Be Improved
- Testing coverage needs expansion — current tests exist for auth, plans, reminders, and dashboard, but more comprehensive integration tests are needed.
- The frontend currently uses inline styles in many components; migrating to a more structured CSS approach (CSS modules or styled-components) would improve maintainability.
- Some features (e.g., SMS reminders via Twilio) are implemented but not fully tested in a production-like environment.

#### Action Items
- Increase test coverage for PM5.
- Set up a staging environment for end-to-end testing.
- Refine UI polish and accessibility.

---

### Sprint Review (PM4)

The following tasks were completed during the PM4 sprint:

| Task | Status | Assignee |
|------|--------|----------|
| Implement user authentication (email/password + Google OAuth) | Done | Team |
| Implement plans CRUD with filtering, search, and sort | Done | Team |
| Implement tasks CRUD with status management | Done | Team |
| Implement reminders CRUD with cron service | Done | Team |
| Implement dashboard with statistics and charts | Done | Team |
| Implement tags system for plans | Done | Team |
| Implement subtasks within tasks | Done | Team |
| Implement plan collaboration (invite/remove collaborators) | Done | Team |
| Implement drag-and-drop task reordering | Done | Team |
| Create database schema and migration runner | Done | Team |
| Set up frontend routing, auth context, and protected routes | Done | Team |
| Write initial unit tests for backend routes | Done | Team |
| Write initial component tests for frontend pages | Done | Team |
| Fix Google OAuth integration bug | Done | Andrew Wulff |
| Fix CI pipeline (npm ci to npm install) | Done | Team |

---

### Sprint Planning (PM5)

The following tasks are prioritized in the backlog for PM5:

| Priority | Task | Description |
|----------|------|-------------|
| High | Expand test coverage | Write additional unit and integration tests to cover edge cases and error scenarios |
| High | End-to-end testing | Set up Cypress or Playwright for automated browser testing |
| High | Deploy to cloud | Deploy backend and frontend to AWS or Azure infrastructure |
| Medium | UI/UX polish | Improve responsiveness, accessibility (ARIA labels), and visual consistency |
| Medium | Notification enhancements | Implement in-app notifications in addition to SMS |
| Medium | Password reset flow | Add forgot password / reset password functionality |
| Low | Performance optimization | Add pagination to plans/tasks list for users with many items |
| Low | Activity log | Track and display recent activity within plans |

### Updated Kanban Board

```
| Backlog              | In Progress          | Done (PM4)                        |
|----------------------|----------------------|-----------------------------------|
| E2E test setup       |                      | User authentication               |
| Cloud deployment     |                      | Plans CRUD + filtering/search     |
| Password reset       |                      | Tasks CRUD + drag-and-drop        |
| In-app notifications |                      | Subtasks                          |
| Pagination           |                      | Reminders + cron service          |
| Activity log         |                      | Dashboard + charts                |
| UI/UX polish         |                      | Tags system                       |
| Accessibility        |                      | Plan collaboration                |
|                      |                      | Database schema + migrations      |
|                      |                      | Unit tests (backend + frontend)   |
|                      |                      | CI pipeline fix                   |
|                      |                      | Google OAuth bug fix              |
```
