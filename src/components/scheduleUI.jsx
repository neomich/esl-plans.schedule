import React, { useMemo, useState } from 'react';
import { Check, X, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import {
  DAY_LABELS, WEEKDAY_FULL, LENGTH_OPTIONS, ALL_TIMES,
  ordinal, isToday, weekRangeLabel, buildViewerGrid,
} from '../lib/dateHelpers.js';

export const PASTELS = [
  { name: 'Coral', hex: '#FCA5A5' },
  { name: 'Tangerine', hex: '#FDBA74' },
  { name: 'Marigold', hex: '#FCD34D' },
  { name: 'Lime', hex: '#BEF264' },
  { name: 'Mint', hex: '#86EFAC' },
  { name: 'Teal', hex: '#5EEAD4' },
  { name: 'Sky', hex: '#7DD3FC' },
  { name: 'Blue', hex: '#93C5FD' },
  { name: 'Violet', hex: '#C4B5FD' },
  { name: 'Pink', hex: '#F9A8D4' },
];

export const POPUP_BG = '#FCE9D4';
const GRID_COLUMNS = 'clamp(30px, 9vw, 52px) repeat(7, minmax(0, 1fr))';

export function Section({ icon: Icon, title, children }) {
  return (
    <div className="border-b border-stone-200 py-6 first:pt-0 last:border-b-0">
      <div className="flex items-center gap-2 mb-4">
        <Icon size={16} className="text-teal-700" strokeWidth={2.2} />
        <h3 className="text-[13px] font-semibold uppercase tracking-wide text-stone-500">{title}</h3>
      </div>
      {children}
    </div>
  );
}

export function ColorPicker({ label, value, onChange }) {
  return (
    <div className="mb-4 last:mb-0">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-4 h-4 rounded-full border border-black/10 shrink-0" style={{ backgroundColor: value }} />
        <span className="text-sm text-stone-700">{label}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {PASTELS.map((p) => (
          <button
            key={p.hex}
            onClick={() => onChange(p.hex)}
            title={p.name}
            type="button"
            className="w-7 h-7 rounded-full border border-black/10 flex items-center justify-center transition-transform hover:scale-110"
            style={{ backgroundColor: p.hex }}
          >
            {value === p.hex && <Check size={13} strokeWidth={3} className="text-stone-700" />}
          </button>
        ))}
      </div>
    </div>
  );
}

export function TimeSelect({ value, onChange, options = ALL_TIMES }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="text-sm border border-stone-300 rounded-lg px-3 py-1.5 bg-white text-stone-700 focus:outline-none focus:ring-2 focus:ring-teal-600/30 focus:border-teal-600"
    >
      {options.map((t) => <option key={t} value={t}>{t}</option>)}
    </select>
  );
}

export function LengthSelect({ value, onChange, options = LENGTH_OPTIONS }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="text-sm border border-stone-300 rounded-lg px-3 py-1.5 bg-white text-stone-700 focus:outline-none focus:ring-2 focus:ring-teal-600/30 focus:border-teal-600"
    >
      {options.map((m) => <option key={m} value={m}>{m} minutes</option>)}
    </select>
  );
}

export function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`w-10 h-6 rounded-full relative transition-colors shrink-0 ${checked ? 'bg-teal-700' : 'bg-stone-300'}`}
    >
      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
    </button>
  );
}

export function Legend({ colors }) {
  return (
    <div className="flex flex-wrap justify-center gap-4 text-sm text-stone-600 mb-4">
      <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded-full border border-black/10" style={{ backgroundColor: colors.free }} />Free</span>
      <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded-full border border-black/10" style={{ backgroundColor: colors.weekly }} />Booked this week</span>
      <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded-full border border-black/10" style={{ backgroundColor: colors.fixed }} />Fixed</span>
    </div>
  );
}

