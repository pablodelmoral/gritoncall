# n8n + Vapi Setup Guide

Complete step-by-step guide to get your automated accountability calls working.

---

## 🚀 Quick Start (n8n Cloud Users)

**If you're using n8n Cloud, follow these simplified steps:**

1. **Vapi Setup** (10 min)
   - Sign up at https://vapi.ai
   - Get API key from Settings → API Keys
   - Buy a phone number (~$1-2/month)
   - Copy Phone Number ID
   - Set webhook URL to: `https://your-workspace.app.n8n.cloud/webhook/vapi-webhook`

2. **n8n Cloud Setup** (15 min)
   - Already have n8n Cloud account ✅
   - Go to Settings → Environment Variables
   - Add: `VAPI_API_KEY`, `VAPI_PHONE_NUMBER_ID`, `VAPI_WEBHOOK_SECRET`
   - Go to Credentials → Add Postgres credential for Supabase
   - Import the 4 workflow JSON files
   - Activate workflows

3. **Test** (5 min)
   - Create a test scheduled call in database
   - Wait for call on your phone
   - Done! 🎉

**For detailed instructions, continue reading below.**

---

## Phase 1: Vapi Setup

### 1. Create Vapi Account
1. Go to https://vapi.ai
2. Sign up for an account
3. Verify your email

### 2. Get API Key
1. Go to Dashboard → Settings → API Keys
2. Create a new API key
3. **Copy and save it** - you'll need this for n8n setup (Phase 2)
4. Don't worry about environment variables yet - we'll set those in n8n

### 3. Purchase Phone Number
1. Go to Dashboard → Phone Numbers
2. Click "Buy Number"
3. Choose a US number (recommended for best quality)
4. Cost: ~$1-2/month
5. **Copy the Phone Number ID** - you'll need this for n8n setup (Phase 2)
6. Don't worry about environment variables yet - we'll set those in n8n

### 4. Configure Webhook
1. Go to Dashboard → Settings → Webhooks
2. Set webhook URL to: `https://your-n8n-instance.com/webhook/vapi-webhook`
3. Enable these events:
   - `call.started`
   - `call.ended`
   - `call.failed`
   - `function-call`
4. Copy webhook secret
5. Set as environment variable: `VAPI_WEBHOOK_SECRET=your_secret`

### 5. Test Vapi
1. Go to Dashboard → Assistants
2. Create a test assistant
3. Make a test call to your phone
4. Verify call quality and latency

---

## Phase 2: n8n Setup

### 1. Set Up n8n Cloud

**Using n8n Cloud (Easiest - Recommended):**
1. Go to https://n8n.io/cloud
2. Sign up for an account (free trial available)
3. Create a new workspace
4. You're ready! Skip to step 2.

**Your webhook URL will be:**
`https://your-workspace.app.n8n.cloud/webhook/vapi-webhook`

**Alternative Options (if not using n8n Cloud):**

<details>
<summary>Railway (Self-hosted)</summary>

```bash
# One-click deploy
https://railway.app/template/n8n
```
</details>

<details>
<summary>Docker (Self-hosted)</summary>

```bash
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -e N8N_BASIC_AUTH_ACTIVE=true \
  -e N8N_BASIC_AUTH_USER=admin \
  -e N8N_BASIC_AUTH_PASSWORD=your_password \
  -e WEBHOOK_URL=https://your-domain.com \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n
```
</details>

### 2. Configure n8n Credentials

#### Supabase Credential
1. Go to n8n → Credentials → Add Credential
2. Select "Postgres"
3. Name: "Supabase"
4. Fill in:
   - Host: `db.your-project.supabase.co`
   - Database: `postgres`
   - User: `postgres`
   - Password: Your Supabase database password
   - Port: `5432`
   - SSL: Enable
5. Test connection
6. Save

#### Vapi Credential
1. Go to n8n → Credentials → Add Credential
2. Select "HTTP Header Auth" (or create custom)
3. Name: "Vapi API"
4. Header Name: `Authorization`
5. Header Value: `Bearer YOUR_VAPI_API_KEY`
6. Save

