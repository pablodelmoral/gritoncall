import AppHeader from '@/components/AppHeader';
import Button from '@/components/atoms/Button';
import CustomScrollView from '@/components/atoms/CustomScrollView';
import GradientCard from '@/components/atoms/GradientPanel';
import FlameProgressBar from '@/components/molecules/FlameProgressBar';
import { INSTANT_CALL_URL } from '@/constants/config';
import { useSession } from '@/hooks/useSession';
import { getCoachAvatar } from '@/lib/coachAssets';
import { supabase } from '@/lib/supabase';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDate() {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const d = new Date();
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()} ${d.getFullYear()}`;
}

export default function Home() {
  const { width, height } = useWindowDimensions();
  const session = useSession();
  const queryClient = useQueryClient();
  const [todaysPlan, setTodaysPlan] = useState<any>(null);
  const [aiMotivation, setAiMotivation] = useState<string>('');
  const [loadingMotivation, setLoadingMotivation] = useState(false);
  const [dailyGreeting, setDailyGreeting] = useState<string>("Hey Pablo here's your mission.");
  const [loadingGreeting, setLoadingGreeting] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [coachProfile, setCoachProfile] = useState<any>(null);
  const [yesterdayCommitment, setYesterdayCommitment] = useState<string | null>(null);
  const [callMadeToday, setCallMadeToday] = useState<boolean>(false);
  const [triggeringCall, setTriggeringCall] = useState<boolean>(false);

  const callStatusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: profile, refetch: refetchProfile } = useQuery({
    enabled: !!session,
    queryKey: ['profile'],
    queryFn: async () => {
      const { data } = await supabase
        .from('users_public')
        .select('id, streak, selected_coach_slug, phone_number')
        .eq('auth_id', session!.user.id)
        .single();
      return data as any;
    },
  });

  // Load user's selected coach profile
  useEffect(() => {
    const loadCoachProfile = async () => {
      if (!profile?.selected_coach_slug) return;

      try {
        const { data, error } = await supabase
          .from('coach_profiles')
          .select('slug, display_name, short_tagline, system_prompt, avatar_image_url')
          .eq('slug', profile.selected_coach_slug)
          .eq('is_active', true)
          .single();

        if (error) {
          console.error('Error loading coach profile:', error);
          return;
        }

        setCoachProfile(data);
      } catch (error) {
        console.error('Failed to load coach profile:', error);
      }
    };

    loadCoachProfile();
  }, [profile?.selected_coach_slug]);

  // Load yesterday's commitment
  useEffect(() => {
    const loadYesterdayCommitment = async () => {
      if (!session) return;

      try {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        const { data: userPublic } = await supabase
          .from('users_public')
          .select('id')
          .eq('auth_id', session.user.id)
          .single();

        if (userPublic) {
          const { data: yesterdayActivity } = await supabase
            .from('daily_activities')
            .select('next_day_commitment, commitment_confidence, call_recap')
            .eq('plan_id', (await supabase
              .from('plans')
              .select('id')
              .eq('user_id', userPublic.id)
              .eq('status', 'active')
              .single()).data?.id || '')
            .eq('scheduled_date', yesterdayStr)
            .single();

          if (yesterdayActivity?.next_day_commitment) {
            setYesterdayCommitment(yesterdayActivity.next_day_commitment);
          }
        }
      } catch (error) {
        console.log('No yesterday commitment found');
      }
    };

    loadYesterdayCommitment();
  }, [session]);

  const checkTodaysCall = useCallback(async () => {
    if (!session) {
      setCallMadeToday(false);
      return;
    }

    try {
      const { data: userPublic } = await supabase
        .from('users_public')
        .select('id')
        .eq('auth_id', session.user.id)
        .single();

      if (userPublic) {
        const today = new Date().toISOString().split('T')[0];

        const { data: calls } = await supabase
          .from('scheduled_calls')
          .select('id, status, call_started_at')
          .eq('user_id', userPublic.id)
          .gte('scheduled_for', `${today}T00:00:00`)
          .lte('scheduled_for', `${today}T23:59:59`);

        // Consider a call "done for today" if it fully completed OR is still in progress
        const hasCompletedOrInProgress = (calls || []).some(call => 
          call.status === 'completed' || (call.status === 'calling' && call.call_started_at)
        );
        setCallMadeToday(hasCompletedOrInProgress);
      }
    } catch (error) {
      console.log('Error checking today\'s call:', error);
    }
  }, [session]);

  // Check if a call was successfully completed today
  useEffect(() => {
    checkTodaysCall();
  }, [checkTodaysCall]);

  useEffect(() => {
    return () => {
      if (callStatusTimeoutRef.current) {
        clearTimeout(callStatusTimeoutRef.current);
      }
    };
  }, []);

  // Load today's plan from database (or next scheduled if today is empty)
  useEffect(() => {
    const loadTodaysPlan = async () => {
      if (!session) return;

      try {
        // First try to get today's activity
        const { data, error } = await supabase.rpc('get_todays_activity', {
          user_auth_id: session.user.id
        });

        if (error) throw error;

        if (data && data.length > 0) {
          const activity = data[0];
          setTodaysPlan({
            id: activity.activity_id,
            title: activity.title,
            description: activity.description,
            duration_minutes: activity.duration_minutes,
            scheduled_time: activity.scheduled_time,
            status: activity.status,
            day_number: activity.day_number,
            weekTheme: activity.week_theme,
            monthlyGoal: activity.monthly_goal,
            isFuture: false,
          });
        } else {
          // No activity today, get the next scheduled one
          const { data: userPublic } = await supabase
            .from('users_public')
            .select('id')
            .eq('auth_id', session.user.id)
            .single();

          if (userPublic) {
            const { data: nextActivity } = await supabase
              .from('daily_activities')
              .select(`
                id,
                title,
                description,
                duration_minutes,
                scheduled_time,
                scheduled_date,
                status,
                day_number,
                week_theme,
                plan_id
              `)
              .eq('plan_id', (await supabase
                .from('plans')
                .select('id')
                .eq('user_id', userPublic.id)
                .eq('status', 'active')
                .single()).data?.id || '')
              .gte('scheduled_date', new Date().toISOString().split('T')[0])
              .order('scheduled_date', { ascending: true })
              .limit(1)
              .single();

            if (nextActivity) {
              const { data: plan } = await supabase
                .from('plans')
                .select('monthly_goal')
                .eq('id', nextActivity.plan_id)
                .single();

              setTodaysPlan({
                id: nextActivity.id,
                title: nextActivity.title,
                description: nextActivity.description,
                duration_minutes: nextActivity.duration_minutes,
                scheduled_time: nextActivity.scheduled_time,
                status: nextActivity.status,
                day_number: nextActivity.day_number,
                weekTheme: nextActivity.week_theme,
                monthlyGoal: plan?.monthly_goal || '',
                isFuture: true,
                scheduledDate: nextActivity.scheduled_date,
              });
            }
          }
        }
      } catch (error) {
        console.error('Error loading activity:', error);
      }
    };

    loadTodaysPlan();
  }, [session]);

  // Generate AI daily greeting
  useEffect(() => {
    const generateGreeting = async () => {
      if (!todaysPlan || !session || !coachProfile) return;

      setLoadingGreeting(true);
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.EXPO_PUBLIC_OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: coachProfile.system_prompt,
              },
              {
                role: 'user',
                content: `Generate a SHORT (5-8 words max) punchy greeting for the daily overview screen. User's name is Pablo. Current streak: ${profile?.streak || 0} days. Today's task: ${todaysPlan.title}. Make it motivating and in your coaching style. Examples: "Time to dominate, Pablo.", "Let's stack another win.", "Your move, champion."`,
              },
            ],
            temperature: 0.9,
            max_tokens: 30,
          }),
        });

        const data = await response.json();
        const greeting = data.choices[0].message.content.replace(/['"]/g, '');
        setDailyGreeting(greeting);
      } catch (error) {
        console.error('Failed to generate greeting:', error);
        setDailyGreeting("Time to show up, Pablo.");
      } finally {
        setLoadingGreeting(false);
      }
    };

    generateGreeting();
  }, [todaysPlan, coachProfile, profile?.streak]);

  // Generate AI motivation based on progress and coach personality
  useEffect(() => {
    const generateMotivation = async () => {
      if (!todaysPlan || !session || !coachProfile) return;
      
      setLoadingMotivation(true);
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.EXPO_PUBLIC_OPENAI_API_KEY}`
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{
              role: 'system',
              content: coachProfile.system_prompt
            }, {
              role: 'user',
              content: `Generate a SHORT (2-3 sentences max) motivational message for today's task.

User's streak: ${profile?.streak || 0} days
Today's activity: ${todaysPlan.title}
Monthly goal: ${todaysPlan.monthlyGoal}
${yesterdayCommitment ? `
Yesterday they committed to: "${yesterdayCommitment}"
Remind them of this commitment and hold them accountable.` : ''}

Stay in character. Reference their streak if relevant. Keep it under 50 words.`
            }],
            temperature: 0.9,
            max_tokens: 100
          })
        });

        const data = await response.json();
        setAiMotivation(data.choices[0].message.content);
      } catch (error) {
        console.error('Failed to generate motivation:', error);
        setAiMotivation(coachProfile.short_tagline || "You've got this. Show up today and prove you're serious about your goal.");
      } finally {
        setLoadingMotivation(false);
      }
    };

    generateMotivation();
  }, [todaysPlan, profile?.streak, coachProfile]);

  const openDetailsModal = () => {
    setShowDetailsModal(true);
  };
  
  const closeDetailsModal = () => {
    setShowDetailsModal(false);
  };

  const callNow = async () => {
    try {
      const res = await fetch(INSTANT_CALL_URL, { method: 'POST' });
      if (!res.ok) throw new Error('Call trigger failed');
      Alert.alert('Calling', 'Your coach will call in a few seconds.');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const markAsDone = async () => {
    console.log('markAsDone called, todaysPlan:', todaysPlan);
    console.log('todaysPlan.id:', todaysPlan?.id);
    
    if (!todaysPlan?.id) {
      Alert.alert('Error', 'No activity ID found. Please refresh the page.');
      return;
    }

    Alert.alert(
      'Mark as Complete',
      'Which target did you hit?',
      [
        {
          text: 'Fallback',
          onPress: async () => {
            try {
              const { error } = await supabase.rpc('complete_activity', {
                activity_id: todaysPlan.id,
                target_level: 'fallback'
              });
              
              if (error) throw error;
              
              // Reload today's plan
              const { data } = await supabase.rpc('get_todays_activity', {
                user_auth_id: session!.user.id
              });
              
              if (data?.[0]) {
                setTodaysPlan({
                  ...data[0],
                  id: data[0].activity_id,
                  status: 'completed',
                });
              }
              
              // Invalidate and refetch profile to update streak
              await queryClient.invalidateQueries({ queryKey: ['profile'] });
              await refetchProfile();
              
              Alert.alert('Nice!', 'Something is better than nothing. Streak maintained!');
            } catch (error: any) {
              console.error('Error completing activity:', error);
              Alert.alert('Error', error.message || 'Failed to save progress');
            }
          }
        },
        {
          text: 'Minimum',
          onPress: async () => {
            try {
              const { error } = await supabase.rpc('complete_activity', {
                activity_id: todaysPlan.id,
                target_level: 'minimum'
              });
              
              if (error) throw error;
              
              const { data } = await supabase.rpc('get_todays_activity', {
                user_auth_id: session!.user.id
              });
              
              if (data?.[0]) {
                setTodaysPlan({
                  ...data[0],
                  id: data[0].activity_id,
                  status: 'completed',
                });
              }
              
              // Invalidate and refetch profile to update streak
              await queryClient.invalidateQueries({ queryKey: ['profile'] });
              await refetchProfile();
              
              Alert.alert('Great!', 'You hit your target. Keep it up!');
            } catch (error: any) {
              console.error('Error completing activity:', error);
              Alert.alert('Error', error.message || 'Failed to save progress');
            }
          }
        },
        {
          text: 'Push Target',
          style: 'default',
          onPress: async () => {
            try {
              const { error } = await supabase.rpc('complete_activity', {
                activity_id: todaysPlan.id,
                target_level: 'push'
              });
              
              if (error) throw error;
              
              const { data } = await supabase.rpc('get_todays_activity', {
                user_auth_id: session!.user.id
              });
              
              if (data?.[0]) {
                setTodaysPlan({
                  ...data[0],
                  id: data[0].activity_id,
                  status: 'completed',
                });
              }
              
              // Invalidate and refetch profile to update streak
              await queryClient.invalidateQueries({ queryKey: ['profile'] });
              await refetchProfile();
              
              Alert.alert('Excellent!', 'You crushed it! That\'s how champions are made.');
            } catch (error: any) {
              console.error('Error completing activity:', error);
              Alert.alert('Error', error.message || 'Failed to save progress');
            }
          }
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]
    );
  };

  const undoComplete = async () => {
    if (!todaysPlan?.id) return;

    try {
      const { error } = await supabase
        .from('daily_activities')
        .update({
          status: 'pending',
          completed_at: null,
          target_reached: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', todaysPlan.id);

      if (error) throw error;

      // Reload today's plan
      const { data } = await supabase.rpc('get_todays_activity', {
        user_auth_id: session!.user.id
      });

      if (data?.[0]) {
        setTodaysPlan({
          ...data[0],
          id: data[0].activity_id,
          status: 'pending',
        });
      }

      // Refetch profile to update streak
      await queryClient.invalidateQueries({ queryKey: ['profile'] });
      await refetchProfile();

      Alert.alert('Undone', 'Task marked as incomplete.');
    } catch (error: any) {
      console.error('Error undoing completion:', error);
      Alert.alert('Error', error.message || 'Failed to undo');
    }
  };

  const resetCallTest = () => {
    setCallMadeToday(false);
    Alert.alert('Reset', 'Call state reset. You can trigger another call.');
  };

  const triggerCallNow = async () => {
    if (!session || !todaysPlan?.id) return;

    setTriggeringCall(true);

    try {
      // Get user ID
      const { data: userPublic } = await supabase
        .from('users_public')
        .select('id')
        .eq('auth_id', session.user.id)
        .single();

      if (!userPublic) throw new Error('User not found');

      // Format phone number to E.164 format
      let formattedPhone = profile?.phone_number || '';
      if (formattedPhone && !formattedPhone.startsWith('+')) {
        // Remove any non-digit characters
        const digitsOnly = formattedPhone.replace(/\D/g, '');
        // Add +1 for North American numbers
        formattedPhone = `+1${digitsOnly}`;
      }

      // Create a scheduled call for right now
      const { data: scheduledCall, error: insertError } = await supabase
        .from('scheduled_calls')
        .insert({
          user_id: userPublic.id,
          daily_activity_id: todaysPlan.id,
          phone_number: formattedPhone,
          coach_slug: profile?.selected_coach_slug || 'drill_sergeant',
          timezone: 'America/Toronto',
          scheduled_for: new Date().toISOString(),
          status: 'pending',
          attempt_number: 1,
          max_attempts: 3
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Trigger the initiate-calls function immediately
      const response = await fetch(
        'https://xbfwsumpaztzmeoumrrq.supabase.co/functions/v1/initiate-calls',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`
          }
        }
      );

      if (!response.ok) throw new Error('Failed to trigger call');

      Alert.alert('Call Initiated!', 'Your accountability call will start in a moment.');

      // After a short delay, check whether the call completed successfully
      if (callStatusTimeoutRef.current) {
        clearTimeout(callStatusTimeoutRef.current);
      }

      callStatusTimeoutRef.current = setTimeout(async () => {
        await checkTodaysCall();
        setTriggeringCall(false);
      }, 30000);
    } catch (error: any) {
      console.error('Error triggering call:', error);
      Alert.alert('Error', error.message || 'Failed to initiate call');
      setTriggeringCall(false);
      if (callStatusTimeoutRef.current) {
        clearTimeout(callStatusTimeoutRef.current);
        callStatusTimeoutRef.current = null;
      }
    }
  };

  const regeneratePlan = () => {
    router.push('/onboarding/chat' as any);
  };

  if (!todaysPlan) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>GRIT ON CALL</Text>
        <Text style={styles.noplan}>No plan yet. Complete onboarding to get started!</Text>
        <Pressable onPress={() => router.push('/onboarding/chat' as any)} style={styles.button}>
          <Text style={styles.buttonText}>START ONBOARDING</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.backgroundImage}>
      <Image 
        source={require('@/assets/images/bg.png')}
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          resizeMode: 'cover',
        }}
      />
      <View style={styles.headerBar}>
        <Image 
          source={require('@/assets/images/logo.png')}
          style={styles.headerLogo}
        />
        <Text style={styles.headerTitle}>DAILY OVERVIEW</Text>
      </View>
      <CustomScrollView style={styles.container}>

      {/* Top Info Card */}
      <View style={styles.infoCard}>
        {/* Greeting */}
          <Text style={styles.greeting}>
            {todaysPlan.isFuture ? "Your journey starts soon!" : (loadingGreeting ? "..." : dailyGreeting)}
          </Text>
          <Text style={styles.date}>
            {todaysPlan.isFuture 
              ? `Starts ${todaysPlan.scheduledDate} - Day ${todaysPlan.day_number}`
              : `${formatDate()} - Day ${todaysPlan.day_number}`}
          </Text>

          {/* Streak Section - Compact Design */}
          <View style={styles.streakSection}>
            <View style={styles.streakHeader}>
              <View style={styles.streakBadge}>
                <Text style={styles.streakText}>🔥 HEATING UP</Text>
              </View>
              <Text style={styles.streakCount}>{profile?.streak || 0} DAY STREAK</Text>
            </View>
            
            {/* Flame Progress Bar - 30 Day Goal */}
            <View style={styles.progressBarContainer}>
              <FlameProgressBar 
                progress={10 + ((Math.min(profile?.streak || 0, 30) / 30) * 90)}
                days={Math.min(profile?.streak || 0, 30)}
                label=""
              />
            </View>
          </View>
      </View>

      {/* Mission Briefing - Clickable Card */}
      <Pressable onPress={openDetailsModal} style={styles.missionCard}>
        <GradientCard>
          <View style={styles.cardHeader}>
            <Text style={styles.sectionTitle}>MISSION BRIEFING</Text>
            <Text style={styles.tapHint}>Tap for details</Text>
          </View>
          
          {/* Minimum Expectation */}
          <View style={styles.missionItem}>
            <Text style={styles.missionLabel}>Minimum Expectation (ME)</Text>
            <Text style={styles.missionText}>{todaysPlan.title}</Text>
          </View>

          {/* Push Target */}
          <View style={styles.missionItem}>
            <Text style={styles.missionLabel}>Push Target (PT)</Text>
            <Text style={styles.missionText}>
              Go for {todaysPlan.duration_minutes + 15} minutes if you're feeling it.
            </Text>
          </View>

          {/* Fallback */}
          <View style={styles.missionItem}>
            <Text style={styles.missionLabel}>Fallback (FB)</Text>
            <Text style={styles.missionText}>
              If the day goes sideways, do {Math.floor(todaysPlan.duration_minutes / 2)} minutes. No zero days.
            </Text>
          </View>
        </GradientCard>
      </Pressable>

      {/* AI Coach Message */}
      <View style={styles.coachWrapper}>
        <Image 
          source={coachProfile ? getCoachAvatar(coachProfile.avatar_image_url) : require('@/assets/images/gockins.png')}
          style={styles.coachAvatar}
        />
        <View style={styles.coachSection}>
          <Text style={styles.coachName}>{coachProfile?.display_name?.toUpperCase() || 'GOCKINS'}</Text>
          {loadingMotivation ? (
            <ActivityIndicator color="#FF0000" />
          ) : (
            <Text style={styles.coachText}>{aiMotivation}</Text>
          )}
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        {!todaysPlan.isFuture && !callMadeToday && (
          <Button 
            title={triggeringCall ? "CALLING..." : "CALL ME NOW"}
            onPress={triggerCallNow}
            variant="primary"
            disabled={triggeringCall}
          />
        )}
        {!todaysPlan.isFuture && callMadeToday && (
          <Button 
            title="Reset Call (Test)"
            onPress={resetCallTest}
            variant="secondary"
          />
        )}
        {!todaysPlan.isFuture && todaysPlan.status !== 'completed' && (
          <Button 
            title="MARK AS DONE" 
            onPress={markAsDone}
            variant="primary"
          />
        )}
        {todaysPlan.status === 'completed' && (
          <>
            <View style={styles.completedBadge}>
              <Text style={styles.completedText}>✅ COMPLETED</Text>
            </View>
            <Button 
              title="UNDO" 
              onPress={undoComplete}
              variant="secondary"
            />
          </>
        )}

        <Button 
          title="REGENERATE PLAN" 
          onPress={regeneratePlan}
          variant="secondary"
        />
      </View>

        <View style={{ height: 40 }} />
      </CustomScrollView>
      <AppHeader />
      
      {/* Full Screen Details Modal */}
      <Modal
        visible={showDetailsModal}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>DETAILED INSTRUCTIONS</Text>
            <Pressable onPress={closeDetailsModal} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </Pressable>
          </View>
          
          <ScrollView 
            style={styles.modalContent}
            showsVerticalScrollIndicator={true}
            indicatorStyle="white"
            scrollIndicatorInsets={{ right: 1 }}
          >
            <View style={styles.modalCard}>
              <Text style={styles.modalActivityTitle}>{todaysPlan.title}</Text>
              <Text style={styles.modalDescription}>{todaysPlan.description || 'No additional details available.'}</Text>
              
              <View style={styles.modalMetaContainer}>
                <View style={styles.modalMeta}>
                  <Text style={styles.modalMetaLabel}>Duration:</Text>
                  <Text style={styles.modalMetaValue}>{todaysPlan.duration_minutes} minutes</Text>
                </View>
                <View style={styles.modalMeta}>
                  <Text style={styles.modalMetaLabel}>Day:</Text>
                  <Text style={styles.modalMetaValue}>Day {todaysPlan.day_number}</Text>
                </View>
              </View>
              
              <View style={styles.modalTargets}>
                <Text style={styles.modalTargetsTitle}>Today's Targets:</Text>
                
                <View style={styles.targetItem}>
                  <Text style={styles.targetLabel}>Minimum Expectation (ME)</Text>
                  <Text style={styles.targetText}>{todaysPlan.title}</Text>
                </View>
                
                <View style={styles.targetItem}>
                  <Text style={styles.targetLabel}>Push Target (PT)</Text>
                  <Text style={styles.targetText}>
                    Go for {todaysPlan.duration_minutes + 15} minutes if you're feeling it.
                  </Text>
                </View>
                
                <View style={styles.targetItem}>
                  <Text style={styles.targetLabel}>Fallback (FB)</Text>
                  <Text style={styles.targetText}>
                    If the day goes sideways, do {Math.floor(todaysPlan.duration_minutes / 2)} minutes. No zero days.
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    backgroundColor: '#000000',
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    padding: 20,
    paddingTop: 0,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#000000',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#FF0000',
  },
  headerLogo: {
    width: 100,
    height: 32,
    resizeMode: 'contain',
  },
  headerTitle: {
    color: '#CCCCCC',
    fontSize: 15,
    fontFamily: 'Akira-Extended',
    letterSpacing: 1.5,
  },
  infoCard: {
    marginBottom: 20,
    padding: 20,
  },
  missionLabel: {
    color: '#999999',
    fontSize: 13,
    marginBottom: 2,
    fontFamily: 'OpenSans-Regular',
  },
  sectionTitle: {
    color: '#FF0000',
    fontSize: 18,
    fontFamily: 'Akira-Extended',
    marginBottom: 16,
    letterSpacing: 1,
  },
  regenerateButtonText: {
    color: '#EEEEEE',
    fontSize: 14,
    fontFamily: 'Akira-Extended',
    letterSpacing: 1,
  },
  greeting: {
    color: '#FF0000',
    fontSize: 18,
    fontFamily: 'OpenSans-Bold',
    marginBottom: 8,
  },
  date: {
    color: '#999999',
    fontSize: 13,
    marginBottom: 16,
    fontFamily: 'OpenSans-Regular',
  },
  streakSection: {
    marginTop: 20,
  },
  streakHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  streakBadge: {
    backgroundColor: '#FFA500',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  streakText: {
    color: '#000000',
    fontSize: 11,
    fontFamily: 'Akira-Extended',
    letterSpacing: 1,
  },
  streakCount: {
    color: '#FFFFFF',
    fontSize: 20,
    fontFamily: 'Akira-Extended',
    letterSpacing: 1.5,
  },
  progressBarContainer: {
    marginTop: 0,
  },
  missionCard: {
    marginBottom: 16,
    position: 'relative',
  },
  missionItem: {
    marginBottom: 20,
  },
  missionText: {
    color: '#E0E0E0',
    fontSize: 17,
    fontFamily: 'OpenSans-SemiBold',
    lineHeight: 26,
    marginTop: 4,
  },
  coachWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 24,
    marginBottom: 16,
  },
  coachAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    marginTop: 4,
  },
  coachSection: {
    flex: 1,
    backgroundColor: '#AAAAAA',
    borderRadius: 16,
    borderTopLeftRadius: 4,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  coachName: {
    color: '#233551',
    fontSize: 12,
    fontFamily: 'Akira-Extended',
    letterSpacing: 1,
    marginBottom: 8,
  },
  coachText: {
    color: '#233551',
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'OpenSans-Regular',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  tapHint: {
    color: '#888888',
    fontSize: 11,
    fontFamily: 'OpenSans-Regular',
    fontStyle: 'italic',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  modalTitle: {
    color: '#CCCCCC',
    fontSize: 18,
    fontFamily: 'Akira-Extended',
    letterSpacing: 1.5,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FF0000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalContent: {
    flex: 1,
  },
  modalCard: {
    margin: 20,
    padding: 20,
    borderRadius: 16,
    backgroundColor: 'rgba(35, 53, 81, 0.8)',
  },
  modalActivityTitle: {
    color: '#FF0000',
    fontSize: 20,
    fontFamily: 'Akira-Extended',
    marginBottom: 16,
    letterSpacing: 1,
  },
  modalDescription: {
    color: '#E0E0E0',
    fontSize: 16,
    fontFamily: 'OpenSans-Regular',
    lineHeight: 24,
    marginBottom: 24,
  },
  modalMetaContainer: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 24,
  },
  modalMeta: {
    flex: 1,
  },
  modalMetaLabel: {
    color: '#999999',
    fontSize: 14,
    fontFamily: 'OpenSans-Regular',
    marginBottom: 4,
  },
  modalMetaValue: {
    color: '#EEEEEE',
    fontSize: 16,
    fontFamily: 'OpenSans-SemiBold',
  },
  modalTargets: {
    borderTopWidth: 1,
    borderTopColor: '#333333',
    paddingTop: 20,
  },
  modalTargetsTitle: {
    color: '#CCCCCC',
    fontSize: 16,
    fontFamily: 'Akira-Extended',
    marginBottom: 16,
    letterSpacing: 1,
  },
  targetItem: {
    marginBottom: 16,
  },
  targetLabel: {
    color: '#999999',
    fontSize: 14,
    fontFamily: 'OpenSans-Regular',
    marginBottom: 4,
  },
  targetText: {
    color: '#E0E0E0',
    fontSize: 15,
    fontFamily: 'OpenSans-SemiBold',
    lineHeight: 22,
  },
  doneButton: {
    backgroundColor: '#FF0000',
    paddingVertical: 18,
    borderRadius: 10,
    marginTop: 8,
  },
  doneButtonText: {
    color: '#000000',
    fontSize: 14,
    fontFamily: 'Akira-Extended',
    textAlign: 'center',
    letterSpacing: 1,
  },
  regenerateButton: {
    backgroundColor: '#1A3A5C',
    paddingVertical: 18,
    borderRadius: 10,
    marginTop: 12,
  },
  title: {
    color: '#EEEEEE',
    fontSize: 24,
    fontFamily: 'Akira-Extended',
    marginBottom: 20,
    textAlign: 'center',
  },
  noplan: {
    color: '#888',
    fontSize: 16,
    marginBottom: 30,
    textAlign: 'center',
  },
  buttonContainer: {
    gap: 12,
    marginTop: 8,
  },
  completedBadge: {
    backgroundColor: 'rgba(0, 255, 0, 0.1)',
    borderWidth: 2,
    borderColor: '#00FF00',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedText: {
    color: '#00FF00',
    fontSize: 16,
    fontFamily: 'Akira-Extended',
    letterSpacing: 1.5,
  },
  button: {
    backgroundColor: '#FF0000',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#EEEEEE',
    fontSize: 14,
    fontFamily: 'Akira-Extended',
    letterSpacing: 1,
  },
});
