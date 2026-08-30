import React, { useEffect, useState } from 'react';
import { Type, Clock, Palette, MessageSquare, Send, CalendarDays, Copy } from 'lucide-react';
import { supabase } from '../lib/supabase.js';
import { useBookings } from '../lib/useBookings.js';
import {
  Section, Toggle, ColorPicker, TimeSelect, LengthSelect,
  CalendarSection, BookingPopup, DeletePopup, SuccessPopup,
} from '../components/scheduleUI.jsx';
import { ALL_TIMES } from '../lib/dateHelpers.js';

export default function Admin({ slug }) {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [row, setRow] = useState(null);
  const [settings, setSettings] = useState(null);
  const [saveStatus, setSaveStatus] = useState('');
  const [saving, setSaving] = useState(false);

  const adminToken = typeof window !== 'undefined' ? localStorage.getItem(`admin_token_${slug}`) : null;

  useEffect(() => {
    (async () => {
      if (!adminToken) { setLoading(false); return; }
      const { data, error } = await supabase.rpc('get_admin_schedule', { p_slug: slug, p_admin_token: adminToken });
      if (error || !data || !data.id) { setLoading(false); return; }
      setRow(data);
      setSettings({
        headline: data.headline,
        show_timezone_note: data.show_timezone_note,
        instructions: data.instructions,
        colors: data.colors,
        avail_from: data.avail_from,
        avail_to: data.avail_to,
        min_length: data.min_length,
        max_length: data.max_length,
        include_topic: data.include_topic,
        success_message: data.success_message,
        student_passcode: data.student_passcode,
        telegram_enabled: data.telegram_enabled,
        telegram_bot_token: data.telegram_bot_token || '',
      });
      setAuthorized(true);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const bk = useBookings(row?.id);
  const [bookSlot, setBookSlot] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [successOpen, setSuccessOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  const update = (patch) => setSettings((s) => ({ ...s, ...patch }));
  const updateInstruction = (id, patch) =>
    setSettings((s) => ({ ...s, instructions: s.instructions.map((i) => (i.id === id ? { ...i, ...patch } : i)) }));

  const handleSave = async () => {
    setSaving(true);
    setSaveStatus('');
    const { data: ok, error } = await supabase.rpc('save_schedule_settings', {
      p_slug: slug,
      p_admin_token: adminToken,
      p_patch: settings,
    });
    if (error || !ok) {
      setSaveStatus('Something went wrong saving. Please try again.');
      setSaving(false);
      return;
    }
    if (settings.telegram_enabled && settings.telegram_bot_token) {
      const { error: tgError } = await supabase.functions.invoke('register-telegram-webhook', {
        body: { slug, admin_token: adminToken },
      });
      if (tgError) {
        setSaveStatus('Saved — but Telegram setup failed. Double-check the token and try again.');
        setSaving(false);
        return;
      }
    }
    setSaveStatus('Saved!');
    setSaving(false);
    setTimeout(() => setSaveStatus(''), 2500);
  };

  const handleSlotClick = (day, time, existingBooking) => {
    if (existingBooking) setDeleteTarget(existingBooking);
    else setBookSlot({ day, time, date: bk.weekDates[day] });
  };

  const confirmBooking = async ({ name, duration, type, topic }) => {
    setSubmitting(true);
    const { error } = await bk.createBooking({ dayDate: bookSlot.date, time: bookSlot.time, name, duration, type, topic });
    setSubmitting(false);
    if (!error) { setBookSlot(null); setSuccessOpen(true); }
  };

  const confirmDelete = async () => {
    setSubmitting(true);
    await bk.deleteBooking(deleteTarget.id);
    setSubmitting(false);
    setDeleteTarget(null);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/${slug}/schedule`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) { /* clipboard unavailable */ }
  };

  if (loading) return <div className="min-h-screen bg-sky-50" />;

  if (!authorized) {
    return (
      <div className="min-h-screen bg-sky-50 flex items-center justify-center p-6 text-center">
        <div className="max-w-sm">
          <p className="text-sm text-stone-600 mb-4">
            This settings page can only be opened from the device where the schedule was created.
          </p>
          <a href="/" className="text-sm text-teal-700 underline">Create your own schedule</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sky-50 font-sans overflow-x-hidden" style={{ touchAction: 'pan-y' }}>
      <div className="border-b border-stone-200 bg-white px-6 py-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-stone-800">Your schedule settings</p>
        <div className="flex items-center gap-1.5 text-xs text-stone-400">
          <CalendarDays size={13} /> {window.location.host}/{slug}/schedule
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-6 bg-white">
        <Section icon={Type} title="Header & messages">
          <label className="block text-xs text-stone-500 mb-1.5">Headline</label>
          <input
            value={settings.headline}
            onChange={(e) => update({ headline: e.target.value })}
            className="w-full text-sm border border-stone-300 rounded-lg px-3 py-1.5 mb-4 focus:outline-none focus:ring-2 focus:ring-teal-600/30 focus:border-teal-600"
          />
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-stone-700">Show "local time zone" note</span>
            <Toggle checked={settings.show_timezone_note} onChange={(v) => update({ show_timezone_note: v })} />
          </div>
          <p className="text-xs text-stone-500 mb-2">Instructions shown above the calendar</p>
          <div className="space-y-3">
            {settings.instructions.map((i) => (
              <div key={i.id} className="flex items-start gap-2.5 bg-stone-50 rounded-lg p-3">
                <div className="pt-0.5"><Toggle checked={i.enabled} onChange={(v) => updateInstruction(i.id, { enabled: v })} /></div>
                <textarea
                  value={i.text}
                  onChange={(e) => updateInstruction(i.id, { text: e.target.value })}
                  disabled={!i.enabled}
                  rows={2}
                  className="flex-1 text-xs border border-stone-200 rounded-lg px-2.5 py-1.5 bg-white disabled:bg-stone-100 disabled:text-stone-400 focus:outline-none focus:ring-2 focus:ring-teal-600/30 resize-none"
                />
              </div>
            ))}
          </div>
        </Section>

        <Section icon={Clock} title="Availability window">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <p className="text-xs text-stone-500 mb-1.5">Earliest time you're happy to teach</p>
              <TimeSelect value={settings.avail_from} onChange={(v) => update({ avail_from: v })} options={ALL_TIMES} />
            </div>
            <div>
              <p className="text-xs text-stone-500 mb-1.5">Latest time you'll teach until</p>
              <TimeSelect value={settings.avail_to} onChange={(v) => update({ avail_to: v })} options={ALL_TIMES} />
            </div>
          </div>
        </Section>

        <Section icon={Palette} title="Colors">
          <ColorPicker label="Free slots" value={settings.colors.free} onChange={(v) => update({ colors: { ...settings.colors, free: v } })} />
          <ColorPicker label="Booked weekly classes" value={settings.colors.weekly} onChange={(v) => update({ colors: { ...settings.colors, weekly: v } })} />
          <ColorPicker label="Fixed classes" value={settings.colors.fixed} onChange={(v) => update({ colors: { ...settings.colors, fixed: v } })} />
        </Section>

        <Section icon={Clock} title="Lesson length">
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <div>
              <p className="text-xs text-stone-500 mb-1.5">Minimum lesson length</p>
              <LengthSelect value={settings.min_length} onChange={(v) => update({ min_length: Math.min(v, settings.max_length) })} />
            </div>
            <div>
              <p className="text-xs text-stone-500 mb-1.5">Maximum lesson length</p>
              <LengthSelect value={settings.max_length} onChange={(v) => update({ max_length: Math.max(v, settings.min_length) })} />
            </div>
          </div>
        </Section>

        <Section icon={MessageSquare} title="Lesson topic feature">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-stone-700">Let students choose a lesson topic (optional)</span>
            <Toggle checked={settings.include_topic} onChange={(v) => update({ include_topic: v })} />
          </div>
          <p className="text-xs text-stone-500 mb-1.5">Message shown after a booking is confirmed</p>
          <textarea
            value={settings.success_message}
            onChange={(e) => update({ success_message: e.target.value })}
            rows={2}
            className="w-full text-xs border border-stone-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-teal-600/30 resize-none"
          />
        </Section>

        <Section icon={Type} title="Student access">
          <p className="text-xs text-stone-500 mb-1.5">Access code your students enter</p>
          <input
            value={settings.student_passcode}
            onChange={(e) => update({ student_passcode: e.target.value })}
            className="text-sm border border-stone-300 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-teal-600/30 focus:border-teal-600"
          />
          <p className="text-[11px] text-stone-400 mt-2">Changing this won't affect students who've already unlocked the page on their device.</p>
        </Section>

        <Section icon={Send} title="Telegram notifications">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-stone-700">Get instant Telegram alerts for new bookings</span>
            <Toggle checked={settings.telegram_enabled} onChange={(v) => update({ telegram_enabled: v })} />
          </div>
          {settings.telegram_enabled ? (
            <div className="bg-stone-50 rounded-lg p-3.5">
              <ol className="text-xs text-stone-600 space-y-1.5 list-decimal pl-4 mb-3">
                <li>In Telegram, open a chat with <span className="font-medium">@BotFather</span> and send <span className="font-mono">/newbot</span>.</li>
                <li>Follow the prompts, then copy the token BotFather gives you.</li>
                <li>Paste that token below, then hit Save.</li>
                <li>Open your new bot in Telegram and send it any message — that's how it learns where to send your alerts.</li>
              </ol>
              <p className="text-xs text-stone-500 mb-1.5">Bot token</p>
              <input
                value={settings.telegram_bot_token}
                onChange={(e) => update({ telegram_bot_token: e.target.value })}
                placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
                className="w-full text-xs font-mono border border-stone-300 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-teal-600/30 focus:border-teal-600"
              />
              <p className="text-[11px] mt-2">
                {row?.telegram_chat_id
                  ? <span className="text-emerald-600 font-medium">✓ Connected — your bot knows where to send alerts.</span>
                  : <span className="text-stone-400">Waiting for you to message your bot for the first time.</span>}
              </p>
            </div>
          ) : (
            <p className="text-xs text-stone-400">No Telegram alerts for now — turn this on anytime.</p>
          )}
        </Section>

        <div className="pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-teal-700 disabled:bg-teal-400 text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-teal-800 transition-colors"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          {saveStatus && <span className="ml-3 text-xs text-stone-500">{saveStatus}</span>}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-6 border-t border-stone-200 bg-sky-50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-stone-700">
            <CalendarDays size={15} className="text-teal-700" /> Live preview
          </div>
          <button
            onClick={copyLink}
            className="flex items-center gap-1.5 border border-stone-300 bg-white rounded-lg px-3 py-1.5 text-xs text-stone-600 hover:bg-stone-50 transition-colors"
          >
            <Copy size={12} /> {copied ? 'Copied!' : 'Copy public link'}
          </button>
        </div>

        <div className="border border-stone-200 rounded-2xl bg-white shadow-sm relative overflow-hidden">
          <CalendarSection
            settings={settings}
            weekDates={bk.weekDates}
            setWeekOffset={bk.setWeekOffset}
            bookings={bk.bookings}
            onSlotClick={handleSlotClick}
          />
          {bookSlot && (
            <BookingPopup slot={bookSlot} settings={settings} onClose={() => setBookSlot(null)} onConfirm={confirmBooking} submitting={submitting} />
          )}
          {deleteTarget && (
            <DeletePopup booking={deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={confirmDelete} submitting={submitting} />
          )}
          {successOpen && (
            <SuccessPopup message={settings.success_message} onClose={() => setSuccessOpen(false)} />
          )}
        </div>
      </div>
    </div>
  );
}
