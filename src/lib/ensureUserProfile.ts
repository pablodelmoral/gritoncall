import { supabase } from '../lib/supabase';

export async function ensureUserProfile() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: existing } = await supabase
    .from('users_public')
    .select('id')
    .eq('auth_id', user.id)
    .maybeSingle();

  if (existing) return existing;

  const { data, error } = await supabase
    .from('users_public')
    .insert({
      auth_id: user.id,
      name: (user.user_metadata as any)?.full_name ?? 'You',
      timezone: 'America/Toronto',
      default_call_time: '07:30',
      quiet_start: '21:00',
      quiet_end: '06:00',
    })
    .select('id')
    .single();

  if (error) throw error;
  return data;
}
