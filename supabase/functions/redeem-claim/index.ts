import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// esl-plans.com's own Supabase project — this is where the actual
// subscriber/tier truth lives. We never store or trust tier info
// ourselves; we ask them, every time.
const ESL_PLANS_SUPABASE_URL = 'https://uhyapbinngjpotcifdbc.supabase.co';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const claimSecret = Deno.env.get('SCHEDULE_CLAIM_SECRET')!;
    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const { token, timezone } = await req.json();
    if (!token) {
      return new Response(JSON.stringify({ ok: false, error: 'missing_token' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Ask esl-plans.com directly whether this token is real, unused,
    // and tied to an actual Friend-tier subscriber. The shared secret
    // proves this request is really coming from us.
    const verifyRes = await fetch(`${ESL_PLANS_SUPABASE_URL}/functions/v1/verify-schedule-claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-claim-secret': claimSecret },
      body: JSON.stringify({ token }),
    });
    const verifyResult = await verifyRes.json().catch(() => ({}));

    if (!verifyRes.ok || !verifyResult.valid || !verifyResult.email) {
      return new Response(JSON.stringify({ ok: false, error: 'invalid_or_used_link' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const email = String(verifyResult.email).toLowerCase().trim();

    // Returning subscriber — send them back to their existing schedule
    // rather than creating a duplicate. Also doubles as account
    // recovery if they lost their admin link on their old device.
    const { data: existing } = await supabase
      .from('schedules')
      .select('slug, admin_token')
      .eq('owner_email', email)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ ok: true, slug: existing.slug, admin_token: existing.admin_token }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // First time — create a fresh schedule for them, named from their
    // email (collisions are handled automatically inside create_schedule).
    const desiredSlug = email.split('@')[0];
    const { data: created, error: createError } = await supabase.rpc('create_schedule', {
      p_desired_slug: desiredSlug,
      p_passcode: '123',
      p_timezone: timezone || 'UTC',
    });

    if (createError || !created || !created[0]) {
      console.error('create_schedule failed:', createError);
      return new Response(JSON.stringify({ ok: false, error: 'creation_failed' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { slug, admin_token } = created[0];
    await supabase.from('schedules').update({ owner_email: email }).eq('slug', slug);

    return new Response(JSON.stringify({ ok: true, slug, admin_token }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('redeem-claim error:', err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
