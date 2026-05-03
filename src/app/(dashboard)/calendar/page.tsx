'use client';
import { useState, useEffect } from 'react';

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  HOLIDAY: { label: 'Holiday', color: 'text-red-500', bg: 'bg-red-500/10 border-red-500/20', icon: '🏖️' },
  HALF_DAY: { label: 'Half Day', color: 'text-amber-500', bg: 'bg-amber-500/10 border-amber-500/20', icon: '🌤️' },
  OPTIONAL: { label: 'Optional', color: 'text-blue-500', bg: 'bg-blue-500/10 border-blue-500/20', icon: '📌' },
  EVENT: { label: 'Event', color: 'text-purple-500', bg: 'bg-purple-500/10 border-purple-500/20', icon: '🎉' },
};

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

export default function CalendarPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchEvents(); }, [year, month]);

  async function fetchEvents() {
    setLoading(true);
    const res = await fetch(`/api/calendar?year=${year}&month=${month + 1}`);
    const data = await res.json();
    setEvents(data.events || []);
    setLoading(false);
  }

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  function getEventsForDay(day: number) {
    return events.filter(e => {
      const d = new Date(e.date);
      return d.getDate() === day && d.getMonth() === month && d.getFullYear() === year;
    });
  }

  function isToday(day: number) {
    return day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  }

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }

  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  const upcomingEvents = events
    .filter(e => new Date(e.date) >= today)
    .slice(0, 5);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-[var(--text)]">Company Calendar</h1>
        <p className="text-sm text-[var(--muted)] mt-0.5">Holidays aur company events dekho</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Calendar */}
        <div className="lg:col-span-2 bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
            <button onClick={prevMonth} className="p-1.5 hover:bg-[var(--surface2)] rounded-lg text-[var(--muted)] hover:text-[var(--text)] transition-all">←</button>
            <h2 className="text-sm font-bold text-[var(--text)]">{MONTHS[month]} {year}</h2>
            <button onClick={nextMonth} className="p-1.5 hover:bg-[var(--surface2)] rounded-lg text-[var(--muted)] hover:text-[var(--text)] transition-all">→</button>
          </div>

          <div className="grid grid-cols-7 border-b border-[var(--border)]">
            {DAYS.map(d => (
              <div key={d} className="py-2 text-center text-[10px] font-bold text-[var(--muted)] uppercase">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {cells.map((day, i) => {
              if (!day) return <div key={`empty-${i}`} className="h-16 border-b border-r border-[var(--border)] opacity-20" />;
              const dayEvents = getEventsForDay(day);
              const isHoliday = dayEvents.some(e => e.type === 'HOLIDAY');
              return (
                <div
                  key={day}
                  className={`h-16 border-b border-r border-[var(--border)] p-1 ${isHoliday ? 'bg-red-500/5' : ''}`}
                >
                  <div className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                    isToday(day) ? 'dart-gradient text-white' : 'text-[var(--text)]'
                  }`}>{day}</div>
                  <div className="mt-0.5 space-y-0.5">
                    {dayEvents.slice(0, 2).map((e, idx) => {
                      const cfg = TYPE_CONFIG[e.type];
                      return (
                        <div key={idx} className={`text-[9px] font-medium px-1 rounded truncate ${cfg.color} bg-[var(--surface2)]`}>
                          {cfg.icon} {e.title}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="space-y-4">
          {/* Legend */}
          <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4">
            <h3 className="text-xs font-bold text-[var(--muted)] uppercase tracking-widest mb-3">Legend</h3>
            <div className="space-y-2">
              {Object.entries(TYPE_CONFIG).map(([k, v]) => (
                <div key={k} className="flex items-center gap-2">
                  <span>{v.icon}</span>
                  <span className={`text-xs font-medium ${v.color}`}>{v.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming */}
          <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--border)]">
              <h3 className="text-xs font-bold text-[var(--muted)] uppercase tracking-widest">Upcoming</h3>
            </div>
            {loading ? (
              <div className="p-4 text-center text-sm text-[var(--muted)]">Loading...</div>
            ) : upcomingEvents.length === 0 ? (
              <div className="p-6 text-center">
                <div className="text-3xl mb-2">🎉</div>
                <p className="text-sm text-[var(--muted)]">Koi upcoming event nahi</p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {upcomingEvents.map((e: any) => {
                  const cfg = TYPE_CONFIG[e.type];
                  const d = new Date(e.date);
                  const daysLeft = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                  return (
                    <div key={e.id} className="px-4 py-3">
                      <div className="flex items-start gap-2">
                        <span className="text-lg">{cfg.icon}</span>
                        <div className="flex-1">
                          <p className="text-[13px] font-semibold text-[var(--text)]">{e.title}</p>
                          <p className="text-[11px] text-[var(--muted)]">
                            {d.toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}
                          </p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          daysLeft === 0 ? 'bg-green-500/10 text-green-500' :
                          daysLeft <= 7 ? 'bg-amber-500/10 text-amber-500' :
                          'bg-[var(--surface2)] text-[var(--muted)]'
                        }`}>
                          {daysLeft === 0 ? 'Today' : `${daysLeft}d`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}