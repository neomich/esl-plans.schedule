import React, { useState } from 'react';
import { Sparkles, ChevronRight } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase.js';

export default function Landing() {
  const [desiredSlug, setDesiredSlug] = useState('');
  const [passcode, setPasscode] = useState('123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!isSupabaseConfigured()) {
      setError('This app is missing its Supabase configuration (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).');
      return;
    }
    if (!desiredSlug.trim()) {
      setError('Please enter a name for your schedule link.');
      return;
    }
    setLoading(true);
    setError('');
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const { data, error: rpcError } = await supabase.rpc('create_schedule', {
      p_desired_slug: desiredSlug.trim(),
      p_passcode: passcode.trim() || '123',
      p_timezone: timezone,
    });
    setLoading(false);
    if (rpcError) {
      if (rpcError.message?.includes('slug_taken')) {
        setError('That name is already in use — please think of another one.');
      } else if (rpcError.message?.includes('empty_slug')) {
        setError('Please enter a name for your schedule link.');
      } else {
        setError('Something went wrong creating your schedule. Please try again.');
      }
      return;
    }
    if (!data || !data[0]) {
      setError('Something went wrong creating your schedule. Please try again.');
      return;
    }
    const { slug, admin_token } = data[0];
    localStorage.setItem(`admin_token_${slug}`, admin_token);
    window.location.href = `/${slug}/manage`;
  };

  return (
    <div className="min-h-screen bg-sky-50 flex items-center justify-center p-6 font-sans">
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 max-w-sm w-full p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center mx-auto mb-5">
          <Sparkles size={20} className="text-teal-700" />
        </div>
        <h1 className="text-lg font-semibold text-stone-800 mb-2">Create your schedule</h1>
        <p className="text-sm text-stone-500 mb-6 leading-relaxed">
          Pick a name for your link and a code for your students. You can change both later.
        </p>

        <label className="block text-xs text-stone-500 mb-1.5 text-left">Your schedule link</label>
        <div className="flex items-center border border-stone-300 rounded-lg mb-4 overflow-hidden">
          <span className="text-xs text-stone-400 pl-3 pr-1 shrink-0">yoursite.com/</span>
          <input
            value={desiredSlug}
            onChange={(e) => setDesiredSlug(e.target.value)}
            placeholder="alex"
            className="flex-1 text-sm px-1 py-2 focus:outline-none min-w-0"
          />
        </div>

        <label className="block text-xs text-stone-500 mb-1.5 text-left">Student access code</label>
        <input
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          className="w-full text-center text-lg font-medium tracking-widest border border-stone-300 rounded-lg px-3 py-2.5 mb-1 focus:outline-none focus:ring-2 focus:ring-teal-600/30 focus:border-teal-600"
        />
        <p className="text-xs text-stone-400 mb-6">You can change this anytime from your settings page.</p>

        <p className="text-[11px] text-stone-400 mb-4">
          Detected timezone: <span className="font-medium text-stone-500">{Intl.DateTimeFormat().resolvedOptions().timeZone}</span> — students in other timezones will automatically see times converted to their own.
        </p>

        {error && <p className="text-xs text-rose-500 mb-4">{error}</p>}

        <button
          onClick={handleCreate}
          disabled={loading}
          className="w-full bg-teal-700 disabled:bg-teal-400 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-teal-800 transition-colors flex items-center justify-center gap-1.5"
        >
          {loading ? 'Creating…' : 'Create my schedule'} <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}
