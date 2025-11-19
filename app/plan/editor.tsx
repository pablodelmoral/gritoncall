import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Modal, Image, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AppHeader from '@/components/AppHeader';
import Button from '@/components/atoms/Button';
import Typography from '@/components/atoms/Typography';
import Card from '@/components/molecules/Card';
import GradientCard from '@/components/atoms/GradientPanel';
import CustomScrollView from '@/components/atoms/CustomScrollView';
import { supabase } from '@/lib/supabase';

interface MicroCommitment {
  day_of_week: number;
  title: string;
  description: string;
  duration_minutes: number;
  scheduled_time?: string;
}

interface WeeklyPlan {
  week_number: number;
  theme: string;
  focus: string;
  micro_commitments: MicroCommitment[];
}

interface Plan {
  monthly_goal: string;
  category: string;
  weekly_plans: WeeklyPlan[];
}

export default function PlanEditor() {
  const { width, height } = useWindowDimensions();
  const router = useRouter();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [editingDay, setEditingDay] = useState<MicroCommitment | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    loadPlanFromDatabase();
  }, []);

  const loadPlanFromDatabase = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('users_public')
        .select('id')
        .eq('auth_id', user.id)
        .single();

      if (!profile) return;

      // Get all plans for the user
      const { data: allPlans, error } = await supabase
        .from('plans')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      console.log('Plans found for editor:', allPlans?.length || 0);

      if (error || !allPlans || allPlans.length === 0) {
        console.error('Error loading plan:', error);
        return;
      }

      // Use the most recent plan
      const planData = allPlans[0];
      console.log('Using plan in editor:', planData);

      if (planData) {
        console.log('Plan data loaded:', planData);
        
        // Parse weekly_plans if it's a string (JSONB from database)
        let weeklyPlans = [];
        try {
          if (typeof planData.weekly_plans === 'string') {
            weeklyPlans = JSON.parse(planData.weekly_plans);
          } else if (Array.isArray(planData.weekly_plans)) {
            weeklyPlans = planData.weekly_plans;
          }
          console.log('Parsed weekly_plans for editor:', weeklyPlans);
        } catch (e) {
          console.error('Error parsing weekly_plans in editor:', e);
          weeklyPlans = [];
        }

        setPlan({
          monthly_goal: planData.monthly_goal || 'Your 30-day goal',
          category: planData.category || 'general',
          weekly_plans: weeklyPlans
        });
      }
    } catch (error) {
      console.error('Error loading plan:', error);
    }
  };

  const handleEditDay = (commitment: MicroCommitment) => {
    setEditingDay({ ...commitment });
    setShowEditModal(true);
  };

  const handleSaveEdit = () => {
    if (!editingDay || !plan) return;

    const updatedPlan = { ...plan };
    const weekIndex = selectedWeek - 1;
    const dayIndex = editingDay.day_of_week - 1;
    
    updatedPlan.weekly_plans[weekIndex].micro_commitments[dayIndex] = editingDay;
    
    setPlan(updatedPlan);
    // Note: Changes are temporary until plan is approved and saved to database
    setShowEditModal(false);
    setEditingDay(null);
  };

  const handleApprovePlan = () => {
    // Navigate to schedule screen to set start date
    router.push('/plan/schedule' as any);
  };

  if (!plan || !plan.weekly_plans || plan.weekly_plans.length === 0) {
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
        <View style={styles.headerBar}>
          <Image 
            source={require('@/assets/images/logo.png')}
            style={styles.headerLogo}
          />
          <Text style={styles.headerTitle}>PLAN EDITOR</Text>
        </View>
        <View style={styles.container}>
          <Text style={styles.loadingText}>
            {!plan ? 'Loading plan...' : 'No plan data available. Please complete onboarding first.'}
          </Text>
        </View>
        <AppHeader />
      </View>
    );
  }

  const currentWeek = plan.weekly_plans[selectedWeek - 1];

  if (!currentWeek) {
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
        <View style={styles.headerBar}>
          <Image 
            source={require('@/assets/images/logo.png')}
            style={styles.headerLogo}
          />
          <Text style={styles.headerTitle}>PLAN EDITOR</Text>
        </View>
        <View style={styles.container}>
          <Text style={styles.loadingText}>Week {selectedWeek} not available</Text>
        </View>
        <AppHeader />
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
      <View style={styles.headerBar}>
        <Image 
          source={require('@/assets/images/logo.png')}
          style={styles.headerLogo}
        />
        <Text style={styles.headerTitle}>PLAN EDITOR</Text>
      </View>
      <View style={styles.container}>

      {/* Week Tabs */}
      <View style={styles.weekTabs}>
        {[1, 2, 3, 4].map((week) => (
          <TouchableOpacity
            key={week}
            style={[
              styles.weekTab,
              selectedWeek === week && styles.weekTabActive
            ]}
            onPress={() => setSelectedWeek(week)}
          >
            <Text style={[
              styles.weekTabText,
              selectedWeek === week && styles.weekTabTextActive
            ]}>
              Week {week}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Week Theme */}
      <View style={styles.weekTheme}>
        <Text style={styles.weekThemeText}>
          W{selectedWeek}: {currentWeek?.theme?.toUpperCase() || 'Loading...'}
        </Text>
      </View>

      {/* Days List */}
      <CustomScrollView style={styles.daysList}>
        {currentWeek.micro_commitments && currentWeek.micro_commitments.length > 0 ? (
          currentWeek.micro_commitments.map((commitment, index) => (
          <GradientCard key={index} style={styles.dayCard}>
            <View style={styles.dayHeader}>
              <Text style={styles.dayTitle}>Day {commitment.day_of_week}</Text>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => handleEditDay(commitment)}
              >
                <Ionicons name="pencil" size={20} color="#FF0000" />
              </TouchableOpacity>
            </View>
            <Text style={styles.dayActivity}>{commitment.title}</Text>
            {commitment.description && (
              <Text style={styles.dayDescription}>{commitment.description}</Text>
            )}
            <View style={styles.dayDetails}>
              <Text style={styles.dayDuration}>{commitment.duration_minutes} minutes</Text>
              <Text style={styles.dayTime}>
                {commitment.scheduled_time || '7:30am'}
              </Text>
            </View>
          </GradientCard>
          ))
        ) : (
          <Text style={styles.loadingText}>No activities for this week</Text>
        )}
      </CustomScrollView>

      {/* Approve Button */}
      <View style={styles.buttonContainer}>
        <Button 
          title="LOOKS GOOD - SCHEDULE START" 
          onPress={handleApprovePlan}
          variant="primary"
        />
      </View>

      {/* Edit Modal */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Day {editingDay?.day_of_week}</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Activity</Text>
              <TextInput
                style={styles.input}
                value={editingDay?.title}
                onChangeText={(text) => setEditingDay(prev => prev ? { ...prev, title: text } : null)}
                placeholder="Activity name"
                placeholderTextColor="#666"
              />

              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={editingDay?.description}
                onChangeText={(text) => setEditingDay(prev => prev ? { ...prev, description: text } : null)}
                placeholder="Activity description"
                placeholderTextColor="#666"
                multiline
                numberOfLines={3}
              />

              <Text style={styles.inputLabel}>Duration (minutes)</Text>
              <TextInput
                style={styles.input}
                value={editingDay?.duration_minutes.toString()}
                onChangeText={(text) => setEditingDay(prev => prev ? { ...prev, duration_minutes: parseInt(text) || 0 } : null)}
                placeholder="Duration"
                placeholderTextColor="#666"
                keyboardType="numeric"
              />

              <Text style={styles.inputLabel}>Scheduled Time</Text>
              <TextInput
                style={styles.input}
                value={editingDay?.scheduled_time || '7:30am'}
                onChangeText={(text) => setEditingDay(prev => prev ? { ...prev, scheduled_time: text } : null)}
                placeholder="Time (e.g., 7:30am)"
                placeholderTextColor="#666"
              />
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={handleSaveEdit}>
              <Text style={styles.saveButtonText}>SAVE CHANGES</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    backgroundColor: 'transparent',
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
  weekTabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    marginBottom: 20,
    gap: 10,
  },
  weekTab: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    alignItems: 'center',
  },
  weekTabActive: {
    backgroundColor: '#FF0000',
  },
  weekTabText: {
    color: '#888888',
    fontSize: 13,
    fontFamily: 'Akira-Extended',
    letterSpacing: 1,
  },
  weekTabTextActive: {
    color: '#EEEEEE',
  },
  weekTheme: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  weekThemeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF0000',
    letterSpacing: 1,
  },
  daysList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  dayCard: {
    marginBottom: 16,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dayTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF0000',
  },
  editButton: {
    padding: 4,
  },
  dayActivity: {
    fontSize: 14,
    color: '#CCC',
    marginBottom: 8,
    fontWeight: '600',
  },
  dayDescription: {
    fontSize: 13,
    color: '#999',
    marginBottom: 12,
    lineHeight: 20,
  },
  dayDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayDuration: {
    fontSize: 12,
    color: '#888',
  },
  dayTime: {
    fontSize: 12,
    color: '#888',
  },
  approveButton: {
    backgroundColor: '#FF0000',
    marginHorizontal: 20,
    marginVertical: 20,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  approveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  loadingText: {
    color: '#FFF',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 100,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
  },
  modalBody: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    color: '#FFF',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    padding: 12,
    color: '#FFF',
    fontSize: 14,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  saveButton: {
    backgroundColor: '#FF0000',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
