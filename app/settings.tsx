import AppHeader from '@/components/AppHeader';
import CustomScrollView from '@/components/atoms/CustomScrollView';
import GradientCard from '@/components/atoms/GradientPanel';
import { useSession } from '@/hooks/useSession';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

export default function SettingsScreen() {
  const session = useSession();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Account settings
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  
  // Editing states
  const [editingName, setEditingName] = useState(false);
  const [editingPhone, setEditingPhone] = useState(false);

  useEffect(() => {
    loadProfile();
  }, [session]);

  const loadProfile = async () => {
    if (!session) return;
    
    try {
      const { data: userPublic } = await supabase
        .from('users_public')
        .select('*')
        .eq('auth_id', session.user.id)
        .single();

      if (userPublic) {
        setProfile(userPublic);
        setName(userPublic.display_name || '');
        setPhone(userPublic.phone_number || '');
      }

      setEmail(session.user.email || '');
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    if (!session || !profile) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('users_public')
        .update({
          display_name: name,
          phone_number: phone,
          updated_at: new Date().toISOString(),
        })
        .eq('auth_id', session.user.id);

      if (error) throw error;

      Alert.alert('Success', 'Profile updated successfully!');
      setEditingName(false);
      setEditingPhone(false);
      loadProfile();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await supabase.auth.signOut();
            router.replace('/');
          },
        },
      ]
    );
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
          <Image
            source={require('@/assets/images/logo.png')}
            style={styles.headerLogo}
          />
          <Text style={styles.headerTitle}>SETTINGS</Text>
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
        <Image
          source={require('@/assets/images/logo.png')}
          style={styles.headerLogo}
        />
        <Text style={styles.headerTitle}>SETTINGS</Text>
      </View>

      <CustomScrollView style={styles.container}>
        {/* Account Settings */}
        <Text style={styles.sectionTitle}>ACCOUNT</Text>
        
        <GradientCard style={styles.card}>
          {/* Name */}
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Name</Text>
              {editingName ? (
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter your name"
                  placeholderTextColor="#666"
                />
              ) : (
                <Text style={styles.settingValue}>{name || 'Not set'}</Text>
              )}
            </View>
            <Pressable
              onPress={() => {
                if (editingName) {
                  saveProfile();
                } else {
                  setEditingName(true);
                }
              }}
              style={styles.editButton}
            >
              <Ionicons 
                name={editingName ? 'checkmark' : 'pencil'} 
                size={20} 
                color="#FF0000" 
              />
            </Pressable>
          </View>

          <View style={styles.divider} />

          {/* Email */}
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Email</Text>
              <Text style={styles.settingValue}>{email}</Text>
              <Text style={styles.settingHint}>Email cannot be changed</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Phone */}
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Phone Number</Text>
              {editingPhone ? (
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Enter phone number"
                  placeholderTextColor="#666"
                  keyboardType="phone-pad"
                />
              ) : (
                <Text style={styles.settingValue}>{phone || 'Not set'}</Text>
              )}
            </View>
            <Pressable
              onPress={() => {
                if (editingPhone) {
                  saveProfile();
                } else {
                  setEditingPhone(true);
                }
              }}
              style={styles.editButton}
            >
              <Ionicons 
                name={editingPhone ? 'checkmark' : 'pencil'} 
                size={20} 
                color="#FF0000" 
              />
            </Pressable>
          </View>
        </GradientCard>

        {/* Call Settings */}
        <Text style={styles.sectionTitle}>CALL SETTINGS</Text>
        
        <GradientCard style={styles.card}>
          <Pressable 
            style={styles.settingRow}
            onPress={() => router.push('/settings/call-preferences' as any)}
          >
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Call Preferences</Text>
              <Text style={styles.settingValue}>Manage when you receive calls</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#888" />
          </Pressable>

          <View style={styles.divider} />

          <Pressable 
            style={styles.settingRow}
            onPress={() => Alert.alert('Coming Soon', 'Notification settings will be available soon')}
          >
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Notifications</Text>
              <Text style={styles.settingValue}>Call reminders and alerts</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#888" />
          </Pressable>
        </GradientCard>

        {/* Coach Settings */}
        <Text style={styles.sectionTitle}>COACH</Text>
        
        <GradientCard style={styles.card}>
          <Pressable 
            style={styles.settingRow}
            onPress={() => router.push('/coach/selection' as any)}
          >
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Change Coach</Text>
              <Text style={styles.settingValue}>
                Current: {profile?.selected_coach_slug || 'Not selected'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#888" />
          </Pressable>
        </GradientCard>

        {/* Danger Zone */}
        <Text style={styles.sectionTitle}>ACCOUNT ACTIONS</Text>
        
        <GradientCard style={styles.card}>
          <Pressable 
            style={styles.settingRow}
            onPress={handleLogout}
          >
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, styles.dangerText]}>Logout</Text>
            </View>
            <Ionicons name="log-out-outline" size={20} color="#FF0000" />
          </Pressable>
        </GradientCard>

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
  sectionTitle: {
    color: '#FF0000',
    fontSize: 14,
    fontFamily: 'Akira-Extended',
    letterSpacing: 1.5,
    marginTop: 24,
    marginBottom: 12,
  },
  card: {
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    color: '#EEEEEE',
    fontSize: 16,
    fontFamily: 'OpenSans-SemiBold',
    marginBottom: 4,
  },
  settingValue: {
    color: '#888',
    fontSize: 14,
    fontFamily: 'OpenSans-Regular',
  },
  settingHint: {
    color: '#666',
    fontSize: 12,
    fontFamily: 'OpenSans-Regular',
    marginTop: 4,
    fontStyle: 'italic',
  },
  editButton: {
    padding: 8,
    marginLeft: 12,
  },
  input: {
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#EEEEEE',
    fontSize: 14,
    fontFamily: 'OpenSans-Regular',
    marginTop: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#333',
    marginVertical: 8,
  },
  dangerText: {
    color: '#FF0000',
  },
});
