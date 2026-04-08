# Project Milestone 3: Design

**Project:** Planit -- A Modern Planning Application
**Course:** CS 3754 Cloud Software Development
**Team:** Wulff, Breslow, Abu Harb, Abuhaija, Khawaja
**Date:** April 1, 2026

---

## 1. High-Level Design (Architectural Pattern)

### Selected Pattern: Client-Server with Layered Architecture

Planit uses a **client-server architectural pattern** organized into distinct **layers** on both sides. The frontend (React SPA) acts as a thin client that communicates over HTTP/REST with a backend API server (Node.js/Express), which in turn manages all business logic and data persistence through PostgreSQL.

```
 +---------------------+         HTTPS / REST          +---------------------+
 |    CLIENT (SPA)     | <---------------------------> |    SERVER (API)      |
 |                     |     JSON over HTTP/HTTPS      |                     |
 |  +--------------+   |                               |  +--------------+   |
 |  | Pages/Views  |   |                               |  | Routes       |   |
 |  +--------------+   |                               |  +--------------+   |
 |  | Components   |   |                               |  | Middleware   |   |
 |  +--------------+   |                               |  +--------------+   |
 |  | Context/State|   |                               |  | Services     |   |
 |  +--------------+   |                               |  +--------------+   |
 |  | API Service  |   |                               |  | Data Access  |   |
 |  +--------------+   |                               |  +--------------+   |
 +---------------------+                               |         |           |
        Browser                                        +---------|-----------+
                                                                 |
                                                       +---------v-----------+
                                                       |    PostgreSQL DB    |
                                                       +---------------------+
```

**Frontend Layers:**
1. **Pages/Views** -- Top-level route components (Dashboard, Plans, PlanDetail, Reminders, Login, Signup)
2. **Components** -- Reusable UI elements (Navbar, ProtectedRoute, PlanModal)
3. **Context/State** -- Global state management via React Context (AuthContext)
4. **API Service** -- Centralized Axios HTTP client (`api.js`) providing named exports for every endpoint

**Backend Layers:**
1. **Routes** -- Express route handlers defining REST endpoints for auth, plans, tasks, reminders, and dashboard
2. **Middleware** -- Cross-cutting concerns: JWT authentication, CORS, cookie parsing, JSON body parsing
3. **Services** -- Background processes like the cron-based reminder checker (`reminderService.js`)
4. **Data Access** -- PostgreSQL connection pool (`db.js`) with parameterized SQL queries executed directly in route handlers

### Justification

The client-server pattern is the natural fit for Planit for several reasons:

1. **Separation of concerns:** The frontend handles presentation and user interaction while the backend handles authentication, business rules, and data integrity. Neither side needs to know the implementation details of the other -- they communicate through a well-defined REST API contract.

2. **Independent deployment and scaling:** The React SPA is served as static files (deployable to a CDN or S3 bucket), while the Express API server can scale independently on cloud infrastructure (AWS/Azure). The PostgreSQL database can also be managed and scaled separately.

3. **Security:** Sensitive operations (password hashing, JWT signing, database access, Google OAuth verification) remain exclusively on the server. The client never touches secrets, database credentials, or raw tokens -- JWT is stored in httpOnly cookies to prevent XSS attacks.

4. **Team parallelism:** A five-person team benefits from the clear boundary between frontend and backend work. Team members can work on React pages or Express routes independently, coordinating only on the API contract.

5. **Cloud-native alignment:** This architecture maps directly to common cloud deployment patterns -- a static frontend hosted on a CDN, an API server behind a load balancer, and a managed PostgreSQL instance -- which aligns with the course's cloud software development focus.

---

## 2. Low-Level Design (Design Pattern)

### Selected Pattern Family: Behavioral -- Strategy Pattern

**Subtask:** Dashboard data aggregation

The Dashboard endpoint (`GET /api/dashboard`) currently computes multiple summary statistics (active plan count, completed plan count, completed tasks, pending reminders, overdue plans, upcoming deadlines). As the application grows, different dashboard "widgets" may need different aggregation strategies, and we may want to add new metrics without modifying the core dashboard handler.

The **Strategy pattern** encapsulates each aggregation query into its own interchangeable strategy object, allowing the dashboard handler to dynamically compose which metrics to compute.

### Informal Class Diagram

