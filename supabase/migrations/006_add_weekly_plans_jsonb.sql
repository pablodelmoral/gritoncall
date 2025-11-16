-- Add weekly_plans JSONB column to plans table
-- This allows storing the complete 30-day plan structure in one field

ALTER TABLE plans 
ADD COLUMN IF NOT EXISTS weekly_plans JSONB;

-- Add a comment explaining the structure
COMMENT ON COLUMN plans.weekly_plans IS 'JSONB array containing 4 weekly plans, each with theme and micro_commitments array';

-- Example structure:
-- [
--   {
--     "week_number": 1,
--     "theme": "Foundation Building",
--     "micro_commitments": [
--       {
--         "day_of_week": 1,
--         "title": "Morning stretch",
--         "description": "10 min gentle stretching",
--         "duration_minutes": 10,
--         "scheduled_time": "07:30",
--         "fallback": "5 min stretch if tight on time"
--       },
--       ...
--     ]
--   },
--   ...
-- ]
