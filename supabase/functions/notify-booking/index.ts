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

    const { schedule_id, student_name, time, duration, booking_type, topic } = await req.json();

    const { data: schedule, error } = await supabase
      .from('schedules')
      .select('telegram_enabled, telegram_bot_token, telegram_chat_id, slug')
      .eq('id', schedule_id)
      .single();

    if (error || !schedule || !schedule.telegram_enabled || !schedule.telegram_bot_token || !schedule.telegram_chat_id) {
      // Nothing to send — not an error, just nothing configured yet.
      return new Response(JSON.stringify({ ok: true, sent: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const typeLabel = booking_type === 'fixed' ? 'Fixed lesson' : 'This week only';
    const lines = [
      `📅 New booking on your schedule!`,
      `Student: ${student_name}`,
      `Time: ${time}`,
      `Duration: ${duration} minutes`,
      `Type: ${typeLabel}`,
    ];
    if (topic) lines.push(`Topic: ${topic}`);

    await fetch(`https://api.telegram.org/bot${schedule.telegram_bot_token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: schedule.telegram_chat_id,
        text: lines.join('\n'),
      }),
    });

    return new Response(JSON.stringify({ ok: true, sent: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('notify-booking error:', err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
