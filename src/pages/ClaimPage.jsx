import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';

export default function ClaimPage({ token }) {
  const [status, setStatus] = useState('loading'); // 'loading' | 'error'

  useEffect(() => {
    (async () => {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      const { data, error } = await supabase.functions.invoke('redeem-claim', {
        body: { token, timezone },
      });
      if (error || !data || !data.ok) {
        setStatus('error');
        return;
      }
      localStorage.setItem(`admin_token_${data.slug}`, data.admin_token);
      window.location.href = `/${data.slug}/manage`;
    })();
  }, [token]);

  return (
    <div className="min-h-screen bg-sky-50 flex items-center justify-center p-6 text-center font-sans">
      {status === 'loading' ? (
        <p className="text-sm text-stone-500">Setting up your schedule…</p>
      ) : (
        <div className="max-w-sm">
          <p className="text-sm text-rose-600 mb-4">
            This link has expired or has already been used. Please go back to esl-plans.com and click "My Schedule" again.
          </p>
          <a href="https://esl-plans.com" className="text-sm text-teal-700 underline">Back to esl-plans.com</a>
        </div>
      )}
    </div>
  );
}
