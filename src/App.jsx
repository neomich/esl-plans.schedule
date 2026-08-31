import React from 'react';
import Landing from './pages/Landing.jsx';
import Admin from './pages/Admin.jsx';
import PublicBooking from './pages/PublicBooking.jsx';
import ClaimPage from './pages/ClaimPage.jsx';
import { isSupabaseConfigured } from './lib/supabase.js';

function ConfigWarning() {
  return (
    <div className="min-h-screen bg-sky-50 flex items-center justify-center p-6 text-center">
      <p className="text-sm text-rose-600 max-w-sm">
        Missing Supabase configuration. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
        as environment variables for this app (see README.md).
      </p>
    </div>
  );
}

export default function App() {
  if (!isSupabaseConfigured()) return <ConfigWarning />;

  const path = window.location.pathname.replace(/^\/+|\/+$/g, ''); // trim slashes

  if (path === '') return <Landing />;

  const claimMatch = path.match(/^claim\/([a-zA-Z0-9]+)$/);
  if (claimMatch) return <ClaimPage token={claimMatch[1]} />;

  const adminMatch = path.match(/^([a-z0-9]+)\/manage$/);
  if (adminMatch) return <Admin slug={adminMatch[1]} />;

  const publicMatch = path.match(/^([a-z0-9]+)$/);
  if (publicMatch) return <PublicBooking slug={publicMatch[1]} />;

  return (
    <div className="min-h-screen bg-sky-50 flex items-center justify-center p-6 text-center">
      <p className="text-sm text-stone-500">Page not found.</p>
    </div>
  );
}