### 3. Set Environment Variables

**Where to set these depends on how you deployed n8n:**

#### If using n8n Cloud (Recommended):
1. Go to https://app.n8n.cloud
2. Click on your workspace
3. Go to **Settings** (gear icon in bottom left)
4. Click **Environment Variables**
5. Click **Add Variable** for each:
   - Variable name: `VAPI_API_KEY`
   - Value: Your API key from Phase 1
   - Click Save
6. Repeat for:
   - `VAPI_PHONE_NUMBER_ID` (your phone number ID from Phase 1)
   - `VAPI_WEBHOOK_SECRET` (your webhook secret from Phase 1)
7. **Important:** Restart your workflows after adding variables

**Note:** In n8n Cloud, you can access these variables in workflows using `{{ $env.VAPI_API_KEY }}`

#### If using Railway:
1. Go to your Railway project
2. Click on your n8n service
3. Go to "Variables" tab
4. Click "New Variable" for each:

```
VAPI_API_KEY=your-vapi-api-key-from-phase-1
VAPI_PHONE_NUMBER_ID=your-phone-number-id-from-phase-1
VAPI_WEBHOOK_SECRET=your-webhook-secret-from-phase-1
```

#### If using Render:
1. Go to your Render dashboard
2. Select your n8n service
3. Go to "Environment" tab
4. Add each variable

#### If using Docker:
Add to your docker run command:
```bash
docker run -it --rm \
  -e VAPI_API_KEY=your-key \
  -e VAPI_PHONE_NUMBER_ID=your-id \
  -e VAPI_WEBHOOK_SECRET=your-secret \
  ...other flags...
  n8nio/n8n
```

#### If self-hosting:
Create a `.env` file in your n8n directory:
```env
VAPI_API_KEY=your-vapi-api-key
VAPI_PHONE_NUMBER_ID=your-phone-number-id
VAPI_WEBHOOK_SECRET=your-webhook-secret
```

**Note:** You can also set these directly in n8n workflows using the "Set" node or hardcode them in the HTTP Request nodes (less secure).

### 4. Import Workflows

1. Go to n8n → Workflows
2. Click "Import from File"
3. Import each workflow in order:
   - `01-call-scheduler.json`
   - `02-call-initiator.json`
   - `03-webhook-handler.json`
   - `04-post-call-processor.json`

### 5. Configure Workflow Credentials

For each workflow:
1. Open the workflow
2. Click on each node that needs credentials
3. Select the appropriate credential:
   - Postgres nodes → "Supabase"
   - HTTP Request nodes → "Vapi API"
4. Save workflow

### 6. Update Webhook URL

1. Open "03-webhook-handler.json"
2. Copy the webhook URL from the trigger node
3. Go back to Vapi dashboard
4. Update webhook URL to match n8n's URL
5. Save in Vapi

---

## Phase 3: Testing

### Test 1: Call Scheduler
1. Ensure you have:
   - Active plan in database
   - Today's activity scheduled
   - Phone number in `users_public`
   - Call preferences include current hour
2. Open "01-call-scheduler" workflow
3. Click "Execute Workflow" (manual test)
4. Check execution log
5. Verify `scheduled_calls` table has new record

### Test 2: Call Initiator
1. Create a test scheduled call:
```sql
INSERT INTO scheduled_calls (
  user_id, 
  phone_number, 
  coach_slug, 
  scheduled_for, 
  timezone
) VALUES (
  'your-user-id',
  '+1234567890',  -- YOUR phone number
  'drill_sergeant',
  NOW(),
  'America/New_York'
);
```
2. Open "02-call-initiator" workflow
3. Click "Execute Workflow"
4. Should receive call on your phone!
5. Check `call_logs` table

### Test 3: Webhook Handler
1. Make a test call via Vapi dashboard
2. Check n8n execution history
3. Should see webhook received
4. Verify `webhook_events` table populated
5. Verify `scheduled_calls` updated

