# n8n Workflows for Grit On Call + Vapi Integration

This directory contains all n8n workflows needed to automate accountability calls using Vapi.

## Overview

The system consists of 4 main workflows:

1. **Call Scheduler** - Runs hourly to create scheduled calls
2. **Call Initiator** - Runs every 5 minutes to trigger Vapi calls
3. **Webhook Handler** - Receives and processes Vapi webhooks
4. **Post-Call Processor** - Updates database after calls complete

## Prerequisites

### Environment Variables
Set these in your n8n instance:

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key

# Vapi
VAPI_API_KEY=your-vapi-api-key
VAPI_PHONE_NUMBER_ID=your-vapi-phone-number-id
VAPI_WEBHOOK_SECRET=your-webhook-secret

# n8n
N8N_WEBHOOK_BASE_URL=https://your-n8n-instance.com
```

### Supabase Setup
1. All database tables created ✅
2. Service role key has full access ✅
3. RLS policies configured ✅

### Vapi Setup
1. Create Vapi account at https://vapi.ai
2. Purchase a phone number
3. Get API key from dashboard
4. Configure webhook URL to point to n8n

## Workflow Details

### 1. Call Scheduler
- **Trigger**: Cron (every hour)
- **Purpose**: Find users who need calls today and schedule them
- **File**: `01-call-scheduler.json`

### 2. Call Initiator
- **Trigger**: Cron (every 5 minutes)
- **Purpose**: Initiate pending calls via Vapi API
- **File**: `02-call-initiator.json`

### 3. Webhook Handler
- **Trigger**: Webhook (from Vapi)
- **Purpose**: Process call events and update database
- **File**: `03-webhook-handler.json`

### 4. Post-Call Processor
- **Trigger**: Database change (call completed)
- **Purpose**: Update user streaks and activity status
- **File**: `04-post-call-processor.json`

## Installation

1. Import each workflow JSON file into n8n
2. Configure credentials for Supabase and Vapi
3. Update webhook URLs
4. Activate workflows
5. Test with your phone number

## Testing

### Test Call Scheduler
1. Ensure you have an active plan with today's activity
2. Set your call preferences to include current hour
3. Run workflow manually
4. Check `scheduled_calls` table for new record

### Test Call Initiator
1. Create a test scheduled call with `scheduled_for = NOW()`
2. Run workflow manually
3. Should receive a call on your phone
4. Check `call_logs` table

### Test Webhook Handler
1. Make a test call via Vapi dashboard
2. Webhook should be received automatically
3. Check `webhook_events` table
4. Verify `scheduled_calls` updated

## Monitoring

### Key Metrics
- Scheduled calls per day
- Call success rate (answered vs missed)
- Average call duration
- User engagement rate

### Logs to Check
- n8n execution logs
- `webhook_events` table
- `call_logs` table
- Vapi dashboard

## Troubleshooting

### Call Not Scheduled
- Check user has phone number
- Verify active plan exists
- Confirm today's activity exists
- Check call preferences include current hour

### Call Not Initiated
- Verify Vapi API key is valid
- Check phone number format (+1234567890)
- Ensure Vapi phone number is active
- Check scheduled_for time has passed

### Webhook Not Received
- Verify webhook URL is correct
- Check Vapi webhook configuration
- Ensure n8n webhook is active
- Check firewall/security settings

### Call Failed
- Check phone number is valid
- Verify user can receive calls
- Check Vapi account balance
- Review error_message in scheduled_calls

## Cost Optimization

### Reduce Costs
- Limit max_call_duration_seconds
- Set max_attempts to 2 instead of 3
- Schedule calls during off-peak hours
- Use cheaper voice models

### Current Estimates
- ~$0.10 per minute
- Average 3-minute call = $0.30
- 100 users × 30 days = $900/month

## Next Steps

1. Import workflows into n8n
2. Configure credentials
3. Test with your phone number
4. Monitor first few calls
5. Adjust coach personalities
6. Scale to more users
