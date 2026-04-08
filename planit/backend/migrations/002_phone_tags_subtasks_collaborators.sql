-- Migration 002: Add phone_number, tags, subtasks, and plan collaborators

-- Add phone_number to users for Twilio SMS reminders
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20);

-- Tags: user-defined labels to organise plans
CREATE TABLE IF NOT EXISTS tags (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(50) NOT NULL,
  color VARCHAR(7) DEFAULT '#4f46e5',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, name)
);

-- Junction table: many-to-many between plans and tags
CREATE TABLE IF NOT EXISTS plan_tags (
  plan_id INTEGER REFERENCES plans(id) ON DELETE CASCADE NOT NULL,
  tag_id  INTEGER REFERENCES tags(id)  ON DELETE CASCADE NOT NULL,
  PRIMARY KEY (plan_id, tag_id)
);

-- Subtasks: checklist items beneath a task
CREATE TABLE IF NOT EXISTS subtasks (
  id           SERIAL PRIMARY KEY,
  task_id      INTEGER REFERENCES tasks(id)  ON DELETE CASCADE NOT NULL,
  user_id      INTEGER REFERENCES users(id)  ON DELETE CASCADE NOT NULL,
  title        VARCHAR(255) NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  sort_order   INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Plan collaborators: share a plan with another user
CREATE TABLE IF NOT EXISTS plan_collaborators (
  plan_id    INTEGER REFERENCES plans(id)  ON DELETE CASCADE NOT NULL,
  user_id    INTEGER REFERENCES users(id)  ON DELETE CASCADE NOT NULL,
  role       VARCHAR(10) CHECK (role IN ('viewer', 'editor')) DEFAULT 'viewer',
  invited_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (plan_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tags_user_id          ON tags(user_id);
CREATE INDEX IF NOT EXISTS idx_plan_tags_plan_id     ON plan_tags(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_tags_tag_id      ON plan_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_subtasks_task_id      ON subtasks(task_id);
CREATE INDEX IF NOT EXISTS idx_collaborators_user_id ON plan_collaborators(user_id);
CREATE INDEX IF NOT EXISTS idx_collaborators_plan_id ON plan_collaborators(plan_id);
