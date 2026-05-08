'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from '@/components/sidebar';
import SessionWatcher from '@/components/SessionWatcher';

function PageLoader() {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(255,255,255,0.85)',
      backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: '16px',
    }}>
      <img
        src="https://cdn.prod.website-files.com/66fbd171291413aa1f7ebcd8/66fc2e6622cef152f22a7fa8_dart%20logo.svg"
        alt="Dart"
        style={{ height: '36px', animation: 'pulse 1s ease-in-out infinite' }}
      />
      <div style={{ width: '120px', height: '3px', background: '#f1f5f9', borderRadius: '99px', overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          background: 'linear-gradient(90deg, #f97316, #fb923c)',
          borderRadius: '99px',
          animation: 'dartLoad 1s ease-in-out infinite',
        }} />
      </div>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes dartLoad {
          0% { width: 0%; margin-left: 0%; }
          50% { width: 80%; margin-left: 10%; }
          100% { width: 0%; margin-left: 100%; }
        }
      `}</style>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="flex min-h-screen bg-[var(--bg)] items-center justify-center">
      <div className="text-center">
        <img
          src="https://cdn.prod.website-files.com/66fbd171291413aa1f7ebcd8/66fc2e6622cef152f22a7fa8_dart%20logo.svg"
          alt="Dart"
          className="h-8 mx-auto mb-4 invert animate-pulse"
        />
        <div className="flex gap-1 justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-[var(--orange)] animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-1.5 h-1.5 rounded-full bg-[var(--orange)] animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-1.5 h-1.5 rounded-full bg-[var(--orange)] animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [isAdminView, setIsAdminView] = useState(false);
  const [loading, setLoading] = useState(false);
  const [prevPath, setPrevPath] = useState(pathname);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      const user = session.user as any;
      setIsAdminView(user.role === 'ADMIN');
    }
  }, [session]);

  useEffect(() => {
    if (pathname !== prevPath) {
      setLoading(false);
      setPrevPath(pathname);
      setMobileMenuOpen(false);
    }
  }, [pathname]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('a');
      if (!target) return;
      const href = target.getAttribute('href');
      if (href && href.startsWith('/') && href !== pathname) {
        setLoading(true);
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [pathname]);

  if (status === 'loading') return <LoadingScreen />;
  if (!session?.user) return null;

  const user = session.user as any;
  const sessionUser = {
    name: user.name || user.email?.split('@')[0] || 'User',
    role: user.role === 'ADMIN' ? 'Administrator' : 'Team Member',
    avatar: user.avatar || user.name?.slice(0, 2).toUpperCase() || 'U',
    isAdmin: user.role === 'ADMIN',
    email: user.email,
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[var(--bg)] text-[var(--text)] font-body">
      <SessionWatcher />
      {loading && <PageLoader />}

      {/* Mobile Header - only visible on small screens */}
      <div className="md:hidden bg-white border-b border-[var(--border)] px-4 py-3 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 flex items-center justify-center">
            <img src="/logo-new.png" alt="Dart" className="h-full w-full object-contain" />
          </div>
          <div>
            <div className="text-sm font-bold leading-tight">Dart</div>
            <div className="text-[8px] text-[var(--muted)] uppercase tracking-wider font-bold">Command Center</div>
          </div>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Menu"
        >
          {mobileMenuOpen ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          )}
        </button>
      </div>

      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        ${mobileMenuOpen ? 'fixed left-0 top-0 bottom-0 z-50' : 'hidden'}
        md:relative md:block md:z-auto
      `}>
        <Sidebar user={sessionUser} isAdmin={isAdminView} setIsAdmin={setIsAdminView} />
      </div>

      {/* Main Content */}
      <main className="flex-1 p-3 md:p-5 overflow-y-auto md:max-h-screen">
        <Suspense fallback={
          <div className="flex items-center justify-center py-20">
            <div className="flex gap-1">
              <div className="w-2 h-2 rounded-full bg-[var(--orange)] animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 rounded-full bg-[var(--orange)] animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 rounded-full bg-[var(--orange)] animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        }>
          {children}
        </Suspense>
      </main>
    </div>
  );
}