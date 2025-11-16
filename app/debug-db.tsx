import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { supabase } from '@/lib/supabase';

export default function DebugDatabase() {
  const [debugInfo, setDebugInfo] = useState<any>(null);

  useEffect(() => {
    loadDebugInfo();
  }, []);

  const loadDebugInfo = async () => {
    const info: any = {};

    try {
      // 1. Get current user
      const { data: { user } } = await supabase.auth.getUser();
      info.currentUser = {
        id: user?.id,
        email: user?.email
      };

      if (user) {
        // 2. Check users_public table
        const { data: profiles, error: profileError } = await supabase
          .from('users_public')
          .select('*')
          .eq('auth_id', user.id);

        info.profiles = {
          found: profiles?.length || 0,
          data: profiles,
          error: profileError
        };

        // 3. Check plans table for this user's profile(s)
        if (profiles && profiles.length > 0) {
          const profileId = profiles[0].id;
          
          const { data: plans, error: plansError } = await supabase
            .from('plans')
            .select('*')
            .eq('user_id', profileId);

          info.plans = {
            profileId: profileId,
            found: plans?.length || 0,
            data: plans,
            error: plansError
          };
        }

        // 4. Also check ALL plans in database (to see if any exist)
        const { data: allPlans, error: allPlansError } = await supabase
          .from('plans')
          .select('*');

        info.allPlansInDb = {
          total: allPlans?.length || 0,
          error: allPlansError
        };
      }
    } catch (error) {
      info.error = error;
    }

    setDebugInfo(info);
  };

  if (!debugInfo) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Loading debug info...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🔍 DATABASE DEBUG INFO</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>1. CURRENT USER</Text>
        <Text style={styles.code}>{JSON.stringify(debugInfo.currentUser, null, 2)}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>2. USER PROFILES</Text>
        <Text style={styles.code}>{JSON.stringify(debugInfo.profiles, null, 2)}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>3. PLANS FOR THIS USER</Text>
        <Text style={styles.code}>{JSON.stringify(debugInfo.plans, null, 2)}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>4. ALL PLANS IN DATABASE</Text>
        <Text style={styles.code}>{JSON.stringify(debugInfo.allPlansInDb, null, 2)}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#000',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  section: {
    marginBottom: 20,
    backgroundColor: '#1a1a1a',
    padding: 15,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ff0000',
    marginBottom: 10,
  },
  code: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#aaa',
    lineHeight: 18,
  },
});
