import AppHeader from '@/components/AppHeader';
import CustomScrollView from '@/components/atoms/CustomScrollView';
import { useSession } from '@/hooks/useSession';
import { supabase } from '@/lib/supabase';
import React, { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

interface DayStatus {
  date: string;
  status: 'completed' | 'missed' | 'pending' | 'future';
  targetReached?: string;
}

export default function ProgressCalendar() {
  const session = useSession();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [dayStatuses, setDayStatuses] = useState<DayStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    streak: 0,
    bestStreak: 0,
    completedDays: 0,
    missedDays: 0,
  });

  useEffect(() => {
    loadProgressData();
  }, [session, currentMonth]);

  const loadProgressData = async () => {
    if (!session) return;

    setLoading(true);
    try {
      // Get user stats
      const { data: profile } = await supabase
        .from('users_public')
        .select('streak, best_streak')
        .eq('auth_id', session.user.id)
        .single();

      if (profile) {
        setStats(prev => ({
          ...prev,
          streak: profile.streak || 0,
          bestStreak: profile.best_streak || 0,
        }));
      }

      // Get user's plan
      const { data: userPublic } = await supabase
        .from('users_public')
        .select('id')
        .eq('auth_id', session.user.id)
        .single();

      if (!userPublic) return;

      const { data: plan } = await supabase
        .from('plans')
        .select('id, start_date, end_date')
        .eq('user_id', userPublic.id)
        .eq('status', 'active')
        .single();

      if (!plan) return;

      // Get all activities for the current month
      const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

      const { data: activities } = await supabase
        .from('daily_activities')
        .select('scheduled_date, status, completed_at, target_reached')
        .eq('plan_id', plan.id)
        .gte('scheduled_date', monthStart.toISOString().split('T')[0])
        .lte('scheduled_date', monthEnd.toISOString().split('T')[0])
        .order('scheduled_date');

      // Build day statuses
      const statuses: DayStatus[] = [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let completed = 0;
      let missed = 0;

      // Create a map of activities by date
      const activityMap = new Map();
      activities?.forEach(activity => {
        activityMap.set(activity.scheduled_date, activity);
      });

      // Generate status for each day in the month
      for (let d = new Date(monthStart); d <= monthEnd; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        const activity = activityMap.get(dateStr);
        const dayDate = new Date(d);
        dayDate.setHours(0, 0, 0, 0);

        let status: 'completed' | 'missed' | 'pending' | 'future' = 'future';

        if (activity) {
          if (activity.status === 'completed') {
            status = 'completed';
            completed++;
          } else if (dayDate < today) {
            status = 'missed';
            missed++;
          } else if (dayDate.getTime() === today.getTime()) {
            status = 'pending';
          } else {
            status = 'future';
          }
        }

        statuses.push({
          date: dateStr,
          status,
          targetReached: activity?.target_reached,
        });
      }

      setDayStatuses(statuses);
      setStats(prev => ({
        ...prev,
        completedDays: completed,
        missedDays: missed,
      }));
    } catch (error) {
      console.error('Error loading progress data:', error);
    } finally {
      setLoading(false);
    }
  };

  const changeMonth = (offset: number) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + offset);
    setCurrentMonth(newMonth);
  };

  const renderCalendar = () => {
    const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    const startDay = monthStart.getDay(); // 0 = Sunday

    const days = [];
    const weeks = [];

    // Add empty cells for days before month starts
    for (let i = 0; i < startDay; i++) {
      days.push(<View key={`empty-${i}`} style={styles.dayCell} />);
    }

    // Add days of the month
    for (let day = 1; day <= monthEnd.getDate(); day++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      const dateStr = date.toISOString().split('T')[0];
      const dayStatus = dayStatuses.find(d => d.date === dateStr);

      days.push(
        <View key={dateStr} style={styles.dayCell}>
          <Text style={styles.dayNumber}>{day}</Text>
          {dayStatus && renderDayIcon(dayStatus)}
        </View>
      );
    }

    // Group into weeks
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(
        <View key={`week-${i}`} style={styles.weekRow}>
          {days.slice(i, i + 7)}
        </View>
      );
    }

    return weeks;
  };

  const renderDayIcon = (dayStatus: DayStatus) => {
    switch (dayStatus.status) {
      case 'completed':
        return (
          <View style={styles.iconContainer}>
            <Text style={styles.flameIcon}>🔥</Text>
            {dayStatus.targetReached === 'push' && (
              <Text style={styles.starIcon}>⭐</Text>
            )}
          </View>
        );
      case 'missed':
        return (
          <View style={styles.iconContainer}>
            <Text style={styles.missedIcon}>❌</Text>
          </View>
        );
      case 'pending':
        return (
          <View style={styles.iconContainer}>
            <Text style={styles.pendingIcon}>⏳</Text>
          </View>
        );
      default:
        return null;
    }
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

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
      
      {/* Header */}
      <View style={styles.headerBar}>
        <Image 
          source={require('@/assets/images/logo.png')}
          style={styles.headerLogo}
        />
        <Text style={styles.headerTitle}>PROGRESS</Text>
      </View>

      <CustomScrollView style={styles.container}>
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.streak}</Text>
            <Text style={styles.statLabel}>Current Streak</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.bestStreak}</Text>
            <Text style={styles.statLabel}>Best Streak</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.completedDays}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.missedDays}</Text>
            <Text style={styles.statLabel}>Missed</Text>
          </View>
        </View>

        {/* Month Navigation */}
        <View style={styles.monthNav}>
          <Pressable onPress={() => changeMonth(-1)} style={styles.navButton}>
            <Text style={styles.navButtonText}>←</Text>
          </Pressable>
          <Text style={styles.monthTitle}>
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </Text>
          <Pressable onPress={() => changeMonth(1)} style={styles.navButton}>
            <Text style={styles.navButtonText}>→</Text>
          </Pressable>
        </View>

        {/* Day Headers */}
        <View style={styles.dayHeaders}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
            <Text key={i} style={styles.dayHeader}>{day}</Text>
          ))}
        </View>

        {/* Calendar Grid */}
        <View style={styles.calendar}>
          {loading ? (
            <Text style={styles.loadingText}>Loading...</Text>
          ) : (
            renderCalendar()
          )}
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <Text style={styles.legendTitle}>LEGEND</Text>
          <View style={styles.legendItem}>
            <Text style={styles.legendIcon}>🔥</Text>
            <Text style={styles.legendText}>Completed</Text>
          </View>
          <View style={styles.legendItem}>
            <Text style={styles.legendIcon}>⭐</Text>
            <Text style={styles.legendText}>Push Target Hit</Text>
          </View>
          <View style={styles.legendItem}>
            <Text style={styles.legendIcon}>❌</Text>
            <Text style={styles.legendText}>Missed</Text>
          </View>
          <View style={styles.legendItem}>
            <Text style={styles.legendIcon}>⏳</Text>
            <Text style={styles.legendText}>Today (Pending)</Text>
          </View>
        </View>
      </CustomScrollView>
      <AppHeader />
    </View>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    backgroundColor: '#000000',
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
  container: {
    flex: 1,
    padding: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    width: '48%',
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
    borderWidth: 1,
    borderColor: '#FF0000',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  statValue: {
    color: '#FF0000',
    fontSize: 32,
    fontFamily: 'Akira-Extended',
    marginBottom: 4,
  },
  statLabel: {
    color: '#CCCCCC',
    fontSize: 11,
    fontFamily: 'OpenSans-Regular',
    textAlign: 'center',
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  navButton: {
    padding: 8,
  },
  navButtonText: {
    color: '#FF0000',
    fontSize: 24,
    fontFamily: 'Akira-Extended',
  },
  monthTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'Akira-Extended',
    letterSpacing: 1,
  },
  dayHeaders: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  dayHeader: {
    color: '#999999',
    fontSize: 12,
    fontFamily: 'Akira-Extended',
    width: 40,
    textAlign: 'center',
  },
  calendar: {
    marginBottom: 24,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  dayCell: {
    width: 40,
    height: 60,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 4,
  },
  dayNumber: {
    color: '#CCCCCC',
    fontSize: 12,
    fontFamily: 'OpenSans-Regular',
    marginBottom: 4,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  flameIcon: {
    fontSize: 24,
  },
  starIcon: {
    fontSize: 12,
    position: 'absolute',
    top: -4,
    right: -8,
  },
  missedIcon: {
    fontSize: 20,
  },
  pendingIcon: {
    fontSize: 20,
  },
  loadingText: {
    color: '#CCCCCC',
    fontSize: 14,
    fontFamily: 'OpenSans-Regular',
    textAlign: 'center',
    marginTop: 40,
  },
  legend: {
    backgroundColor: 'rgba(255, 0, 0, 0.05)',
    borderWidth: 1,
    borderColor: '#FF0000',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  legendTitle: {
    color: '#FF0000',
    fontSize: 14,
    fontFamily: 'Akira-Extended',
    marginBottom: 12,
    letterSpacing: 1,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  legendIcon: {
    fontSize: 20,
    marginRight: 12,
    width: 30,
  },
  legendText: {
    color: '#CCCCCC',
    fontSize: 13,
    fontFamily: 'OpenSans-Regular',
  },
});
