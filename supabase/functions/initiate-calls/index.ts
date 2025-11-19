// Supabase Edge Function: Initiate Calls
// Runs every 5 minutes to trigger Vapi calls for pending scheduled_calls

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const coachFlavors: Record<string, string[]> = {
  drill_sergeant: [
    'Today, push the user harder than usual. Focus on brutal honesty, concrete examples of where they are holding back, and challenge them to do something they would normally avoid.',
    'Today, emphasize mental toughness. Use visualization of hard situations they have already conquered and tie that to today\'s mission.',
    'Today, lean into tough love but end with a very specific, aggressively framed commitment for tomorrow.',
    'Today, focus on catching excuses in real time and turning each one into a mini drill or micro-challenge the user must accept on the call.'
  ],
  athlete_coach: [
    'Today, treat the user like a high-performance athlete in a training block. Warm them up with quick wins, then design one key “training rep” for today\'s activity.',
    'Today, emphasize recovery and setup. Help the user engineer their environment so today\'s mission feels like part of a bigger season plan.',
    'Today, focus on momentum. Celebrate any streaks, then design a simple next action that is almost impossible to skip.',
    'Today, use sports metaphors. Compare today\'s mission to a game situation and walk them through how a pro would execute it.'
  ],
  high_performance_ceo: [
    'Today, run the call like a board meeting. Start with a quick status report, then drive toward one key decision and one concrete next action.',
    'Today, emphasize leverage. Help the user find the smallest action that unlocks the biggest result for their long-term goal.',
    'Today, focus on ruthless prioritization. Help the user say no to low-value tasks so today\'s mission becomes non-negotiable.',
    'Today, speak in a calm, decisive tone. Treat the user like a founder making an important but doable move.'
  ],
  stoic_monk: [
    'Today, focus on equanimity. Help the user see today\'s mission as training for staying calm under pressure.',
    'Today, emphasize identity. Remind the user of the kind of person they are becoming by following through on this one mission.',
    'Today, use short, grounded reflections. Connect today\'s activity to a simple Stoic principle like controlling what they can control.',
    'Today, help the user rehearse how they will respond to obstacles with calm, deliberate action instead of reactivity.'
  ]
}

