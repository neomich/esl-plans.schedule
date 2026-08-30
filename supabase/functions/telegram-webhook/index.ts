import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get('slug');
    if (!slug) return new Response('ok'); // always ack Telegram quickly

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const update = await req.json();
    const chatId = update?.message?.chat?.id;
    if (!chatId) return new Response('ok');

    const { data: schedule } = await supabase
      .from('schedules')
      .select('telegram_bot_token, telegram_chat_id')
      .eq('slug', slug)
      .single();

    if (schedule && !schedule.telegram_chat_id) {
      await supabase.from('schedules').update({ telegram_chat_id: String(chatId) }).eq('slug', slug);

      if (schedule.telegram_bot_token) {
        await fetch(`https://api.telegram.org/bot${schedule.telegram_bot_token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: "You're connected! You'll get a message here every time a student books a lesson.",
          }),
        });
      }
    }

    return new Response('ok');
  } catch (err) {
    console.error('telegram-webhook error:', err);
    return new Response('ok'); // still ack — Telegram will retry otherwise
  }
});
