import { supabase } from '@/lib/supabase';

export async function ensureUserProfile() {
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;
  if (!user) return null;

  const { data: existing } = await supabase
    .from('users_public')
    .select('id, streak')
    .eq('auth_id', user.id)
    .maybeSingle();

  if (existing) return existing;

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  const { data, error } = await supabase
    .from('users_public')
    .insert({ auth_id: user.id, timezone, streak: 0, onboarding_completed: false })
    .select('id, streak')
    .single();

  if (error) throw error;
  return data;
}
