-- Fix RLS policies to allow inserts for daily_activities and call_schedule

-- Add INSERT policy for daily_activities
CREATE POLICY "Users can insert own activities" ON daily_activities
  FOR INSERT 
  WITH CHECK (
    plan_id IN (
      SELECT id FROM plans 
      WHERE user_id IN (
        SELECT id FROM users_public 
        WHERE auth_id = auth.uid()
      )
    )
  );

-- Add INSERT policy for call_schedule
CREATE POLICY "Users can insert own calls" ON call_schedule
  FOR INSERT 
  WITH CHECK (
    auth.uid() IN (
      SELECT auth_id FROM users_public 
      WHERE id = user_id
    )
  );
