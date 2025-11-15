// Plan database utilities
import { supabase } from './supabase';

export interface PlanData {
  monthly_goal: string;
  goal_category: string;
  daily_time_minutes: number;
  current_level: string;
  preferred_time: string;
  weekly_plans: Array<{
    week_number: number;
    theme: string;
    focus: string;
    micro_commitments: Array<{
      day_of_week: number;
      title: string;
      description: string;
      duration_minutes: number;
      scheduled_time?: string;
    }>;
  }>;
}

export interface SavePlanParams {
  userId: string;
  planData: PlanData;
  startDate: Date;
}

/**
 * Save a generated plan to the database with scheduled dates
 */
export async function savePlanToDatabase({ userId, planData, startDate }: SavePlanParams) {
  try {
    console.log('📊 Saving plan to database:', { userId, planData, startDate });

    // 0. Deactivate any existing active plans
    const { error: deactivateError } = await supabase
      .from('plans')
      .update({ status: 'replaced' })
      .eq('user_id', userId)
      .eq('status', 'active');

    if (deactivateError) {
      console.warn('⚠️ Warning deactivating old plans:', deactivateError);
    }

    // Calculate end date (30 days from start)
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 29);

    // 1. Create the plan record
    const planRecord = {
      user_id: userId,
      monthly_goal: planData.monthly_goal || 'Achieve your goal',
      category: planData.goal_category || 'general',
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      status: 'active',
      daily_time_minutes: planData.daily_time_minutes || 30,
      current_level: planData.current_level || 'beginner',
      preferred_time: planData.preferred_time || 'morning',
    };

    console.log('📝 Plan record to insert:', planRecord);

    const { data: plan, error: planError } = await supabase
      .from('plans')
      .insert(planRecord)
      .select()
      .single();

    if (planError) {
      console.error('❌ Plan insert error:', planError);
      throw planError;
    }

    console.log('✅ Plan created:', plan);

    // 2. Create daily activities with scheduled dates
    const dailyActivities = [];
    let dayCounter = 0;

    for (const week of planData.weekly_plans) {
      for (const commitment of week.micro_commitments) {
        const scheduledDate = new Date(startDate);
        scheduledDate.setDate(scheduledDate.getDate() + dayCounter);

        dailyActivities.push({
          plan_id: plan.id,
          day_number: dayCounter + 1,
          scheduled_date: scheduledDate.toISOString().split('T')[0],
          title: commitment.title,
          description: commitment.description,
          duration_minutes: commitment.duration_minutes,
          scheduled_time: commitment.scheduled_time || planData.preferred_time === 'morning' ? '07:30:00' : 
                         planData.preferred_time === 'afternoon' ? '14:00:00' : '19:00:00',
          week_number: week.week_number,
          week_theme: week.theme,
          status: 'pending',
        });

        dayCounter++;
      }
    }

    console.log(`📅 Inserting ${dailyActivities.length} daily activities`);

    const { data: insertedActivities, error: activitiesError } = await supabase
      .from('daily_activities')
      .insert(dailyActivities)
      .select();

    if (activitiesError) {
      console.error('❌ Activities insert error:', activitiesError);
      throw activitiesError;
    }

    console.log('✅ Daily activities created:', insertedActivities?.length);

    // 3. Schedule first day's call
    if (insertedActivities && insertedActivities.length > 0) {
      const firstActivity = insertedActivities[0];
      const firstCallTime = new Date(startDate);
      const [hours, minutes] = (firstActivity.scheduled_time || '07:30:00').split(':');
      firstCallTime.setHours(parseInt(hours), parseInt(minutes), 0);

      const { error: callError } = await supabase
        .from('call_schedule')
        .insert({
          user_id: userId,
          daily_activity_id: firstActivity.id,
          scheduled_time: firstCallTime.toISOString(),
          status: 'scheduled',
        });

      if (callError) {
        console.error('⚠️ Failed to schedule call:', callError);
      } else {
        console.log('✅ First call scheduled');
      }
    }

    return { success: true, planId: plan.id };
  } catch (error) {
    console.error('Error saving plan to database:', error);
    throw error;
  }
}

/**
 * Get today's activity for the current user
 */
export async function getTodaysActivity() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase.rpc('get_todays_activity', {
      user_auth_id: user.id
    });

    if (error) throw error;
    return data?.[0] || null;
  } catch (error) {
    console.error('Error getting today\'s activity:', error);
    return null;
  }
}

/**
 * Mark an activity as complete
 */
export async function markActivityComplete(activityId: string, targetLevel: 'minimum' | 'push' | 'fallback') {
  try {
    const { error } = await supabase.rpc('complete_activity', {
      activity_id: activityId,
      target_level: targetLevel
    });

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error marking activity complete:', error);
    throw error;
  }
}

/**
 * Get user's plan progress statistics
 */
export async function getPlanProgress(userId: string) {
  try {
    const { data: plan, error: planError } = await supabase
      .from('plans')
      .select('id, monthly_goal, start_date, end_date')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (planError || !plan) return null;

    const { data: activities, error: activitiesError } = await supabase
      .from('daily_activities')
      .select('status, target_reached, day_number')
      .eq('plan_id', plan.id)
      .order('day_number');

    if (activitiesError) throw activitiesError;

    const completed = activities.filter(a => a.status === 'completed').length;
    const pushTargets = activities.filter(a => a.target_reached === 'push').length;
    const minimums = activities.filter(a => a.target_reached === 'minimum').length;
    const fallbacks = activities.filter(a => a.target_reached === 'fallback').length;

    return {
      planId: plan.id,
      monthlyGoal: plan.monthly_goal,
      startDate: plan.start_date,
      endDate: plan.end_date,
      totalDays: activities.length,
      completedDays: completed,
      pushTargets,
      minimums,
      fallbacks,
      currentDay: activities.findIndex(a => a.status === 'pending') + 1,
    };
  } catch (error) {
    console.error('Error getting plan progress:', error);
    return null;
  }
}

/**
 * Get user's active plan with all activities
 */
export async function getActivePlan(userId: string) {
  try {
    const { data: plan, error: planError } = await supabase
      .from('plans')
      .select(`
        *,
        daily_activities (*)
      `)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (planError) throw planError;
    return plan;
  } catch (error) {
    console.error('Error getting active plan:', error);
    return null;
  }
}