### Test 4: Post-Call Processor
1. Complete a test call
2. Mark it as completed in database
3. Run "04-post-call-processor" manually
4. Verify:
   - `daily_activities` status updated
   - User streak incremented
   - `calls` record created

---

## Phase 4: Activation

### 1. Activate Workflows
1. Go to each workflow
2. Toggle "Active" switch to ON
3. Workflows will now run on schedule

### 2. Monitor First Calls
1. Watch n8n execution logs
2. Check database tables
3. Verify calls are being made
4. Listen to call quality

### 3. Adjust Coach Personalities
Based on feedback:
1. Update `coach_profiles` table
2. Modify system prompts
3. Adjust voice IDs
4. Test changes

---

## Phase 5: Scaling

### Performance Optimization
- Add database indexes (already done ✅)
- Increase n8n worker threads
- Use Vapi's batch API for multiple calls
- Cache assistant configurations

### Cost Optimization
- Reduce max call duration
- Limit retry attempts
- Schedule calls during off-peak hours
- Use cheaper voice models

### Monitoring
Set up alerts for:
- Failed calls > 10%
- Webhook processing errors
- Database connection issues
- Vapi API errors

---

## Troubleshooting

### "No calls being scheduled"
**Check:**
- User has phone number
- Active plan exists
- Today's activity exists
- Call preferences include current hour
- Workflow is active

**Fix:**
```sql
-- Verify user setup
SELECT 
  u.phone_number,
  u.call_preferences,
  p.status as plan_status,
  da.scheduled_date,
  da.status as activity_status
FROM users_public u
LEFT JOIN plans p ON p.user_id = u.id
LEFT JOIN daily_activities da ON da.plan_id = p.id
WHERE u.id = 'your-user-id';
```

### "Calls not being initiated"
**Check:**
- Vapi API key is valid
- Phone number format is correct (+1234567890)
- scheduled_for time has passed
- Workflow is active

**Fix:**
```sql
-- Check pending calls
SELECT * FROM scheduled_calls 
WHERE status = 'pending' 
AND scheduled_for <= NOW()
ORDER BY scheduled_for;
```

### "Webhooks not received"
**Check:**
- Webhook URL is correct in Vapi
- n8n webhook is active
- Firewall allows incoming requests
- SSL certificate is valid

**Fix:**
1. Test webhook with curl:
```bash
curl -X POST https://your-n8n.com/webhook/vapi-webhook \
  -H "Content-Type: application/json" \
  -d '{"event":"test","call":{"id":"test-123"}}'
```

### "Call quality issues"
**Check:**
- Voice model selection
- Network latency
- Phone number quality
- Vapi account status

**Fix:**
- Try different voice models
- Use premium phone numbers
- Adjust response delay settings

---

## Maintenance

### Daily
- Check execution logs
- Monitor call success rate
- Review failed calls

### Weekly
- Analyze call transcripts
- Adjust coach personalities
- Review user feedback
- Check costs

### Monthly
- Optimize workflows
- Update voice models
- Review database performance
- Plan scaling

---

## Support

### Resources
- n8n Docs: https://docs.n8n.io
- Vapi Docs: https://docs.vapi.ai
- Supabase Docs: https://supabase.com/docs

### Community
- n8n Community: https://community.n8n.io
- Vapi Discord: https://discord.gg/vapi

### Issues
If you encounter issues:
1. Check execution logs
2. Review database tables
3. Test each component individually
4. Check environment variables
5. Verify credentials

---

## Next Steps

Once everything is working:
1. ✅ Test with 5-10 users
2. ✅ Gather feedback on coach personalities
3. ✅ Monitor costs and optimize
4. ✅ Add push notifications in app
5. ✅ Create call history UI
6. ✅ Add ability to reschedule calls
7. ✅ Implement SMS fallback
8. ✅ Scale to more users

Good luck! 🚀
