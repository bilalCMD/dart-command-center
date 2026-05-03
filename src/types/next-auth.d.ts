// src/types/next-auth.d.ts
// Extend NextAuth types to include our custom user fields

import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: 'ADMIN' | 'MEMBER';
      avatar?: string | null;
      jobTitle?: string | null;
      division?: string | null;
    };
  }

  interface User {
    id: string;
    email: string;
    name: string;
    role: 'ADMIN' | 'MEMBER';
    avatar?: string | null;
    jobTitle?: string | null;
    division?: string | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId: string;
    role: 'ADMIN' | 'MEMBER';
    avatar?: string | null;
    jobTitle?: string | null;
    division?: string | null;
  }
}