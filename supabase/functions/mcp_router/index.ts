// deno-lint-ignore-file no-explicit-any
// @ts-nocheck
// Edge Function: mcp_router
// Tools: get_user_profile, get_latest_commitment, save_new_commitment

import { createClient } from '@supabase/supabase-js';

// Environment
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY');
}

// CORS helpers
const corsHeaders: HeadersInit = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { 'content-type': 'application/json', ...corsHeaders, ...(init?.headers || {}) },
  });
}

function unauthorized(msg = 'Unauthorized') {
  return json({ error: msg }, { status: 401 });
}

function badRequest(msg = 'Bad Request') {
  return json({ error: msg }, { status: 400 });
}

function serverError(msg = 'Internal Error') {
  return json({ error: msg }, { status: 500 });
}

// Compute YYYY-MM-DD string, attempting to use a provided IANA timezone
function dateInTimezone(tz?: string): string {
  try {
    const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: tz || 'UTC', year: 'numeric', month: '2-digit', day: '2-digit' });
    const parts = fmt.formatToParts(new Date());
    const y = parts.find((p) => p.type === 'year')?.value ?? '0000';
    const m = parts.find((p) => p.type === 'month')?.value ?? '01';
    const d = parts.find((p) => p.type === 'day')?.value ?? '01';
    return `${y}-${m}-${d}`;
  } catch {
    const d = new Date();
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}

// Router
Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return badRequest('Only POST is supported');
  }

  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return unauthorized('Missing or invalid Authorization header');
  }

  const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: authHeader } },
  });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return badRequest('Invalid JSON body');
  }

  const tool = body?.tool as 'get_user_profile' | 'get_latest_commitment' | 'save_new_commitment';
  const args = (body?.args || {}) as Record<string, any>;
  if (!tool) return badRequest('Missing tool');

  try {
    // Fetch auth user (used in multiple tools)
    const { data: userData, error: uErr } = await supabase.auth.getUser();
    if (uErr) return unauthorized(uErr.message);
    const user = userData?.user;
    if (!user) return unauthorized();

    if (tool === 'get_user_profile') {
      const { data, error } = await supabase
        .from('users_public')
        .select('*')
        .eq('auth_id', user.id)
        .single();
      if (error) return serverError(error.message);
      return json({ data });
    }

    if (tool === 'get_latest_commitment') {
      const { data: up, error: e1 } = await supabase
        .from('users_public')
        .select('id')
        .eq('auth_id', user.id)
        .single();
      if (e1) return serverError(e1.message);

      const { data, error } = await supabase
        .from('micro_commitments')
        .select('*')
        .eq('user_id', up!.id)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) return serverError(error.message);
      return json({ data });
    }

    if (tool === 'save_new_commitment') {
      const text = String(args.text ?? '').trim();
      if (!text) return badRequest('text is required');
      const confidence = args.confidence == null ? null : Number(args.confidence);
      const scheduled_at = args.scheduled_at == null ? null : String(args.scheduled_at);

      // Load user profile to get timezone and id
      const { data: profile, error: pErr } = await supabase
        .from('users_public')
        .select('id, timezone')
        .eq('auth_id', user.id)
        .single();
      if (pErr) return serverError(pErr.message);

      const today = dateInTimezone(profile?.timezone || 'UTC');

      const row = {
        user_id: profile!.id,
        date: today,
        text,
        confidence: confidence,
        scheduled_at: scheduled_at,
        planned: false,
      } as const;

      const { data, error } = await supabase
        .from('micro_commitments')
        .upsert(row, { onConflict: 'user_id,date' })
        .select('*')
        .single();
      if (error) return serverError(error.message);
      return json({ data });
    }

    return badRequest('Unknown tool');
  } catch (e: any) {
    return serverError(e?.message ?? 'Unhandled error');
  }
});
