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

// Given an instant and an IANA timezone, returns how many ms that
// timezone's wall clock is ahead of UTC at that instant (handles DST).
export function getTimeZoneOffsetMs(date, timeZone) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const parts = {};
  for (const p of dtf.formatToParts(date)) parts[p.type] = p.value;
  const asUTC = Date.UTC(
    Number(parts.year), Number(parts.month) - 1, Number(parts.day),
    Number(parts.hour), Number(parts.minute), Number(parts.second)
  );
  return asUTC - date.getTime();
}

// Converts a wall-clock date/time meant to be read in `timeZone` into
// the actual UTC instant it represents.
export function zonedTimeToUtc(year, month, day, hour, minute, timeZone) {
  let guess = Date.UTC(year, month - 1, day, hour, minute);
  for (let i = 0; i < 2; i++) {
    const offset = getTimeZoneOffsetMs(new Date(guess), timeZone);
    guess = Date.UTC(year, month - 1, day, hour, minute) - offset;
  }
  return new Date(guess);
}

// The core of real timezone support: the teacher's working hours are
// wall-clock times in THEIR timezone. This walks a generous window of
// candidate teacher-local calendar days, converts each potential slot
// to its real UTC instant, then re-reads that instant using the
// viewer's own local time (plain JS Date getters already do this
// automatically) to see which day/time it lands on for THEM. Slots
// can legitimately shift to a different calendar day for the viewer
// than for the teacher — that's correct, not a bug.
export function buildViewerGrid({ weekDates, timezone, availFrom, availTo, bookings }) {
  const [fromH, fromM] = availFrom.split(':').map(Number);
  const [toH, toM] = availTo.split(':').map(Number);
  const fromMinutes = fromH * 60 + fromM;
  const toMinutes = toH * 60 + toM;

  const scanStart = new Date(weekDates[0]);
  scanStart.setDate(scanStart.getDate() - 2);
  const scanDays = 11; // 7 displayed days + 2-day buffer each side

  const byDay = Array.from({ length: 7 }, () => []);

  for (let i = 0; i < scanDays; i++) {
    const candidate = new Date(scanStart);
    candidate.setDate(candidate.getDate() + i);
    const y = candidate.getFullYear();
    const m = candidate.getMonth() + 1;
    const d = candidate.getDate();

    for (let mins = fromMinutes; mins <= toMinutes; mins += 30) {
      const hh = Math.floor(mins / 60);
      const mm = mins % 60;
      const utcInstant = zonedTimeToUtc(y, m, d, hh, mm, timezone);
      const viewerDayIdx = weekDates.findIndex((wd) => wd.toDateString() === utcInstant.toDateString());
      if (viewerDayIdx === -1) continue;
      const viewerTime = `${utcInstant.getHours().toString().padStart(2, '0')}:${utcInstant.getMinutes().toString().padStart(2, '0')}`;
      byDay[viewerDayIdx].push({ utcInstant, viewerTime });
    }
  }

  byDay.forEach((daySlots) => daySlots.sort((a, b) => a.utcInstant - b.utcInstant));
  const times = Array.from(new Set(byDay.flat().map((s) => s.viewerTime))).sort();

  const cellsByDay = byDay.map((daySlots) => {
    const cells = [];
    let i = 0;
    while (i < daySlots.length) {
      const slot = daySlots[i];
      const booking = (bookings || []).find((b) => new Date(b.start_time).getTime() === slot.utcInstant.getTime());
      const rowStart = times.indexOf(slot.viewerTime);
      if (booking) {
        const span = Math.max(1, Math.round(booking.duration / 30));
        cells.push({ type: 'booking', rowStart, span, booking });
        i += span;
      } else {
        cells.push({ type: 'free', rowStart, time: slot.viewerTime, utcInstant: slot.utcInstant });
        i += 1;
      }
    }
    return cells;
  });

  return { times, cellsByDay };
}
