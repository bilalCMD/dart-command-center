'use client';
import { useState, useEffect } from 'react';

const DAYS = ['MON','TUE','WED','THU','FRI','SAT','SUN'];
const DAY_LABELS: Record<string,string> = { MON:'Mon',TUE:'Tue',WED:'Wed',THU:'Thu',FRI:'Fri',SAT:'Sat',SUN:'Sun' };

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-all duration-300 ${checked ? 'dart-gradient' : 'bg-[var(--border)]'}`}>
      <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all duration-300 ${checked ? 'left-6' : 'left-1'}`} />
    </button>
  );
}

function Card({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-[var(--border)] flex items-center gap-2.5 bg-[var(--surface2)]">
        <span className="text-lg">{icon}</span>
        <h2 className="text-[13px] font-bold text-[var(--text)]">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider block">{label}</label>
      {children}
      {hint && <p className="text-[10px] text-[var(--subtle)]">{hint}</p>}
    </div>
  );
}

function Input({ value, onChange, type = 'text', placeholder, min, max, step }: any) {
  return (
    <input type={type} value={value} onChange={onChange} placeholder={placeholder}
      min={min} max={max} step={step}
      className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--orange)] focus:ring-2 focus:ring-[var(--orange)]/10 transition-all" />
  );
}

