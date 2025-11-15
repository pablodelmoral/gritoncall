import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import AppHeader from '@/components/AppHeader';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/colors';
import Typography from '@/components/atoms/Typography';
import Button from '@/components/atoms/Button';
import Card from '@/components/molecules/Card';

export default function PlanOverview() {
  const router = useRouter();
  const [planData, setPlanData] = React.useState<any>({
    monthlyGoal: '',
    weeklyFocus: [],
    dayOnePreview: {
      activity: '',
      fallback: ''
    }
  });
  const [loading, setLoading] = React.useState(true);

  // Load plan from database
  React.useEffect(() => {
    loadPlanFromDatabase();
  }, []);

  const loadPlanFromDatabase = async () => {
    try {
      // Get the user's auth ID
      const { data: { user } } = await supabase.auth.getUser();
      console.log('Auth user:', user?.id);
      if (!user) {
        console.log('No user found');
        setLoading(false);
        return;
      }

      // Get user's public profile to get the user_id
      const { data: profile, error: profileError } = await supabase
        .from('users_public')
        .select('id')
        .eq('auth_id', user.id)
        .single();

      console.log('Profile query result:', { profile, profileError });
      
      if (!profile) {
        console.log('No profile found');
        setLoading(false);
        return;
      }

      console.log('Looking for plan with user_id:', profile.id);

      // First, let's see ALL plans in the database for this user
      const { data: allPlans, error: allPlansError } = await supabase
        .from('plans')
        .select('*')
        .eq('user_id', profile.id);

      console.log('=== ALL PLANS FOR USER ===');
      console.log('Total plans found:', allPlans?.length || 0);
      console.log('All plans:', allPlans);
      console.log('Error:', allPlansError);

      if (!allPlans || allPlans.length === 0) {
        console.log('No plans found in database for this user');
        setLoading(false);
        return;
      }

      // Use the most recent plan (first one)
      const plan = allPlans[0];
      console.log('Using plan:', plan);

      if (plan) {
        processAndSetPlan(plan);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading plan:', error);
      setLoading(false);
    }
  };

  const processAndSetPlan = (plan: any) => {
    console.log('=== PROCESSING PLAN ===');
    console.log('Full plan object:', JSON.stringify(plan, null, 2));
    console.log('monthly_goal:', plan.monthly_goal);
    console.log('weekly_plans type:', typeof plan.weekly_plans);
    console.log('weekly_plans value:', plan.weekly_plans);
        
    // Parse weekly_plans if it's a string (JSONB from database)
    let weeklyPlans = null;
    try {
      if (typeof plan.weekly_plans === 'string') {
        weeklyPlans = JSON.parse(plan.weekly_plans);
      } else if (Array.isArray(plan.weekly_plans)) {
        weeklyPlans = plan.weekly_plans;
      }
      console.log('Parsed weekly_plans:', weeklyPlans);
    } catch (e) {
      console.error('Error parsing weekly_plans:', e);
      weeklyPlans = [];
    }

    // Build the plan data with safe defaults
    const weeklyFocus = Array.isArray(weeklyPlans) 
      ? weeklyPlans.map((week: any) => ({
          week: week.week_number || 0,
          title: week.theme || 'Week ' + (week.week_number || 0)
        }))
      : [];

    const firstDay = weeklyPlans?.[0]?.micro_commitments?.[0];
    
    console.log('Setting plan data with:', {
      monthlyGoal: plan.monthly_goal,
      weeklyFocusCount: weeklyFocus.length,
      firstDay
    });
    
    setPlanData({
      monthlyGoal: plan.monthly_goal || 'Your 30-day goal',
      weeklyFocus: weeklyFocus,
      dayOnePreview: {
        activity: firstDay?.title || "Start your journey",
        fallback: firstDay?.fallback || firstDay?.description || "Take the first step"
      }
    });
  };

  const handleApprovePlan = async () => {
    // Navigate to editor for detailed review
    router.push('/plan/editor' as any);
  };

  const handleRegeneratePlan = () => {
    // Go back to onboarding chat
    router.push('/onboarding/chat' as any);
  };

  if (loading) {
    return (
      <View style={styles.wrapper}>
        <View style={styles.loadingContainer}>
          <Typography variant="h3">Loading your plan...</Typography>
        </View>
        <AppHeader />
      </View>
    );
  }

  if (!planData || !planData.monthlyGoal) {
    return (
      <View style={styles.wrapper}>
        <ScrollView style={styles.container}>
          <View style={styles.header}>
            <Typography variant="h2">NO PLAN YET</Typography>
          </View>
          <Card style={styles.section}>
            <Typography variant="body">
              You haven't created a plan yet. Complete the onboarding to generate your personalized 30-day plan.
            </Typography>
          </Card>
          <View style={styles.buttonContainer}>
            <Button
              title="START ONBOARDING"
              onPress={() => router.push('/onboarding/chat' as any)}
              variant="primary"
            />
          </View>
        </ScrollView>
        <AppHeader />
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Typography variant="h2">YOUR 30 DAY PLAN</Typography>
        </View>

        <Card title="Monthly Goal" style={styles.section}>
          <Typography variant="body">{planData.monthlyGoal || 'Loading...'}</Typography>
        </Card>

        <Card title="Weekly Focus" style={styles.section}>
          {planData.weeklyFocus && planData.weeklyFocus.length > 0 ? (
            planData.weeklyFocus.map((week: any) => (
              <Typography key={week.week} variant="body" style={styles.weekText}>
                W{week.week}: {week.title}
              </Typography>
            ))
          ) : (
            <Typography variant="body">Loading weekly plan...</Typography>
          )}
        </Card>

        <Card title="Day 1 Preview" style={styles.section}>
          <Typography variant="body">
            {planData.dayOnePreview?.activity || 'Loading...'} • Fallback: {planData.dayOnePreview?.fallback || 'Loading...'}
          </Typography>
        </Card>

        <View style={styles.buttonContainer}>
          <Button
            title="REVIEW & EDIT PLAN"
            onPress={handleApprovePlan}
            variant="primary"
          />
          <Button
            title="REGENERATE PLAN"
            onPress={handleRegeneratePlan}
            variant="secondary"
          />
        </View>
      </ScrollView>
      <AppHeader />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.black,
    padding: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingTop: 40,
    paddingBottom: 24,
    alignItems: 'center',
  },
  section: {
    marginHorizontal: 0,
  },
  weekText: {
    marginBottom: 8,
  },
  buttonContainer: {
    marginTop: 16,
    gap: 16,
    paddingBottom: 40,
  },
});
