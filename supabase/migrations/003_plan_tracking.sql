-- Plan tracking schema
-- Stores user plans, daily activities, and progress tracking

-- Plans table: stores the overall 30-day plan for each user
CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users_public(id) ON DELETE CASCADE,
  monthly_goal TEXT NOT NULL,
  category TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active', -- active, completed, abandoned
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Metadata
  daily_time_minutes INTEGER NOT NULL,
  current_level TEXT NOT NULL,
  preferred_time TEXT NOT NULL,
  
  -- Only one active plan per user
  CONSTRAINT unique_active_plan UNIQUE (user_id, status)
);

-- Daily activities table: stores each day's micro-commitment
CREATE TABLE IF NOT EXISTS daily_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL, -- 1-30
  scheduled_date DATE NOT NULL,
  
  -- Activity details
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  scheduled_time TIME,
  
  -- Week context
  week_number INTEGER NOT NULL, -- 1-4
  week_theme TEXT,
  
  -- Progress tracking
  status TEXT NOT NULL DEFAULT 'pending', -- pending, completed, skipped, failed
  completed_at TIMESTAMPTZ,
  target_reached TEXT, -- 'minimum', 'push', 'fallback', null
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT unique_plan_day UNIQUE (plan_id, day_number)
);

-- Call schedule table: tracks scheduled accountability calls
CREATE TABLE IF NOT EXISTS call_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users_public(id) ON DELETE CASCADE,
  daily_activity_id UUID REFERENCES daily_activities(id) ON DELETE CASCADE,
  
  scheduled_time TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled', -- scheduled, completed, missed, cancelled
  
  -- Call details
  duration_seconds INTEGER,
  notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_plans_user_status ON plans(user_id, status);
CREATE INDEX IF NOT EXISTS idx_daily_activities_plan ON daily_activities(plan_id);
CREATE INDEX IF NOT EXISTS idx_daily_activities_date ON daily_activities(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_call_schedule_user ON call_schedule(user_id);
CREATE INDEX IF NOT EXISTS idx_call_schedule_time ON call_schedule(scheduled_time);

-- RLS Policies
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_schedule ENABLE ROW LEVEL SECURITY;

-- Users can only see their own plans
CREATE POLICY "Users can view own plans" ON plans
  FOR SELECT USING (auth.uid() IN (SELECT auth_id FROM users_public WHERE id = user_id));

CREATE POLICY "Users can insert own plans" ON plans
  FOR INSERT WITH CHECK (auth.uid() IN (SELECT auth_id FROM users_public WHERE id = user_id));

CREATE POLICY "Users can update own plans" ON plans
  FOR UPDATE USING (auth.uid() IN (SELECT auth_id FROM users_public WHERE id = user_id));

-- Users can only see their own daily activities
CREATE POLICY "Users can view own activities" ON daily_activities
  FOR SELECT USING (plan_id IN (SELECT id FROM plans WHERE user_id IN (SELECT id FROM users_public WHERE auth_id = auth.uid())));

CREATE POLICY "Users can update own activities" ON daily_activities
  FOR UPDATE USING (plan_id IN (SELECT id FROM plans WHERE user_id IN (SELECT id FROM users_public WHERE auth_id = auth.uid())));

-- Users can only see their own call schedule
CREATE POLICY "Users can view own calls" ON call_schedule
  FOR SELECT USING (auth.uid() IN (SELECT auth_id FROM users_public WHERE id = user_id));

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_plans_updated_at BEFORE UPDATE ON plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_activities_updated_at BEFORE UPDATE ON daily_activities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to get today's activity for a user
CREATE OR REPLACE FUNCTION get_todays_activity(user_auth_id UUID)
RETURNS TABLE (
  activity_id UUID,
  title TEXT,
  description TEXT,
  duration_minutes INTEGER,
  scheduled_time TIME,
  status TEXT,
  day_number INTEGER,
  week_theme TEXT,
  monthly_goal TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    da.id,
    da.title,
    da.description,
    da.duration_minutes,
    da.scheduled_time,
    da.status,
    da.day_number,
    da.week_theme,
    p.monthly_goal
  FROM daily_activities da
  JOIN plans p ON da.plan_id = p.id
  JOIN users_public u ON p.user_id = u.id
  WHERE u.auth_id = user_auth_id
    AND da.scheduled_date = CURRENT_DATE
    AND p.status = 'active'
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark activity as complete
CREATE OR REPLACE FUNCTION complete_activity(
  activity_id UUID,
  target_level TEXT -- 'minimum', 'push', 'fallback'
)
RETURNS VOID AS $$
BEGIN
  UPDATE daily_activities
  SET 
    status = 'completed',
    completed_at = NOW(),
    target_reached = target_level
  WHERE id = activity_id;
  
  -- Update user streak
  UPDATE users_public
  SET 
    streak = streak + 1,
    updated_at = NOW()
  WHERE id IN (
    SELECT p.user_id 
    FROM daily_activities da
    JOIN plans p ON da.plan_id = p.id
    WHERE da.id = activity_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
