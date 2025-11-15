-- Reset Onboarding for Testing
-- Run this in Supabase SQL Editor to test the onboarding flow again

-- STEP 1: Find your user's email first
-- Uncomment and run this to see all users:
-- SELECT id, email FROM auth.users;

-- STEP 2: Replace 'your-email@example.com' with your actual email
-- Then run the queries below:

-- Reset onboarding status
UPDATE users_public
SET 
  onboarding_completed = false,
  onboarding_data = NULL,
  monthly_goal = NULL
WHERE auth_id = (
  SELECT id FROM auth.users WHERE email = 'your-email@example.com'
);

-- Optional: Clean up old onboarding sessions
DELETE FROM onboarding_sessions 
WHERE user_id IN (
  SELECT id FROM users_public 
  WHERE auth_id = (SELECT id FROM auth.users WHERE email = 'your-email@example.com')
);

-- Optional: Clean up old plans (if you want to start fresh)
DELETE FROM weekly_plans
WHERE user_id IN (
  SELECT id FROM users_public 
  WHERE auth_id = (SELECT id FROM auth.users WHERE email = 'your-email@example.com')
);

DELETE FROM micro_commitments
WHERE user_id IN (
  SELECT id FROM users_public 
  WHERE auth_id = (SELECT id FROM auth.users WHERE email = 'your-email@example.com')
);

-- Verify the reset worked
SELECT 
  up.id,
  au.email,
  up.onboarding_completed,
  up.monthly_goal,
  up.onboarding_data
FROM users_public up
JOIN auth.users au ON up.auth_id = au.id
WHERE au.email = 'your-email@example.com';