export function PopupShell({ children, wide }) {
  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-[1px] flex items-center justify-center z-50 p-3">
      <div
        className={`rounded-xl shadow-xl w-full ${wide ? 'max-w-md' : 'max-w-xs'} p-5 relative`}
        style={{ backgroundColor: POPUP_BG }}
      >
        {children}
      </div>
    </div>
  );
}

export function BookingPopup({ slot, settings, onClose, onConfirm, submitting }) {
  const validLengths = LENGTH_OPTIONS.filter((m) => m >= settings.min_length && m <= settings.max_length);
  const [name, setName] = useState('');
  const [duration, setDuration] = useState(validLengths[0] || settings.min_length);
  const [bookingType, setBookingType] = useState('weekly');
  const [topic, setTopic] = useState('');

  const weekdayFull = WEEKDAY_FULL[slot.day % 7];
  const monthFull = slot.date.toLocaleDateString('en-US', { month: 'long' });

  return (
    <PopupShell wide>
      <button onClick={onClose} className="absolute top-3 right-3 text-stone-500 hover:text-stone-700">
        <X size={16} />
      </button>
      <p
        className="font-bold text-rose-700 mb-4 whitespace-nowrap overflow-hidden text-ellipsis pr-6"
        style={{ fontSize: 'clamp(13px, 4.6vw, 19px)' }}
        title={`Book ${weekdayFull} ${slot.time} on ${monthFull} ${ordinal(slot.date.getDate())}?`}
      >
        Book {weekdayFull} {slot.time} on {monthFull} {ordinal(slot.date.getDate())}?
      </p>

      <input
        value={name}
        onChange={(e) => setName(e.target.value.slice(0, 7))}
        placeholder="Your name (max 7 chars)"
        maxLength={7}
        className="w-full text-base border border-stone-300 rounded-lg px-3 py-2.5 mb-4 bg-white focus:outline-none focus:ring-2 focus:ring-teal-600/30 focus:border-teal-600"
      />

      <p className="text-sm font-semibold text-stone-600 mb-1.5">Lesson Duration</p>
      <div className="mb-4">
        <LengthSelect value={duration} onChange={setDuration} options={validLengths} />
      </div>

      <p className="text-sm font-semibold text-stone-600 mb-1.5">Booking Type</p>
      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => setBookingType('weekly')}
          style={{ backgroundColor: settings.colors.weekly, opacity: bookingType === 'weekly' ? 1 : 0.45 }}
          className="flex-1 text-sm font-medium py-2.5 rounded-lg text-stone-800 transition-opacity"
        >
          This week only
        </button>
        <button
          type="button"
          onClick={() => setBookingType('fixed')}
          style={{ backgroundColor: settings.colors.fixed, opacity: bookingType === 'fixed' ? 1 : 0.45 }}
          className="flex-1 text-sm font-medium py-2.5 rounded-lg text-stone-800 transition-opacity"
        >
          Fixed lesson
        </button>
      </div>

      {settings.include_topic && (
        <div className="mb-4">
          <p className="text-sm font-semibold text-stone-600 mb-1.5">Lesson Topic (optional)</p>
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="What would you like to focus on?"
            className="w-full text-base border border-stone-300 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-teal-600/30 focus:border-teal-600"
          />
        </div>
      )}

      <div className="bg-white/60 border border-black/5 rounded-lg p-3 mb-4 text-sm text-stone-700 space-y-1.5">
        <p><span className="font-semibold">Name:</span> {name || '—'}</p>
        <p><span className="font-semibold">Duration:</span> {duration}mins</p>
        <p><span className="font-semibold">Type:</span> {bookingType === 'weekly' ? 'This week only' : 'Fixed lesson'}</p>
        {settings.include_topic && <p><span className="font-semibold">Topic:</span> {topic}</p>}
      </div>

      <div className="flex items-center justify-end gap-4 mt-2">
        <button onClick={onClose} className="text-base text-stone-600 hover:text-stone-800">Cancel</button>
        <button
          disabled={!name.trim() || submitting}
          onClick={() => onConfirm({ name: name.trim(), duration, type: bookingType, topic })}
          className="bg-blue-600 disabled:bg-blue-300 text-white text-base font-medium px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors"
        >
          {submitting ? 'Booking…' : 'Book Lesson'}
        </button>
      </div>
    </PopupShell>
  );
}

