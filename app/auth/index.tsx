import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from 'react-native';
import { supabase } from '@/lib/supabase';
import { ensureUserProfile } from '@/lib/ensureUserProfile';
import { useSession } from '@/hooks/useSession';
import { useRouter } from 'expo-router';

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const session = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session) router.replace('/');
  }, [session]);

  const onSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) throw signInError;
      await ensureUserProfile();
      router.replace('/');
    } catch (e: any) {
      setError(e?.message ?? 'Sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>GRIT ON CALL</Text>
      <Text style={styles.subtitle}>Sign in to continue</Text>
      {!!error && <Text style={styles.error}>{error}</Text>}
      <TextInput
        placeholder="Email"
        placeholderTextColor="#9CA3AF"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
      />
      <TextInput
        placeholder="Password"
        placeholderTextColor="#9CA3AF"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={styles.input}
      />
      <Pressable onPress={onSignIn} disabled={loading} style={({ pressed }) => [styles.button, pressed && styles.pressed, loading && styles.disabled]}>
        <Text style={styles.buttonText}>{loading ? 'Signing In…' : 'Sign In'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111111', padding: 24, justifyContent: 'center' },
  title: { color: '#FFFFFF', fontSize: 28, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  subtitle: { color: '#D1D5DB', fontSize: 14, textAlign: 'center', marginBottom: 24 },
  input: { backgroundColor: '#1A1A1A', color: '#FFFFFF', paddingHorizontal: 14, paddingVertical: 12, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: '#2A2A2A' },
  button: { backgroundColor: '#C64F1A', paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: 4 },
  buttonText: { color: '#FFFFFF', fontWeight: '800' },
  pressed: { opacity: 0.9 },
  disabled: { opacity: 0.6 },
  error: { color: '#FCA5A5', textAlign: 'center', marginBottom: 8 },
});
