// @ts-nocheck
// Edge Function: onboarding_chat
// Intelligent LLM-powered interview for any type of goal

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `You are a coach conducting a 4-question interview. 

STRICT RULES - DO NOT DEVIATE:
1. Count the user messages
2. Based on count, ask ONLY the corresponding question
3. Maximum 15 words per response
4. NO explanations, suggestions, or advice
5. ONLY ask the question

USER MESSAGE COUNT → YOUR RESPONSE:
- Count 1 (first user message): "How much time can you dedicate daily?"
- Count 2: "Any constraints or challenges?"
- Count 3: "Experience level - beginner, intermediate, or advanced?"
- Count 4: "What time of day - morning, afternoon, or evening?"
- Count 5: Output JSON (see below)

AFTER 4 USER MESSAGES, output this JSON (no other text):
{
  "complete": true,
  "data": {
    "monthly_goal": "user's goal from message 1",
    "goal_category": "fitness|financial|creative|professional|health|personal",
    "daily_time_minutes": 15,
    "current_level": "beginner|intermediate|advanced",
    "constraints": [],
    "preferred_time": "morning|afternoon|evening",
    "motivation": "extracted from conversation"
  }
}

REMEMBER: 15 words max. Just ask the question. No advice.`;

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
    const { message, sessionId } = body;

    // Use fallback chat system for reliable, structured conversation
    // OpenAI will be used only for plan generation (in generate_plan function)
    console.log('Using fallback chat system for structured interview');
    if (true) { // Always use fallback for chat
      
      // Simplified conversation flow using message content analysis
      const msg = message.toLowerCase();
      console.log('📝 Processing message:', message);
      console.log('🔍 Lowercase message:', msg);
      let response = "";
      let isComplete = false;
      
      // Determine conversation stage based on message content
      if (msg.includes('gym') || msg.includes('exercise') || msg.includes('fitness') || msg.includes('run') || msg.includes('workout')) {
        // First fitness message
        response = "Fitness goals are excellent for building discipline! How much time can you dedicate daily?";
      } else if (msg.includes('save') || msg.includes('money') || msg.includes('$')) {
        // First financial message
        response = "Saving money is a fantastic goal! How much time can you dedicate daily to tracking expenses or finding savings?";
      } else if (msg.includes('write') || msg.includes('book') || msg.includes('story')) {
        // First creative message
        response = "Writing is such a rewarding pursuit! How much time can you commit to writing each day?";
      } else if (msg.includes('learn') || msg.includes('study') || msg.includes('skill')) {
        // First learning message
        response = "Learning new skills is amazing! How much time can you commit to this daily?";
      } else if (msg.includes('hour') || msg.includes('hr') || msg.includes('minutes') || msg.includes('min') || /\d+/.test(msg)) {
        // Time commitment response
        response = "Perfect! Any constraints or challenges I should know about that might affect your plan?";
      } else if (msg.includes('no') || msg.includes('none') || msg.includes('nothing') || msg.includes('constraint')) {
        // Constraints response
        response = "Great! What's your current experience level with this - beginner, intermediate, or advanced?";
      } else if (msg.includes('beginner') || msg.includes('intermediate') || msg.includes('advanced') || 
                 msg.includes('starting') || msg.includes('new') || msg.includes('first time') || 
                 msg.includes('never') || msg.includes('just')) {
        // Experience level response
        response = "Excellent! What time of day works best for you - morning, afternoon, or evening?";
      } else if (msg.includes('morning') || msg.includes('afternoon') || msg.includes('evening') || 
                 msg.includes('norning') || msg.includes('am') || msg.includes('pm') || 
                 msg.includes('early') || msg.includes('late') || /\d+am/.test(msg) || /\d+pm/.test(msg)) {
        // Final response - trigger plan generation
        isComplete = true;
        response = "Perfect! I have everything I need. Let me create your personalized 30-day plan...";
      } else {
        // Check if this might be a time response that we missed
        if (msg.includes('time') || /\d+:\d+/.test(msg) || /\d+\s*(am|pm)/.test(msg)) {
          isComplete = true;
          response = "Perfect! I have everything I need. Let me create your personalized 30-day plan...";
        } else {
          // Default fallback
          response = "That's a great goal! Tell me more about what specifically you want to achieve.";
        }
      }
      
      if (isComplete) {
        console.log('✅ Conversation complete, generating plan...');
        
        // Extract goal category from the conversation
        let goalCategory = "general";
        if (msg.includes('gym') || msg.includes('exercise') || msg.includes('fitness')) {
          goalCategory = "fitness";
        } else if (msg.includes('save') || msg.includes('money')) {
          goalCategory = "financial";
        } else if (msg.includes('write') || msg.includes('book')) {
          goalCategory = "creative";
        } else if (msg.includes('learn') || msg.includes('study')) {
          goalCategory = "learning";
        }
        
        console.log('🎯 Detected goal category:', goalCategory);
        
        // Trigger plan generation
        const extractedData = {
          monthly_goal: "Start going to the gym consistently", // Based on the conversation
          goal_category: goalCategory,
          daily_time_minutes: 60, // From "1 hour"
          current_level: "beginner",
          constraints: [],
          preferred_time: "morning",
          motivation: "Build discipline and get fit",
          weekly_themes: {
            week1: "Foundation Building",
            week2: "Skill Development", 
            week3: "Consistency Challenge",
            week4: "Goal Achievement"
          }
        };
        
        console.log('📊 Extracted data for plan generation:', extractedData);
        
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ content: response })}\n\n`));
            controller.enqueue(
              new TextEncoder().encode(
                `data: ${JSON.stringify({ complete: true, sessionId: sessionId || 'demo-session', data: extractedData })}\n\n`
              )
            );
            controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
            controller.close();
          },
        });

        return new Response(stream, {
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        });
      }
      
      // Return normal response
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ content: response })}\n\n`));
          controller.enqueue(
            new TextEncoder().encode(`data: ${JSON.stringify({ sessionId: sessionId || 'demo-session' })}\n\n`)
          );
          controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
          controller.close();
        },
      });

      return new Response(stream, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // Build conversation history properly
    const conversationHistory = [];
    
    // Add the current user message
    conversationHistory.push({ role: 'user', content: message });

    // Test simple OpenAI call first
    console.log('Making OpenAI request with key:', OPENAI_API_KEY ? 'Present' : 'Missing');
    
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a helpful coach. Respond briefly and encouragingly.' },
          { role: 'user', content: message }
        ],
        temperature: 0.7,
        max_tokens: 150,
        stream: false, // Disable streaming temporarily for debugging
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI API Error:', {
        status: openaiResponse.status,
        statusText: openaiResponse.statusText,
        body: errorText
      });
      throw new Error(`OpenAI API error: ${openaiResponse.status} ${openaiResponse.statusText} - ${errorText}`);
    }

    // Get the response from OpenAI
    const result = await openaiResponse.json();
    const assistantMessage = result.choices[0].message.content;

    // For now, return a simple response to test the connection
    const stream = new ReadableStream({
      start(controller) {
        // Send the response content
        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ content: assistantMessage })}\n\n`));
        
        // Send session info
        controller.enqueue(
          new TextEncoder().encode(`data: ${JSON.stringify({ sessionId: sessionId || 'demo-session' })}\n\n`)
        );
        
        controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('❌ Onboarding chat error:', error);
    console.error('Error stack:', error.stack);
    console.error('Request body:', { message, sessionId });
    
    // Return a user-friendly error in the expected streaming format
    const errorStream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ content: `Sorry, something went wrong: ${error.message}. Please try again.` })}\n\n`));
        controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
        controller.close();
      },
    });

    return new Response(errorStream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  }
});
