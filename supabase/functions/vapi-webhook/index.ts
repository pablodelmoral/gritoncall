// Supabase Edge Function: Vapi Webhook Handler
// Receives webhooks from Vapi and updates database

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Parse webhook payload
    const payload = await req.json()
    const eventType = payload.event
    const call = payload.call

    console.log(`📨 Received webhook: ${eventType} for call ${call?.id}`)

    // Log webhook event
    await supabaseClient
      .from('webhook_events')
      .insert({
        event_type: eventType,
        source: 'vapi',
        vapi_call_id: call?.id,
        payload: payload,
        headers: Object.fromEntries(req.headers.entries())
      })

    // Get scheduled call
    const { data: scheduledCall } = await supabaseClient
      .from('scheduled_calls')
      .select('*')
      .eq('vapi_call_id', call?.id)
      .single()

    if (!scheduledCall) {
      console.warn(`⚠️  No scheduled call found for vapi_call_id: ${call?.id}`)
    }

    // Route by event type
    switch (eventType) {
      case 'call.started':
        await handleCallStarted(supabaseClient, call)
        break
      
      case 'call.ended':
        await handleCallEnded(supabaseClient, call, scheduledCall)
        break
      
      case 'call.failed':
        await handleCallFailed(supabaseClient, call, scheduledCall)
        break
      
      case 'function-call':
        await handleFunctionCall(supabaseClient, payload, scheduledCall)
        break
      
      default:
        console.log(`ℹ️  Unhandled event type: ${eventType}`)
    }

    // Mark webhook as processed
    await supabaseClient
      .from('webhook_events')
      .update({ processed: true, processed_at: new Date().toISOString() })
      .eq('vapi_call_id', call?.id)
      .eq('event_type', eventType)

    return new Response(
      JSON.stringify({ success: true, message: 'Webhook processed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error processing webhook:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function handleCallStarted(supabaseClient: any, call: any) {
  console.log(`📞 Call started: ${call.id}`)
  
  await supabaseClient
    .from('scheduled_calls')
    .update({
      status: 'calling',
      call_started_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('vapi_call_id', call.id)

  await supabaseClient
    .from('call_logs')
    .update({
      status: 'in_progress',
      started_at: new Date().toISOString()
    })
    .eq('vapi_call_id', call.id)
}

async function handleCallEnded(supabaseClient: any, call: any, scheduledCall: any) {
  console.log(`✅ Call ended: ${call.id}`)
  
  // Extract commitment data from function calls
  let commitment = null
  let confidence = null
  let completedToday = null

  if (call.messages) {
    for (const msg of call.messages) {
      if (msg.role === 'function_call' && msg.function_call?.name === 'record_commitment') {
        try {
          const args = JSON.parse(msg.function_call.arguments || '{}')
          commitment = args.commitment
          confidence = args.confidence
          completedToday = args.completed_today
        } catch (e) {
          console.error('Error parsing function call arguments:', e)
        }
      }
    }
  }

  // Update scheduled_calls
  await supabaseClient
    .from('scheduled_calls')
    .update({
      status: 'completed',
      call_ended_at: new Date().toISOString(),
      call_duration_seconds: call.duration || 0,
      transcript: call.transcript || null,
      summary: call.summary || null,
      user_commitment: commitment,
      user_confidence: confidence,
      user_completed_today: completedToday,
      updated_at: new Date().toISOString()
    })
    .eq('vapi_call_id', call.id)

  // Update call_logs
  await supabaseClient
    .from('call_logs')
    .update({
      status: 'completed',
      ended_at: new Date().toISOString(),
      duration_seconds: call.duration || 0,
      full_transcript: call.transcript || null,
      summary: call.summary,
      user_commitment: commitment,
      user_confidence: confidence,
      completed_today: completedToday,
      cost_cents: Math.round((call.cost || 0) * 100),
      end_reason: call.endedReason
    })
    .eq('vapi_call_id', call.id)

  // Process post-call actions
  if (scheduledCall && completedToday !== null) {
    await processPostCall(supabaseClient, scheduledCall, completedToday)
  }
}

async function handleCallFailed(supabaseClient: any, call: any, scheduledCall: any) {
  console.log(`❌ Call failed: ${call.id}`)
  
  const errorMessage = call.endedReason || 'Call failed'
  
  // Update scheduled_calls with retry logic
  if (scheduledCall) {
    const shouldRetry = scheduledCall.attempt_number < scheduledCall.max_attempts
    
    await supabaseClient
      .from('scheduled_calls')
      .update({
        status: 'failed',
        error_message: errorMessage,
        attempt_number: scheduledCall.attempt_number + 1,
        retry_after: shouldRetry ? new Date(Date.now() + 3600000).toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .eq('vapi_call_id', call.id)
  }

  // Update call_logs
  await supabaseClient
    .from('call_logs')
    .update({
      status: 'failed',
      ended_at: new Date().toISOString(),
      end_reason: errorMessage,
      error_details: { call }
    })
    .eq('vapi_call_id', call.id)
}

async function handleFunctionCall(supabaseClient: any, payload: any, scheduledCall: any) {
  console.log(`🔧 Function call received: ${payload.functionCall?.name}`)
  
  if (payload.functionCall?.name === 'record_commitment') {
    const args = payload.functionCall.parameters
    
    // Update scheduled_calls with commitment data
    await supabaseClient
      .from('scheduled_calls')
      .update({
        user_commitment: args.commitment,
        user_confidence: args.confidence,
        user_completed_today: args.completed_today,
        updated_at: new Date().toISOString()
      })
      .eq('vapi_call_id', payload.call.id)
  }
}

async function processPostCall(supabaseClient: any, scheduledCall: any, completedToday: boolean) {
  console.log(`🔄 Processing post-call actions for user ${scheduledCall.user_id}`)
  
  try {
    // Update daily activity with call recap
    if (scheduledCall.daily_activity_id) {
      const callRecap = {
        call_date: new Date().toISOString(),
        completed_today: completedToday,
        commitment: scheduledCall.user_commitment,
        confidence: scheduledCall.user_confidence,
        transcript_summary: scheduledCall.summary,
        call_duration_seconds: scheduledCall.call_duration_seconds,
        coach_slug: scheduledCall.coach_slug
      }

      await supabaseClient
        .from('daily_activities')
        .update({
          status: completedToday ? 'completed' : 'pending',
          completed_at: completedToday ? new Date().toISOString() : null,
          call_recap: callRecap,
          next_day_commitment: scheduledCall.user_commitment,
          commitment_confidence: scheduledCall.user_confidence,
          updated_at: new Date().toISOString()
        })
        .eq('id', scheduledCall.daily_activity_id)
      
      console.log(`✅ Call recap saved to daily activity`)
    }

    // Update user streak
    if (completedToday) {
      // Increment streak
      await supabaseClient.rpc('increment_user_streak', {
        p_user_id: scheduledCall.user_id
      })
    } else {
      // Reset streak
      await supabaseClient
        .from('users_public')
        .update({
          streak: 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', scheduledCall.user_id)
    }

    // Create call record
    await supabaseClient
      .from('calls')
      .insert({
        user_id: scheduledCall.user_id,
        status: 'completed',
        summary_json: {
          commitment: scheduledCall.user_commitment,
          confidence: scheduledCall.user_confidence,
          completed: completedToday,
          scheduled_call_id: scheduledCall.id
        }
      })

    console.log(`✅ Post-call processing complete`)
    
  } catch (error) {
    console.error('❌ Error in post-call processing:', error)
  }
}
