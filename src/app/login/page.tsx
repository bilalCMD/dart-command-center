'use client';

// src/app/login/page.tsx

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Mail, KeyRound, ArrowLeft, AlertCircle, Loader2, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to send code');
        setLoading(false);
        return;
      }

      setStep('code');
    } catch {
      setError('Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        code,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid or expired code. Try again.');
        setLoading(false);
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('Something went wrong. Try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Subtle background gradient decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full dart-gradient opacity-[0.06] blur-3xl" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full dart-gradient opacity-[0.06] blur-3xl" />
      </div>

      <div className="w-full max-w-[400px] relative z-10 animate-slide-up">
        {/* ═══════════════════════════════════════════════════════ */}
        {/* LOGO HEADER                                              */}
        {/* ═══════════════════════════════════════════════════════ */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl dart-gradient flex items-center justify-center shadow-[0_10px_30px_rgba(237,103,28,0.25)] mb-4">
<img
  src="/dart-logo.png"
  alt="Dart"
  className="h-10 w-10 object-contain"
/>
          </div>
          <div className="text-[22px] font-black text-[var(--text)] tracking-tight leading-tight">
            Dart
          </div>
          <div className="text-[10px] text-[var(--muted)] tracking-[0.22em] font-bold uppercase mt-0.5">
            Command Center
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* LOGIN CARD                                               */}
        {/* ═══════════════════════════════════════════════════════ */}
        <div className="bg-white rounded-2xl border border-[var(--border)] shadow-elevated p-8">
          {step === 'email' ? (
            <>
              <div className="text-center mb-6">
                <h1 className="text-[22px] font-black text-[var(--text)] tracking-tight mb-1.5">
                  Welcome back
                </h1>
                <p className="text-[13px] text-[var(--muted)] leading-relaxed">
                  Sign in with your{' '}
                  <span className="font-semibold text-[var(--text)]">@dartmarketing.io</span>{' '}
                  email
                </p>
              </div>

              <form onSubmit={handleSendCode} className="space-y-4">
                <div>
                  <label className="block text-[10px] text-[var(--text-soft)] tracking-[0.12em] font-bold mb-1.5 uppercase">
                    Work Email
                  </label>
                  <div className="relative">
                    <Mail
                      size={15}
                      strokeWidth={2}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--subtle)]"
                    />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={loading}
                      autoFocus
                      placeholder="you@dartmarketing.io"
                      className="w-full pl-9 pr-3 py-3 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-[14px] text-[var(--text)] placeholder:text-[var(--subtle)] focus:outline-none focus:border-[var(--orange)] focus:bg-white transition-all disabled:opacity-50"
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-2 text-[12px] text-[var(--danger)] bg-[var(--danger-soft)] border border-red-200 rounded-lg px-3 py-2.5 animate-fade-in">
                    <AlertCircle size={14} strokeWidth={2.5} className="shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full dart-gradient dart-gradient-hover text-white text-[14px] font-bold py-3 rounded-lg border-none cursor-pointer transition-all disabled:opacity-60 disabled:cursor-not-allowed hover:shadow-[0_8px_20px_rgba(237,103,28,0.35)] flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 size={15} strokeWidth={2.5} className="animate-spin" />
                      <span>Sending code...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} strokeWidth={2.5} />
                      <span>Send Login Code</span>
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-xl dart-gradient-soft flex items-center justify-center mx-auto mb-3">
                  <KeyRound size={22} strokeWidth={2} className="text-[var(--orange)]" />
                </div>
                <h1 className="text-[22px] font-black text-[var(--text)] tracking-tight mb-1.5">
                  Check your email
                </h1>
                <p className="text-[13px] text-[var(--muted)] leading-relaxed">
                  We sent a 6-digit code to
                </p>
                <p className="text-[13px] font-semibold text-[var(--text)] mt-1 break-all">
                  {email}
                </p>
              </div>

              <form onSubmit={handleVerifyCode} className="space-y-4">
                <div>
                  <label className="block text-[10px] text-[var(--text-soft)] tracking-[0.12em] font-bold mb-1.5 uppercase">
                    Enter 6-Digit Code
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    required
                    disabled={loading}
                    autoFocus
                    placeholder="000000"
                    maxLength={6}
                    className="w-full px-4 py-4 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-[24px] font-black text-center tracking-[0.5em] text-[var(--text)] placeholder:text-[var(--subtle)] focus:outline-none focus:border-[var(--orange)] focus:bg-white transition-all disabled:opacity-50 text-mono"
                  />
                </div>

                {error && (
                  <div className="flex items-start gap-2 text-[12px] text-[var(--danger)] bg-[var(--danger-soft)] border border-red-200 rounded-lg px-3 py-2.5 animate-fade-in">
                    <AlertCircle size={14} strokeWidth={2.5} className="shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || code.length !== 6}
                  className="w-full dart-gradient dart-gradient-hover text-white text-[14px] font-bold py-3 rounded-lg border-none cursor-pointer transition-all disabled:opacity-60 disabled:cursor-not-allowed hover:shadow-[0_8px_20px_rgba(237,103,28,0.35)] flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 size={15} strokeWidth={2.5} className="animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <span>Sign In</span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStep('email');
                    setError('');
                    setCode('');
                  }}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-1.5 text-[12px] font-semibold text-[var(--muted)] py-2 bg-transparent border-none cursor-pointer hover:text-[var(--text)] transition-colors disabled:opacity-50"
                >
                  <ArrowLeft size={13} strokeWidth={2.5} />
                  <span>Use a different email</span>
                </button>
              </form>
            </>
          )}

          {/* Divider */}
          <div className="mt-6 pt-5 border-t border-[var(--border-subtle)]">
            <p className="text-[11px] text-[var(--muted)] text-center leading-relaxed">
              Only{' '}
              <span className="font-semibold text-[var(--text-soft)]">@dartmarketing.io</span>{' '}
              emails allowed.
              <br />
              Contact your admin for account access.
            </p>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* FOOTER                                                   */}
        {/* ═══════════════════════════════════════════════════════ */}
        <p className="text-[11px] text-[var(--muted)] text-center mt-6">
          <span className="font-semibold">Dart Marketing</span> © 2026 ·{' '}
          <span className="dart-gradient-text font-semibold">command.dartmarketing.io</span>
        </p>
      </div>
    </div>
  );
}