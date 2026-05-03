'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from '@/components/sidebar';

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
      {/* Progress bar */}
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

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      const user = session.user as any;
      setIsAdminView(user.role === 'ADMIN');
    }
  }, [session]);

  // Show loader when path changes
  useEffect(() => {
    if (pathname !== prevPath) {
      setLoading(false);
      setPrevPath(pathname);
    }
  }, [pathname]);

  // Listen for link clicks
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
    <div className="flex min-h-screen bg-[var(--bg)] text-[var(--text)] font-body">
      {loading && <PageLoader />}
      <Sidebar user={sessionUser} isAdmin={isAdminView} setIsAdmin={() => {}} />
      <main className="flex-1 p-5 overflow-y-auto max-h-screen">
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