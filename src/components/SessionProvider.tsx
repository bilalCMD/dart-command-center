// src/components/SessionProvider.tsx
// Client-side wrapper so NextAuth session is available throughout the app

'use client';

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react';
import { ReactNode } from 'react';

export default function SessionProvider({ children }: { children: ReactNode }) {
  return (
    <NextAuthSessionProvider
      refetchOnWindowFocus={false}
      refetchInterval={30 * 60} // re-check session only every 30 min (was: every focus)
    >
      {children}
    </NextAuthSessionProvider>
  );
}