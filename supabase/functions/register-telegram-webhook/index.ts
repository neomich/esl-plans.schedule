import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const { slug, admin_token } = await req.json();

    const { data: schedule, error } = await supabase
      .from('schedules')
      .select('id, telegram_bot_token')
      .eq('slug', slug)
      .eq('admin_token', admin_token)
      .single();

    if (error || !schedule || !schedule.telegram_bot_token) {
      return new Response(JSON.stringify({ ok: false, error: 'Not authorized or no bot token set.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const webhookUrl = `${supabaseUrl}/functions/v1/telegram-webhook?slug=${encodeURIComponent(slug)}`;

    const tgResponse = await fetch(
      `https://api.telegram.org/bot${schedule.telegram_bot_token}/setWebhook?url=${encodeURIComponent(webhookUrl)}`
    );
    const tgResult = await tgResponse.json();

    if (!tgResult.ok) {
      return new Response(JSON.stringify({ ok: false, error: tgResult.description || 'Telegram rejected the token.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('register-telegram-webhook error:', err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