function pickDailyFlavor(coachSlug: string, userId: string, dateStr: string): string | null {
  const variants = coachFlavors[coachSlug]
  if (!variants || variants.length === 0) return null

  const seed = `${coachSlug}:${userId}:${dateStr}`
  let h = 0
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0
  }
  const idx = h % variants.length
  return variants[idx]
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''

    const supabaseClient = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const vapiApiKey = Deno.env.get('VAPI_API_KEY')
    const vapiPhoneNumberId = Deno.env.get('VAPI_PHONE_NUMBER_ID')
    const vapiServerUrl = `${supabaseUrl}/functions/v1/vapi-webhook`

    if (!vapiApiKey || !vapiPhoneNumberId) {
      throw new Error('VAPI_API_KEY or VAPI_PHONE_NUMBER_ID not configured')
    }

    console.log('🔍 Finding pending calls...')

    // Get pending calls with coach and activity data
    const { data: pendingCalls, error: queryError } = await supabaseClient
      .from('scheduled_calls')
      .select(`
        *,
        coach_profiles!scheduled_calls_coach_slug_fkey (
          display_name,
          system_prompt,
          vapi_voice_id,
          vapi_first_message,
          vapi_end_message,
          max_call_duration_seconds
        ),
        daily_activities!scheduled_calls_daily_activity_id_fkey (
          title,
          description
        )
      `)
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .lte('attempt_number', 3)
      .order('scheduled_for', { ascending: true })
      .limit(10)

    if (queryError) throw queryError

    console.log(`📞 Found ${pendingCalls?.length || 0} pending calls`)

    if (!pendingCalls || pendingCalls.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No pending calls', initiated: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const results = []

    for (const call of pendingCalls) {
      try {
        const coach = call.coach_profiles
        const activity = call.daily_activities

        const todayStr = new Date().toISOString().split('T')[0]
        const dailyFlavor = pickDailyFlavor(call.coach_slug, call.user_id, todayStr)
        const flavorSection = dailyFlavor
          ? `

## Today\'s Flavor
${dailyFlavor}`
          : ''

        const contextualPrompt = `${coach.system_prompt}${flavorSection}

## Today\'s Context
User committed to: "${activity.title}"
Description: ${activity.description || 'No additional details'}

## Your Task
1. Check in on their progress with today\'s activity
2. Provide accountability in your coaching style
3. Get their commitment for tomorrow
4. Rate their confidence level (1-10)
5. End the call naturally

Keep the call under ${Math.floor(coach.max_call_duration_seconds / 60)} minutes.`

        // Create Vapi assistant
        // Use special ElevenLabs model/voice for Gockins (drill_sergeant)
        const isGockinsCoach = call.coach_slug === 'drill_sergeant'
        const voiceConfig = isGockinsCoach
          ? {
              provider: '11labs',
              voiceId: 'LQboqQKiOAfFvYtOK9H4',
              model: 'eleven_flash_v2',
              stability: 0.5,
              similarityBoost: 0.75
            }
          : {
              provider: '11labs',
              voiceId: coach.vapi_voice_id
            }

        console.log(`🤖 Creating assistant for ${coach.display_name} with voice config:`, voiceConfig)
        
        const assistantResponse = await fetch('https://api.vapi.ai/assistant', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${vapiApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: `Grit Coach - ${coach.display_name}`,
            server: {
              url: vapiServerUrl,
              timeoutSeconds: 20
            },
            model: {
              provider: 'openai',
              model: 'gpt-4o-mini',
              temperature: 0.7,
              messages: [{
                role: 'system',
                content: contextualPrompt
              }],
              functions: [{
                name: 'record_commitment',
                description: 'Record the user\'s commitment for tomorrow and their confidence level',
                parameters: {
                  type: 'object',
                  properties: {
                    commitment: {
                      type: 'string',
                      description: 'What the user commits to doing tomorrow'
                    },
                    confidence: {
                      type: 'integer',
                      minimum: 1,
                      maximum: 10,
                      description: 'User\'s confidence level (1-10)'
                    },
                    completed_today: {
                      type: 'boolean',
                      description: 'Whether user completed today\'s activity'
                    }
                  },
                  required: ['commitment', 'confidence', 'completed_today']
                }
              }]
            },
            voice: voiceConfig,
            firstMessage: coach.vapi_first_message,
            endCallMessage: coach.vapi_end_message,
            endCallPhrases: ['goodbye', 'talk later', 'bye', 'see you'],
            maxDurationSeconds: coach.max_call_duration_seconds,
            silenceTimeoutSeconds: 30,
            responseDelaySeconds: 0.4,
            llmRequestDelaySeconds: 0.1,
            numWordsToInterruptAssistant: 2,
            backgroundSound: 'off'
          })
        })

        if (!assistantResponse.ok) {
          const error = await assistantResponse.text()
          throw new Error(`Vapi assistant creation failed: ${error}`)
        }

        const assistant = await assistantResponse.json()
        console.log(`✅ Assistant created: ${assistant.id}`)

        // Initiate call
        console.log(`📞 Calling ${call.phone_number}...`)
        
        const callResponse = await fetch('https://api.vapi.ai/call/phone', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${vapiApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            assistantId: assistant.id,
            phoneNumberId: vapiPhoneNumberId,
            customer: {
              number: call.phone_number
            },
            metadata: {
              scheduled_call_id: call.id,
              user_id: call.user_id,
              daily_activity_id: call.daily_activity_id,
              coach_slug: call.coach_slug,
              activity_title: activity.title
            }
          })
        })

        if (!callResponse.ok) {
          const error = await callResponse.text()
          throw new Error(`Vapi call initiation failed: ${error}`)
        }

        const vapiCall = await callResponse.json()
        console.log(`✅ Call initiated: ${vapiCall.id}`)

        // Update scheduled_calls
        await supabaseClient
          .from('scheduled_calls')
          .update({
            status: 'calling',
            vapi_call_id: vapiCall.id,
            vapi_assistant_id: assistant.id,
            call_started_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', call.id)

        // Create call log
        await supabaseClient
          .from('call_logs')
          .insert({
            scheduled_call_id: call.id,
            user_id: call.user_id,
            vapi_call_id: vapiCall.id,
            phone_number: call.phone_number,
            coach_slug: call.coach_slug,
            status: 'calling',
            started_at: new Date().toISOString()
          })

        results.push({
          scheduled_call_id: call.id,
          vapi_call_id: vapiCall.id,
          status: 'success'
        })

        console.log(`🎉 Call successfully initiated for ${call.phone_number}`)

      } catch (error) {
        console.error(`❌ Error initiating call ${call.id}:`, error)
        
        // Update with error and retry logic
        await supabaseClient
          .from('scheduled_calls')
          .update({
            status: 'failed',
            error_message: error.message,
            attempt_number: call.attempt_number + 1,
            retry_after: call.attempt_number < call.max_attempts 
              ? new Date(Date.now() + 3600000).toISOString() // Retry in 1 hour
              : null,
            updated_at: new Date().toISOString()
          })
          .eq('id', call.id)

        results.push({
          scheduled_call_id: call.id,
          status: 'failed',
          error: error.message
        })
      }
    }

    const successCount = results.filter(r => r.status === 'success').length

    return new Response(
      JSON.stringify({
        message: 'Call initiation complete',
        total_pending: pendingCalls.length,
        successful: successCount,
        failed: results.length - successCount,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error in initiate-calls function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
