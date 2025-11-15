# Grit On Call - Deployment Guide

## Overview
LLM-powered onboarding chat with OpenAI streaming, 30-day plan generation, and Vapi call integration.

---

## 1. Database Setup

### Run Schema Updates
Execute the SQL in `supabase/schema_updates.sql` in your Supabase SQL Editor:

```sql
-- This will:
-- 1. Add monthly_goal, onboarding_completed, onboarding_data to users_public
-- 2. Create onboarding_sessions table
-- 3. Enhance micro_commitments with title, description, duration, week_number
-- 4. Create weekly_plans table
-- 5. Set up RLS policies
```

### Verify Tables
After running, confirm these tables exist:
- `users_public` (with new columns)
- `onboarding_sessions`
- `micro_commitments` (with new columns)
- `weekly_plans`

---

## 2. Environment Variables

### App (.env in project root)
```bash
# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# OpenAI (for client if needed, but mainly for Edge Functions)
EXPO_PUBLIC_OPENAI_API_KEY=sk-...
```

### Edge Functions
For each function, create a `.env` file (copy from `.env.example`):

**supabase/functions/onboarding_chat/.env**
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJ...
OPENAI_API_KEY=sk-...
```

**supabase/functions/generate_plan/.env**
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJ...
OPENAI_API_KEY=sk-...
```

**supabase/functions/mcp_router/.env**
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJ...
```

---

## 3. Deploy Edge Functions

### Install Supabase CLI
```bash
npm install -g supabase
```

### Login
```bash
supabase login
```

### Link Project
```bash
supabase link --project-ref your-project-ref
```

### Deploy Functions
```bash
# Deploy onboarding chat
supabase functions deploy onboarding_chat

# Deploy plan generation
supabase functions deploy generate_plan

# Deploy MCP router
supabase functions deploy mcp_router
```

### Set Secrets (Alternative to .env files)
```bash
supabase secrets set OPENAI_API_KEY=sk-...
supabase secrets set SUPABASE_URL=https://...
supabase secrets set SUPABASE_ANON_KEY=eyJ...
```

---

## 4. Test Edge Functions

### Test Onboarding Chat
```bash
curl -X POST https://your-project.supabase.co/functions/v1/onboarding_chat \
  -H "Authorization: Bearer YOUR_SUPABASE_JWT" \
  -H "Content-Type: application/json" \
  -d '{"message":"I want to run consistently"}'
```

### Test Plan Generation
```bash
curl -X POST https://your-project.supabase.co/functions/v1/generate_plan \
  -H "Authorization: Bearer YOUR_SUPABASE_JWT" \
  -H "Content-Type: application/json"
```

---

## 5. Run the App

### Install Dependencies
```bash
npm install
```

### Start Expo
```bash
npm run start
```

### Open on Device
- Scan QR code with Expo Go (Android/iOS)
- Or press `a` for Android emulator
- Or press `i` for iOS simulator

---

## 6. User Flow

### First Time User
1. **Login** → `/auth`
2. **Onboarding Chat** → `/onboarding/chat`
   - LLM asks 5 questions
   - Extracts structured data
   - Saves to `onboarding_sessions` and `users_public`
3. **Plan Generation** → Edge Function `generate_plan`
   - Creates 4 weeks × 7 days = 28 daily tasks
   - Saves to `weekly_plans` and `micro_commitments`
4. **Home Screen** → `/(tabs)`
   - Shows today's task
   - "CALL FOR GRIT" button

### Returning User
1. **Login** → `/auth`
2. **Home Screen** → `/(tabs)`
   - Shows streak, today's commitment
   - Can trigger Vapi call

---

## 7. OpenAI Usage & Costs

### Onboarding Chat
- Model: `gpt-4o-mini`
- Streaming: Yes
- Avg tokens per session: ~500-1000
- Cost: ~$0.0001-0.0002 per session

### Plan Generation
- Model: `gpt-4o-mini`
- JSON mode: Yes
- Avg tokens: ~2000-3000
- Cost: ~$0.0003-0.0005 per plan

### Monthly Estimate (100 users)
- 100 onboardings: $0.02
- 100 plans: $0.05
- **Total: ~$0.07/month**

---

## 8. Troubleshooting

### "Onboarding not completing"
- Check Edge Function logs: `supabase functions logs onboarding_chat`
- Verify OpenAI API key is set
- Ensure user has valid JWT

### "Plan not generating"
- Check logs: `supabase functions logs generate_plan`
- Verify onboarding_data exists in users_public
- Check OpenAI API quota

### "Database errors"
- Verify schema updates ran successfully
- Check RLS policies are enabled
- Ensure user has valid session

### "Streaming not working"
- Verify CORS headers in Edge Function
- Check network tab for SSE events
- Test with curl first

---

## 9. Next Steps

After onboarding is working, you can build:
1. **Plan Overview Screen** - Show 4 weeks with daily breakdown
2. **Daily Detail View** - Enhanced UI with coach messages
3. **Mark as Done** - Update `done_at` and increment streak
4. **Plan Regeneration** - Allow users to regenerate plans

---

## 10. Security Notes

- ✅ All Edge Functions require valid Supabase JWT
- ✅ RLS policies enforce user-scoped data access
- ✅ OpenAI API key never exposed to client
- ✅ CORS configured for your domain only (update in production)

---

## Support

For issues, check:
1. Supabase logs: Dashboard → Edge Functions → Logs
2. App logs: Expo DevTools console
3. Database: Supabase → Table Editor

---

**You're ready to go! 🚀**
