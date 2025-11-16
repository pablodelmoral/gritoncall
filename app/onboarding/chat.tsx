import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Image, ImageBackground, Dimensions, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

// Generate category-specific plans
function generateCategoryPlan(category: string, monthlyGoal: string, dailyMinutes: number) {
  const planTemplates: any = {
    financial: {
      weeks: [
        {
          theme: "Financial Foundation",
          commitments: [
            { title: "Track daily expenses", description: "Record every purchase to build awareness", duration: 10 },
            { title: "Review spending", description: "Analyze yesterday's expenses", duration: 10 },
            { title: "Set daily budget", description: "Plan spending for today", duration: 15 },
            { title: "Find one saving", description: "Identify one way to save money today", duration: 10 },
            { title: "Check account balance", description: "Monitor your financial position", duration: 5 },
            { title: "Plan weekend spending", description: "Budget for weekend activities", duration: 15 },
            { title: "Weekly financial review", description: "Assess progress and plan next week", duration: 20 }
          ]
        },
        {
          theme: "Saving Strategies",
          commitments: [
            { title: "Automate savings", description: "Set up automatic transfers to savings", duration: 15 },
            { title: "Cut one expense", description: "Eliminate or reduce one recurring cost", duration: 10 },
            { title: "Compare prices", description: "Research better deals on regular purchases", duration: 15 },
            { title: "Meal prep planning", description: "Plan meals to reduce food costs", duration: 20 },
            { title: "Review subscriptions", description: "Cancel unused subscriptions", duration: 15 },
            { title: "Find free alternatives", description: "Replace paid services with free options", duration: 10 },
            { title: "Calculate savings", description: "Total up this week's savings", duration: 15 }
          ]
        },
        {
          theme: "Expense Optimization",
          commitments: [
            { title: "Negotiate bills", description: "Call providers to reduce rates", duration: 20 },
            { title: "Energy audit", description: "Find ways to reduce utility costs", duration: 15 },
            { title: "Shop secondhand", description: "Buy used instead of new this week", duration: 15 },
            { title: "Use coupons", description: "Find and use coupons for purchases", duration: 10 },
            { title: "Batch errands", description: "Combine trips to save gas money", duration: 10 },
            { title: "DIY project", description: "Do something yourself instead of paying", duration: 30 },
            { title: "Review progress", description: "Assess total savings so far", duration: 20 }
          ]
        },
        {
          theme: "Goal Achievement",
          commitments: [
            { title: "Final expense review", description: "Analyze all spending patterns", duration: 25 },
            { title: "Celebrate wins", description: "Acknowledge your saving successes", duration: 10 },
            { title: "Set new targets", description: "Plan next month's financial goals", duration: 20 },
            { title: "Share strategies", description: "Tell others about what worked", duration: 15 },
            { title: "Invest savings", description: "Move savings to higher-yield account", duration: 20 },
            { title: "Plan rewards", description: "Budget a small reward for your success", duration: 10 },
            { title: "Create next plan", description: "Design your next 30-day financial challenge", duration: 25 }
          ]
        }
      ]
    },
    fitness: {
      weeks: [
        {
          theme: "Foundation Building",
          commitments: [
            { title: "Visit the gym", description: "Get familiar with the gym environment", duration: 30 },
            { title: "Basic bodyweight workout", description: "10 push-ups, 10 squats, 1-min plank", duration: 15 },
            { title: "Cardio session", description: "20 minutes on treadmill or bike", duration: 20 },
            { title: "Rest and stretch", description: "Light stretching and mobility work", duration: 15 },
            { title: "Upper body basics", description: "Learn proper form for upper body", duration: 30 },
            { title: "Lower body basics", description: "Practice squats, lunges, leg exercises", duration: 30 },
            { title: "Active recovery", description: "Light walk or gentle yoga", duration: 20 }
          ]
        },
        {
          theme: "Strength Building",
          commitments: [
            { title: "Full body workout", description: "Combine upper and lower body", duration: 45 },
            { title: "Cardio intervals", description: "Alternate high and low intensity", duration: 25 },
            { title: "Core strengthening", description: "Focus on abs and core stability", duration: 20 },
            { title: "Flexibility day", description: "Dedicated stretching session", duration: 30 },
            { title: "Progressive overload", description: "Increase weights or reps", duration: 45 },
            { title: "Functional movements", description: "Practice real-world patterns", duration: 40 },
            { title: "Recovery reflection", description: "Light activity and assess progress", duration: 25 }
          ]
        },
        {
          theme: "Consistency Challenge",
          commitments: [
            { title: "Challenge workout", description: "Push yourself harder", duration: 50 },
            { title: "New exercise", description: "Try new equipment or exercise", duration: 35 },
            { title: "Endurance focus", description: "Longer cardio to build stamina", duration: 40 },
            { title: "Strength test", description: "See how much you've improved", duration: 45 },
            { title: "Compound movements", description: "Multi-muscle exercises", duration: 45 },
            { title: "High intensity", description: "Short, intense workout", duration: 30 },
            { title: "Active rest", description: "Light movement for recovery", duration: 20 }
          ]
        },
        {
          theme: "Goal Achievement",
          commitments: [
            { title: "Personal best attempt", description: "Try for a new record", duration: 60 },
            { title: "Favorite workout", description: "Do what you enjoy most", duration: 45 },
            { title: "Skill refinement", description: "Perfect your form", duration: 40 },
            { title: "Endurance challenge", description: "Test your fitness", duration: 50 },
            { title: "Strength showcase", description: "Show what you've learned", duration: 55 },
            { title: "Celebration workout", description: "Enjoy a fun session", duration: 45 },
            { title: "Plan next month", description: "Set new goals", duration: 30 }
          ]
        }
      ]
    },
    creative: {
      weeks: [
        {
          theme: "Creative Foundation",
          commitments: [
            { title: "Morning pages", description: "Write 3 pages stream-of-consciousness", duration: 20 },
            { title: "Idea capture", description: "Record 5 new creative ideas", duration: 15 },
            { title: "Practice basics", description: "Work on fundamental skills", duration: 25 },
            { title: "Study inspiration", description: "Analyze work you admire", duration: 15 },
            { title: "Create something", description: "Make anything, no judgment", duration: 30 },
            { title: "Share your work", description: "Get feedback from others", duration: 10 },
            { title: "Reflect on progress", description: "Review what you created", duration: 20 }
          ]
        },
        {
          theme: "Skill Building",
          commitments: [
            { title: "Learn new technique", description: "Study a new creative method", duration: 25 },
            { title: "Daily practice", description: "Consistent skill development", duration: 30 },
            { title: "Experiment freely", description: "Try something different", duration: 20 },
            { title: "Copy the masters", description: "Learn by recreating great work", duration: 30 },
            { title: "Personal project", description: "Work on your own creation", duration: 35 },
            { title: "Collaborate", description: "Create with someone else", duration: 25 },
            { title: "Weekly review", description: "Assess your creative growth", duration: 20 }
          ]
        },
        {
          theme: "Creative Flow",
          commitments: [
            { title: "Extended session", description: "Longer creative work period", duration: 45 },
            { title: "Challenge yourself", description: "Push creative boundaries", duration: 30 },
            { title: "Rapid creation", description: "Make many quick pieces", duration: 25 },
            { title: "Deep work", description: "Focus on one major project", duration: 40 },
            { title: "Cross-pollinate", description: "Combine different influences", duration: 30 },
            { title: "Public sharing", description: "Show work to wider audience", duration: 15 },
            { title: "Reflection", description: "Document your process", duration: 20 }
          ]
        },
        {
          theme: "Project Completion",
          commitments: [
            { title: "Finish strong", description: "Complete your main project", duration: 50 },
            { title: "Polish work", description: "Refine and improve", duration: 35 },
            { title: "Get feedback", description: "Seek constructive criticism", duration: 20 },
            { title: "Revise", description: "Implement improvements", duration: 40 },
            { title: "Final touches", description: "Perfect the details", duration: 30 },
            { title: "Celebrate", description: "Share your finished work", duration: 25 },
            { title: "Plan next project", description: "Design your next creation", duration: 30 }
          ]
        }
      ]
    }
  };

  // Check if category exists, otherwise try to detect from goal text
  let selectedTemplate = planTemplates[category];
  
  if (!selectedTemplate) {
    const goalLower = monthlyGoal.toLowerCase();
    if (goalLower.includes('save') || goalLower.includes('money') || goalLower.includes('$') || goalLower.includes('budget') || goalLower.includes('financial')) {
      selectedTemplate = planTemplates.financial;
    } else if (goalLower.includes('write') || goalLower.includes('book') || goalLower.includes('story') || goalLower.includes('creative')) {
      selectedTemplate = planTemplates.creative;
    } else if (goalLower.includes('gym') || goalLower.includes('exercise') || goalLower.includes('fitness') || goalLower.includes('workout')) {
      selectedTemplate = planTemplates.fitness;
    } else {
      // Default to fitness if nothing matches
      selectedTemplate = planTemplates.fitness;
    }
  }
  
  const template = selectedTemplate;
  
  return {
    success: true,
    plan: {
      monthly_goal: monthlyGoal,
      category: category,
      weekly_plans: template.weeks.map((week: any, weekIndex: number) => ({
        week_number: weekIndex + 1,
        theme: week.theme,
        focus: `Week ${weekIndex + 1} focus: ${week.theme}`,
        micro_commitments: week.commitments.map((commitment: any, dayIndex: number) => {
          // Adjust duration based on user's available time
          let adjustedDuration = commitment.duration;
          if (dailyMinutes < 20) {
            adjustedDuration = Math.min(commitment.duration, 15);
          } else if (dailyMinutes > 60) {
            adjustedDuration = Math.min(commitment.duration + 15, dailyMinutes);
          } else {
            adjustedDuration = Math.min(commitment.duration, dailyMinutes + 5);
          }
          
          return {
            day_of_week: dayIndex + 1,
            title: commitment.title,
            description: commitment.description,
            duration_minutes: adjustedDuration,
            scheduled_time: '7:30am' // Could be customized based on time preference
          };
        })
      }))
    }
  };
}

