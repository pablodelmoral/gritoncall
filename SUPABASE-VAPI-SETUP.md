# Supabase + Vapi Setup Guide (No n8n Required!)

Complete guide to set up automated accountability calls using **only Supabase and Vapi**.

---

## ✅ Why This Approach?

- **Simpler**: No extra services to manage
- **Cheaper**: Save $20-50/month (no n8n costs)
- **Scalable**: Handles unlimited users
- **Integrated**: Everything in Supabase
- **Reliable**: Serverless edge functions

---

## 🚀 Quick Overview

**What we're building:**
1. **Supabase Edge Functions** - Serverless functions for call logic
2. **pg_cron** - Built-in PostgreSQL scheduler
3. **Database Functions** - Smart SQL functions for scheduling
4. **Vapi** - Voice AI for making calls

**Total cost for 100 users:** ~$920/month (Vapi only)

---

## Phase 1: Vapi Setup (10 minutes)

### 1. Create Vapi Account
1. Go to https://vapi.ai
2. Sign up and verify email
3. Complete onboarding

### 2. Get API Key
1. Dashboard → Settings → API Keys
2. Create new API key
3. **Copy and save it** - you'll need this later

### 3. Purchase Phone Number
1. Dashboard → Phone Numbers
2. Click "Buy Number"
3. Choose US number (~$1-2/month)
4. **Copy the Phone Number ID**

### 4. Configure Webhook (Do this AFTER deploying Edge Functions)
1. Dashboard → Settings → Webhooks
2. Set URL to: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/vapi-webhook`
3. Enable events:
   - `call.started`
   - `call.ended`
   - `call.failed`
   - `function-call`
4. Save the webhook configuration

---

## Phase 2: Supabase Setup (20 minutes)

### 1. Apply Database Migration

Run the streak function migration:

```bash
# Using Supabase CLI
supabase db push

# Or run SQL directly in Supabase Dashboard → SQL Editor
```

Paste the contents of `supabase/migrations/create_streak_function.sql`

### 2. Deploy Edge Functions

```bash
# Install Supabase CLI if you haven't
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref YOUR_PROJECT_REF

# Deploy all functions
supabase functions deploy schedule-calls
supabase functions deploy initiate-calls
supabase functions deploy vapi-webhook
```

### 3. Set Environment Variables

In Supabase Dashboard:

1. Go to **Settings** → **Edge Functions** → **Manage Secrets**
2. Add these secrets:

```
VAPI_API_KEY=your-vapi-api-key-from-phase-1
VAPI_PHONE_NUMBER_ID=your-phone-number-id-from-phase-1
```

### 4. Enable pg_cron Extension

In Supabase Dashboard → **Database** → **Extensions**:

1. Search for `pg_cron`
2. Enable it
3. Confirm

### 5. Set Up Cron Jobs

Run this SQL in **SQL Editor**:

```sql
-- Schedule calls every hour
SELECT cron.schedule(
  'schedule-calls-hourly',
  '0 * * * *', -- Every hour at minute 0
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/schedule-calls',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
  );
  $$
);

-- Initiate calls every 5 minutes
SELECT cron.schedule(
  'initiate-calls-5min',
  '*/5 * * * *', -- Every 5 minutes
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/initiate-calls',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
  );
  $$
);
```

**Replace:**
- `YOUR_PROJECT_REF` with your Supabase project reference
- `YOUR_ANON_KEY` with your anon/public key from Settings → API

### 6. Update Vapi Webhook URL

Now go back to Vapi Dashboard and set webhook URL to:
```
https://YOUR_PROJECT_REF.supabase.co/functions/v1/vapi-webhook
```

---

## Phase 3: Testing (10 minutes)

### Test 1: Schedule Calls Function

```bash
# Test the schedule-calls function manually
curl -X POST \
  'https://YOUR_PROJECT_REF.supabase.co/functions/v1/schedule-calls' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json'
```

**Expected result:** JSON response showing candidates checked and calls scheduled

**Check database:**
```sql
SELECT * FROM scheduled_calls ORDER BY created_at DESC LIMIT 5;
```

### Test 2: Initiate Calls Function

First, create a test scheduled call:

```sql
INSERT INTO scheduled_calls (
  user_id,
  phone_number,
  coach_slug,
  scheduled_for,
  timezone
) VALUES (
  'YOUR_USER_ID',
  '+1234567890',  -- YOUR phone number
  'drill_sergeant',
  NOW(),
  'America/New_York'
);
```

Then trigger the function:

```bash
curl -X POST \
  'https://YOUR_PROJECT_REF.supabase.co/functions/v1/initiate-calls' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json'
```

**You should receive a call!** 📞

### Test 3: Webhook Handler

The webhook will be triggered automatically when a call ends. Check:

```sql
-- View webhook events
SELECT * FROM webhook_events ORDER BY received_at DESC LIMIT 10;

-- View call logs
SELECT * FROM call_logs ORDER BY created_at DESC LIMIT 5;