```
+-----------------------------+
|    DashboardController      |
|-----------------------------|
| - strategies: Strategy[]    |
|-----------------------------|
| + getSummary(userId): obj   |
+-------------+---------------+
              |  uses
              v
+-----------------------------+
|    <<interface>>            |
|    DashboardStrategy        |
|-----------------------------|
| + getKey(): string          |
| + execute(userId): any      |
+-----------------------------+
       ^         ^         ^
       |         |         |
+------+--+ +---+------+ +---+-----------+
|PlanStats| |TaskStats | |ReminderStats  |
|Strategy | |Strategy  | |Strategy       |
|---------| |----------| |---------------|
|+getKey()| |+getKey() | |+getKey()      |
|+execute()| |+execute()| |+execute()     |
+----------+ +----------+ +---------------+

       ^              ^
       |              |
+------+------+ +-----+--------+
|OverduePlans | |UpcomingDeadlines|
|Strategy     | |Strategy         |
|-------------| |-----------------|
|+getKey()    | |+getKey()        |
|+execute()   | |+execute()       |
+-------------+ +-----------------+
```

### Code Representation

```javascript
// --- Strategy Interface (via duck typing in JavaScript) ---

// Each strategy must implement: getKey() and execute(userId)

class PlanStatsStrategy {
  getKey() { return 'planStats'; }

  async execute(userId) {
    const result = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'active') AS active_plans,
         COUNT(*) FILTER (WHERE status = 'completed') AS completed_plans
       FROM plans WHERE user_id = $1`,
      [userId]
    );
    return result.rows[0];
  }
}

class TaskStatsStrategy {
  getKey() { return 'taskStats'; }