export function DeletePopup({ booking, onClose, onConfirm, submitting }) {
  const dateLabel = new Date(booking.start_time).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeLabel = new Date(booking.start_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return (
    <PopupShell>
      <p className="text-xl font-bold text-stone-800 mb-4">Delete Booking</p>
      <div className="text-base text-stone-700 space-y-2 mb-5">
        <p><span className="font-semibold">Name:</span> {booking.student_name}</p>
        <p><span className="font-semibold">Time:</span> {dateLabel} {timeLabel}</p>
        <p><span className="font-semibold">Duration:</span> {booking.duration} minutes</p>
        <p><span className="font-semibold">Type:</span> {booking.booking_type}</p>
      </div>
      <div className="flex items-center justify-end gap-4">
        <button onClick={onClose} className="text-base text-stone-600 hover:text-stone-800">Cancel</button>
        <button
          disabled={submitting}
          onClick={onConfirm}
          className="flex items-center gap-1.5 bg-rose-600 disabled:bg-rose-300 text-white text-base font-medium px-5 py-2.5 rounded-lg hover:bg-rose-700 transition-colors"
        >
          <Trash2 size={14} /> {submitting ? 'Deleting…' : 'Delete'}
        </button>
      </div>
    </PopupShell>
  );
}

export function SuccessPopup({ message, onClose }) {
  const lines = message.split('\n').filter(Boolean);
  return (
    <PopupShell>
      <div className="text-center py-2">
        {lines.map((line, i) => (
          <p key={i} className={i === 0 ? 'text-2xl font-bold text-emerald-700 mb-3' : 'text-base text-stone-700 mb-1'}>
            {line}
          </p>
        ))}
        <button onClick={onClose} className="mt-4 bg-blue-600 text-white text-base font-medium px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-colors">
          Got it
        </button>
      </div>
    </PopupShell>
  );
}

export function CalendarSection({ settings, weekDates, setWeekOffset, bookings, onSlotClick, boundedHeight = true }) {
  return (
    <div className="p-2 sm:p-5 relative text-center">
      <h2 className="text-xl sm:text-lg font-semibold text-stone-800 mb-1">{settings.headline || 'Book a Lesson'}</h2>
      {settings.show_timezone_note && (
        <p className="text-sm text-stone-500 mb-3">The slots displayed are in your local time zone!</p>
      )}
      {(settings.instructions || []).filter((i) => i.enabled).length > 0 && (
        <div className="text-sm text-stone-600 mb-4 space-y-1.5 text-left">
          {settings.instructions.filter((i) => i.enabled).map((i) => <p key={i.id}>• {i.text}</p>)}
        </div>
      )}
      <Legend colors={settings.colors} />
      <CalendarGrid settings={settings} weekDates={weekDates} setWeekOffset={setWeekOffset} bookings={bookings} onSlotClick={onSlotClick} boundedHeight={boundedHeight} />
    </div>
  );
}

function WeekNav({ weekDates, setWeekOffset }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: GRID_COLUMNS }} className="items-center py-1.5 px-1.5 gap-1">
      <div style={{ gridColumn: 2 }} className="flex justify-start">
        <button onClick={() => setWeekOffset((o) => o - 1)} className="w-7 h-7 rounded-lg bg-sky-100 flex items-center justify-center hover:bg-sky-200 transition-colors">
          <ChevronLeft size={15} className="text-stone-700" />
        </button>
      </div>
      <div style={{ gridColumn: '3 / 8' }} className="flex justify-center">
        <p className="text-sm font-semibold text-stone-800 whitespace-nowrap">{weekRangeLabel(weekDates)}</p>
      </div>
      <div style={{ gridColumn: 8 }} className="flex justify-end">
        <button onClick={() => setWeekOffset((o) => o + 1)} className="w-7 h-7 rounded-lg bg-sky-100 flex items-center justify-center hover:bg-sky-200 transition-colors">
          <ChevronRight size={15} className="text-stone-700" />
        </button>
      </div>
    </div>
  );
}

