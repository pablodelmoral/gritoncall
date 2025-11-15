-- Fix the unique constraint on plans table
-- The constraint should only apply to active plans, not all statuses

-- Drop the old constraint
ALTER TABLE plans DROP CONSTRAINT IF EXISTS unique_active_plan;

-- Add a partial unique index instead (only for active plans)
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_plan_per_user 
  ON plans(user_id) 
  WHERE status = 'active';