export default function OnboardingChat() {
  const { width, height } = useWindowDimensions();
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Hi! I'm your Grit coach. Let's build your personalized 30-day plan. What outcome do you want to achieve in 30 days?" },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const router = useRouter();

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setLoading(true);
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);

    try {
      // Call OpenAI directly from client
      const conversationHistory = messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content
      }));
      
      conversationHistory.push({ role: 'user', content: userMessage });
      
      const openAiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.EXPO_PUBLIC_OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are Grit, a focused coach conducting a 4-question interview to create a 30-day plan.

RULES:
- Keep responses to 1-2 sentences MAX
- Ask ONE question at a time
- Count user messages to know which question to ask

QUESTION SEQUENCE (based on user message count):
1st user message → Ask: "How much time can you dedicate daily?"
2nd user message → Ask: "Any constraints or challenges?"
3rd user message → Ask: "Experience level - beginner, intermediate, or advanced?"
4th user message → Ask: "What time of day - morning, afternoon, or evening?"
5th user message → Respond with ONLY this JSON (no other text):
{
  "complete": true,
  "data": {
    "monthly_goal": "user's exact goal from message 1",
    "goal_category": "fitness|financial|creative|professional|health|personal",
    "daily_time_minutes": 30,
    "current_level": "beginner|intermediate|advanced",
    "preferred_time": "morning|afternoon|evening"
  }
}

