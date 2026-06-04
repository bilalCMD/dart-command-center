'use client';
import { useState, useEffect } from 'react';
import { Card, FormLabel, FormTextarea } from '@/components/ui';

const CRITERIA = [
  { id: 'satisfaction', name: 'Client Satisfaction', desc: 'Feedback on responsiveness & relationship' },
  { id: 'quality', name: 'Quality of Work', desc: 'Accuracy, detail, polish of deliverables' },
  { id: 'understanding', name: 'Project Understanding', desc: 'Brand knowledge, research, strategy' },
  { id: 'approach', name: 'Work Approach', desc: 'Proactiveness, initiative, problem-solving' },
  { id: 'ethic', name: 'Work Ethic', desc: 'Punctuality, EOD compliance, reliability' },
];

const SCORE_OPTIONS = [1, 1.5, 2, 2.5, 3, 3.5, 4];

const MONTHS = Array.from({ length: 12 }, (_, i) => {
  const d = new Date(2026, i, 1);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
});

export default function AdminEvalPage() {
  const [team, setTeam] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [month, setMonth] = useState(MONTHS[new Date().getMonth()]);
  const [scores, setScores] = useState<Record<string, number>>({ satisfaction: 3, quality: 3, understanding: 3, approach: 3, ethic: 3 });
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [existingEvals, setExistingEvals] = useState<Record<string, any>>({});

  useEffect(() => {
    fetch('/api/clock/team')
      .then(r => r.json())
      .then(data => {
        const members = (data.team || []).filter((u: any) => u.role === 'MEMBER');
        setTeam(members);
        if (members.length) setSelected(members[0]);
      });
  }, []);

  // Load existing eval when member or month changes
  useEffect(() => {
    if (!selected) return;
    const key = `${selected.userId}_${month}`;
    if (existingEvals[key]) {
      const e = existingEvals[key];
      setScores({ satisfaction: e.satisfaction, quality: e.quality, understanding: e.understanding, approach: e.approach, ethic: e.ethic });
      setNotes(e.notes || '');
    } else {
      fetch(`/api/evaluations?evaluateeId=${selected.userId}&month=${encodeURIComponent(month)}`)
        .then(r => r.json())
        .then(data => {
          const ev = data.evaluations?.[0];
          if (ev) {
            setExistingEvals(prev => ({ ...prev, [key]: ev }));
            setScores({ satisfaction: ev.satisfaction, quality: ev.quality, understanding: ev.understanding, approach: ev.approach, ethic: ev.ethic });
            setNotes(ev.notes || '');
          } else {
            setScores({ satisfaction: 3, quality: 3, understanding: 3, approach: 3, ethic: 3 });
            setNotes('');
          }
        });
    }
  }, [selected, month]);

  const avg = Object.values(scores).reduce((a, b) => a + b, 0) / 5;
  const ratingColor = avg >= 3.5 ? '#10b981' : avg >= 2.5 ? '#ED671C' : '#ef4444';
  const ratingLabel = avg >= 3.5 ? 'Exceeds' : avg >= 2.5 ? 'Meets' : avg >= 1.5 ? 'Below' : 'Critical';

  const handleSubmit = async () => {
    if (!selected) return;
    setSubmitting(true);
    setMsg(null);
    try {
      const res = await fetch('/api/evaluations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ evaluateeId: selected.userId, month, ...scores, notes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMsg({ type: 'success', text: `✅ ${selected.name} ki evaluation save ho gayi! (${avg.toFixed(1)}/4.0)` });
      setExistingEvals(prev => ({ ...prev, [`${selected.userId}_${month}`]: data.evaluation }));
    } catch (e: any) {
      setMsg({ type: 'error', text: `❌ ${e.message || 'Error aa gaya'}` });
    }
    setSubmitting(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-extrabold text-[var(--text)]">Monthly Evaluation</h1>
          <p className="text-xs text-[var(--muted)] mt-0.5">Rate team members 1–4 per criteria</p>
        </div>
        <select
          value={month}
          onChange={e => setMonth(e.target.value)}
          className="px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-xs font-semibold text-[var(--text)]"
        >
          {MONTHS.map(m => <option key={m}>{m}</option>)}
        </select>
      </div>

      <Card className="border-l-[3px] border-l-[#B71CED] mb-3">
        <p className="text-xs text-[var(--muted)] leading-relaxed m-0">
          Rate each member 1–4 per criteria. Avg = rating.{' '}
          <strong className="text-[var(--text)]">3+ Meets. 3.5+ Exceeds. Below 2.5 coaching plan.</strong>
        </p>
      </Card>

      {msg && (
        <div className={`mb-3 text-xs px-4 py-3 rounded-lg ${msg.type === 'success' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
          {msg.text}
        </div>
      )}

      <div className="flex gap-3.5 flex-wrap">
        {/* Member Selector */}
        <div className="w-[180px] max-h-[480px] overflow-y-auto">
          {team.map((m) => (
            <button key={m.userId} onClick={() => { setSelected(m); setMsg(null); }}
              className={`flex items-center gap-1.5 w-full px-2 py-1.5 border-none rounded-[5px] cursor-pointer text-left mb-px text-[11.5px] ${
                selected?.userId === m.userId ? 'bg-[var(--surface2)] text-[var(--orange)]' : 'bg-transparent text-[var(--muted)]'
              }`}>
              <div className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ background: 'linear-gradient(135deg, #ED671C, #B71CED)' }}>
                {m.name?.[0]}
              </div>
              {m.name}
            </button>
          ))}
        </div>

        {/* Scoring Panel */}
        <div className="flex-1 min-w-[270px]">
          <Card>
            <div className="flex justify-between items-center mb-3.5">
              <div>
                <div className="text-[14px] font-bold">{selected?.name || '—'}</div>
                <div className="text-[11px] text-[var(--muted)]">{month}</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-extrabold font-mono" style={{ color: ratingColor }}>{avg.toFixed(1)}</div>
                <div className="text-[10.5px] font-semibold" style={{ color: ratingColor }}>{ratingLabel}</div>
              </div>
            </div>

            {CRITERIA.map((c) => (
              <div key={c.id} className="mb-3">
                <div className="flex justify-between mb-0.5">
                  <div>
                    <div className="text-xs font-semibold">{c.name}</div>
                    <div className="text-[9px] text-[var(--muted)]">{c.desc}</div>
                  </div>
                  <div className="text-[15px] font-extrabold font-mono" style={{ color: scores[c.id] >= 3.5 ? '#10b981' : scores[c.id] >= 2.5 ? '#ED671C' : '#ef4444' }}>
                    {scores[c.id]}
                  </div>
                </div>
                <div className="flex gap-1">
                  {SCORE_OPTIONS.map((v) => (
                    <button key={v} onClick={() => setScores({ ...scores, [c.id]: v })}
                      className={`w-8 h-[26px] rounded-[5px] cursor-pointer text-[10px] font-semibold font-mono border ${
                        scores[c.id] === v ? 'dart-gradient text-white border-transparent' : 'bg-[var(--surface2)] text-[var(--muted)] border-[var(--border)]'
                      }`}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <FormLabel>Notes (optional)</FormLabel>
            <FormTextarea value={notes} onChange={(e: any) => setNotes(e.target.value)} placeholder="Feedback for this team member..." style={{ minHeight: 40 }} />

            <button onClick={handleSubmit} disabled={submitting || !selected}
              className="w-full mt-2.5 border-none dart-gradient text-white text-xs font-semibold py-2 rounded-[5px] cursor-pointer disabled:opacity-50">
              {submitting ? 'Saving...' : 'Submit Evaluation'}
            </button>
          </Card>
        </div>
      </div>
    </div>
  );
}
