// @ts-nocheck
// Edge Function: generate_plan
// Intelligent plan generation for any type of goal using OpenAI

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { generateStandardizedPlan } from './planTemplates.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

console.log('🔑 Environment check:', {
  hasSupabaseUrl: !!SUPABASE_URL,
  hasAnonKey: !!SUPABASE_ANON_KEY,
  hasOpenAiKey: !!OPENAI_API_KEY,
  openAiKeyLength: OPENAI_API_KEY?.length || 0
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, Authorization, Content-Type',
  'Access-Control-Max-Age': '86400',
};

const PLAN_GENERATION_PROMPT = `You are Grit, an expert coach creating personalized 30-day plans for any type of goal. Generate a detailed, actionable plan based on the user's onboarding data.

PLAN STRUCTURE:
- 4 weekly themes that build progressively
- 7 daily micro-actions per week (28 total)
- Each micro-action should be:
  * Small and achievable (5-30 minutes)
  * Specific and actionable
  * Building toward the monthly goal
  * Appropriate for their experience level

MICRO-ACTION FORMAT:
- Title: Short, action-oriented (e.g., "Write 200 words", "Do 10 pushups", "Save $5")
- Description: Brief context/motivation (1-2 sentences)
- Duration: Realistic time estimate
- Day of week: 1-7 (Monday=1, Sunday=7)

RESPOND WITH VALID JSON ONLY:
{
  "success": true,
  "plan": {
    "monthly_goal": "User's refined 30-day goal",
    "category": "goal category from onboarding",
    "weekly_plans": [
      {
        "week_number": 1,
        "theme": "Week 1 theme",
        "focus": "What to focus on this week",
        "micro_commitments": [
          {
            "day_of_week": 1,
            "title": "Action title",
            "description": "Why this matters and how to do it",
            "duration_minutes": 15
          }
        ]
      }
    ]
  }
}

Create a plan that's perfectly tailored to their specific goal, constraints, and experience level.`;

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    });
  }

  try {
    const body = await req.json();
    console.log('📥 Received body:', body);
    
    // Handle both data structures for compatibility
    const onboardingData = body.data || body.onboardingData || body;
    console.log('📊 Using onboarding data:', onboardingData);

    if (!OPENAI_API_KEY) {
      console.log('OpenAI API key not found, using fallback plan generation');
      
      // Generate a smart fallback plan based on the goal
      // Handle case where onboardingData might be an array or different structure
      let goalCategory = 'general';
      let monthlyGoal = 'Achieve your 30-day goal';
      
      if (onboardingData && typeof onboardingData === 'object') {
        if (Array.isArray(onboardingData)) {
          // If it's an array of messages, extract goal from first message
          monthlyGoal = onboardingData[0] || 'Achieve your 30-day goal';
          
          // Try to detect goal category from the message content
          const firstMessage = monthlyGoal.toLowerCase();
          if (firstMessage.includes('save') || firstMessage.includes('money') || firstMessage.includes('$')) {
            goalCategory = 'financial';
          } else if (firstMessage.includes('write') || firstMessage.includes('book') || firstMessage.includes('story')) {
            goalCategory = 'creative';
          } else if (firstMessage.includes('exercise') || firstMessage.includes('fitness') || firstMessage.includes('gym')) {
            goalCategory = 'fitness';
          } else if (firstMessage.includes('learn') || firstMessage.includes('study') || firstMessage.includes('skill')) {
            goalCategory = 'learning';
          } else if (firstMessage.includes('health') || firstMessage.includes('water') || firstMessage.includes('sleep')) {
            goalCategory = 'health';
          }
        } else {
          goalCategory = onboardingData.goal_category || 'general';
          monthlyGoal = onboardingData.monthly_goal || 'Achieve your 30-day goal';
        }
      }
      
      const dailyTimeMinutes = (onboardingData && onboardingData.daily_time_minutes) || 15;
      const fallbackPlan = generateStandardizedPlan(goalCategory, monthlyGoal, dailyTimeMinutes);

      return new Response(JSON.stringify(fallbackPlan), {
        status: 200,
        headers: { 
          ...corsHeaders, 
          'content-type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, Authorization, Content-Type',
        },
      });
    }

    if (!onboardingData) {
      throw new Error('Onboarding data is required');
    }

    // Create prompt with user's specific data
    const userPrompt = `Create a 30-day plan for this user:

GOAL: ${onboardingData.monthly_goal}
CATEGORY: ${onboardingData.goal_category || 'general'}
DAILY TIME: ${onboardingData.daily_time_minutes} minutes
EXPERIENCE: ${onboardingData.current_level || 'beginner'}
CONSTRAINTS: ${onboardingData.constraints?.join(', ') || 'None specified'}
PREFERRED TIME: ${onboardingData.preferred_time || 'flexible'}
MOTIVATION: ${onboardingData.motivation || 'Personal growth'}

Generate a detailed, personalized 30-day plan with 4 weekly themes and 7 daily micro-actions per week.`;

    // Call OpenAI to generate the plan
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: PLAN_GENERATION_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!openaiResponse.ok) {
      throw new Error(`OpenAI API error: ${openaiResponse.statusText}`);
    }

    const openaiResult = await openaiResponse.json();
    const generatedContent = openaiResult.choices[0].message.content;

    // Parse the JSON response from OpenAI
    let planData;
    try {
      planData = JSON.parse(generatedContent);
    } catch (e) {
      // If JSON parsing fails, create a fallback plan
      planData = {
        success: true,
        plan: {
          monthly_goal: onboardingData.monthly_goal,
          category: onboardingData.goal_category || 'general',
          weekly_plans: [
            {
              week_number: 1,
              theme: 'Foundation Building',
              focus: 'Establish daily habits and routines',
              micro_commitments: []
            },
            {
              week_number: 2,
              theme: 'Skill Development',
              focus: 'Build core competencies',
              micro_commitments: []
            },
            {
              week_number: 3,
              theme: 'Consistency Challenge',
              focus: 'Maintain momentum and push boundaries',
              micro_commitments: []
            },
            {
              week_number: 4,
              theme: 'Goal Achievement',
              focus: 'Complete strong and confident',
              micro_commitments: []
            }
          ]
        }
      };
    }

    return new Response(JSON.stringify(planData), {
      status: 200,
      headers: { 
        ...corsHeaders, 
        'content-type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, Authorization, Content-Type',
      },
    });
  } catch (error: any) {
    console.error('❌ Generate plan error:', error);
    console.error('Error stack:', error.stack);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: 'Check function logs for more information'
    }), {
      status: 500,
      headers: { 
        ...corsHeaders, 
        'content-type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, Authorization, Content-Type',
      },
    });
  }
});