Be brief. No explanations. Just ask the next question.`
            },
            ...conversationHistory
          ],
          temperature: 0.7,
          max_tokens: 150
        })
      });

      if (!openAiResponse.ok) {
        throw new Error(`OpenAI API error: ${openAiResponse.status}`);
      }

      const aiData = await openAiResponse.json();
      const aiMessage = aiData.choices[0].message.content;

      // Check if response is JSON (completion signal)
      try {
        const jsonMatch = aiMessage.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.complete && parsed.data) {
            console.log('🎯 AI Interview complete! Data:', parsed.data);
            const { data: { session } } = await supabase.auth.getSession();
            const authToken = session?.access_token;
            if (authToken) {
              await generatePlanWithAI(authToken, parsed.data);
            }
            setLoading(false);
            return;
          }
        }
      } catch (e) {
        // Not JSON, continue as normal message
      }

      // Add AI response to messages
      setMessages((prev) => [...prev, { role: 'assistant', content: aiMessage }]);
      setLoading(false);
    } catch (error: any) {
      console.error('Chat error:', error);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' },
      ]);
      setLoading(false);
    }
  };

  // AI-powered plan generation
  const generatePlanWithAI = async (accessToken: string, extractedData: any) => {
    setIsGeneratingPlan(true);
    setMessages((prev) => [
      ...prev,
      { role: 'assistant', content: '🎯 Generating your personalized 30-day plan with AI...' },
    ]);

    try {
      const planPrompt = `Create a detailed, personalized 30-day plan based on this user data:

