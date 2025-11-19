// Supabase Edge Function: Schedule Calls
// Runs every hour to create scheduled_calls for eligible users

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('🔍 Finding users eligible for calls...')

    // Get all candidates from the view
    const { data: candidates, error: candidatesError } = await supabaseClient
      .from('call_scheduling_candidates')
      .select('*')
      .eq('call_already_scheduled', false)

    if (candidatesError) {
      throw candidatesError
    }

    console.log(`📋 Found ${candidates?.length || 0} candidates`)

    if (!candidates || candidates.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No eligible users found', scheduled: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Filter by call preferences
    const now = new Date()
    const scheduledCalls = []

    for (const candidate of candidates) {
      try {
        // Get user's timezone (default to UTC)
        const timezone = candidate.timezone || 'UTC'
        
        // Get current time in user's timezone
        const userTime = new Date(now.toLocaleString('en-US', { timeZone: timezone }))
        const currentHour = userTime.getHours()
        const dayOfWeek = userTime.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
        
        // Check call preferences
        const callPrefs = candidate.call_preferences
        if (!callPrefs || !callPrefs[dayOfWeek]) {
          console.log(`⏭️  Skipping ${candidate.display_name}: No preferences for ${dayOfWeek}`)
          continue
        }
        
        const dayPrefs = callPrefs[dayOfWeek]
        if (!dayPrefs.enabled) {
          console.log(`⏭️  Skipping ${candidate.display_name}: Day not enabled`)
          continue
        }
        
        // Check if current hour is in available hours
        const availableHours = dayPrefs.availableHours || []
        if (!availableHours.includes(currentHour)) {
          console.log(`⏭️  Skipping ${candidate.display_name}: Hour ${currentHour} not available`)
          continue
        }
        
        // Calculate next 15-minute slot
        const minutes = userTime.getMinutes()
        const nextSlot = new Date(userTime)
        if (minutes < 15) nextSlot.setMinutes(15)
        else if (minutes < 30) nextSlot.setMinutes(30)
        else if (minutes < 45) nextSlot.setMinutes(45)
        else {
          nextSlot.setHours(nextSlot.getHours() + 1)
          nextSlot.setMinutes(0)
        }
        nextSlot.setSeconds(0)
        nextSlot.setMilliseconds(0)
        
        // Create scheduled call
        const { data: scheduledCall, error: insertError } = await supabaseClient
          .from('scheduled_calls')
          .insert({
            user_id: candidate.user_id,
            daily_activity_id: candidate.daily_activity_id,
            phone_number: candidate.phone_number,
            coach_slug: candidate.selected_coach_slug,
            timezone: timezone,
            scheduled_for: nextSlot.toISOString(),
            status: 'pending',
            attempt_number: 1,
            max_attempts: 3
          })
          .select()
          .single()

        if (insertError) {
          console.error(`❌ Error scheduling call for ${candidate.display_name}:`, insertError)
          continue
        }

        scheduledCalls.push(scheduledCall)
        console.log(`✅ Scheduled call for ${candidate.display_name} at ${nextSlot.toISOString()}`)
        
      } catch (error) {
        console.error(`❌ Error processing candidate ${candidate.user_id}:`, error)
        continue
      }
    }

    console.log(`🎉 Successfully scheduled ${scheduledCalls.length} calls`)

    return new Response(
      JSON.stringify({
        message: 'Call scheduling complete',
        candidates_checked: candidates.length,
        calls_scheduled: scheduledCalls.length,
        scheduled_calls: scheduledCalls
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error in schedule-calls function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
