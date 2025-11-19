// Plan start date scheduler
import AppHeader from '@/components/AppHeader';
import Button from '@/components/atoms/Button';
import CustomScrollView from '@/components/atoms/CustomScrollView';
import GradientCard from '@/components/atoms/GradientPanel';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';

export default function SchedulePlan() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [saving, setSaving] = useState(false);
  const [preferredTime, setPreferredTime] = useState<string>('morning');
  const [timeValidationError, setTimeValidationError] = useState<string>('');

  // Load user's preferred time from plan
  React.useEffect(() => {
    const loadPreferredTime = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: userPublic } = await supabase
          .from('users_public')
          .select('id')
          .eq('auth_id', user.id)
          .single();

        if (!userPublic) return;

        const { data: plan } = await supabase
          .from('plans')
          .select('preferred_time')
          .eq('user_id', userPublic.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (plan?.preferred_time) {
          setPreferredTime(plan.preferred_time);
          // Validate initial date selection
          validateTimeSelection(selectedDate);
        }
      } catch (error) {
        console.error('Error loading preferred time:', error);
      }
    };

    loadPreferredTime();
  }, []);

  const formatDate = (date: Date) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  };

  const adjustDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
    validateTimeSelection(newDate);
  };

  // Check if the selected time has already passed for today
  const validateTimeSelection = (date: Date) => {
    const isToday = date.toDateString() === new Date().toDateString();
    if (!isToday) {
      setTimeValidationError('');
      return true;
    }

    const now = new Date();
    const currentHour = now.getHours();

    // Define time windows
    const timeWindows = {
      morning: { end: 12, label: 'Morning' },      // Before noon
      afternoon: { end: 17, label: 'Afternoon' },  // Before 5 PM
      evening: { end: 24, label: 'Evening' }       // Before midnight
    };

    const selectedWindow = timeWindows[preferredTime as keyof typeof timeWindows];
    
    if (selectedWindow && currentHour >= selectedWindow.end) {
      setTimeValidationError(
        `⚠️ ${selectedWindow.label} has already passed today. Please choose tomorrow or select a different date.`
      );
      return false;
    }

    setTimeValidationError('');
    return true;
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

      // Validate time selection before saving
      if (!validateTimeSelection(selectedDate)) {
        setSaving(false);
        return;
      }

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

      // Navigate directly to home page
      router.replace('/(tabs)' as any);
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
      {/* Header Bar */}
      <View style={styles.headerBar}>
        <Image
          source={require('@/assets/images/logo.png')}
          style={styles.headerLogo}
        />
        <Text style={styles.pageTitle}>SCHEDULE YOUR PLAN</Text>
      </View>
      <CustomScrollView style={styles.container}>
      <Text style={styles.subtitle}>When do you want to start your 30-day journey?</Text>

      <GradientCard style={styles.dateSelector} padding={20}>
        <View style={styles.dateSelectorRow}>
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
      </GradientCard>

      {timeValidationError ? (
        <GradientCard style={styles.warningBox}>
          <Text style={styles.warningText}>{timeValidationError}</Text>
        </GradientCard>
      ) : null}

      <View style={styles.quickOptions}>
        <Pressable
          onPress={() => {
            const today = new Date();
            setSelectedDate(today);
            validateTimeSelection(today);
          }}
          style={styles.quickButton}
        >
          <Text style={styles.quickButtonText}>Today</Text>
        </Pressable>

        <Pressable
          onPress={() => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            setSelectedDate(tomorrow);
            validateTimeSelection(tomorrow);
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
            validateTimeSelection(nextMonday);
          }}
          style={styles.quickButton}
        >
          <Text style={styles.quickButtonText}>Next Monday</Text>
        </Pressable>
      </View>

      <GradientCard style={styles.infoBox}>
        <Text style={styles.infoTitle}>What happens next:</Text>
        <Text style={styles.infoText}>• Your first call will be scheduled for {formatDate(selectedDate)} in the {preferredTime}</Text>
        <Text style={styles.infoText}>• You'll receive daily accountability calls at your preferred time</Text>
        <Text style={styles.infoText}>• Track your progress and maintain your streak</Text>
        <Text style={styles.infoText}>• Complete all 30 days to achieve your goal</Text>
      </GradientCard>

      <View style={styles.buttonContainer}>
        <Button
          title={saving ? 'SAVING...' : 'CONFIRM & START'}
          onPress={confirmAndSave}
          disabled={saving || !!timeValidationError}
          variant="primary"
        />
      </View>

      <Pressable onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backButtonText}>Go Back</Text>
      </Pressable>
      </CustomScrollView>
      <AppHeader />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#000000',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerLogo: {
    width: 80,
    height: 28,
    resizeMode: 'contain',
  },
  pageTitle: {
    color: '#CCCCCC',
    fontSize: 15,
    fontFamily: 'Akira-Extended',
    letterSpacing: 1.5,
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    padding: 20,
  },
  subtitle: {
    color: '#888',
    fontSize: 16,
    marginBottom: 40,
  },
  dateSelector: {
    marginBottom: 24,
  },
  dateSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  arrowButton: {
    width: 50,
    height: 50,
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
    alignItems: 'center',
  },
  dateText: {
    color: '#EEEEEE',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  todayBadge: {
    color: '#FF0000',
    fontSize: 12,
    fontFamily: 'Akira-Extended',
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
    color: '#EEEEEE',
    fontSize: 14,
    fontWeight: '600',
  },
  infoBox: {
    marginBottom: 32,
  },
  infoTitle: {
    color: '#FF0000',
    fontSize: 16,
    fontFamily: 'Akira-Extended',
    marginBottom: 12,
    letterSpacing: 1,
  },
  infoText: {
    color: '#CCCCCC',
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
  buttonContainer: {
    marginBottom: 12,
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
  warningBox: {
    marginBottom: 24,
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
    borderWidth: 1,
    borderColor: '#FF0000',
  },
  warningText: {
    color: '#FF0000',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
