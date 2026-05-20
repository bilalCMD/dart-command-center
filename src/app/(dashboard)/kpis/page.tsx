'use client';

import { useSession } from 'next-auth/react';

export default function KpisPage() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const isAdmin = user?.role === 'ADMIN';

  // Employees see Coming Soon
  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto animate-fade-in" style={{ paddingTop: '60px' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>🎯</div>
          <h1 style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text)', marginBottom: '12px' }}>
            KPIs & OKRs
          </h1>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '99px', marginBottom: '16px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f97316' }} />
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#ea580c' }}>Coming Soon</span>
          </div>
          <p style={{ fontSize: '15px', color: 'var(--muted)', lineHeight: 1.6, maxWidth: '480px', margin: '0 auto' }}>
            We&apos;re building a powerful goal-tracking system to help you measure your performance and growth. Stay tuned!
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '32px' }}>
          {[
            { icon: '📊', title: 'Track Your KPIs', desc: 'Monitor your key performance indicators in real-time' },
            { icon: '🎯', title: 'Set OKRs', desc: 'Define objectives and key results for each quarter' },
            { icon: '📈', title: 'Progress Insights', desc: 'Visualize your growth with detailed analytics' },
            { icon: '🏆', title: 'Achievements', desc: 'Earn recognition for hitting your targets' },
          ].map((f) => (
            <div key={f.title} style={{ background: '#fff', borderRadius: '16px', border: '1px solid var(--border)', padding: '20px' }}>
              <div style={{ fontSize: '28px', marginBottom: '10px' }}>{f.icon}</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', marginBottom: '4px' }}>{f.title}</div>
              <div style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.5 }}>{f.desc}</div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', padding: '20px', background: 'var(--surface2)', borderRadius: '14px', border: '1px solid var(--border)' }}>
          <p style={{ fontSize: '13px', color: 'var(--muted)' }}>
            💡 In the meantime, keep submitting your <strong style={{ color: 'var(--text)' }}>EOD reports</strong> and tracking your <strong style={{ color: 'var(--text)' }}>daily hours</strong>!
          </p>
        </div>
      </div>
    );
  }

  // Admin sees Coming Soon too (until feature is built)
  return (
    <div className="max-w-2xl mx-auto animate-fade-in" style={{ paddingTop: '60px' }}>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <div style={{ fontSize: '64px', marginBottom: '20px' }}>🎯</div>
        <h1 style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text)', marginBottom: '12px' }}>
          KPIs & OKRs
        </h1>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '99px', marginBottom: '16px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f97316' }} />
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#ea580c' }}>Coming Soon</span>
        </div>
        <p style={{ fontSize: '15px', color: 'var(--muted)', lineHeight: 1.6, maxWidth: '480px', margin: '0 auto' }}>
          The KPIs &amp; OKRs management system is under development. You&apos;ll be able to set and track team goals here soon.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
        {[
          { icon: '📊', title: 'Team KPIs', desc: 'Set and monitor team-wide performance metrics' },
          { icon: '🎯', title: 'Assign OKRs', desc: 'Define objectives for each team member' },
          { icon: '📈', title: 'Analytics', desc: 'Track team progress with detailed reports' },
          { icon: '🏆', title: 'Recognition', desc: 'Reward top performers automatically' },
        ].map((f) => (
          <div key={f.title} style={{ background: '#fff', borderRadius: '16px', border: '1px solid var(--border)', padding: '20px' }}>
            <div style={{ fontSize: '28px', marginBottom: '10px' }}>{f.icon}</div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', marginBottom: '4px' }}>{f.title}</div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.5 }}>{f.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}