export const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const WEEKDAY_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const LENGTH_OPTIONS = [30, 60, 90, 120];

export function generateTimes(startHour = 6, endHour = 23.5) {
  const times = [];
  for (let h = startHour; h <= endHour; h += 0.5) {
    const hour = Math.floor(h);
    const min = h % 1 === 0 ? '00' : '30';
    times.push(`${hour.toString().padStart(2, '0')}:${min}`);
  }
  return times;
}
export const ALL_TIMES = generateTimes(6, 23.5);

export function ordinal(n) {
  const rem = n % 100;
  if (rem >= 11 && rem <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

export function getMonday(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function getWeekDates(offset) {
  const monday = getMonday(new Date());
  monday.setDate(monday.getDate() + offset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return d;
  });
}

export function isToday(d) {
  const t = new Date();
  return d.toDateString() === t.toDateString();
}

export function weekRangeLabel(weekDates) {
  const start = weekDates[0];
  const end = weekDates[6];
  const monthName = (d) => d.toLocaleDateString('en-US', { month: 'long' });
  if (start.getMonth() === end.getMonth()) {
    return `${monthName(start)} ${start.getDate()} - ${end.getDate()}, ${end.getFullYear()}`;
  }
  return `${monthName(start)} ${start.getDate()} - ${monthName(end)} ${end.getDate()}, ${end.getFullYear()}`;
}

// "09:00" -> minutes since midnight, for sorting/spanning math
export function timeToMinutes(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

// Local "HH:MM" from a Date, in the browser's own timezone.
export function timeStringFromDate(d) {
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

// Combine a day (Date, time ignored) with a "HH:MM" string into a
// real Date in the browser's local timezone.
export function combineDateAndTime(dayDate, timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  const d = new Date(dayDate);
  d.setHours(h, m, 0, 0);
  return d;
}

// Given a week's worth of bookings (each with a real start_time /
// end_time), group them per day into either single free slots or
// one merged block per booking, sized by how many 30-min slots its
// duration covers. This powers the "block height = lesson length"
// visual from the prototype.
export function buildDayCells(dayDate, times, bookingsForDay) {
  const cells = [];
  let i = 0;
  while (i < times.length) {
    const time = times[i];
    const booking = bookingsForDay.find((b) => timeStringFromDate(new Date(b.start_time)) === time);
    if (booking) {
      const rawSpan = Math.max(1, Math.round(booking.duration / 30));
      const span = Math.min(rawSpan, times.length - i);
      cells.push({ type: 'booking', rowStart: i, span, booking });
      i += span;
    } else {
      cells.push({ type: 'free', rowStart: i, time });
      i += 1;
    }
  }
  return cells;
}
