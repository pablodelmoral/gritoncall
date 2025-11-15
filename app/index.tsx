import { Redirect } from 'expo-router';
import { useSession } from '@/hooks/useSession';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { ActivityIndicator, View, StyleSheet, Text } from 'react-native';

export default function Index() {
  const session = useSession();
  
  console.log('🔐 Session status:', !!session);
  console.log('🔐 Session data:', session);
  console.log('🔧 Supabase URL:', process.env.EXPO_PUBLIC_SUPABASE_URL);
  console.log('🔧 Supabase Key exists:', !!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

  const { data: profile, isLoading, error } = useQuery({
    enabled: !!session,
    queryKey: ['profile-onboarding'],
    queryFn: async () => {
      console.log('🔍 Checking onboarding status for user:', session!.user.id);
      const { data, error } = await supabase
        .from('users_public')
        .select('onboarding_completed')
        .eq('auth_id', session!.user.id)
        .single();
      
      console.log('📊 Query result:', { data, error });
      if (error) {
        console.error('❌ Query error:', error);
        throw error;
      }
      return data;
    },
  });

  // Temporarily bypass all checks and go directly to onboarding for testing
  console.log('🧪 Testing mode: Going directly to onboarding');
  return <Redirect href={"/onboarding/chat" as any} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  loading: {
    flex: 1,
    backgroundColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
