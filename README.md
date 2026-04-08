# Planit

A modern web-based planning application that helps people organize personal and professional goals. Create plans, set deadlines, track progress through tasks, and receive reminders — all through a clean, motivational interface.

**CS 3754 Cloud Software Development**
Team: Ahmad Harb, Yousif Abuhaija, Zann Khawaja, Andrew Wulff, Carson Breslow

---

## Tech Stack

| Layer          | Technology                              |
|----------------|-----------------------------------------|
| Frontend       | React.js (Create React App)             |
| Backend        | Node.js / Express                       |
| Database       | PostgreSQL                              |
| Authentication | JWT (httpOnly cookies) + Google OAuth    |
| Hosting        | AWS or Azure Cloud Infrastructure       |

---

## Getting Started

### Prerequisites

- Node.js (v18+)
- PostgreSQL (v14+)

### 1. Clone the repository

```bash
git clone https://github.com/DroidRobot/StudyAI.git
cd StudyAI/planit
```

### 2. Set up the backend

```bash
cd backend
cp .env.example .env
# Edit .env with your database URL, JWT secret, and Google OAuth credentials
npm install
npm run migrate
npm run dev
```

The API server starts at `http://localhost:3001`.

### 3. Set up the frontend

```bash
cd frontend
npm install
npm start
```

The app opens at `http://localhost:3000`.

---

## Environment Variables

Create a `.env` file in `planit/backend/` based on `.env.example`:

| Variable              | Description                        |
|-----------------------|------------------------------------|
| `DATABASE_URL`        | PostgreSQL connection string       |
| `JWT_SECRET`          | Secret key for signing JWT tokens  |
| `GOOGLE_CLIENT_ID`    | Google OAuth client ID             |
| `GOOGLE_CLIENT_SECRET`| Google OAuth client secret         |
| `PORT`                | Backend port (default: 3001)       |
| `FRONTEND_URL`        | Frontend origin for CORS           |

---

## Features

- **User Authentication** — Sign up with email/password or Google OAuth
- **Plans** — Create, edit, and delete plans with deadlines and priority levels
- **Tasks** — Break plans into tasks, mark them complete, track progress
- **Reminders** — Schedule reminders linked to plans or tasks
- **Dashboard** — View active plans, overdue items, upcoming deadlines, and task stats

---

## API Endpoints

### Auth
- `POST /api/auth/signup` — Register with email/password
- `POST /api/auth/login` — Log in
- `POST /api/auth/google` — Google OAuth login
- `POST /api/auth/logout` — Log out
- `GET  /api/auth/me` — Get current user

### Plans
- `GET    /api/plans` — List plans with task counts
- `GET    /api/plans/:id` — Get plan with tasks
- `POST   /api/plans` — Create plan
- `PUT    /api/plans/:id` — Update plan
- `DELETE /api/plans/:id` — Delete plan

### Tasks
- `GET    /api/tasks?plan_id=:id` — List tasks for a plan
- `POST   /api/tasks` — Create task
- `PUT    /api/tasks/:id` — Update task
- `DELETE /api/tasks/:id` — Delete task

### Reminders
- `GET    /api/reminders` — List upcoming reminders
- `POST   /api/reminders` — Create reminder
- `DELETE /api/reminders/:id` — Delete reminder

### Dashboard
- `GET /api/dashboard` — Summary stats, overdue plans, upcoming deadlines

---

## Project Structure

```
planit/
├── backend/
│   ├── src/
│   │   ├── index.js              # Express entry point
│   │   ├── config/db.js          # PostgreSQL pool
│   │   ├── middleware/auth.js     # JWT middleware
│   │   ├── routes/               # API route handlers
│   │   └── services/             # Reminder cron service
│   ├── migrations/               # SQL schema + runner
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.js                # Router + layout
│   │   ├── context/              # Auth state provider
│   │   ├── services/api.js       # Axios API client
│   │   ├── components/           # Navbar, ProtectedRoute, PlanModal
│   │   ├── pages/                # Login, Signup, Dashboard, Plans, Reminders
│   │   └── styles/App.css        # Application styles
│   └── package.json
└── CLAUDE.md
```
