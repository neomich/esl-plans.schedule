import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase.js';
import { getWeekDates } from './dateHelpers.js';

export function useBookings(scheduleId) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);

  const weekDates = getWeekDates(weekOffset);

  const refetch = useCallback(async () => {
    if (!scheduleId) return;
    setLoading(true);
    const rangeStart = new Date(weekDates[0]);
    const rangeEnd = new Date(weekDates[6]);
    rangeEnd.setHours(23, 59, 59, 999);

    const [oneTimeRes, fixedRes] = await Promise.all([
      supabase.from('bookings').select('*')
        .eq('schedule_id', scheduleId)
        .neq('booking_type', 'fixed')
        .gte('start_time', rangeStart.toISOString())
        .lte('start_time', rangeEnd.toISOString()),
      // Fixed bookings recur every week from when they were first made,
      // so we fetch all of them up through this week (not scoped to
      // this week's date range) and let buildViewerGrid project them
      // onto whichever week is being displayed.
      supabase.from('bookings').select('*')
        .eq('schedule_id', scheduleId)
        .eq('booking_type', 'fixed')
        .lte('start_time', rangeEnd.toISOString()),
    ]);

    if (!oneTimeRes.error && !fixedRes.error) {
      setBookings([...(oneTimeRes.data || []), ...(fixedRes.data || [])]);
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduleId, weekOffset]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const createBooking = async ({ start, name, duration, type, topic }) => {
    const end = new Date(start.getTime() + duration * 60000);
    const { error } = await supabase.from('bookings').insert([{
      schedule_id: scheduleId,
      student_name: name,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      duration,
      booking_type: type,
      topic: topic || null,
    }]);
    if (!error) await refetch();
    return { error };
  };

  const deleteBooking = async (id) => {
    const { error } = await supabase.from('bookings').delete().eq('id', id);
    if (!error) await refetch();
    return { error };
  };

  return { weekOffset, setWeekOffset, weekDates, bookings, loading, refetch, createBooking, deleteBooking };
}