const PLAN_GENERATION_PROMPT = `You are a fitness coach creating a detailed 30-day plan. Given the user's goal and constraints, generate:

1. 4 weekly themes (one per week)
2. For each week, 7 daily micro-movements with:
   - Title (short, action-oriented)
   - Description (1-2 sentences of context/motivation)
   - Duration in minutes
   - Suggested time (e.g., "7:30am")

Rules:
- Start easy and build gradually
- Respect constraints
- Keep daily time within user's limit
- Make it achievable and motivating
- Use progressive overload principles

Return ONLY valid JSON in this exact format:
{
  "weeks": [
    {
      "week_number": 1,
      "focus_area": "Week 1 theme",
      "description": "What this week is about",
      "days": [
        {
          "day_of_week": 1,
          "title": "Day 1 title",
          "description": "Motivational context for today",
          "duration_minutes": 10,
          "scheduled_time": "07:30"
        }
        // ... 6 more days
      ]
    }
    // ... 3 more weeks
  ]
}`;

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    });
  }

  console.log('📥 Generate plan request received');

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'content-type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'content-type': 'application/json' },
      });
    }

    // Get user profile with onboarding data
    const { data: profile } = await supabase
      .from('users_public')
      .select('id, timezone, onboarding_data')
      .eq('auth_id', userData.user.id)
      .single();

    if (!profile || !profile.onboarding_data) {
      return new Response(JSON.stringify({ error: 'Onboarding data not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'content-type': 'application/json' },
      });
    }

    const onboardingData = profile.onboarding_data;

    // Build prompt with user data
    const userContext = `
User Goal: ${onboardingData.monthly_goal}
Daily Time Available: ${onboardingData.daily_time_minutes} minutes
Constraints: ${onboardingData.constraints?.join(', ') || 'None'}
Fitness Level: ${onboardingData.fitness_level || 'beginner'}
Preferred Time: ${onboardingData.preferred_time || 'morning'}
`;

    // Call OpenAI to generate plan
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: PLAN_GENERATION_PROMPT },
          { role: 'user', content: userContext },
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' },
      }),
    });

    if (!openaiResponse.ok) {
      throw new Error(`OpenAI API error: ${openaiResponse.statusText}`);
    }

    const result = await openaiResponse.json();
    const planData = JSON.parse(result.choices[0].message.content);

    // Calculate start date (today in user's timezone)
    const startDate = new Date();
    const tzOffset = startDate.getTimezoneOffset() * 60000;
    const localDate = new Date(startDate.getTime() - tzOffset);

    // Save weekly plans and daily commitments
    for (const week of planData.weeks) {
      // Insert weekly plan
      await supabase
        .from('weekly_plans')
        .upsert({
          user_id: profile.id,
          week_number: week.week_number,
          focus_area: week.focus_area,
          description: week.description,
        }, { onConflict: 'user_id,week_number' });

      // Insert daily commitments
      for (const day of week.days) {
        const dayOffset = (week.week_number - 1) * 7 + (day.day_of_week - 1);
        const commitmentDate = new Date(localDate);
        commitmentDate.setDate(commitmentDate.getDate() + dayOffset);
        const dateStr = commitmentDate.toISOString().split('T')[0];

        await supabase
          .from('micro_commitments')
          .upsert({
            user_id: profile.id,
            date: dateStr,
            title: day.title,
            text: day.title, // Keep for backward compatibility
            description: day.description,
            duration_minutes: day.duration_minutes,
            week_number: week.week_number,
            day_of_week: day.day_of_week,
            scheduled_at: day.scheduled_time ? `${dateStr}T${day.scheduled_time}:00` : null,
            planned: true,
            confidence: null,
          }, { onConflict: 'user_id,date' });
      }
    }

    return new Response(JSON.stringify({ success: true, plan: planData }), {
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Plan generation error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    });
  }
});
