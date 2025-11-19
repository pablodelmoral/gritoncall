import { getCoachAvatar } from '@/lib/coachAssets';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export type CoachProfileCard = {
  id?: string;
  slug: string;
  display_name: string;
  short_tagline?: string | null;
  sample_voice_line?: string | null;
  system_prompt?: string | null;
  behavior_notes?: string | null;
  avatar_image_url?: string | null;
  avatar_style?: string | null;
  voice_preview_url?: string | null;
  voice_provider?: string | null;
  voice_model?: string | null;
  voice_config?: any;
  metadata?: {
    style?: string;
    intensity?: string;
    [key: string]: any;
  };
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
};

interface CoachCardProps {
  coach: CoachProfileCard;
  selected?: boolean;
  onPress?: () => void;
}

const CoachCard: React.FC<CoachCardProps> = ({ coach, selected = false, onPress }) => {
  const avatarSource = getCoachAvatar(coach.avatar_image_url);

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={[styles.card, selected && styles.cardSelected]}
    >
      <View style={styles.leftSection}>
        <Image source={avatarSource} style={styles.avatar} />
      </View>
      <View style={styles.rightSection}>
        <Text style={styles.name}>{coach.display_name}</Text>
        {coach.short_tagline ? (
          <Text style={styles.tagline}>{coach.short_tagline}</Text>
        ) : null}
        {coach.sample_voice_line ? (
          <Text style={styles.voiceLine}>{coach.sample_voice_line}</Text>
        ) : null}
        {selected && (
          <Text style={styles.selectedLabel}>SELECTED</Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  cardSelected: {
    borderColor: '#FF0000',
    backgroundColor: '#1A0000',
  },
  leftSection: {
    marginRight: 12,
    justifyContent: 'center',
  },
  rightSection: {
    flex: 1,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  name: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  tagline: {
    color: '#FF0000',
    fontSize: 13,
    marginBottom: 4,
  },
  voiceLine: {
    color: '#AAAAAA',
    fontSize: 12,
  },
  selectedLabel: {
    marginTop: 8,
    color: '#FF0000',
    fontSize: 11,
    letterSpacing: 1,
  },
});

export default CoachCard;