Goal: ${extractedData.monthly_goal}
Category: ${extractedData.goal_category}
Daily Time: ${extractedData.daily_time_minutes} minutes
Experience: ${extractedData.current_level}
Preferred Time: ${extractedData.preferred_time}

IMPORTANT: For each daily activity, provide DETAILED, ACTIONABLE instructions in the description field.
The description should include:
- A brief overview (1 sentence)
- 3-5 bullet points with specific, concrete steps to complete the activity
- Each bullet should be actionable and time-specific when possible
- Make it practical and easy to follow

Generate a JSON plan with this EXACT structure:
{
  "plan": {
    "monthly_goal": "specific goal",
    "category": "category",
    "weekly_plans": [
      {
        "week_number": 1,
        "theme": "Week theme",
        "focus": "Week focus",
        "micro_commitments": [
          {
            "day_of_week": 1,
            "title": "Activity title (short, action-oriented)",
            "description": "Brief overview of the activity.\\n\\n• First specific action step (be concrete)\\n• Second specific action step (include details)\\n• Third specific action step (make it actionable)\\n• Fourth step if needed (time-specific when possible)\\n• Fifth step if helpful (practical and clear)",
            "duration_minutes": 30
          }
          // ... 7 days total
        ]
      }
      // ... 4 weeks total
    ]
  }
}

EXAMPLE for a financial goal:
{
  "title": "Track Daily Expenses",
  "description": "Begin building awareness of your spending patterns to identify savings opportunities.\\n\\n• Open a notes app or spreadsheet on your phone\\n• Record every purchase you make today, no matter how small\\n• Categorize each expense (food, transport, entertainment, etc.)\\n• Calculate your total spending at the end of the day\\n• Identify one expense you could have avoided"
}

