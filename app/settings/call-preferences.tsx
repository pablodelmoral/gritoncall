import AppHeader from '@/components/AppHeader';
import Button from '@/components/atoms/Button';
import CustomScrollView from '@/components/atoms/CustomScrollView';
import GradientCard from '@/components/atoms/GradientPanel';
import { useSession } from '@/hooks/useSession';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';

type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

type CallPreferences = {
  [key in DayOfWeek]: {
    enabled: boolean;
    availableHours: number[]; // Array of hours (0-23) when calls are allowed
  };
};

const DAYS: { key: DayOfWeek; label: string }[] = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
];

const TIME_PRESETS = [
  { label: 'Morning', hours: [6, 7, 8, 9, 10, 11] },
  { label: 'Afternoon', hours: [12, 13, 14, 15, 16] },
  { label: 'Evening', hours: [17, 18, 19, 20] },
  { label: 'All Day', hours: [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20] },
];

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function CallPreferences() {
  const session = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<CallPreferences>({
    monday: { enabled: true, availableHours: [9, 10, 11, 12, 13, 14, 15, 16] },
    tuesday: { enabled: true, availableHours: [9, 10, 11, 12, 13, 14, 15, 16] },
    wednesday: { enabled: true, availableHours: [9, 10, 11, 12, 13, 14, 15, 16] },
    thursday: { enabled: true, availableHours: [9, 10, 11, 12, 13, 14, 15, 16] },
    friday: { enabled: true, availableHours: [9, 10, 11, 12, 13, 14, 15, 16] },
    saturday: { enabled: false, availableHours: [] },
    sunday: { enabled: false, availableHours: [] },
  });
  const [expandedDay, setExpandedDay] = useState<DayOfWeek | null>(null);

  useEffect(() => {
    loadPreferences();
  }, [session]);

  const loadPreferences = async () => {
    if (!session) return;

    try {
      const { data: userPublic } = await supabase
        .from('users_public')
        .select('call_preferences')
        .eq('auth_id', session.user.id)
        .single();

      if (userPublic?.call_preferences) {
        setPreferences(userPublic.call_preferences as CallPreferences);
      }
    } catch (error) {
      console.error('Error loading call preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    if (!session) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('users_public')
        .update({
          call_preferences: preferences,
          updated_at: new Date().toISOString(),
        })
        .eq('auth_id', session.user.id);

      if (error) throw error;

      Alert.alert('Success', 'Call preferences saved successfully!');
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const toggleDay = (day: DayOfWeek) => {
    setPreferences(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        enabled: !prev[day].enabled,
        availableHours: !prev[day].enabled && prev[day].availableHours.length === 0
          ? [9, 10, 11, 12, 13, 14, 15, 16]
          : prev[day].availableHours,
      },
    }));
  };

  const toggleHour = (day: DayOfWeek, hour: number) => {
    setPreferences(prev => {
      const currentHours = prev[day].availableHours;
      const newHours = currentHours.includes(hour)
        ? currentHours.filter(h => h !== hour)
        : [...currentHours, hour].sort((a, b) => a - b);
      
      return {
        ...prev,
        [day]: {
          ...prev[day],
          availableHours: newHours,
        },
      };
    });
  };

  const applyPreset = (day: DayOfWeek, hours: number[]) => {
    setPreferences(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        availableHours: hours,
      },
    }));
  };

  const clearAllHours = (day: DayOfWeek) => {
    setPreferences(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        availableHours: [],
      },
    }));
  };

  const formatHour = (hour: number) => {
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}${ampm}`;
  };

  const getTimeRangeDisplay = (hours: number[]) => {
    if (hours.length === 0) return 'No times selected';
    const sorted = [...hours].sort((a, b) => a - b);
    const ranges: string[] = [];
    let start = sorted[0];
    let end = sorted[0];
    
    for (let i = 1; i <= sorted.length; i++) {
      if (i < sorted.length && sorted[i] === end + 1) {
        end = sorted[i];
      } else {
        ranges.push(`${formatHour(start)}-${formatHour(end + 1)}`);
        if (i < sorted.length) {
          start = sorted[i];
          end = sorted[i];
        }
      }
    }
    return ranges.join(', ');
  };

  if (loading) {
    return (
      <View style={styles.wrapper}>
        <Image
          source={require('@/assets/images/bg.png')}
          style={styles.backgroundImage}
          resizeMode="cover"
        />
        <View style={styles.headerBar}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FF0000" />
          </Pressable>
          <Image
            source={require('@/assets/images/logo.png')}
            style={styles.headerLogo}
          />
          <Text style={styles.headerTitle}>CALL PREFERENCES</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
        <AppHeader />
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <Image
        source={require('@/assets/images/bg.png')}
        style={styles.backgroundImage}
        resizeMode="cover"
      />
      
      {/* Header */}
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FF0000" />
        </Pressable>
        <Image
          source={require('@/assets/images/logo.png')}
          style={styles.headerLogo}
        />
        <Text style={styles.headerTitle}>CALL PREFERENCES</Text>
      </View>

      <CustomScrollView style={styles.container}>
        <Text style={styles.subtitle}>
          Choose which days you want to receive accountability calls and set your available time windows.
        </Text>

        {DAYS.map(({ key, label }) => {
          const dayPrefs = preferences[key];
          const isExpanded = expandedDay === key;

          return (
            <GradientCard key={key} style={styles.dayCard}>
              {/* Day Header */}
              <Pressable
                style={styles.dayHeader}
                onPress={() => setExpandedDay(isExpanded ? null : key)}
              >
                <View style={styles.dayHeaderLeft}>
                  <Pressable
                    style={[styles.checkbox, dayPrefs.enabled && styles.checkboxActive]}
                    onPress={() => toggleDay(key)}
                  >
                    {dayPrefs.enabled && (
                      <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                    )}
                  </Pressable>
                  <Text style={[styles.dayLabel, !dayPrefs.enabled && styles.dayLabelDisabled]}>
                    {label}
                  </Text>
                </View>
                <View style={styles.dayHeaderRight}>
                  {dayPrefs.enabled && dayPrefs.availableHours.length > 0 && (
                    <Text style={styles.timeBlockCount}>
                      {getTimeRangeDisplay(dayPrefs.availableHours)}
                    </Text>
                  )}
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color="#888"
                  />
                </View>
              </Pressable>

              {/* Expanded Hour Selection */}
              {isExpanded && dayPrefs.enabled && (
                <View style={styles.timeBlocksContainer}>
                  <View style={styles.divider} />
                  
                  {/* Quick Presets */}
                  <View style={styles.presetsContainer}>
                    <Text style={styles.presetsLabel}>QUICK SELECT:</Text>
                    <View style={styles.presetButtons}>
                      {TIME_PRESETS.map((preset) => (
                        <Pressable
                          key={preset.label}
                          style={styles.presetButton}
                          onPress={() => applyPreset(key, preset.hours)}
                        >
                          <Text style={styles.presetButtonText}>{preset.label}</Text>
                        </Pressable>
                      ))}
                      <Pressable
                        style={[styles.presetButton, styles.clearButton]}
                        onPress={() => clearAllHours(key)}
                      >
                        <Text style={styles.clearButtonText}>Clear</Text>
                      </Pressable>
                    </View>
                  </View>

                  {/* Hour Grid */}
                  <View style={styles.hourGrid}>
                    {HOURS.filter(h => h >= 6 && h <= 22).map((hour) => {
                      const isSelected = dayPrefs.availableHours.includes(hour);
                      return (
                        <Pressable
                          key={hour}
                          style={[styles.hourButton, isSelected && styles.hourButtonSelected]}
                          onPress={() => toggleHour(key, hour)}
                        >
                          <Text style={[styles.hourButtonText, isSelected && styles.hourButtonTextSelected]}>
                            {formatHour(hour)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <Text style={styles.hourGridHint}>
                    Tap hours to toggle availability. Selected hours: {dayPrefs.availableHours.length}
                  </Text>
                </View>
              )}
            </GradientCard>
          );
        })}

        {/* Save Button */}
        <View style={styles.saveButtonContainer}>
          <Button
            title={saving ? 'SAVING...' : 'SAVE PREFERENCES'}
            onPress={savePreferences}
            disabled={saving}
            variant="primary"
          />
        </View>

        <View style={{ height: 40 }} />
      </CustomScrollView>

      <AppHeader />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#000000',
  },
  backgroundImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
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
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  headerLogo: {
    width: 100,
    height: 32,
    resizeMode: 'contain',
    position: 'absolute',
    left: 20,
  },
  headerTitle: {
    color: '#CCCCCC',
    fontSize: 15,
    fontFamily: 'Akira-Extended',
    letterSpacing: 1.5,
    flex: 1,
    textAlign: 'right',
  },
  container: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#888',
    fontSize: 16,
  },
  subtitle: {
    color: '#CCCCCC',
    fontSize: 16,
    fontFamily: 'OpenSans-Regular',
    marginBottom: 24,
    lineHeight: 24,
  },
  dayCard: {
    marginBottom: 12,
    padding: 0,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  dayHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dayHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#666',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: '#FF0000',
    borderColor: '#FF0000',
  },
  dayLabel: {
    color: '#EEEEEE',
    fontSize: 16,
    fontFamily: 'OpenSans-SemiBold',
  },
  dayLabelDisabled: {
    color: '#666',
  },
  timeBlockCount: {
    color: '#888',
    fontSize: 13,
    fontFamily: 'OpenSans-Regular',
  },
  timeBlocksContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#333',
    marginBottom: 16,
  },
  presetsContainer: {
    marginBottom: 16,
  },
  presetsLabel: {
    color: '#888',
    fontSize: 12,
    fontFamily: 'OpenSans-SemiBold',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  presetButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  presetButton: {
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FF0000',
    marginRight: 8,
    marginBottom: 8,
  },
  presetButtonText: {
    color: '#FF0000',
    fontSize: 12,
    fontFamily: 'OpenSans-SemiBold',
  },
  clearButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: '#666',
  },
  clearButtonText: {
    color: '#888',
    fontSize: 12,
    fontFamily: 'OpenSans-SemiBold',
  },
  hourGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    marginHorizontal: -4,
  },
  hourButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    minWidth: 60,
    alignItems: 'center',
    margin: 4,
  },
  hourButtonSelected: {
    backgroundColor: 'rgba(255, 0, 0, 0.2)',
    borderColor: '#FF0000',
  },
  hourButtonText: {
    color: '#888',
    fontSize: 13,
    fontFamily: 'OpenSans-SemiBold',
  },
  hourButtonTextSelected: {
    color: '#FF0000',
  },
  hourGridHint: {
    color: '#666',
    fontSize: 12,
    fontFamily: 'OpenSans-Regular',
    textAlign: 'center',
    marginTop: 4,
  },
  saveButtonContainer: {
    marginTop: 24,
  },
});
