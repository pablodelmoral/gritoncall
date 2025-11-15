-- Schema updates for LLM-powered onboarding and 30-day plans
-- Run these in your Supabase SQL editor

-- 1. Add monthly_goal to users_public
ALTER TABLE users_public 
ADD COLUMN IF NOT EXISTS monthly_goal TEXT,
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS onboarding_data JSONB;

-- 2. Create onboarding_sessions table (tracks conversation)
CREATE TABLE IF NOT EXISTS onboarding_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users_public(id) ON DELETE CASCADE,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  extracted_data JSONB,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_onboarding_sessions_user_id ON onboarding_sessions(user_id);

-- 3. Enhance micro_commitments table
ALTER TABLE micro_commitments
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS duration_minutes INTEGER,
ADD COLUMN IF NOT EXISTS week_number INTEGER,
ADD COLUMN IF NOT EXISTS day_of_week INTEGER,
ADD COLUMN IF NOT EXISTS planned BOOLEAN DEFAULT TRUE;

-- 4. Create weekly_plans table
CREATE TABLE IF NOT EXISTS weekly_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users_public(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  focus_area TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, week_number)
);

CREATE INDEX IF NOT EXISTS idx_weekly_plans_user_id ON weekly_plans(user_id);

-- 5. Enable RLS on new tables
ALTER TABLE onboarding_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_plans ENABLE ROW LEVEL SECURITY;

-- RLS Policies for onboarding_sessions
CREATE POLICY "Users can view own onboarding sessions"
  ON onboarding_sessions FOR SELECT
  USING (user_id IN (SELECT id FROM users_public WHERE auth_id = auth.uid()));

CREATE POLICY "Users can insert own onboarding sessions"
  ON onboarding_sessions FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM users_public WHERE auth_id = auth.uid()));

CREATE POLICY "Users can update own onboarding sessions"
  ON onboarding_sessions FOR UPDATE
  USING (user_id IN (SELECT id FROM users_public WHERE auth_id = auth.uid()));

-- RLS Policies for weekly_plans
CREATE POLICY "Users can view own weekly plans"
  ON weekly_plans FOR SELECT
  USING (user_id IN (SELECT id FROM users_public WHERE auth_id = auth.uid()));

CREATE POLICY "Users can insert own weekly plans"
  ON weekly_plans FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM users_public WHERE auth_id = auth.uid()));

CREATE POLICY "Users can update own weekly plans"
  ON weekly_plans FOR UPDATE
  USING (user_id IN (SELECT id FROM users_public WHERE auth_id = auth.uid()));
