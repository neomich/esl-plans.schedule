import React, { useEffect, useState } from 'react';
import { Lock } from 'lucide-react';
import { supabase } from '../lib/supabase.js';
import { useBookings } from '../lib/useBookings.js';
import { CalendarSection, BookingPopup, DeletePopup, SuccessPopup } from '../components/scheduleUI.jsx';

const SAFE_COLUMNS = 'id, slug, student_passcode, headline, show_timezone_note, instructions, colors, avail_from, avail_to, min_length, max_length, include_topic, success_message, timezone';

export default function PublicBooking({ slug }) {
  const [schedule, setSchedule] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [checkingLock, setCheckingLock] = useState(true);
  const [entered, setEntered] = useState('');
  const [err, setErr] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('schedules').select(SAFE_COLUMNS).eq('slug', slug).single();
      if (error || !data) {
        setNotFound(true);
        setCheckingLock(false);
        return;
      }
      setSchedule(data);
      const stored = localStorage.getItem(`passcode_${slug}`);
      if (stored && stored === data.student_passcode) setUnlocked(true);
      setCheckingLock(false);
    })();
  }, [slug]);

  const bk = useBookings(schedule?.id);
  const [bookSlot, setBookSlot] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [successOpen, setSuccessOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleUnlock = () => {
    if (!schedule || entered !== schedule.student_passcode) { setErr(true); return; }
    setUnlocked(true);
    localStorage.setItem(`passcode_${slug}`, entered);
  };

  const handleSlotClick = (day, time, existingBooking, utcInstant) => {
    if (existingBooking) {
      setDeleteTarget(existingBooking);
    } else {
      setBookSlot({ day, time, date: utcInstant });
    }
  };

  const confirmBooking = async ({ name, duration, type, topic }) => {
    setSubmitting(true);
    const { error } = await bk.createBooking({ start: bookSlot.date, name, duration, type, topic });
    setSubmitting(false);
    if (!error) {
      setBookSlot(null);
      setSuccessOpen(true);
      supabase.functions.invoke('notify-booking', {
        body: {
          schedule_id: schedule.id,
          student_name: name,
          start_time: bookSlot.date.toISOString(),
          duration,
          booking_type: type,
          topic,
        },
      }).catch(() => { /* notification is best-effort, never block the student */ });
    }
  };

  const confirmDelete = async () => {
    setSubmitting(true);
    await bk.deleteBooking(deleteTarget.id);
    setSubmitting(false);
    setDeleteTarget(null);
  };

  if (notFound) {
    return (
      <div className="min-h-screen bg-sky-50 flex items-center justify-center p-6 text-center">
        <p className="text-sm text-stone-500">This schedule link doesn't exist.</p>
      </div>
    );
  }

  if (checkingLock || !schedule) {
    return <div className="min-h-screen bg-sky-50" />;
  }

  return (
    <div className="min-h-screen bg-sky-50 font-sans overflow-x-hidden" style={{ touchAction: 'pan-y' }}>
      <div className="sm:max-w-3xl sm:mx-auto sm:py-8 sm:px-4">
        <div className="border-0 sm:border sm:border-stone-200 sm:rounded-2xl bg-white sm:shadow-sm relative overflow-hidden min-h-screen sm:min-h-0">
          {!unlocked ? (
            <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
              <div className="w-11 h-11 rounded-full bg-teal-50 flex items-center justify-center mb-4">
                <Lock size={18} className="text-teal-700" />
              </div>
              <p className="text-sm font-medium text-stone-800 mb-1">Enter your access code</p>
              <p className="text-xs text-stone-500 mb-4 max-w-[220px]">Your teacher gave you a code to book lessons on this page. You'll only need to enter it once on this device.</p>
              <input
                value={entered}
                onChange={(e) => { setEntered(e.target.value); setErr(false); }}
                placeholder="Access code"
                className="text-sm border border-stone-300 rounded-lg px-3 py-1.5 text-center w-36 mb-2 focus:outline-none focus:ring-2 focus:ring-teal-600/30 focus:border-teal-600"
              />
              {err && <p className="text-xs text-rose-500 mb-2">That code doesn't match. Try again.</p>}
              <button
                onClick={handleUnlock}
                className="bg-teal-700 text-white text-sm font-medium px-4 py-1.5 rounded-lg hover:bg-teal-800 transition-colors"
              >
                Continue
              </button>
            </div>
          ) : (
            <CalendarSection
              settings={schedule}
              weekDates={bk.weekDates}
              setWeekOffset={bk.setWeekOffset}
              bookings={bk.bookings}
              onSlotClick={handleSlotClick}
              boundedHeight={false}
            />
          )}

          {bookSlot && (
            <BookingPopup slot={bookSlot} settings={schedule} onClose={() => setBookSlot(null)} onConfirm={confirmBooking} submitting={submitting} />
          )}
          {deleteTarget && (
            <DeletePopup booking={deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={confirmDelete} submitting={submitting} />
          )}
          {successOpen && (
            <SuccessPopup message={schedule.success_message} onClose={() => setSuccessOpen(false)} />
          )}
        </div>
      </div>
    </div>
  );
}
