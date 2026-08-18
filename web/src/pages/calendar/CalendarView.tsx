import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../../lib/axios';
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  BookOpen,
  ClipboardList,
  Megaphone,
} from 'lucide-react';

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------
type EventType = 'assignment' | 'attendance' | 'announcement';

interface CalendarEvent {
  id: string;
  type: EventType;
  title: string;
  date: string; // ISO
  meta: {
    status?: string;
    maxScore?: number;
    courseId?: string;
    subjectName?: string;
  };
}

// ------------------------------------------------------------------
// Config
// ------------------------------------------------------------------
const EVENT_CONFIG: Record<EventType, { label: string; color: string; dotColor: string; Icon: React.ElementType }> = {
  assignment: {
    label: 'Assignment',
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    dotColor: 'bg-orange-400',
    Icon: ClipboardList,
  },
  attendance: {
    label: 'Attendance',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    dotColor: 'bg-blue-400',
    Icon: BookOpen,
  },
  announcement: {
    label: 'Announcement',
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    dotColor: 'bg-purple-400',
    Icon: Megaphone,
  },
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------
function buildCalendarGrid(year: number, month: number): (Date | null)[] {
  // month is 0-indexed for Date
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const grid: (Date | null)[] = [];

  for (let i = 0; i < firstDay; i++) grid.push(null);
  for (let d = 1; d <= daysInMonth; d++) grid.push(new Date(year, month, d));
  // pad to complete last week
  while (grid.length % 7 !== 0) grid.push(null);

  return grid;
}

function isoDateKey(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function isToday(date: Date): boolean {
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

// ------------------------------------------------------------------
// Component
// ------------------------------------------------------------------
export const CalendarView = () => {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-indexed
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(isoDateKey(now));
  const [filterType, setFilterType] = useState<EventType | ''>('');

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/calendar', {
        params: { year, month: month + 1 }, // API uses 1-indexed month
      });
      setEvents(res.data.events || []);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const grid = buildCalendarGrid(year, month);

  // Group events by date key for fast lookup
  const eventsByDate = React.useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const ev of events) {
      const key = isoDateKey(ev.date);
      if (!map[key]) map[key] = [];
      map[key].push(ev);
    }
    return map;
  }, [events]);

  const navigate = (dir: -1 | 1) => {
    const d = new Date(year, month + dir, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
    setSelectedDate(null);
  };

  // Events shown in the detail panel
  const selectedEvents = React.useMemo(() => {
    if (!selectedDate) return [];
    const all = eventsByDate[selectedDate] || [];
    if (!filterType) return all;
    return all.filter((e) => e.type === filterType);
  }, [selectedDate, eventsByDate, filterType]);

  // Overall event counts for legend
  const counts = React.useMemo(() => {
    const c = { assignment: 0, attendance: 0, announcement: 0 };
    for (const ev of events) c[ev.type] = (c[ev.type] || 0) + 1;
    return c;
  }, [events]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
            <CalendarDays size={24} className="text-primary-600 flex-shrink-0" />
            <span className="truncate">Academic Calendar</span>
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-1 font-medium">
            Assignments, attendance sessions, and announcements
          </p>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-base sm:text-lg font-extrabold text-gray-900 min-w-[120px] sm:min-w-[180px] text-center">
            {MONTHS[month]} {year}
          </span>
          <button
            onClick={() => navigate(1)}
            className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
            aria-label="Next month"
          >
            <ChevronRight size={18} />
          </button>
          <button
            onClick={() => { setYear(now.getFullYear()); setMonth(now.getMonth()); setSelectedDate(isoDateKey(now)); }}
            className="px-4 py-2 text-sm font-bold text-primary-700 bg-primary-50 border border-primary-200 rounded-xl hover:bg-primary-100 transition-colors"
          >
            Today
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Grid */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-gray-100">
            {DAYS.map((d) => (
              <div key={d} className="py-2 md:py-3 text-center text-[9px] md:text-[11px] font-extrabold text-gray-500 uppercase tracking-wider">
                {d}
              </div>
            ))}
          </div>

          {/* Grid cells */}
          {loading ? (
            <div className="p-8 text-center text-gray-400 font-medium text-sm">Loading calendar...</div>
          ) : (
            <div className="grid grid-cols-7">
              {grid.map((day, idx) => {
                if (!day) {
                  return <div key={`empty-${idx}`} className="min-h-[64px] md:min-h-[90px] border-b border-r border-gray-50 bg-gray-50/30" />;
                }
                const key = isoDateKey(day);
                const dayEvents = eventsByDate[key] || [];
                const isSelected = selectedDate === key;
                const today = isToday(day);

                return (
                  <button
                    key={key}
                    onClick={() => setSelectedDate(isSelected ? null : key)}
                    className={`min-h-[64px] md:min-h-[90px] border-b border-r border-gray-100 p-1 md:p-2 text-left transition-all hover:bg-blue-50/40 flex flex-col gap-0.5 md:gap-1 ${
                      isSelected ? 'bg-primary-50 ring-2 ring-inset ring-primary-400' : ''
                    }`}
                  >
                    {/* Day number */}
                    <span
                      className={`inline-flex items-center justify-center w-6 h-6 md:w-7 md:h-7 rounded-full text-xs md:text-sm font-extrabold transition-colors ${
                        today
                          ? 'bg-primary-600 text-white shadow-md'
                          : isSelected
                          ? 'text-primary-700'
                          : 'text-gray-700'
                      }`}
                    >
                      {day.getDate()}
                    </span>

                    {/* Event pills — show up to 3 */}
                    <div className="flex flex-col gap-0.5 w-full overflow-hidden">
                      {dayEvents.slice(0, 3).map((ev) => {
                        const cfg = EVENT_CONFIG[ev.type];
                        return (
                          <div
                            key={ev.id}
                            className={`flex items-center gap-1 px-1 py-0.5 rounded text-[8px] md:text-[9px] font-bold border truncate ${cfg.color}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dotColor}`} />
                            <span className="truncate">{ev.title}</span>
                          </div>
                        );
                      })}
                      {dayEvents.length > 3 && (
                        <div className="text-[8px] md:text-[9px] font-bold text-gray-400 pl-1">
                          +{dayEvents.length - 3}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right panel: Legend + Selected day events */}
        <div className="flex flex-col gap-4">
          {/* Legend / Summary */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <h3 className="text-sm font-extrabold text-gray-900 mb-4 uppercase tracking-wider">
              This Month
            </h3>
            <div className="space-y-2">
              {(Object.keys(EVENT_CONFIG) as EventType[]).map((type) => {
                const cfg = EVENT_CONFIG[type];
                const count = counts[type] || 0;
                const active = filterType === type;
                return (
                  <button
                    key={type}
                    onClick={() => setFilterType(active ? '' : type)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all ${
                      active
                        ? cfg.color + ' ring-2 ring-offset-1 ring-current'
                        : 'border-gray-100 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${cfg.dotColor}`} />
                      <cfg.Icon size={13} className="text-current opacity-70" />
                      <span className="text-xs font-bold">{cfg.label}</span>
                    </div>
                    <span className={`text-xs font-extrabold px-2 py-0.5 rounded-full ${count > 0 ? 'bg-current/10' : 'text-gray-400'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
            {filterType && (
              <button
                onClick={() => setFilterType('')}
                className="mt-3 w-full text-xs font-bold text-gray-500 hover:text-gray-700 underline underline-offset-2"
              >
                Clear filter
              </button>
            )}
          </div>

          {/* Selected day detail */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex-1">
            <h3 className="text-sm font-extrabold text-gray-900 mb-1 uppercase tracking-wider">
              {selectedDate
                ? new Date(selectedDate + 'T00:00:00').toLocaleDateString(undefined, {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })
                : 'Select a date'}
            </h3>
            {selectedDate && selectedEvents.length === 0 && (
              <p className="text-xs text-gray-400 font-medium mt-3">No events on this day.</p>
            )}
            <div className="space-y-2 mt-3">
              {selectedEvents.map((ev) => {
                const cfg = EVENT_CONFIG[ev.type];
                return (
                  <div
                    key={ev.id}
                    className={`p-3 rounded-xl border ${cfg.color} flex items-start gap-2`}
                  >
                    <cfg.Icon size={14} className="mt-0.5 flex-shrink-0 opacity-80" />
                    <div className="min-w-0">
                      <div className="text-xs font-extrabold truncate">{ev.title}</div>
                      {ev.meta.subjectName && (
                        <div className="text-[10px] font-medium opacity-70 mt-0.5">{ev.meta.subjectName}</div>
                      )}
                      {ev.type === 'assignment' && ev.meta.maxScore !== undefined && (
                        <div className="text-[10px] font-bold opacity-60 mt-0.5">Max: {ev.meta.maxScore} pts</div>
                      )}
                      <div className="text-[10px] font-bold uppercase tracking-wider opacity-60 mt-0.5">
                        {cfg.label}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
