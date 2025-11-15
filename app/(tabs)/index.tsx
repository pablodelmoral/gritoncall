import { View, Text, Pressable, Alert, StyleSheet, ScrollView, ActivityIndicator, ImageBackground, Image, useWindowDimensions } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { INSTANT_CALL_URL } from '@/constants/config';
import { useSession } from '@/hooks/useSession';
import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import AppHeader from '@/components/AppHeader';

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
  const [todaysPlan, setTodaysPlan] = useState<any>(null);
  const [aiMotivation, setAiMotivation] = useState<string>('');
  const [loadingMotivation, setLoadingMotivation] = useState(false);

  const { data: profile } = useQuery({
    enabled: !!session,
    queryKey: ['profile'],
    queryFn: async () => {
      const { data } = await supabase
        .from('users_public')
        .select('id, streak')
        .eq('auth_id', session!.user.id)
        .single();
      return data as any;
    },
  });

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

  // Generate AI motivation based on progress
  useEffect(() => {
    const generateMotivation = async () => {
      if (!todaysPlan || !session) return;
      
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
              role: 'user',
              content: `You are Gockins, a tough-love AI coach. Generate a SHORT (2-3 sentences max) motivational message for today's task.

User's streak: ${profile?.streak || 0} days
Today's activity: ${todaysPlan.title}
Monthly goal: ${todaysPlan.monthlyGoal}

Be direct, motivating, and slightly challenging. Reference their streak. Keep it under 50 words.`
            }],
            temperature: 0.9,
            max_tokens: 100
          })
        });

        const data = await response.json();
        setAiMotivation(data.choices[0].message.content);
      } catch (error) {
        console.error('Failed to generate motivation:', error);
        setAiMotivation("You've got this. Show up today and prove you're serious about your goal.");
      } finally {
        setLoadingMotivation(false);
      }
    };

    generateMotivation();
  }, [todaysPlan, profile?.streak]);

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
    if (!todaysPlan?.id) return;

    Alert.alert(
      'Mark as Complete',
      'Which target did you hit?',
      [
        {
          text: 'Fallback',
          onPress: async () => {
            try {
              await supabase.rpc('complete_activity', {
                activity_id: todaysPlan.id,
                target_level: 'fallback'
              });
              Alert.alert('Nice!', 'Something is better than nothing. Streak maintained!');
              // Reload today's plan
              const { data } = await supabase.rpc('get_todays_activity', {
                user_auth_id: session!.user.id
              });
              if (data?.[0]) setTodaysPlan({ ...todaysPlan, status: 'completed' });
            } catch (error) {
              Alert.alert('Error', 'Failed to save progress');
            }
          }
        },
        {
          text: 'Minimum',
          onPress: async () => {
            try {
              await supabase.rpc('complete_activity', {
                activity_id: todaysPlan.id,
                target_level: 'minimum'
              });
              Alert.alert('Great!', 'You hit your target. Keep it up!');
              const { data } = await supabase.rpc('get_todays_activity', {
                user_auth_id: session!.user.id
              });
              if (data?.[0]) setTodaysPlan({ ...todaysPlan, status: 'completed' });
            } catch (error) {
              Alert.alert('Error', 'Failed to save progress');
            }
          }
        },
        {
          text: 'Push Target',
          style: 'default',
          onPress: async () => {
            try {
              await supabase.rpc('complete_activity', {
                activity_id: todaysPlan.id,
                target_level: 'push'
              });
              Alert.alert('Excellent!', 'You crushed it! That\'s how champions are made.');
              const { data } = await supabase.rpc('get_todays_activity', {
                user_auth_id: session!.user.id
              });
              if (data?.[0]) setTodaysPlan({ ...todaysPlan, status: 'completed' });
            } catch (error) {
              Alert.alert('Error', 'Failed to save progress');
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
    <View style={styles.wrapper}>
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
      <ScrollView style={styles.container}>
        {/* Daily Overview Title */}
        <Text style={styles.pageTitle}>DAILY OVERVIEW</Text>

      {/* Greeting */}
      <Text style={styles.greeting}>
        {todaysPlan.isFuture ? "Your journey starts soon!" : "Hey Pablo here's your mission."}
      </Text>
      <Text style={styles.date}>
        {todaysPlan.isFuture 
          ? `Starts ${todaysPlan.scheduledDate} - Day ${todaysPlan.day_number}`
          : `${formatDate()} - 7:30 am call`}
      </Text>
      {todaysPlan.isFuture && (
        <View style={styles.futureNotice}>
          <Text style={styles.futureNoticeText}>
            ⏰ Your plan starts on {new Date(todaysPlan.scheduledDate).toLocaleDateString('en-US', { 
              weekday: 'long', 
              month: 'long', 
              day: 'numeric' 
            })}
          </Text>
        </View>
      )}

      {/* Streak Badge */}
      <View style={styles.streakBadge}>
        <Text style={styles.streakText}>YOU'RE HEATING UP</Text>
      </View>
      <Text style={styles.streakCount}>{profile?.streak || 0} DAY STREAK</Text>

      {/* Mission Briefing */}
      <Text style={styles.sectionTitle}>MISSION BRIEFING</Text>

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

      {/* AI Coach Message */}
      <View style={styles.coachSection}>
        <View style={styles.coachHeader}>
          <Image 
            source={require('@/assets/images/gockins.png')}
            style={styles.coachAvatar}
          />
          <Text style={styles.coachName}>GOCKINS</Text>
        </View>
        {loadingMotivation ? (
          <ActivityIndicator color="#FF0000" />
        ) : (
          <Text style={styles.coachText}>{aiMotivation}</Text>
        )}
      </View>

      {/* Action Buttons */}
      {!todaysPlan.isFuture && (
        <Pressable onPress={markAsDone} style={styles.doneButton}>
          <Text style={styles.doneButtonText}>MARK AS DONE</Text>
        </Pressable>
      )}

      <Pressable onPress={regeneratePlan} style={styles.regenerateButton}>
        <Text style={styles.regenerateButtonText}>REGENERATE PLAN</Text>
      </Pressable>

        <View style={{ height: 40 }} />
      </ScrollView>
      <AppHeader />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  container: { 
    flex: 1, 
    backgroundColor: 'transparent',
    padding: 20 
  },
  header: {
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  logo: {
    color: '#FF0000',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1,
    lineHeight: 24,
  },
  pageTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 20,
    textAlign: 'center',
  },
  greeting: {
    color: '#FF0000',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  date: {
    color: '#888',
    fontSize: 14,
    marginBottom: 16,
  },
  futureNotice: {
    backgroundColor: '#FF6600',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  futureNoticeText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  streakBadge: {
    backgroundColor: '#FF0000',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  streakText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  streakCount: {
    color: '#FF0000',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#FF0000',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 16,
  },
  missionItem: {
    marginBottom: 16,
  },
  missionLabel: {
    color: '#888',
    fontSize: 12,
    marginBottom: 4,
  },
  missionText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  coachSection: {
    backgroundColor: 'rgba(192, 192, 192, 0.95)',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
    marginBottom: 24,
  },
  coachMessage: {
    backgroundColor: '#C0C0C0',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
    marginBottom: 24,
  },
  coachHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  coachAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#FF0000',
  },
  coachAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    backgroundColor: '#FF0000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachAvatarText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '900',
  },
  coachName: {
    color: '#000',
    fontSize: 14,
    fontWeight: '700',
  },
  coachText: {
    color: '#000',
    fontSize: 14,
    lineHeight: 20,
  },
  doneButton: {
    backgroundColor: '#FF0000',
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 8,
    marginBottom: 12,
  },
  doneButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
  regenerateButton: {
    backgroundColor: '#1A1A1A',
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  regenerateButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
  noplan: {
    color: '#888',
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  title: { 
    color: '#FFFFFF', 
    fontSize: 22, 
    fontWeight: '800', 
    marginBottom: 8 
  },
  button: { 
    backgroundColor: '#FF0000', 
    paddingVertical: 16, 
    alignItems: 'center', 
    borderRadius: 10 
  },
  buttonText: { 
    color: '#FFFFFF', 
    fontWeight: '800' 
  },
});