Make it specific to their goal "${extractedData.monthly_goal}". Include 4 weeks, each with 7 daily activities with detailed bullet-point instructions.`;

      const planResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.EXPO_PUBLIC_OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: planPrompt }],
          temperature: 0.8,
          max_tokens: 8000
        })
      });

      if (!planResponse.ok) {
        throw new Error(`OpenAI API error: ${planResponse.status}`);
      }

      const planData = await planResponse.json();
      const planText = planData.choices[0].message.content;
      
      // Extract JSON from response
      const jsonMatch = planText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON in response');
      }

      const generatedPlan = JSON.parse(jsonMatch[0]);
      
      console.log('Generated plan:', generatedPlan);

      // Save plan to database
      try {
        console.log('=== SAVING PLAN TO DATABASE ===');
        
        const { data: { user } } = await supabase.auth.getUser();
        console.log('Auth user ID:', user?.id);
        if (!user) throw new Error('No authenticated user');

        // Get user's public profile
        const { data: profile, error: profileError } = await supabase
          .from('users_public')
          .select('id, auth_id')
          .eq('auth_id', user.id)
          .single();

        console.log('Profile lookup result:', { profile, profileError });

        if (!profile) {
          console.error('No profile found for auth_id:', user.id);
          throw new Error('No user profile found');
        }

        console.log('Using user_id for plan:', profile.id);

        // Calculate start and end dates
        const startDate = new Date();
        startDate.setDate(startDate.getDate() + 1); // Start tomorrow
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 29); // 30 days total

        // Insert the plan into the database
        const planToInsert = {
          user_id: profile.id,
          monthly_goal: generatedPlan.plan.monthly_goal,
          category: generatedPlan.plan.category || 'general',
          weekly_plans: generatedPlan.plan.weekly_plans,
          status: 'active',
          // Required fields from schema
          start_date: startDate.toISOString().split('T')[0], // YYYY-MM-DD
          end_date: endDate.toISOString().split('T')[0],
          daily_time_minutes: 30, // Default 30 minutes
          current_level: 'beginner', // Default level
          preferred_time: 'morning' // Default time
        };

        console.log('Plan data to insert:', {
          user_id: planToInsert.user_id,
          monthly_goal: planToInsert.monthly_goal,
          category: planToInsert.category,
          weekly_plans_count: planToInsert.weekly_plans?.length || 0,
          status: planToInsert.status,
          start_date: planToInsert.start_date,
          end_date: planToInsert.end_date
        });

        // Mark any existing active plans as replaced (unique constraint allows only one active plan per user)
        const { error: updateError } = await supabase
          .from('plans')
          .update({ status: 'replaced' })
          .eq('user_id', profile.id)
          .eq('status', 'active');

        if (updateError) {
          console.log('Note: No existing active plans to replace, or error:', updateError);
        } else {
          console.log('Marked existing active plans as replaced');
        }

        const { data: insertedPlan, error: insertError } = await supabase
          .from('plans')
          .insert(planToInsert)
          .select()
          .single();

        if (insertError) {
          console.error('Error saving plan:', insertError);
          throw insertError;
        }

        console.log('✅ Plan saved successfully!');
        console.log('Plan ID:', insertedPlan.id);
        console.log('Plan user_id:', insertedPlan.user_id);

        // Also save daily activities to daily_activities table
        if (generatedPlan.plan.weekly_plans && insertedPlan.id) {
          console.log('Saving daily activities to database...');
          const dailyActivities: any[] = [];
          
          generatedPlan.plan.weekly_plans.forEach((week: any, weekIndex: number) => {
            week.micro_commitments?.forEach((commitment: any, dayIndex: number) => {
              const dayNumber = (weekIndex * 7) + dayIndex + 1; // 1-30
              const scheduledDate = new Date(startDate);
              scheduledDate.setDate(scheduledDate.getDate() + (dayNumber - 1));
              
              dailyActivities.push({
                plan_id: insertedPlan.id,
                day_number: dayNumber,
                scheduled_date: scheduledDate.toISOString().split('T')[0],
                title: commitment.title,
                description: commitment.description || commitment.fallback || '',
                duration_minutes: commitment.duration_minutes || 30,
                scheduled_time: commitment.scheduled_time || '07:30',
                week_number: week.week_number,
                week_theme: week.theme,
                status: 'pending'
              });
            });
          });

          const { error: activitiesError } = await supabase
            .from('daily_activities')
            .insert(dailyActivities);

          if (activitiesError) {
            console.error('Error saving daily activities:', activitiesError);
          } else {
            console.log(`✅ Saved ${dailyActivities.length} daily activities to database`);
          }
        }
      } catch (saveError) {
        console.error('Failed to save plan to database:', saveError);
        // Don't block the user, just log the error
      }

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: '✅ Your AI-powered plan is ready! Let me show you...' },
      ]);

      setTimeout(() => {
        router.replace('/plan/overview' as any);
      }, 1500);
    } catch (error: any) {
      console.error('AI Plan generation error:', error);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Failed to generate plan: ${error.message}. Please try again.` },
      ]);
      setIsGeneratingPlan(false);
    }
  };

  // Alias for AI-powered generation
  const generatePlan = generatePlanWithAI;

  // Remove old streaming code, replace with simple response handling
  const oldSendMessage = async () => {
    // This is the old Edge Function approach - keeping as backup
    if (!input.trim() || loading) return;
    const userMessage = input.trim();
    setInput('');
    setLoading(true);
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/onboarding_chat`,
        {
          method: 'POST',
          body: JSON.stringify({ message: userMessage, sessionId: sessionId }),
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response stream');

      const decoder = new TextDecoder();
      let assistantMessage = '';
      let newSessionId = sessionId;
      let isComplete = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter((line) => line.trim() !== '');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              
              if (parsed.content) {
                assistantMessage += parsed.content;
                setMessages((prev) => {
                  const newMessages = [...prev];
                  if (newMessages[newMessages.length - 1]?.role === 'assistant') {
                    newMessages[newMessages.length - 1].content = assistantMessage;
                  } else {
                    newMessages.push({ role: 'assistant', content: assistantMessage });
                  }
                  return newMessages;
                });
              }

              if (parsed.sessionId) {
                newSessionId = parsed.sessionId;
                setSessionId(parsed.sessionId);
                console.log('🔄 Updated sessionId to:', parsed.sessionId);
              }

              if (parsed.complete && parsed.data) {
                console.log('🎯 Onboarding complete! Data:', parsed.data);
                if (authToken) {
                  generatePlan(authToken, parsed.data);
                }
              } else if (parsed.complete) {
                // Handle case where complete is true but no structured data
                console.log('🎯 Onboarding marked complete, extracting data from conversation');
                
                // Extract goal category from conversation messages
                // Focus on user messages, especially the first one
                const userMessages = messages.filter(m => m.role === 'user').map(m => m.content.toLowerCase());
                const firstUserMessage = userMessages[0] || '';
                const allUserText = userMessages.join(' ');
                
                let goalCategory = 'general';
                let monthlyGoal = firstUserMessage || 'Achieve your 30-day goal';
                
                // Check for financial keywords
                if (allUserText.includes('save') || allUserText.includes('money') || allUserText.includes('$') || 
                    allUserText.includes('budget') || allUserText.includes('financial') || allUserText.includes('expense')) {
                  goalCategory = 'financial';
                  if (!monthlyGoal.includes('save') && !monthlyGoal.includes('money')) {
                    monthlyGoal = 'Save money and improve financial habits';
                  }
                } 
                // Check for fitness keywords
                else if (allUserText.includes('gym') || allUserText.includes('exercise') || allUserText.includes('fitness') || 
                         allUserText.includes('workout') || allUserText.includes('weight') || allUserText.includes('run')) {
                  goalCategory = 'fitness';
                  if (!monthlyGoal.includes('gym') && !monthlyGoal.includes('fitness')) {
                    monthlyGoal = 'Start going to the gym consistently';
                  }
                } 
                // Check for creative keywords
                else if (allUserText.includes('write') || allUserText.includes('book') || allUserText.includes('story') || 
                         allUserText.includes('creative') || allUserText.includes('art') || allUserText.includes('paint')) {
                  goalCategory = 'creative';
                  if (!monthlyGoal.includes('write') && !monthlyGoal.includes('creative')) {
                    monthlyGoal = 'Complete a creative project';
                  }
                }
                
                // Extract time commitment from conversation
                let dailyMinutes = 30;
                const timeMatch = allUserText.match(/(\d+)\s*(hour|hr|minute|min)/i);
                if (timeMatch) {
                  const num = parseInt(timeMatch[1]);
                  const unit = timeMatch[2].toLowerCase();
                  dailyMinutes = unit.includes('hour') || unit.includes('hr') ? num * 60 : num;
                }
                
                // Extract experience level
                let experienceLevel = 'beginner';
                if (allUserText.includes('intermediate') || allUserText.includes('some experience')) {
                  experienceLevel = 'intermediate';
                } else if (allUserText.includes('advanced') || allUserText.includes('experienced')) {
                  experienceLevel = 'advanced';
                }
                
                // Extract time preference
                let timePreference = 'flexible';
                if (allUserText.includes('morning') || allUserText.includes('am')) {
                  timePreference = 'morning';
                } else if (allUserText.includes('afternoon')) {
                  timePreference = 'afternoon';
                } else if (allUserText.includes('evening') || allUserText.includes('night') || allUserText.includes('pm')) {
                  timePreference = 'evening';
                }
                
                const conversationData = {
                  monthly_goal: monthlyGoal,
                  goal_category: goalCategory,
                  daily_time_minutes: dailyMinutes,
                  current_level: experienceLevel,
                  constraints: [],
                  preferred_time: timePreference,
                  motivation: "Build consistent daily habits",
                  user_context: {
                    first_message: firstUserMessage,
                    all_responses: userMessages
                  }
                };
                
                console.log('📊 Extracted conversation data:', conversationData);
                
                if (authToken) {
                  generatePlan(authToken, conversationData);
                }
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }

      if (!isComplete && assistantMessage && messages[messages.length - 1]?.role !== 'assistant') {
        setMessages((prev) => [...prev, { role: 'assistant', content: assistantMessage }]);
      }
    } catch (error: any) {
      console.error('Chat error:', error);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Old template-based generation removed - now using AI-powered generation above

  return (
    <View style={styles.backgroundImage}>
      <Image 
        source={require('@/assets/images/bg.png')}
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          top: 0,
          left: 0,
        }}
        resizeMode="cover"
      />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
      <ScrollView
        ref={scrollRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map((msg, idx) => (
          <View
            key={idx}
            style={[
              styles.messageBubble,
              msg.role === 'user' ? styles.userBubble : styles.assistantBubble,
            ]}
          >
            {msg.role === 'assistant' && (
              <Image 
                source={require('@/assets/images/gockins.png')}
                style={styles.coachAvatar}
              />
            )}
            <View style={styles.messageContent}>
              <Text
                style={[
                  styles.messageText,
                  msg.role === 'user' ? styles.userText : styles.assistantText,
                ]}
              >
                {msg.content}
              </Text>
            </View>
          </View>
        ))}
        {loading && (
          <View style={[styles.messageBubble, styles.assistantBubble]}>
            <View style={styles.coachAvatar}>
              <Text style={styles.coachAvatarText}>🎯</Text>
            </View>
            <View style={styles.messageContent}>
              <ActivityIndicator color="#C64F1A" />
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Type your answer..."
          placeholderTextColor="#666"
          multiline
          maxLength={500}
          editable={!loading && !isGeneratingPlan}
          onSubmitEditing={sendMessage}
          blurOnSubmit={false}
        />
        <Pressable
          onPress={sendMessage}
          disabled={!input.trim() || loading || isGeneratingPlan}
          style={({ pressed }) => [
            styles.sendButton,
            pressed && styles.sendButtonPressed,
            (!input.trim() || loading || isGeneratingPlan) && styles.sendButtonDisabled,
          ]}
        >
          <Text style={styles.sendButtonText}>→</Text>
        </Pressable>
      </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  headerSubtitle: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
  },
  messageBubble: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  userBubble: {
    justifyContent: 'flex-end',
  },
  assistantBubble: {
    justifyContent: 'flex-start',
  },
  coachAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 2,
    borderColor: '#FF0000',
  },
  coachAvatarText: {
    fontSize: 18,
  },
  messageContent: {
    flex: 1,
    maxWidth: '80%',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userText: {
    color: '#FFFFFF',
    backgroundColor: '#2A2A2A',
    padding: 12,
    borderRadius: 16,
    borderBottomRightRadius: 4,
    alignSelf: 'flex-end',
  },
  assistantText: {
    color: '#E5E7EB',
    backgroundColor: '#1A1A1A',
    padding: 12,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    color: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    fontSize: 15,
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#C64F1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonPressed: {
    opacity: 0.8,
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '600',
  },
});
