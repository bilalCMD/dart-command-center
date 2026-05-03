'use client';

// src/app/(dashboard)/admin-eval/page.tsx
// Monthly evaluation — admin scores team members on 5 criteria

import { useState } from 'react';
import { PageHeader, Card, FormLabel, FormTextarea, Avatar } from '@/components/ui';

const TEAM = [
  { id: 3, name: 'Maheen Khan', role: 'Marketing Lead', div: 'Both', av: 'MK' },
  { id: 4, name: 'Talha Tajuddin', role: 'Sales Support', div: 'Dart Growth', av: 'TT' },
  { id: 5, name: 'Bilal Altaf', role: 'Web Dev & IT', div: 'Client Ops', av: 'BA' },
  { id: 6, name: 'Hasnain Karim', role: 'SEO Associate', div: 'Client Ops', av: 'HK' },
  { id: 7, name: 'Lasma Tariq', role: 'Creative (UI/UX)', div: 'Client Ops', av: 'LT' },
  { id: 8, name: 'Raahim Khan', role: 'Account Manager', div: 'Client Ops', av: 'RK' },
  { id: 9, name: 'Zahid Chishti', role: 'Creative (PT)', div: 'Client Ops', av: 'ZC' },
  { id: 10, name: 'Urooj Shahab', role: 'Proposal Design', div: 'Growth', av: 'US' },
  { id: 11, name: 'Zainab Ali', role: 'Account Mgr (PK)', div: 'Client Ops', av: 'ZA' },
  { id: 12, name: 'Hasan Jawed', role: 'Account Mgr (US)', div: 'Client Ops', av: 'HJ' },
  { id: 13, name: 'Wajiha Tahir', role: 'Cold Calling', div: 'Growth', av: 'WT' },
  { id: 14, name: 'Waniya Naushad', role: 'Research', div: 'Growth', av: 'WN' },
  { id: 15, name: 'Okasha Naseem', role: 'Sr. Creative', div: 'Client Ops', av: 'ON' },
  { id: 16, name: 'Ahad Baig', role: 'Creative', div: 'Client Ops', av: 'AB' },
  { id: 17, name: 'Muhammad Kaleem', role: '3D CGI', div: 'Client Ops', av: 'KL' },
];

const CRITERIA = [
  { id: 'satisfaction', name: 'Client Satisfaction', desc: 'Feedback on responsiveness & relationship' },
  { id: 'quality', name: 'Quality of Work', desc: 'Accuracy, detail, polish of deliverables' },
  { id: 'understanding', name: 'Project Understanding', desc: 'Brand knowledge, research, strategy' },
  { id: 'approach', name: 'Work Approach', desc: 'Proactiveness, initiative, problem-solving' },
  { id: 'ethic', name: 'Work Ethic', desc: 'Punctuality, EOD compliance, reliability' },
];

const SCORE_OPTIONS = [1, 1.5, 2, 2.5, 3, 3.5, 4];

export default function AdminEvalPage() {
  const [selected, setSelected] = useState(TEAM[0]);
  const [scores, setScores] = useState<Record<string, number>>({
    satisfaction: 3, quality: 3, understanding: 3, approach: 3, ethic: 3,
  });

  const avg = Object.values(scores).reduce((a, b) => a + b, 0) / 5;
  const ratingColor = avg >= 3.5 ? '#10b981' : avg >= 2.5 ? '#ED671C' : '#ef4444';
  const ratingLabel = avg >= 3.5 ? 'Exceeds' : avg >= 2.5 ? 'Meets' : avg >= 1.5 ? 'Below' : 'Critical';

  const handleSubmit = async () => {
    // TODO: POST /api/evaluations
    // const res = await fetch('/api/evaluations', {
    //   method: 'POST',
    //   body: JSON.stringify({
    //     evaluateeId: selected.id,
    //     month: 'April 2026',
    //     ...scores,
    //   }),
    // });
    alert(`Evaluation submitted for ${selected.name}: ${avg.toFixed(1)}/4.0`);
  };

  return (
    <div>
      <PageHeader title="Monthly Evaluation" />

      {/* Explainer */}
      <Card className="border-l-[3px] border-l-[#B71CED] mb-3">
        <p className="text-xs text-[var(--muted)] leading-relaxed m-0">
          Rate each member 1–4 per criteria. Avg = rating.{' '}
          <strong className="text-[var(--text)]">3+ Meets. 3.5+ Exceeds. Below 2.5 coaching plan.</strong>
        </p>
      </Card>

      <div className="flex gap-3.5 flex-wrap">
        {/* Member Selector */}
        <div className="w-[180px] max-h-[480px] overflow-y-auto">
          {TEAM.map((m) => (
            <button
              key={m.id}
              onClick={() => setSelected(m)}
              className={`flex items-center gap-1.5 w-full px-2 py-1.5 border-none rounded-[5px] cursor-pointer font-body text-left mb-px text-[11.5px] ${
                selected.id === m.id
                  ? 'bg-[var(--surface2)] text-[var(--orange)]'
                  : 'bg-transparent text-[var(--muted)]'
              }`}
            >
              <Avatar initials={m.av} />
              {m.name}
            </button>
          ))}
        </div>

        {/* Scoring Panel */}
        <div className="flex-1 min-w-[270px]">
          <Card>
            {/* Header */}
            <div className="flex justify-between items-center mb-3.5">
              <div>
                <div className="text-[14px] font-bold">{selected.name}</div>
                <div className="text-[11px] text-[var(--muted)]">{selected.role}</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-extrabold font-mono" style={{ color: ratingColor }}>
                  {avg.toFixed(1)}
                </div>
                <div className="text-[10.5px] font-semibold" style={{ color: ratingColor }}>
                  {ratingLabel}
                </div>
              </div>
            </div>

            {/* Criteria Scoring */}
            {CRITERIA.map((c) => (
              <div key={c.id} className="mb-3">
                <div className="flex justify-between mb-0.5">
                  <div>
                    <div className="text-xs font-semibold">{c.name}</div>
                    <div className="text-[9px] text-[var(--muted)]">{c.desc}</div>
                  </div>
                  <div
                    className="text-[15px] font-extrabold font-mono"
                    style={{
                      color: scores[c.id] >= 3.5 ? '#10b981' : scores[c.id] >= 2.5 ? '#ED671C' : '#ef4444',
                    }}
                  >
                    {scores[c.id]}
                  </div>
                </div>
                <div className="flex gap-1">
                  {SCORE_OPTIONS.map((v) => (
                    <button
                      key={v}
                      onClick={() => setScores({ ...scores, [c.id]: v })}
                      className={`w-8 h-[26px] rounded-[5px] cursor-pointer text-[10px] font-semibold font-mono border ${
                        scores[c.id] === v
                          ? 'dart-gradient text-white border-transparent'
                          : 'bg-[var(--surface2)] text-[var(--muted)] border-[var(--border)]'
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <FormLabel>Notes (optional)</FormLabel>
            <FormTextarea placeholder="Feedback for this team member..." style={{ minHeight: 40 }} />

            <button
              onClick={handleSubmit}
              className="w-full mt-2.5 border-none dart-gradient text-white text-xs font-semibold py-2 rounded-[5px] cursor-pointer font-body"
            >
              Submit Evaluation
            </button>
          </Card>
        </div>
      </div>
    </div>
  );
}