-- View updated scheduled calls
SELECT * FROM scheduled_calls WHERE status = 'completed' LIMIT 5;
```

---

## Phase 4: Monitoring

### View Cron Job Status

```sql
-- Check cron jobs
SELECT * FROM cron.job;

-- View cron job runs
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;
```

### View Edge Function Logs

In Supabase Dashboard:
1. Go to **Edge Functions**
2. Click on a function
3. View **Logs** tab

### Check Call Status

```sql
-- Pending calls
SELECT COUNT(*) FROM scheduled_calls WHERE status = 'pending';

-- Completed calls today
SELECT COUNT(*) FROM scheduled_calls 
WHERE status = 'completed' 
AND DATE(call_ended_at) = CURRENT_DATE;

-- Failed calls
SELECT * FROM scheduled_calls 
WHERE status = 'failed' 
ORDER BY updated_at DESC;

-- Success rate
SELECT 
  status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM scheduled_calls
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY status;
```

---

## Scaling for Multiple Users

### ✅ This setup handles multiple users automatically!

**How it scales:**

1. **Scheduling** (hourly):
   - Checks ALL users with active plans
   - Filters by each user's call preferences
   - Creates scheduled_calls for eligible users
   - **No limit on user count**

2. **Call Initiation** (every 5 minutes):
   - Processes up to 10 pending calls at once
   - If more than 10 pending, next batch in 5 minutes
   - **Handles hundreds of users**

3. **Webhooks**:
   - Serverless - scales automatically
   - Each call gets its own webhook
   - **Unlimited concurrent calls**

### Performance Limits

| Users | Calls/Day | Edge Function Invocations | Cost |
|-------|-----------|---------------------------|------|
| 10    | 10        | ~300/day                  | $3/day |
| 100   | 100       | ~3,000/day                | $30/day |
| 1,000 | 1,000     | ~30,000/day               | $300/day |

**Supabase Free Tier:**
- 500,000 Edge Function invocations/month
- = ~16,000/day
- = **~160 users** on free tier

**Supabase Pro ($25/month):**
- 2,000,000 invocations/month
- = ~66,000/day
- = **~660 users**

---

## Troubleshooting

### Calls Not Being Scheduled

**Check:**
```sql
-- View scheduling candidates
SELECT * FROM call_scheduling_candidates;

-- Check user call preferences
SELECT phone_number, call_preferences 
FROM users_public 
WHERE id = 'YOUR_USER_ID';
```

**Common issues:**
- No phone number set
- Call preferences don't include current hour
- No active plan
- No activity scheduled for today

### Calls Not Being Initiated

**Check Edge Function logs:**
```bash
supabase functions logs initiate-calls
```

**Common issues:**
- VAPI_API_KEY not set
- VAPI_PHONE_NUMBER_ID incorrect
- Phone number format wrong (must be +1234567890)
- Vapi account out of credits

### Webhooks Not Received

**Check:**
```sql
SELECT * FROM webhook_events ORDER BY received_at DESC LIMIT 10;
```

**Common issues:**
- Webhook URL incorrect in Vapi
- Edge function not deployed
- Firewall blocking requests

### Cron Jobs Not Running

**Check cron status:**
```sql
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'schedule-calls-hourly')
ORDER BY start_time DESC 
LIMIT 10;
```

**Common issues:**
- pg_cron extension not enabled
- Cron job not created
- URL or auth token incorrect

---

## Cost Breakdown

### Vapi Costs
- **Per minute**: ~$0.10
- **Average call**: 3 minutes = $0.30
- **100 users × 30 days**: $900/month

### Supabase Costs
- **Free tier**: Up to 160 users
- **Pro ($25/month)**: Up to 660 users
- **Team ($599/month)**: Unlimited

### Total Monthly Cost
- **10 users**: $3-25/month
- **100 users**: $25-925/month
- **1,000 users**: $625-9,599/month

---

## Maintenance

### Daily
- Check Edge Function logs for errors
- Monitor call success rate
- Review failed calls

### Weekly
- Analyze call transcripts
- Adjust coach personalities if needed
- Review user feedback

### Monthly
- Optimize database queries
- Review and optimize costs
- Update voice models if needed

---

## Next Steps

1. ✅ Deploy to production
2. ✅ Test with 5-10 users
3. ✅ Monitor first week of calls
4. ✅ Gather user feedback
5. ✅ Adjust coach personalities
6. ✅ Scale to more users

---

## Support

### Useful Commands

```bash
# View Edge Function logs
supabase functions logs schedule-calls --tail
supabase functions logs initiate-calls --tail
supabase functions logs vapi-webhook --tail

# Redeploy a function
supabase functions deploy schedule-calls

# Test function locally
supabase functions serve schedule-calls
```

### Resources
- Supabase Docs: https://supabase.com/docs
- Vapi Docs: https://docs.vapi.ai
- pg_cron Docs: https://github.com/citusdata/pg_cron

---

## 🎉 You're Done!

Your automated accountability call system is now running entirely on Supabase + Vapi!

**No n8n needed. No extra services. Just works.** 🔥