export default function AdminSettingsPage() {
  const [tab, setTab] = useState<'company'|'employees'>('company');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [empSettings, setEmpSettings] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');

  const [company, setCompany] = useState({
    workStartTime: '09:00',
    workEndTime: '18:00',
    workingDays: ['MON','TUE','WED','THU','FRI'],
    defaultDailyHours: 8,
    defaultWeeklyHours: 40,
    lateThresholdMins: 15,
    earlyDepartureThresholdMins: 15,
    gracePeriodMins: 5,
    defaultBreakMins: 60,
    maxBreakMins: 90,
    autoClockOutEnabled: false,
    autoClockOutTime: '23:00',
    requireNoteOnLate: false,
    requireEOD: true,
    overtimeEnabled: false,
    overtimeAfterHours: 8,
  });

  const [empForm, setEmpForm] = useState({
    dailyHours: '', weeklyHours: '', workStartTime: '',
    workEndTime: '', isRemote: false, customNote: '',
  });

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    const res = await fetch('/api/admin-settings');
    const data = await res.json();
    if (data.settings) setCompany(prev => ({ ...prev, ...data.settings }));
    setUsers(data.users || []);
    setEmpSettings(data.employeeSettings || []);
    setLoading(false);
  }

  useEffect(() => {
    if (selectedUser) {
      const existing = empSettings.find(e => e.userId === selectedUser);
      if (existing) {
        setEmpForm({
          dailyHours: existing.dailyHours || '',
          weeklyHours: existing.weeklyHours || '',
          workStartTime: existing.workStartTime || '',
          workEndTime: existing.workEndTime || '',
          isRemote: existing.isRemote || false,
          customNote: existing.customNote || '',
        });
      } else {
        setEmpForm({ dailyHours: '', weeklyHours: '', workStartTime: '', workEndTime: '', isRemote: false, customNote: '' });
      }
    }
  }, [selectedUser]);

  async function saveCompany() {
    setSaving(true);
    await fetch('/api/admin-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'COMPANY', data: company }),
    });
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  async function saveEmployee() {
    if (!selectedUser) return;
    setSaving(true);
    await fetch('/api/admin-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'EMPLOYEE',
        data: {
          userId: selectedUser,
          dailyHours: empForm.dailyHours ? parseInt(empForm.dailyHours) : null,
          weeklyHours: empForm.weeklyHours ? parseInt(empForm.weeklyHours) : null,
          workStartTime: empForm.workStartTime || null,
          workEndTime: empForm.workEndTime || null,
          isRemote: empForm.isRemote,
          customNote: empForm.customNote || null,
        },
      }),
    });
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    fetchData();
  }

  function toggleDay(day: string) {
    setCompany(prev => ({
      ...prev,
      workingDays: prev.workingDays.includes(day)
        ? prev.workingDays.filter(d => d !== day)
        : [...prev.workingDays, day],
    }));
  }

  function set(key: string, val: any) {
    setCompany(prev => ({ ...prev, [key]: val }));
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-[var(--orange)] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const selectedUserName = users.find(u => u.id === selectedUser)?.name || '';

  return (
    <div className="space-y-6 max-w-3xl pb-10">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--text)]">Settings</h1>
          <p className="text-xs text-[var(--muted)] mt-0.5">Company-wide aur per-employee configuration</p>
        </div>
        {saved && (
          <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-xl text-green-600 text-sm font-semibold animate-pulse">
            ✓ Saved successfully
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[var(--surface2)] p-1 rounded-xl w-fit border border-[var(--border)]">
        {([['company','🏢','Company'],['employees','👤','Employees']] as const).map(([k, ic, lb]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 ${
              tab === k
                ? 'bg-white text-[var(--text)] shadow-sm border border-[var(--border)]'
                : 'text-[var(--muted)] hover:text-[var(--text)]'
            }`}>
            <span>{ic}</span> {lb}
          </button>
        ))}
      </div>

      {/* ── COMPANY TAB ── */}
      {tab === 'company' && (
        <div className="space-y-4">

          {/* Working Hours */}
          <Card title="Working Hours" icon="⏰">
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Work Start Time">
                  <Input type="time" value={company.workStartTime}
                    onChange={(e: any) => set('workStartTime', e.target.value)} />
                </Field>
                <Field label="Work End Time">
                  <Input type="time" value={company.workEndTime}
                    onChange={(e: any) => set('workEndTime', e.target.value)} />
                </Field>
                <Field label="Daily Target Hours" hint="Kitne ghante kaam karna hai">
                  <div className="relative">
                    <Input type="number" min={1} max={24} value={company.defaultDailyHours}
                      onChange={(e: any) => set('defaultDailyHours', parseInt(e.target.value))} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--muted)]">hrs</span>
                  </div>
                </Field>
                <Field label="Weekly Target Hours" hint="Poore hafte ka target">
                  <div className="relative">
                    <Input type="number" min={1} max={168} value={company.defaultWeeklyHours}
                      onChange={(e: any) => set('defaultWeeklyHours', parseInt(e.target.value))} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--muted)]">hrs</span>
                  </div>
                </Field>
              </div>

              {/* Working Days */}
              <Field label="Working Days">
                <div className="flex gap-2 flex-wrap mt-1">
                  {DAYS.map(day => {
                    const active = company.workingDays.includes(day);
                    const isWeekend = day === 'SAT' || day === 'SUN';
                    return (
                      <button key={day} onClick={() => toggleDay(day)}
                        className={`w-12 h-12 rounded-xl text-xs font-bold border-2 transition-all ${
                          active
                            ? 'dart-gradient text-white border-transparent shadow-md scale-105'
                            : isWeekend
                            ? 'bg-red-500/5 text-red-400 border-red-200 hover:border-red-400'
                            : 'bg-[var(--surface2)] text-[var(--muted)] border-[var(--border)] hover:border-[var(--orange)] hover:text-[var(--text)]'
                        }`}>
                        {DAY_LABELS[day]}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-[var(--subtle)] mt-2">Red = weekend. Click karo toggle karne ke liye.</p>
              </Field>
            </div>
          </Card>

          {/* Late Rules */}
          <Card title="Late & Attendance Rules" icon="⚠️">
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <Field label="Grace Period" hint="Is waqt tak late nahi maana jayega">
                  <div className="relative">
                    <Input type="number" min={0} max={60} value={company.gracePeriodMins}
                      onChange={(e: any) => set('gracePeriodMins', parseInt(e.target.value))} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--muted)]">min</span>
                  </div>
                </Field>
                <Field label="Late Threshold" hint="Itne mins baad late count hoga">
                  <div className="relative">
                    <Input type="number" min={0} max={120} value={company.lateThresholdMins}
                      onChange={(e: any) => set('lateThresholdMins', parseInt(e.target.value))} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--muted)]">min</span>
                  </div>
                </Field>
                <Field label="Early Departure" hint="Pehle jane par flag">
                  <div className="relative">
                    <Input type="number" min={0} max={120} value={company.earlyDepartureThresholdMins}
                      onChange={(e: any) => set('earlyDepartureThresholdMins', parseInt(e.target.value))} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--muted)]">min</span>
                  </div>
                </Field>
              </div>
              <div className="flex items-center justify-between py-3 px-4 bg-[var(--surface2)] rounded-xl border border-[var(--border)]">
                <div>
                  <p className="text-sm font-semibold text-[var(--text)]">Late aane par note required</p>
                  <p className="text-[11px] text-[var(--muted)]">Employee ko reason dena hoga</p>
                </div>
                <Toggle checked={company.requireNoteOnLate} onChange={v => set('requireNoteOnLate', v)} />
              </div>
            </div>
          </Card>

          {/* Break */}
          <Card title="Break Settings" icon="☕">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Default Break" hint="Normal break duration">
                <div className="relative">
                  <Input type="number" min={0} max={180} value={company.defaultBreakMins}
                    onChange={(e: any) => set('defaultBreakMins', parseInt(e.target.value))} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--muted)]">min</span>
                </div>
              </Field>
              <Field label="Max Break" hint="Itne se zyada break nahi">
                <div className="relative">
                  <Input type="number" min={0} max={240} value={company.maxBreakMins}
                    onChange={(e: any) => set('maxBreakMins', parseInt(e.target.value))} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--muted)]">min</span>
                </div>
              </Field>
            </div>
          </Card>

          {/* Auto Clock Out + Overtime */}
          <Card title="Auto Clock Out & Overtime" icon="🔄">
            <div className="space-y-3">
              <div className="flex items-center justify-between py-3 px-4 bg-[var(--surface2)] rounded-xl border border-[var(--border)]">
                <div>
                  <p className="text-sm font-semibold text-[var(--text)]">Auto Clock Out</p>
                  <p className="text-[11px] text-[var(--muted)]">Is waqt ke baad automatically clock out</p>
                </div>
                <Toggle checked={company.autoClockOutEnabled} onChange={v => set('autoClockOutEnabled', v)} />
              </div>
              {company.autoClockOutEnabled && (
                <div className="w-48">
                  <Field label="Auto Clock Out Time">
                    <Input type="time" value={company.autoClockOutTime}
                      onChange={(e: any) => set('autoClockOutTime', e.target.value)} />
                  </Field>
                </div>
              )}
              <div className="flex items-center justify-between py-3 px-4 bg-[var(--surface2)] rounded-xl border border-[var(--border)]">
                <div>
                  <p className="text-sm font-semibold text-[var(--text)]">Overtime Tracking</p>
                  <p className="text-[11px] text-[var(--muted)]">Extra ghante track karo</p>
                </div>
                <Toggle checked={company.overtimeEnabled} onChange={v => set('overtimeEnabled', v)} />
              </div>
              {company.overtimeEnabled && (
                <div className="w-48">
                  <Field label="Overtime After">
                    <div className="relative">
                      <Input type="number" min={1} max={24} step={0.5} value={company.overtimeAfterHours}
                        onChange={(e: any) => set('overtimeAfterHours', parseFloat(e.target.value))} />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--muted)]">hrs</span>
                    </div>
                  </Field>
                </div>
              )}
            </div>
          </Card>

          {/* EOD Policy */}
          <Card title="EOD Policy" icon="📋">
            <div className="flex items-center justify-between py-3 px-4 bg-[var(--surface2)] rounded-xl border border-[var(--border)]">
              <div>
                <p className="text-sm font-semibold text-[var(--text)]">EOD Report Required</p>
                <p className="text-[11px] text-[var(--muted)]">A daily end-of-day report will be required</p>
              </div>
              <Toggle checked={company.requireEOD} onChange={v => set('requireEOD', v)} />
            </div>
          </Card>

          <button onClick={saveCompany} disabled={saving}
            className="w-full py-3.5 rounded-xl dart-gradient text-white font-bold text-sm disabled:opacity-50 transition-all hover:opacity-90 flex items-center justify-center gap-2">
            {saving ? (
              <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</>
            ) : '💾 Save Company Settings'}
          </button>
        </div>
      )}

      {/* ── EMPLOYEES TAB ── */}
      {tab === 'employees' && (
        <div className="space-y-4">
          {/* All employees grid */}
          <Card title="All Employees" icon="👥">
            <div className="grid grid-cols-1 gap-2">
              {users.filter(u => u.role !== 'ADMIN').map(u => {
                const override = empSettings.find(e => e.userId === u.id);
                const initials = u.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
                const isSelected = selectedUser === u.id;
                return (
                  <button key={u.id} onClick={() => setSelectedUser(isSelected ? '' : u.id)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-left ${
                      isSelected
                        ? 'border-[var(--orange)] bg-[var(--orange)]/5'
                        : 'border-[var(--border)] bg-[var(--surface2)] hover:border-[var(--orange)]/40'
                    }`}>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl dart-gradient flex items-center justify-center text-[11px] font-bold text-white shrink-0">
                        {initials}
                      </div>
                      <div>
                        <p className="text-[13px] font-semibold text-[var(--text)]">{u.name}</p>
                        <p className="text-[11px] text-[var(--muted)]">{u.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {override ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--orange)]/10 text-[var(--orange)] border border-[var(--orange)]/20">
                          Custom
                        </span>
                      ) : (
                        <span className="text-[10px] text-[var(--subtle)]">Default</span>
                      )}
                      <span className={`text-xs transition-transform ${isSelected ? 'rotate-180' : ''}`}>▾</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Selected employee form */}
          {selectedUser && (
            <Card title={`Override Settings — ${selectedUserName}`} icon="⚙️">
              <div className="space-y-4">
                <div className="px-3 py-2 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                  <p className="text-[11px] text-blue-600">Khaali chhoddo = company default use hoga ({company.defaultDailyHours}h/day, {company.defaultWeeklyHours}h/week)</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Daily Hours Override">
                    <div className="relative">
                      <Input type="number" min={1} max={24} value={empForm.dailyHours}
                        onChange={(e: any) => setEmpForm(p => ({ ...p, dailyHours: e.target.value }))}
                        placeholder={`${company.defaultDailyHours}`} />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--muted)]">hrs</span>
                    </div>
                  </Field>
                  <Field label="Weekly Hours Override">
                    <div className="relative">
                      <Input type="number" min={1} max={168} value={empForm.weeklyHours}
                        onChange={(e: any) => setEmpForm(p => ({ ...p, weeklyHours: e.target.value }))}
                        placeholder={`${company.defaultWeeklyHours}`} />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--muted)]">hrs</span>
                    </div>
                  </Field>
                  <Field label="Custom Start Time">
                    <Input type="time" value={empForm.workStartTime}
                      onChange={(e: any) => setEmpForm(p => ({ ...p, workStartTime: e.target.value }))} />
                  </Field>
                  <Field label="Custom End Time">
                    <Input type="time" value={empForm.workEndTime}
                      onChange={(e: any) => setEmpForm(p => ({ ...p, workEndTime: e.target.value }))} />
                  </Field>
                </div>
                <div className="flex items-center justify-between py-3 px-4 bg-[var(--surface2)] rounded-xl border border-[var(--border)]">
                  <div>
                    <p className="text-sm font-semibold text-[var(--text)]">Remote Employee</p>
                    <p className="text-[11px] text-[var(--muted)]">WFH — machine punch required nahi</p>
                  </div>
                  <Toggle checked={empForm.isRemote} onChange={v => setEmpForm(p => ({ ...p, isRemote: v }))} />
                </div>
                <Field label="Note (optional)">
                  <Input type="text" value={empForm.customNote}
                    onChange={(e: any) => setEmpForm(p => ({ ...p, customNote: e.target.value }))}
                    placeholder="e.g. Part-time, Internee, Contract..." />
                </Field>
                <button onClick={saveEmployee} disabled={saving}
                  className="w-full py-3 rounded-xl dart-gradient text-white font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving ? (
                    <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</>
                  ) : `💾 Save ${selectedUserName}'s Settings`}
                </button>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}