// bookings: array of real rows (start_time/end_time/duration/booking_type/student_name/topic)
export function CalendarGrid({ settings, weekDates, setWeekOffset, bookings, onSlotClick, boundedHeight = true }) {
  const { times, cellsByDay } = useMemo(
    () => buildViewerGrid({
      weekDates,
      timezone: settings.timezone || 'UTC',
      availFrom: settings.avail_from,
      availTo: settings.avail_to,
      bookings,
    }),
    [weekDates, settings.timezone, settings.avail_from, settings.avail_to, bookings]
  );

  return (
    <div
      className={`border border-stone-200 rounded-lg overflow-hidden bg-white flex flex-col ${boundedHeight ? '' : 'h-full min-h-0'}`}
      style={boundedHeight ? { maxHeight: '20rem' } : undefined}
    >
      {/* Pinned block: never scrolls, always visible */}
      <div className="flex-shrink-0">
        <WeekNav weekDates={weekDates} setWeekOffset={setWeekOffset} />
        <div style={{ display: 'grid', gridTemplateColumns: GRID_COLUMNS }} className="gap-1 px-1.5 pb-1.5">
          <div />
          {weekDates.map((d, i) => {
            const today = isToday(d);
            return (
              <div key={i} className={`rounded-md py-1 text-center ${today ? 'bg-rose-100' : 'bg-sky-100'}`}>
                <p className="text-[13px] font-semibold text-stone-700">{DAY_LABELS[i]}</p>
                <p className={`text-[13px] font-bold ${today ? 'text-rose-600' : 'text-stone-500'}`}>{d.getDate()}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Scrollable block: only the time slots live here */}
      <div className="flex-1 min-h-0 overflow-y-auto border-t border-stone-100 px-1.5 pb-1.5" style={{ touchAction: 'pan-y' }}>
        <div style={{ display: 'grid', gridTemplateColumns: GRID_COLUMNS, gridAutoRows: '30px' }} className="gap-1 pt-1.5">
          {times.map((time, rowIdx) => (
            <div
              key={time}
              style={{ gridColumn: 1, gridRow: rowIdx + 1, fontSize: 'clamp(9px, 2.6vw, 12px)' }}
              className="text-stone-400 text-right pr-1.5 flex items-center justify-end"
            >
              {time}
            </div>
          ))}

          {cellsByDay.map((cells, dayIdx) =>
            cells.map((cell) => {
              if (cell.type === 'free') {
                return (
                  <button
                    key={`${dayIdx}-${cell.rowStart}`}
                    onClick={() => onSlotClick(dayIdx, cell.time, null, cell.utcInstant)}
                    style={{ backgroundColor: settings.colors.free, gridColumn: dayIdx + 2, gridRow: cell.rowStart + 1, fontSize: 'clamp(8px, 2.2vw, 10px)' }}
                    className="rounded flex items-center justify-center text-stone-700 hover:brightness-95 transition-all"
                  >
                    Add
                  </button>
                );
              }
              return (
                <button
                  key={`${dayIdx}-${cell.rowStart}`}
                  onClick={() => onSlotClick(dayIdx, null, cell.booking, null)}
                  style={{
                    backgroundColor: settings.colors[cell.booking.booking_type],
                    gridColumn: dayIdx + 2,
                    gridRow: `${cell.rowStart + 1} / span ${cell.span}`,
                    fontSize: 'clamp(9px, 2.8vw, 13px)',
                  }}
                  className="rounded font-medium flex items-center justify-center text-stone-800 hover:brightness-95 transition-all leading-tight overflow-hidden whitespace-nowrap"
                >
                  <span className="px-[3px] overflow-hidden text-ellipsis">{cell.booking.student_name}</span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