  async execute(userId) {
    const result = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'completed') AS completed_tasks,
         COUNT(*) FILTER (WHERE status = 'pending') AS pending_tasks
       FROM tasks WHERE user_id = $1`,
      [userId]
    );
    return result.rows[0];
  }
}

class OverduePlansStrategy {
  getKey() { return 'overduePlans'; }

  async execute(userId) {
    const result = await pool.query(
      `SELECT id, title, deadline FROM plans
       WHERE user_id = $1 AND status = 'active'
         AND deadline < NOW()
       ORDER BY deadline ASC LIMIT 5`,
      [userId]
    );
    return result.rows;
  }
}

class UpcomingDeadlinesStrategy {
  getKey() { return 'upcomingDeadlines'; }

  async execute(userId) {
    const result = await pool.query(
      `SELECT id, title, deadline FROM plans
       WHERE user_id = $1 AND status = 'active'
         AND deadline BETWEEN NOW() AND NOW() + INTERVAL '7 days'
       ORDER BY deadline ASC`,
      [userId]
    );
    return result.rows;
  }
}

class ReminderStatsStrategy {
  getKey() { return 'upcomingReminders'; }

  async execute(userId) {
    const result = await pool.query(
      `SELECT id, message, remind_at FROM reminders
       WHERE user_id = $1 AND is_sent = FALSE
       ORDER BY remind_at ASC LIMIT 5`,
      [userId]
    );
    return result.rows;
  }
}

// --- Dashboard Controller (Context) ---

class DashboardController {
  constructor(strategies) {
    this.strategies = strategies;
  }

  async getSummary(userId) {
    const results = {};
    // Execute all strategies concurrently
    const entries = await Promise.all(
      this.strategies.map(async (strategy) => ({
        key: strategy.getKey(),
        value: await strategy.execute(userId),
      }))
    );
    for (const { key, value } of entries) {
      results[key] = value;
    }
    return results;
  }
}

// --- Usage in Express Route ---

const dashboardController = new DashboardController([
  new PlanStatsStrategy(),
  new TaskStatsStrategy(),
  new OverduePlansStrategy(),
  new UpcomingDeadlinesStrategy(),
  new ReminderStatsStrategy(),
]);

router.get('/', authenticate, async (req, res) => {
  try {
    const summary = await dashboardController.getSummary(req.user.id);
    res.json(summary);
  } catch (err) {
    console.error('Dashboard error:', err.message);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});
```

### Justification

The **Strategy pattern** (a Behavioral pattern) is well-suited here because:

1. **Open/Closed Principle:** New dashboard widgets (e.g., "plans completed this week," "streak tracking") can be added by creating a new strategy class and registering it -- without modifying the DashboardController or existing strategies.

2. **Single Responsibility:** Each strategy encapsulates exactly one query and its result transformation. This makes individual metrics easy to test, debug, and optimize in isolation.

3. **Concurrent execution:** Because strategies are independent, the controller can execute all of them in parallel via `Promise.all()`, significantly reducing dashboard load time compared to sequential queries.

4. **Composability:** Different views or user roles could use different subsets of strategies. For example, a mobile dashboard might only use `PlanStatsStrategy` and `TaskStatsStrategy` for a lighter payload.

---

## 3. Design Sketch

### Wireframe: Primary User Flow -- Creating a Plan and Adding Tasks

```
+================================================================+
|  PLANIT                           [Dashboard] [Plans] [Logout]  |
+================================================================+

SCREEN 1: DASHBOARD (Landing after login)
+----------------------------------------------------------------+
|  Welcome back, Sarah!                                           |
|                                                                 |
|  +------------+  +------------+  +------------+  +------------+ |
|  | Active     |  | Completed  |  | Tasks Done |  | Pending    | |
|  | Plans: 3   |  | Plans: 5   |  | 12         |  | Reminders:2| |
|  +------------+  +------------+  +------------+  +------------+ |
|                                                                 |
|  OVERDUE PLANS                    UPCOMING DEADLINES            |
|  +-------------------------+      +-------------------------+   |
|  | ! Capstone Report       |      | Final Exam Prep  Apr 15 |  |
|  |   Due: Mar 28           |      | Budget Review    Apr 20 |  |
|  +-------------------------+      +-------------------------+   |
|                                                                 |
|  UPCOMING REMINDERS                                             |
|  +----------------------------------------------------------+  |
|  | Apr 2 - Review capstone draft                             |  |
|  | Apr 5 - Submit budget spreadsheet                         |  |
|  +----------------------------------------------------------+  |
|                                                 [View Plans ->] |
+----------------------------------------------------------------+

SCREEN 2: PLANS LIST
+----------------------------------------------------------------+
|  My Plans                                    [+ Create Plan]    |
|                                                                 |
|  +----------------------------------------------------------+  |
|  | Final Exam Prep            HIGH    Active    Apr 15       |  |
|  | [=======--------] 60% complete     [Edit] [Delete]       |  |
|  +----------------------------------------------------------+  |
|  | Budget Review              MEDIUM  Active    Apr 20       |  |
|  | [===------------] 25% complete     [Edit] [Delete]       |  |
|  +----------------------------------------------------------+  |
|  | Capstone Report            HIGH    Active    Mar 28       |  |
|  | [================] 100% complete   [Complete] [Delete]    |  |
|  +----------------------------------------------------------+  |
+----------------------------------------------------------------+

SCREEN 3: CREATE PLAN MODAL (overlays Screen 2)
+----------------------------------------------------------------+
|                                                                 |
|   +------------------------------------------------------+     |
|   |  Create New Plan                              [X]    |     |
|   |                                                      |     |
|   |  Title:    [Spring Cleaning               ]         |     |
|   |                                                      |     |
|   |  Descrip:  [Declutter and organize the     ]         |     |
|   |            [apartment before summer        ]         |     |
|   |                                                      |     |
|   |  Deadline: [2026-04-30       ]                       |     |
|   |                                                      |     |
|   |  Priority: ( ) Low  (o) Medium  ( ) High             |     |
|   |                                                      |     |
|   |            [Cancel]            [Create Plan]         |     |
|   +------------------------------------------------------+     |
|                                                                 |
+----------------------------------------------------------------+

SCREEN 4: PLAN DETAIL (after selecting a plan)
+----------------------------------------------------------------+
|  <- Back to Plans                                               |
|                                                                 |
|  Spring Cleaning                                                |
|  Declutter and organize the apartment before summer             |
|  Deadline: Apr 30, 2026 | Priority: MEDIUM | Status: Active    |
|                                                                 |
|  TASKS                                          [+ Add Task]   |
|  +----------------------------------------------------------+  |
|  | [x] Sort through closet                      Apr 10      |  |
|  +----------------------------------------------------------+  |
|  | [ ] Deep clean kitchen                       Apr 15      |  |
|  +----------------------------------------------------------+  |
|  | [ ] Organize garage                          Apr 25      |  |
|  +----------------------------------------------------------+  |
|                                                                 |
|  REMINDERS                                  [+ Add Reminder]   |
|  +----------------------------------------------------------+  |
|  | Apr 8 - Start closet sorting this weekend                 |  |
|  +----------------------------------------------------------+  |
+----------------------------------------------------------------+
```

### Design Rationale

The wireframe follows a **progressive disclosure** pattern: the Dashboard provides a high-level summary with at-a-glance statistics, the Plans list gives an overview of all plans with progress indicators, and the Plan Detail view exposes full task-level granularity. This three-level navigation hierarchy (Dashboard -> Plans -> Plan Detail) reduces cognitive load by only showing the level of detail relevant to the user's current intent, consistent with Shneiderman's "overview first, zoom and filter, then details-on-demand" information-seeking mantra.

Key design decisions include: (1) a **modal for plan creation/editing** rather than a separate page, keeping the user in context and reducing navigation; (2) **inline task checkboxes** for quick status toggling without extra clicks; (3) **color-coded priority badges** (high = red, medium = yellow, low = green) for rapid visual scanning; and (4) **persistent top navigation** so the user can always jump between Dashboard, Plans, and Reminders without breadcrumb confusion. Compared to the lightning talk, we added the overdue plans section to the Dashboard and the progress bars on the Plans list, both of which give users immediate feedback on their planning health without navigating deeper -- a direct application of the recognition-over-recall heuristic (Nielsen's Usability Heuristics).

---

## 4. Process Deliverable III

### Process Model: Scrum

Our team follows **Scrum** with one-week sprints aligned to each project milestone.

---

### Sprint Retrospective (PM2 -> PM3)

**What went well:**
- The backend API was fully implemented ahead of schedule, allowing the frontend team to integrate against real endpoints rather than mocks.
- JWT authentication with httpOnly cookies was implemented correctly on the first attempt, avoiding common security pitfalls.
- Database schema design was stable -- no migration changes were needed after the initial schema was merged.
- Daily async standups via Discord kept everyone informed without blocking.

**What could be improved:**
- Frontend styling was inconsistent across pages because multiple team members styled independently. We need a shared design system or at minimum a shared CSS variables file.
- The Google OAuth integration required more coordination between frontend and backend than expected. In the future, auth features should be assigned to a single pair.
- Code reviews took too long (1-2 days). We will aim for <24-hour review turnaround going forward.

**Action items for next sprint:**
1. Establish shared CSS variables for colors, spacing, and typography.
2. Assign OAuth-related work to a single developer pair.
3. Set a 24-hour SLA on pull request reviews.

---

### Sprint Review (PM3)

**Sprint Goal:** Complete system design documentation and refine the application architecture.

**Completed items:**
| Task | Assignee | Status |
|------|----------|--------|
| Document high-level architecture (client-server layered pattern) | Wulff | Done |
| Design Strategy pattern for dashboard aggregation | Breslow | Done |
| Create wireframe mockups for all primary screens | Abu Harb | Done |
| Write design rationale with HCI justification | Abuhaija | Done |
| Conduct sprint retrospective and planning | Khawaja | Done |

**Demo highlights:**
- Walked through the architectural diagram showing the clear separation between frontend layers (Pages, Components, Context, API Service) and backend layers (Routes, Middleware, Services, Data Access).
- Demonstrated how the Strategy pattern allows adding new dashboard widgets without modifying existing code, with a live code walkthrough.
- Presented wireframe storyboard showing the complete user flow from Dashboard to Plan creation to Task management.

**Stakeholder feedback:**
- The wireframes clearly communicate the user flow. Consider adding a search/filter capability on the Plans list for users with many plans.
- The Strategy pattern is a good fit for dashboard extensibility but keep it simple for now -- don't over-engineer before it's needed.

---

### Sprint Planning (PM4)

**Sprint Goal:** Implement the full frontend UI, integrate all API endpoints, and deploy to cloud infrastructure.

**Prioritized Backlog for PM4:**

| Priority | Task | Story Points | Assignee |
|----------|------|-------------|----------|
| P0 | Implement Dashboard page with live API data | 5 | Wulff |
| P0 | Implement Plans list page with CRUD operations | 5 | Breslow |
| P0 | Implement Plan Detail page with task management | 5 | Abu Harb |
| P0 | Implement Reminders page | 3 | Abuhaija |
| P0 | Implement Login and Signup pages with form validation | 3 | Khawaja |
| P1 | Google OAuth frontend integration | 3 | Khawaja |
| P1 | Responsive CSS + shared design system (CSS variables) | 5 | Abu Harb |
| P1 | Deploy backend to AWS (EC2 or Elastic Beanstalk) | 3 | Wulff |
| P1 | Deploy frontend to AWS (S3 + CloudFront) | 3 | Breslow |
| P1 | Set up PostgreSQL on AWS RDS | 2 | Abuhaija |
| P2 | End-to-end testing of all user flows | 5 | All |
| P2 | Error handling and loading states across all pages | 3 | All |

**Total estimated points:** 45
**Team velocity (PM3):** 38 points
**Capacity note:** PM4 is the implementation-heavy milestone. We have allocated 45 points anticipating improved velocity from better code review SLAs and the established design from PM3.

**Sprint ceremonies scheduled:**
- Daily async standups: Discord #planit-standup
- Mid-sprint sync: Wednesday, April 8
- Sprint review/demo: April 14
- Retrospective: April 14 (after demo)
