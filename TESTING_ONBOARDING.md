# Testing the Onboarding Flow

## Option 1: Create a New Test User

1. **Sign out** from the app (if logged in)
2. **Sign up** with a new email at `/auth`
3. After login, you'll be automatically redirected to `/onboarding/chat`

---

## Option 2: Reset Existing User's Onboarding Status

### Via Supabase Dashboard (Easiest)

1. Go to your Supabase Dashboard
2. Navigate to **Table Editor** → `users_public`
3. Find your user row (by email or auth_id)
4. Set `onboarding_completed` to `false` (uncheck the box)
5. Click **Save**
6. Refresh your app or sign out and back in
7. You'll be redirected to `/onboarding/chat`

### Via SQL Editor

Run this SQL in Supabase SQL Editor:

```sql
-- Replace 'your-email@example.com' with your actual email
UPDATE users_public
SET onboarding_completed = false,
    onboarding_data = NULL,
    monthly_goal = NULL
WHERE auth_id = (
  SELECT id FROM auth.users WHERE email = 'your-email@example.com'
);
```

---

## Option 3: Direct Navigation (For Development)

If you just want to see the UI without the full flow:

1. **Temporarily comment out** the onboarding check in `app/index.tsx`:

```typescript
// Comment this out:
// if (!profile?.onboarding_completed) {
//   return <Redirect href={"/onboarding/chat" as any} />;
// }

// Add this instead:
return <Redirect href={"/onboarding/chat" as any} />;
```

2. Save and refresh the app
3. You'll go straight to onboarding chat
4. **Remember to uncomment after testing!**

---

## What to Test

### 1. Chat Flow
- ✅ Coach asks first question
- ✅ You can type and send answers
- ✅ Responses stream in real-time
- ✅ Coach asks 5 questions total
- ✅ After question 5, extraction happens

### 2. Data Extraction
- ✅ Check `onboarding_sessions` table for saved messages
- ✅ Check `users_public.onboarding_data` for extracted JSON
- ✅ Verify `onboarding_completed` is set to `true`

### 3. Plan Generation
- ✅ After extraction, "Generating plan..." message appears
- ✅ Check `weekly_plans` table (should have 4 rows)
- ✅ Check `micro_commitments` table (should have 28 rows)
- ✅ Redirects to home screen

### 4. Home Screen
- ✅ Shows today's commitment from generated plan
- ✅ Shows streak (should be 0 for new user)
- ✅ "CALL FOR GRIT" button works

---

## Troubleshooting

### "Not redirecting to onboarding"
- Clear app cache: Stop expo, run `npx expo start -c`
- Check database: Verify `onboarding_completed` is `false`
- Check console for errors

### "Chat not responding"
- Verify Edge Functions are deployed
- Check OpenAI API key is set in Edge Function secrets
- View logs: `supabase functions logs onboarding_chat`

### "Plan not generating"
- Check Edge Function logs: `supabase functions logs generate_plan`
- Verify `onboarding_data` exists in database
- Check OpenAI API quota/billing

---

## Quick Reset Script

Save this as a bookmark in Supabase SQL Editor:

```sql
-- Quick reset for testing (replace email)
UPDATE users_public
SET 
  onboarding_completed = false,
  onboarding_data = NULL,
  monthly_goal = NULL
WHERE auth_id = (
  SELECT id FROM auth.users WHERE email = 'YOUR_EMAIL_HERE'
);

-- Also delete old sessions and plans
DELETE FROM onboarding_sessions 
WHERE user_id IN (
  SELECT id FROM users_public 
  WHERE auth_id = (SELECT id FROM auth.users WHERE email = 'YOUR_EMAIL_HERE')
);

DELETE FROM weekly_plans
WHERE user_id IN (
  SELECT id FROM users_public 
  WHERE auth_id = (SELECT id FROM auth.users WHERE email = 'YOUR_EMAIL_HERE')
);

DELETE FROM micro_commitments
WHERE user_id IN (
  SELECT id FROM users_public 
  WHERE auth_id = (SELECT id FROM auth.users WHERE email = 'YOUR_EMAIL_HERE')
);
```

Run this whenever you want to test onboarding from scratch!
