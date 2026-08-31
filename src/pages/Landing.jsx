import React from 'react';
import { Sparkles } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-sky-50 flex items-center justify-center p-6 font-sans">
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 max-w-sm w-full p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center mx-auto mb-5">
          <Sparkles size={20} className="text-teal-700" />
        </div>
        <h1 className="text-lg font-semibold text-stone-800 mb-2">This is a Friend-tier feature</h1>
        <p className="text-sm text-stone-500 mb-6 leading-relaxed">
          Schedules here are set up automatically for ESL-plans Friend-tier members.
          Log in at esl-plans.com and click "My Schedule" from your account menu to get started.
        </p>
        <a
          href="https://esl-plans.com"
          className="inline-block w-full bg-teal-700 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-teal-800 transition-colors"
        >
          Go to esl-plans.com
        </a>
      </div>
    </div>
  );
}
