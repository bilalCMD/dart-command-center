'use client';
import { useState, useEffect } from 'react';

const TYPE_CONFIG: Record<string, { label: string; color: string; dot: string; pill: string }> = {
  HOLIDAY:  { label: 'Holiday',  color: 'text-red-600',    dot: 'bg-red-500',    pill: 'bg-red-50 text-red-600 border-red-200' },
  HALF_DAY: { label: 'Half Day', color: 'text-amber-600',  dot: 'bg-amber-500',  pill: 'bg-amber-50 text-amber-600 border-amber-200' },
  OPTIONAL: { label: 'Optional', color: 'text-blue-600',   dot: 'bg-blue-500',   pill: 'bg-blue-50 text-blue-600 border-blue-200' },
  EVENT:    { label: 'Event',    color: 'text-purple-600', dot: 'bg-purple-500', pill: 'bg-purple-50 text-purple-600 border-purple-200' },
  LEAVE:    { label: 'On Leave', color: 'text-teal-600',   dot: 'bg-teal-500',   pill: 'bg-teal-50 text-teal-600 border-teal-200' },
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
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', type: 'HOLIDAY', description: '', isRecurring: false });
  const [submitting, setSubmitting] = useState(false);
  const [formDate, setFormDate] = useState('');

  useEffect(() => { fetchEvents(); }, [year, month]);

  async function fetchEvents() {
    setLoading(true);
    const res = await fetch(`/api/calendar?year=${year}&month=${month + 1}`);
    const data = await res.json();
    setEvents(data.events || []);
    setLoading(false);
  }

  async function handleAdd() {
    if (!formDate || !form.title) return;
    setSubmitting(true);
    await fetch('/api/calendar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, date: new Date(formDate).toISOString() }),
    });
    setSubmitting(false);
    setShowForm(false);
    setForm({ title: '', type: 'HOLIDAY', description: '', isRecurring: false });
    setFormDate('');
    fetchEvents();
  }

  async function handleDelete(id: string) {
    if (id.startsWith('leave-')) return;
    setDeleting(id);
    await fetch('/api/calendar', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setDeleting(null);
    fetchEvents();
  }

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
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

  const selectedDayEvents = selectedDay ? getEventsForDay(selectedDay) : [];
  const companyEvents = events.filter(e => e.type !== 'LEAVE');

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[26px] font-black text-[var(--text)] tracking-tight">Company Calendar</h1>
          <p className="text-[13px] text-[var(--muted)] mt-0.5">Holidays, events aur off days manage karo</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-white border border-[var(--border)] rounded-xl p-1">
            <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--surface2)] text-[var(--muted)] hover:text-[var(--text)] transition-all">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <span className="text-[13px] font-bold text-[var(--text)] px-3">{MONTHS[month]} {year}</span>
            <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--surface2)] text-[var(--muted)] hover:text-[var(--text)] transition-all">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          </div>
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl dart-gradient text-white text-[13px] font-bold shadow-md hover:opacity-90 transition-all">
            {showForm ? (
              <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>Cancel</>
            ) : (
              <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>Add Event</>
            )}
          </button>
        </div>
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-[var(--border)] shadow-soft p-5 mb-5">
          <p className="text-[13px] font-bold text-[var(--text)] mb-4">New Event</p>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider mb-1.5 block">Date</label>
              <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)}
                className="w-full bg-[var(--surface2)] border border-[var(--border)] rounded-xl px-3 py-2 text-[13px] text-[var(--text)] focus:outline-none focus:border-[var(--orange)]" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider mb-1.5 block">Type</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className="w-full bg-[var(--surface2)] border border-[var(--border)] rounded-xl px-3 py-2 text-[13px] text-[var(--text)] focus:outline-none focus:border-[var(--orange)]">
                {Object.entries(TYPE_CONFIG).filter(([k]) => k !== 'LEAVE').map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider mb-1.5 block">Title</label>
              <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Eid ul Fitr..."
                className="w-full bg-[var(--surface2)] border border-[var(--border)] rounded-xl px-3 py-2 text-[13px] text-[var(--text)] focus:outline-none focus:border-[var(--orange)]" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider mb-1.5 block">Description (optional)</label>
              <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Extra details..."
                className="w-full bg-[var(--surface2)] border border-[var(--border)] rounded-xl px-3 py-2 text-[13px] text-[var(--text)] focus:outline-none focus:border-[var(--orange)]" />
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isRecurring} onChange={e => setForm(f => ({ ...f, isRecurring: e.target.checked }))}
                  className="w-4 h-4 accent-[var(--orange)]" />
                <span className="text-[12px] text-[var(--muted)] font-semibold">Repeat every year</span>
              </label>
            </div>
          </div>
          <button onClick={handleAdd} disabled={submitting || !formDate || !form.title}
            className="px-6 py-2.5 rounded-xl dart-gradient text-white text-[13px] font-bold shadow-md disabled:opacity-50 hover:opacity-90 transition-all">
            {submitting ? 'Adding...' : 'Add Event'}
          </button>
        </div>
      )}

      <div className="grid grid-cols-12 gap-5">
        {/* Calendar Grid */}
        <div className="col-span-8 bg-white rounded-2xl border border-[var(--border)] shadow-soft overflow-hidden">
          <div className="grid grid-cols-7 border-b border-[var(--border)]">
            {DAYS.map(d => (
              <div key={d} className="py-3 text-center text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((day, i) => {
              if (!day) return <div key={`e-${i}`} className="h-[88px] border-b border-r border-[var(--border)] bg-[var(--surface2)]/30" />;
              const dayEvents = getEventsForDay(day);
              const isHoliday = dayEvents.some(e => e.type === 'HOLIDAY');
              const isSelected = selectedDay === day;
              const isTdy = isToday(day);
              return (
                <div key={day} onClick={() => setSelectedDay(day === selectedDay ? null : day)}
                  className={`h-[88px] border-b border-r border-[var(--border)] p-2 cursor-pointer transition-all
                    ${isHoliday ? 'bg-red-50/60' : ''}
                    ${isSelected ? 'bg-[var(--surface2)] ring-2 ring-inset ring-[var(--orange)]' : 'hover:bg-[var(--surface2)]/60'}
                  `}>
                  <div className={`text-[12px] font-bold w-7 h-7 flex items-center justify-center rounded-full mb-1
                    ${isTdy ? 'dart-gradient text-white shadow-sm' : 'text-[var(--text)]'}
                  `}>{day}</div>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 3).map((e, idx) => {
                      const cfg = TYPE_CONFIG[e.type] || TYPE_CONFIG.EVENT;
                      return (
                        <div key={idx} className="flex items-center gap-1">
                          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
                          <span className={`text-[9px] font-semibold truncate ${cfg.color}`}>
                            {e.type === 'LEAVE' ? e.userName?.split(' ')[0] : e.title}
                          </span>
                        </div>
                      );
                    })}
                    {dayEvents.length > 3 && (
                      <span className="text-[9px] text-[var(--muted)] font-semibold">+{dayEvents.length - 3} more</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Panel */}
        <div className="col-span-4 space-y-4">
          {/* Selected day */}
          {selectedDay && (
            <div className="bg-white rounded-2xl border border-[var(--border)] shadow-soft overflow-hidden">
              <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--surface2)] flex items-center justify-between">
                <p className="text-[11px] font-bold text-[var(--text)] uppercase tracking-[0.1em]">{MONTHS[month]} {selectedDay}</p>
                <span className="text-[10px] text-[var(--muted)] font-semibold">{selectedDayEvents.length} events</span>
              </div>
              {selectedDayEvents.length === 0 ? (
                <div className="px-4 py-5 text-center text-[12px] text-[var(--muted)]">No events — click Add Event to create one</div>
              ) : (
                <div className="divide-y divide-[var(--border)]">
                  {selectedDayEvents.map((e: any, i) => {
                    const cfg = TYPE_CONFIG[e.type] || TYPE_CONFIG.EVENT;
                    const isLeave = e.type === 'LEAVE';
                    return (
                      <div key={i} className="px-4 py-3 flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-semibold text-[var(--text)] truncate">{e.title}</p>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${cfg.pill}`}>{cfg.label}</span>
                        </div>
                        {!isLeave && (
                          <button onClick={() => handleDelete(e.id)} disabled={deleting === e.id}
                            className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-red-50 text-[var(--subtle)] hover:text-red-500 transition-all shrink-0">
                            {deleting === e.id ? '...' : (
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                            )}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Events List */}
          <div className="bg-white rounded-2xl border border-[var(--border)] shadow-soft overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--surface2)] flex items-center justify-between">
              <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-[0.12em]">{MONTHS[month]} Events</p>
              <span className="text-[10px] font-bold text-[var(--muted)] bg-[var(--border)] px-2 py-0.5 rounded-full">{companyEvents.length}</span>
            </div>
            {loading ? (
              <div className="px-4 py-6 text-center text-[12px] text-[var(--muted)]">Loading...</div>
            ) : companyEvents.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-[13px] font-semibold text-[var(--text)] mb-1">No events yet</p>
                <p className="text-[11px] text-[var(--muted)]">Click a day or use Add Event</p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border)] max-h-[400px] overflow-y-auto">
                {companyEvents.map((e: any) => {
                  const cfg = TYPE_CONFIG[e.type] || TYPE_CONFIG.EVENT;
                  const d = new Date(e.date);
                  return (
                    <div key={e.id} className="px-4 py-3 flex items-center gap-3 hover:bg-[var(--surface2)] transition-colors">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold text-[var(--text)] truncate">{e.title}</p>
                        <p className="text-[10px] text-[var(--muted)]">
                          {d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                          {e.isRecurring ? ' · Recurring' : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${cfg.pill}`}>{cfg.label}</span>
                        <button onClick={() => handleDelete(e.id)} disabled={deleting === e.id}
                          className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-red-50 text-[var(--subtle)] hover:text-red-500 transition-all">
                          {deleting === e.id ? '...' : (
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="bg-white rounded-2xl border border-[var(--border)] shadow-soft p-4">
            <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-[0.12em] mb-3">Legend</p>
            <div className="space-y-2">
              {Object.entries(TYPE_CONFIG).map(([k, v]) => (
                <div key={k} className="flex items-center gap-2.5">
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${v.dot}`} />
                  <span className="text-[12px] font-semibold text-[var(--text)]">{v.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}