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

export default function AdminCalendarPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', type: 'HOLIDAY', description: '', isRecurring: false });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchEvents(); }, [year, month]);

  async function fetchEvents() {
    setLoading(true);
    const res = await fetch(`/api/calendar?year=${year}&month=${month + 1}`);
    const data = await res.json();
    setEvents(data.events || []);
    setLoading(false);
  }

  async function handleAdd() {
    if (!selectedDay || !form.title) return;
    setSubmitting(true);
    await fetch('/api/calendar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, date: selectedDay.toISOString() }),
    });
    setSubmitting(false);
    setShowForm(false);
    setForm({ title: '', type: 'HOLIDAY', description: '', isRecurring: false });
    fetchEvents();
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    await fetch('/api/calendar', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setDeleting(null);
    fetchEvents();
  }

  // Calendar grid
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

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--text)]">Company Calendar</h1>
          <p className="text-sm text-[var(--muted)] mt-0.5">Holidays, events aur off days manage karo</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-lg dart-gradient text-white text-sm font-semibold"
        >
          {showForm ? '✕ Cancel' : '+ Add Event'}
        </button>
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-5 space-y-4">
          <h2 className="text-sm font-bold text-[var(--text)]">New Event</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[var(--muted)] mb-1 block">Date</label>
              <input
                type="date"
                value={selectedDay ? selectedDay.toISOString().split('T')[0] : ''}
                onChange={e => setSelectedDay(new Date(e.target.value))}
                className="w-full bg-[var(--surface2)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--orange)]"
              />
            </div>
            <div>
              <label className="text-xs text-[var(--muted)] mb-1 block">Type</label>
              <select
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className="w-full bg-[var(--surface2)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--orange)]"
              >
                {Object.entries(TYPE_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>{v.icon} {v.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-[var(--muted)] mb-1 block">Title</label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Eid ul Fitr, Company Retreat..."
              className="w-full bg-[var(--surface2)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--orange)]"
            />
          </div>
          <div>
            <label className="text-xs text-[var(--muted)] mb-1 block">Description (optional)</label>
            <input
              type="text"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Extra details..."
              className="w-full bg-[var(--surface2)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--orange)]"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="recurring"
              checked={form.isRecurring}
              onChange={e => setForm(f => ({ ...f, isRecurring: e.target.checked }))}
              className="w-4 h-4 accent-[var(--orange)]"
            />
            <label htmlFor="recurring" className="text-xs text-[var(--muted)]">Har saal repeat ho (recurring)</label>
          </div>
          <button
            onClick={handleAdd}
            disabled={submitting || !selectedDay || !form.title}
            className="w-full py-2.5 rounded-lg dart-gradient text-white text-sm font-semibold disabled:opacity-50"
          >
            {submitting ? 'Adding...' : 'Add Event'}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Calendar */}
        <div className="lg:col-span-2 bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden">
          {/* Month Nav */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
            <button onClick={prevMonth} className="p-1.5 hover:bg-[var(--surface2)] rounded-lg text-[var(--muted)] hover:text-[var(--text)] transition-all">←</button>
            <h2 className="text-sm font-bold text-[var(--text)]">{MONTHS[month]} {year}</h2>
            <button onClick={nextMonth} className="p-1.5 hover:bg-[var(--surface2)] rounded-lg text-[var(--muted)] hover:text-[var(--text)] transition-all">→</button>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 border-b border-[var(--border)]">
            {DAYS.map(d => (
              <div key={d} className="py-2 text-center text-[10px] font-bold text-[var(--muted)] uppercase">{d}</div>
            ))}
          </div>

          {/* Cells */}
          <div className="grid grid-cols-7">
            {cells.map((day, i) => {
              if (!day) return <div key={`empty-${i}`} className="h-16 border-b border-r border-[var(--border)] opacity-20" />;
              const dayEvents = getEventsForDay(day);
              const isHoliday = dayEvents.some(e => e.type === 'HOLIDAY');
              return (
                <div
                  key={day}
                  onClick={() => {
                    const d = new Date(year, month, day);
                    setSelectedDay(d);
                    setShowForm(true);
                    setForm(f => ({ ...f }));
                  }}
                  className={`h-16 border-b border-r border-[var(--border)] p-1 cursor-pointer transition-all hover:bg-[var(--surface2)] ${isHoliday ? 'bg-red-500/5' : ''}`}
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

        {/* Events List */}
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border)]">
            <h3 className="text-xs font-bold text-[var(--muted)] uppercase tracking-widest">
              {MONTHS[month]} Events ({events.length})
            </h3>
          </div>
          {loading ? (
            <div className="p-6 text-center text-sm text-[var(--muted)]">Loading...</div>
          ) : events.length === 0 ? (
            <div className="p-6 text-center">
              <div className="text-3xl mb-2">📅</div>
              <p className="text-sm text-[var(--muted)]">Koi event nahi</p>
              <p className="text-xs text-[var(--subtle)] mt-1">Calendar mein din click karo</p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {events.map((e: any) => {
                const cfg = TYPE_CONFIG[e.type];
                const d = new Date(e.date);
                return (
                  <div key={e.id} className="px-4 py-3 flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <span className="text-lg mt-0.5">{cfg.icon}</span>
                      <div>
                        <p className="text-[13px] font-semibold text-[var(--text)]">{e.title}</p>
                        <p className="text-[11px] text-[var(--muted)]">
                          {d.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                        {e.description && <p className="text-[11px] text-[var(--subtle)] mt-0.5">{e.description}</p>}
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${cfg.bg} ${cfg.color} mt-1 inline-block`}>
                          {cfg.label} {e.isRecurring ? '· Recurring' : ''}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(e.id)}
                      disabled={deleting === e.id}
                      className="text-[var(--subtle)] hover:text-red-500 transition-colors text-xs shrink-0"
                    >
                      {deleting === e.id ? '...' : '✕'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}