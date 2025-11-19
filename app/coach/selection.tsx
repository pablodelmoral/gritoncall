import AppHeader from '@/components/AppHeader';
import CustomScrollView from '@/components/atoms/CustomScrollView';
import GradientCard from '@/components/atoms/GradientPanel';
import { CoachProfileCard } from '@/components/molecules/CoachCard';
import { useSession } from '@/hooks/useSession';
import { getCoachAvatar } from '@/lib/coachAssets';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';

export default function CoachSelection() {
  const session = useSession();
  const [coaches, setCoaches] = useState<CoachProfileCard[]>([]);
  const [currentCoach, setCurrentCoach] = useState<string | null>(null);
  const [selectedCoach, setSelectedCoach] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCoaches();
  }, [session]);

  const loadCoaches = async () => {
    try {
      // Load current coach selection
      if (session) {
        const { data: profile } = await supabase
          .from('users_public')
          .select('selected_coach_slug')
          .eq('auth_id', session.user.id)
          .single();

        if (profile?.selected_coach_slug) {
          setCurrentCoach(profile.selected_coach_slug);
          setSelectedCoach(profile.selected_coach_slug);
        }
      }

      // Load all coaches
      const { data: coachData } = await supabase
        .from('coach_profiles')
        .select('*')
        .eq('is_active', true)
        .order('slug', { ascending: true });

      if (coachData) {
        setCoaches(coachData);
      }
    } catch (error) {
      console.error('Error loading coaches:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveCoachSelection = async () => {
    if (!session || !selectedCoach) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('users_public')
        .update({
          selected_coach_slug: selectedCoach,
          updated_at: new Date().toISOString(),
        })
        .eq('auth_id', session.user.id);

      if (error) throw error;

      setCurrentCoach(selectedCoach);
      Alert.alert('Success', 'Your coach has been updated!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update coach');
    } finally {
      setSaving(false);
    }
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
          <Text style={styles.headerTitle}>CHANGE COACH</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF0000" />
          <Text style={styles.loadingText}>Loading coaches...</Text>
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
        <Text style={styles.headerTitle}>CHANGE COACH</Text>
      </View>

      <CustomScrollView style={styles.container}>
        <Text style={styles.subtitle}>
          Choose your accountability coach. Each has a unique style and approach to keep you on track.
        </Text>

        {currentCoach && (
          <GradientCard style={styles.currentCoachCard}>
            <View style={styles.currentCoachHeader}>
              <Ionicons name="checkmark-circle" size={24} color="#00FF00" />
              <Text style={styles.currentCoachLabel}>CURRENT COACH</Text>
            </View>
            <Text style={styles.currentCoachName}>
              {coaches.find(c => c.slug === currentCoach)?.display_name.toUpperCase() || currentCoach.toUpperCase()}
            </Text>
          </GradientCard>
        )}

        <Text style={styles.sectionTitle}>SELECT YOUR COACH</Text>

        {coaches.map((coach) => {
          const avatarSource = getCoachAvatar(coach.avatar_image_url);

          return (
            <Pressable
              key={coach.slug}
              onPress={() => setSelectedCoach(coach.slug)}
              style={[
                styles.coachCard,
                selectedCoach === coach.slug && styles.coachCardSelected,
              ]}
            >
              {/* Selection Badge */}
              {selectedCoach === coach.slug && (
                <View style={styles.selectedBadge}>
                  <Ionicons name="checkmark-circle" size={32} color="#FF0000" />
                </View>
              )}

              {/* Resume Header with Avatar */}
              <View style={styles.resumeHeader}>
                <View style={styles.avatarContainer}>
                  <Image 
                    source={avatarSource}
                    style={styles.coachAvatar}
                    resizeMode="cover"
                  />
                </View>
                <View style={styles.resumeHeaderText}>
                  <Text style={styles.coachName}>{coach.display_name.toUpperCase()}</Text>
                  <Text style={styles.coachTagline}>"{coach.short_tagline}"</Text>
                </View>
              </View>

              {/* Divider */}
              <View style={styles.resumeDivider} />

              {/* Professional Summary */}
              <View style={styles.resumeSection}>
                <Text style={styles.resumeSectionTitle}>PROFESSIONAL SUMMARY</Text>
                <Text style={styles.coachDescription}>{coach.system_prompt}</Text>
              </View>

              {/* Core Competencies */}
              <View style={styles.resumeSection}>
                <Text style={styles.resumeSectionTitle}>CORE COMPETENCIES</Text>
                <View style={styles.competenciesGrid}>
                  <View style={styles.competencyItem}>
                    <View style={styles.competencyBullet} />
                    <View style={styles.competencyContent}>
                      <Text style={styles.competencyLabel}>Coaching Style</Text>
                      <Text style={styles.competencyValue}>{coach.metadata?.style || 'Adaptive'}</Text>
                    </View>
                  </View>
                  <View style={styles.competencyItem}>
                    <View style={styles.competencyBullet} />
                    <View style={styles.competencyContent}>
                      <Text style={styles.competencyLabel}>Intensity Level</Text>
                      <Text style={styles.competencyValue}>{coach.metadata?.intensity || 'Medium'}</Text>
                    </View>
                  </View>
                  <View style={styles.competencyItem}>
                    <View style={styles.competencyBullet} />
                    <View style={styles.competencyContent}>
                      <Text style={styles.competencyLabel}>Approach</Text>
                      <Text style={styles.competencyValue}>{coach.metadata?.approach || 'Balanced'}</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Ideal Client Profile */}
              {coach.behavior_notes && (
                <View style={styles.resumeSection}>
                  <Text style={styles.resumeSectionTitle}>IDEAL CLIENT PROFILE</Text>
                  <View style={styles.idealClientBox}>
                    <Ionicons name="person" size={20} color="#FF0000" style={styles.idealClientIcon} />
                    <Text style={styles.idealClientText}>{coach.behavior_notes}</Text>
                  </View>
                </View>
              )}

              {/* Sample Communication */}
              {coach.sample_voice_line && (
                <View style={styles.resumeSection}>
                  <Text style={styles.resumeSectionTitle}>SAMPLE COMMUNICATION</Text>
                  <View style={styles.sampleMessageBox}>
                    <Ionicons name="chatbubble-ellipses" size={18} color="#888" style={styles.messageIcon} />
                    <Text style={styles.sampleMessageText}>"{coach.sample_voice_line}"</Text>
                  </View>
                </View>
              )}
            </Pressable>
          );
        })}

        {selectedCoach && selectedCoach !== currentCoach && (
          <Pressable
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={saveCoachSelection}
            disabled={saving}
          >
            <Text style={styles.saveButtonText}>
              {saving ? 'SAVING...' : 'SAVE COACH SELECTION'}
            </Text>
          </Pressable>
        )}

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
    marginTop: 16,
    fontFamily: 'OpenSans-Regular',
  },
  subtitle: {
    color: '#CCCCCC',
    fontSize: 16,
    fontFamily: 'OpenSans-Regular',
    marginBottom: 24,
    lineHeight: 24,
  },
  currentCoachCard: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: 'rgba(0, 255, 0, 0.05)',
    borderWidth: 1,
    borderColor: '#00FF00',
  },
  currentCoachHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  currentCoachLabel: {
    color: '#00FF00',
    fontSize: 12,
    fontFamily: 'Akira-Extended',
    letterSpacing: 1,
    marginLeft: 8,
  },
  currentCoachName: {
    color: '#EEEEEE',
    fontSize: 20,
    fontFamily: 'Akira-Extended',
    letterSpacing: 1.5,
  },
  sectionTitle: {
    color: '#FF0000',
    fontSize: 14,
    fontFamily: 'Akira-Extended',
    letterSpacing: 1.5,
    marginBottom: 16,
  },
  coachCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 24,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  coachCardSelected: {
    borderColor: '#FF0000',
    backgroundColor: 'rgba(255, 0, 0, 0.08)',
  },
  selectedBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
  },
  resumeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#FF0000',
    marginRight: 20,
  },
  coachAvatar: {
    width: '100%',
    height: '100%',
  },
  resumeHeaderText: {
    flex: 1,
  },
  coachName: {
    color: '#EEEEEE',
    fontSize: 24,
    fontFamily: 'Akira-Extended',
    letterSpacing: 2,
    marginBottom: 6,
  },
  coachTagline: {
    color: '#FF0000',
    fontSize: 15,
    fontFamily: 'OpenSans-SemiBold',
    fontStyle: 'italic',
    lineHeight: 22,
  },
  resumeDivider: {
    height: 2,
    backgroundColor: '#333',
    marginBottom: 20,
  },
  resumeSection: {
    marginBottom: 20,
  },
  resumeSectionTitle: {
    color: '#FF0000',
    fontSize: 11,
    fontFamily: 'Akira-Extended',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  coachDescription: {
    color: '#CCCCCC',
    fontSize: 15,
    fontFamily: 'OpenSans-Regular',
    lineHeight: 24,
  },
  competenciesGrid: {
    gap: 12,
  },
  competencyItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  competencyBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF0000',
    marginTop: 6,
    marginRight: 12,
  },
  competencyContent: {
    flex: 1,
  },
  competencyLabel: {
    color: '#888',
    fontSize: 12,
    fontFamily: 'OpenSans-SemiBold',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  competencyValue: {
    color: '#EEEEEE',
    fontSize: 15,
    fontFamily: 'OpenSans-Regular',
    lineHeight: 22,
  },
  idealClientBox: {
    backgroundColor: 'rgba(255, 0, 0, 0.05)',
    padding: 14,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FF0000',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  idealClientIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  idealClientText: {
    color: '#CCCCCC',
    fontSize: 14,
    fontFamily: 'OpenSans-Regular',
    lineHeight: 22,
    flex: 1,
  },
  sampleMessageBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  messageIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  sampleMessageText: {
    color: '#CCCCCC',
    fontSize: 14,
    fontFamily: 'OpenSans-Regular',
    fontStyle: 'italic',
    lineHeight: 22,
    flex: 1,
  },
  saveButton: {
    backgroundColor: '#FF0000',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Akira-Extended',
    letterSpacing: 1.5,
  },
});
