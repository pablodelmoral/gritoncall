// Plan start date scheduler
import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import AppHeader from '@/components/AppHeader';

export default function SchedulePlan() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [saving, setSaving] = useState(false);

  const formatDate = (date: Date) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  };

  const adjustDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  const confirmAndSave = async () => {
    try {
      setSaving(true);

      // Get user ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: userPublic } = await supabase
        .from('users_public')
        .select('id')
        .eq('auth_id', user.id)
        .single();

      if (!userPublic) throw new Error('User not found');

      // Get the most recent active plan from database
      const { data: existingPlan, error: planError } = await supabase
        .from('plans')
        .select('*')
        .eq('user_id', userPublic.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (planError || !existingPlan) {
        throw new Error('No active plan found. Please complete onboarding first.');
      }

      console.log('📦 Plan loaded from database:', existingPlan);

      // Update the plan's start date
      const { error: updateError } = await supabase
        .from('plans')
        .update({ 
          start_date: selectedDate.toISOString().split('T')[0],
          end_date: new Date(selectedDate.getTime() + 29 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        })
        .eq('id', existingPlan.id);

      if (updateError) {
        throw updateError;
      }

      // Update all daily activities with new scheduled dates
      const { data: activities } = await supabase
        .from('daily_activities')
        .select('id, day_number')
        .eq('plan_id', existingPlan.id);

      if (activities && activities.length > 0) {
        for (const activity of activities) {
          const activityDate = new Date(selectedDate);
          activityDate.setDate(activityDate.getDate() + (activity.day_number - 1));
          
          await supabase
            .from('daily_activities')
            .update({ scheduled_date: activityDate.toISOString().split('T')[0] })
            .eq('id', activity.id);
        }
        console.log(`Updated ${activities.length} activity dates`);
      }

      console.log('✅ Plan scheduled successfully!');

      Alert.alert(
        'Plan Scheduled!',
        `Your 30-day journey starts on ${formatDate(selectedDate)}. Your first accountability call is scheduled for that morning.`,
        [
          {
            text: 'Let\'s Go!',
            onPress: () => router.replace('/(tabs)' as any),
          },
        ]
      );
    } catch (error: any) {
      console.error('❌ Error saving plan:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      
      let errorMessage = 'Failed to save plan. Please try again.';
      
      if (error.message) {
        errorMessage = error.message;
      }
      
      if (error.details) {
        errorMessage += `\n\nDetails: ${error.details}`;
      }
      
      if (error.hint) {
        errorMessage += `\n\nHint: ${error.hint}`;
      }
      
      Alert.alert('Error Saving Plan', errorMessage);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.container}>
      <Text style={styles.title}>SCHEDULE YOUR PLAN</Text>
      <Text style={styles.subtitle}>When do you want to start your 30-day journey?</Text>

      <View style={styles.dateSelector}>
        <Pressable onPress={() => adjustDate(-1)} style={styles.arrowButton}>
          <Text style={styles.arrowText}>←</Text>
        </Pressable>

        <View style={styles.dateDisplay}>
          <Text style={styles.dateText}>{formatDate(selectedDate)}</Text>
          {selectedDate.toDateString() === new Date().toDateString() && (
            <Text style={styles.todayBadge}>TODAY</Text>
          )}
        </View>

        <Pressable onPress={() => adjustDate(1)} style={styles.arrowButton}>
          <Text style={styles.arrowText}>→</Text>
        </Pressable>
      </View>

      <View style={styles.quickOptions}>
        <Pressable
          onPress={() => setSelectedDate(new Date())}
          style={styles.quickButton}
        >
          <Text style={styles.quickButtonText}>Today</Text>
        </Pressable>

        <Pressable
          onPress={() => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            setSelectedDate(tomorrow);
          }}
          style={styles.quickButton}
        >
          <Text style={styles.quickButtonText}>Tomorrow</Text>
        </Pressable>

        <Pressable
          onPress={() => {
            const nextMonday = new Date();
            const daysUntilMonday = (8 - nextMonday.getDay()) % 7 || 7;
            nextMonday.setDate(nextMonday.getDate() + daysUntilMonday);
            setSelectedDate(nextMonday);
          }}
          style={styles.quickButton}
        >
          <Text style={styles.quickButtonText}>Next Monday</Text>
        </Pressable>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>What happens next:</Text>
        <Text style={styles.infoText}>• Your first call will be scheduled for {formatDate(selectedDate)} morning</Text>
        <Text style={styles.infoText}>• You'll receive daily accountability calls at your preferred time</Text>
        <Text style={styles.infoText}>• Track your progress and maintain your streak</Text>
        <Text style={styles.infoText}>• Complete all 30 days to achieve your goal</Text>
      </View>

      <Pressable
        onPress={confirmAndSave}
        disabled={saving}
        style={[styles.confirmButton, saving && styles.confirmButtonDisabled]}
      >
        <Text style={styles.confirmButtonText}>
          {saving ? 'SAVING...' : 'CONFIRM & START'}
        </Text>
      </Pressable>

      <Pressable onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backButtonText}>Go Back</Text>
      </Pressable>
      </View>
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
    backgroundColor: '#0A0A0A',
    padding: 20,
  },
  title: {
    color: '#FF0000',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 2,
    marginTop: 40,
    marginBottom: 8,
  },
  subtitle: {
    color: '#888',
    fontSize: 16,
    marginBottom: 40,
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  arrowButton: {
    width: 50,
    height: 50,
    backgroundColor: '#1A1A1A',
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: {
    color: '#FF0000',
    fontSize: 24,
    fontWeight: '700',
  },
  dateDisplay: {
    flex: 1,
    marginHorizontal: 16,
    backgroundColor: '#1A1A1A',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  dateText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  todayBadge: {
    color: '#FF0000',
    fontSize: 12,
    fontWeight: '900',
    marginTop: 8,
    letterSpacing: 1,
  },
  quickOptions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  quickButton: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  quickButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  infoBox: {
    backgroundColor: '#1A1A1A',
    padding: 20,
    borderRadius: 12,
    marginBottom: 32,
  },
  infoTitle: {
    color: '#FF0000',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  infoText: {
    color: '#AAA',
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
  confirmButton: {
    backgroundColor: '#FF0000',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
  backButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
  },
});
