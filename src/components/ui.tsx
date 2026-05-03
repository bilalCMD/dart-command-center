'use client';

// src/components/ui.tsx
// Shared UI components used across all pages

export function Tag({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span
      className="inline-block px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold"
      style={{ background: `${color}15`, color }}
    >
      {children}
    </span>
  );
}

export function Ring({
  pct,
  size = 48,
  strokeWidth = 4,
  color = '#ED671C',
}: {
  pct: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}) {
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={circumference} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.5s' }}
      />
    </svg>
  );
}

export function StatCard({
  label,
  value,
  sub,
  accent = '#ED671C',
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="bg-[var(--surface)] rounded-lg p-3 pl-5 relative">
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-lg"
        style={{ background: accent }}
      />
      <div className="text-[9px] text-[var(--muted)] font-semibold uppercase tracking-wider mb-1">
        {label}
      </div>
      <div className="text-lg font-extrabold font-display">{value}</div>
      {sub && <div className="text-[9.5px] text-[var(--muted)] mt-0.5">{sub}</div>}
    </div>
  );
}

export function Avatar({ initials }: { initials: string }) {
  return (
    <div className="w-[22px] h-[22px] rounded-[5px] bg-[var(--surface2)] flex items-center justify-center text-[8px] font-bold text-[var(--orange)] border border-[var(--border)] shrink-0">
      {initials}
    </div>
  );
}

export function DataTable({
  heads,
  rows,
}: {
  heads: string[];
  rows: React.ReactNode[][];
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
      <table className="w-full text-[11.5px]">
        <thead>
          <tr>
            {heads.map((h, i) => (
              <th
                key={i}
                className="text-left px-2.5 py-[7px] bg-[var(--surface)] text-[9px] font-semibold text-[var(--muted)] uppercase tracking-wider border-b border-[var(--border)]"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className={i % 2 ? 'bg-white/[0.012]' : ''}
            >
              {row.map((cell, j) => (
                <td
                  key={j}
                  className="px-2.5 py-[7px] border-b border-[var(--border)] align-middle"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PageHeader({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex justify-between items-center mb-4">
      <h1 className="text-lg font-extrabold font-display tracking-tight">{title}</h1>
      {children}
    </div>
  );
}

export function Pill({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] text-[var(--muted)] bg-[var(--surface2)] px-2.5 py-1 rounded-full font-medium">
      {children}
    </div>
  );
}

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-[var(--surface)] rounded-lg p-3.5 mb-2.5 border border-[var(--border)] ${className}`}>
      {children}
    </div>
  );
}

export function GradientButton({
  children,
  onClick,
  className = '',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`border-none dart-gradient text-white text-xs font-semibold px-4 py-[7px] rounded-[5px] cursor-pointer font-body ${className}`}
    >
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="border border-[var(--border)] bg-transparent text-[var(--muted)] text-[10.5px] font-medium px-2.5 py-1 rounded-[5px] cursor-pointer font-body"
    >
      {children}
    </button>
  );
}

export function FormLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[9px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-0.5 mt-1.5">
      {children}
    </label>
  );
}

export function FormInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full bg-[var(--surface2)] border border-[var(--border)] rounded-[5px] px-2.5 py-1.5 text-xs font-body text-[var(--text)] outline-none"
    />
  );
}

export function FormSelect({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className="w-full bg-[var(--surface2)] border border-[var(--border)] rounded-[5px] px-2.5 py-1.5 text-xs font-body text-[var(--text)] outline-none"
    >
      {children}
    </select>
  );
}

export function FormTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className="w-full bg-[var(--surface2)] border border-[var(--border)] rounded-[5px] px-2.5 py-1.5 text-xs font-body text-[var(--text)] outline-none"
    />
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[12.5px] font-bold font-display mt-5 mb-2.5">
      {children}
    </h2>
  );
}

export function StatusDot({ active, labelOn, labelOff }: { active: boolean; labelOn: string; labelOff: string }) {
  return (
    <div
      className="text-[10.5px] text-white px-3 py-1 rounded-full font-semibold"
      style={{ background: active ? 'var(--success)' : 'var(--danger)' }}
    >
      {active ? labelOn : labelOff}
    </div>
  );
}
