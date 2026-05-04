// src/lib/auth.ts
// NextAuth configuration — Email OTP (passwordless) auth
// Only @dartmarketing.io emails allowed

import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import bcrypt from 'bcryptjs';
import { prisma } from './db';

const ALLOWED_DOMAIN = 'dartmarketing.io';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'otp',
      credentials: {
        email: { label: 'Email', type: 'email' },
        code: { label: 'OTP Code', type: 'text' },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.code) {
          throw new Error('Email and code required');
        }

        const email = credentials.email.toLowerCase().trim();
        const code = credentials.code.trim();

        // ═══════════════════════════════════════════════════════
        // 1. DOMAIN CHECK — only @dartmarketing.io allowed
        // ═══════════════════════════════════════════════════════
        if (!email.endsWith(`@${ALLOWED_DOMAIN}`)) {
          throw new Error(`Only @${ALLOWED_DOMAIN} emails are allowed`);
        }

        // ═══════════════════════════════════════════════════════
        // 2. FIND LATEST UNUSED OTP FOR THIS EMAIL
        // ═══════════════════════════════════════════════════════
        const otpRecord = await prisma.otpCode.findFirst({
          where: {
            email,
            usedAt: null,
            expiresAt: { gt: new Date() },
          },
          orderBy: { createdAt: 'desc' },
        });

        if (!otpRecord) {
          throw new Error('Code expired or invalid. Request a new one.');
        }

        // ═══════════════════════════════════════════════════════
        // 3. CHECK ATTEMPTS (max 5)
        // ═══════════════════════════════════════════════════════
        if (otpRecord.attempts >= 5) {
          throw new Error('Too many attempts. Request a new code.');
        }

        // ═══════════════════════════════════════════════════════
        // 4. VERIFY CODE (stored as bcrypt hash)
        // ═══════════════════════════════════════════════════════
        const isValid = await bcrypt.compare(code, otpRecord.code);

        if (!isValid) {
          // Increment attempts
          await prisma.otpCode.update({
            where: { id: otpRecord.id },
            data: { attempts: { increment: 1 } },
          });
          throw new Error('Invalid code');
        }

        // ═══════════════════════════════════════════════════════
        // 5. FIND OR AUTO-CREATE USER
        // ═══════════════════════════════════════════════════════
        let user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user) {
          // Auto-create user from email (since domain is verified)
          const namePart = email.split('@')[0];
          const displayName = namePart
            .split(/[._-]/)
            .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
            .join(' ');
          const avatar = displayName
            .split(' ')
            .map((s) => s[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);

          user = await prisma.user.create({
            data: {
              email,
              name: displayName || namePart,
              avatar,
              role: 'MEMBER',
              isActive: true,
            },
          });

          // Give default leave balances
          const currentYear = new Date().getFullYear();
          const leaveTypes = [
            { type: 'ANNUAL' as const, total: 20 },
            { type: 'SICK' as const, total: 10 },
            { type: 'CASUAL' as const, total: 7 },
            { type: 'EMERGENCY' as const, total: 5 },
          ];
          for (const lt of leaveTypes) {
            await prisma.leaveBalance.create({
              data: {
                userId: user.id,
                type: lt.type,
                total: lt.total,
                used: 0,
                year: currentYear,
              },
            });
          }
        }

        // ═══════════════════════════════════════════════════════
        // 6. CHECK USER IS ACTIVE
        // ═══════════════════════════════════════════════════════
        if (!user.isActive) {
          throw new Error('Account is deactivated. Contact admin.');
        }

        // ═══════════════════════════════════════════════════════
        // 7. MARK OTP AS USED
        // ═══════════════════════════════════════════════════════
        await prisma.otpCode.update({
          where: { id: otpRecord.id },
          data: { usedAt: new Date() },
        });

        // ═══════════════════════════════════════════════════════
        // 8. UPDATE lastLoginAt
        // ═══════════════════════════════════════════════════════
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() } as any,
        });

        // ═══════════════════════════════════════════════════════
        // 9. LOG THE LOGIN (audit trail)
        // ═══════════════════════════════════════════════════════
        try {
          const ipAddress =
            (req?.headers as any)?.['x-forwarded-for']?.split(',')[0]?.trim() ||
            (req?.headers as any)?.['x-real-ip'] ||
            null;
          const userAgent = (req?.headers as any)?.['user-agent'] || null;

          await prisma.loginLog.create({
            data: {
              userId: user.id,
              email: user.email,
              ipAddress,
              userAgent,
              success: true,
            },
          });
        } catch (logErr) {
          // Don't fail login if audit log fails
          console.error('Login log failed:', logErr);
        }

        // ═══════════════════════════════════════════════════════
        // 10. RETURN USER FOR SESSION
        // ═══════════════════════════════════════════════════════
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          avatar: user.avatar,
          jobTitle: user.jobTitle,
          division: user.division,
        } as any;
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      profile(profile) {
        const email = profile.email.toLowerCase();
        if (!email.endsWith(`@${ALLOWED_DOMAIN}`)) {
          throw new Error(`Only @${ALLOWED_DOMAIN} emails are allowed`);
        }
        return {
          id: profile.sub,
          email: profile.email,
          name: profile.name,
          image: profile.picture,
          role: 'MEMBER' as any,
        };
      },
    }),
  ],

  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google') {
        const email = user.email!.toLowerCase();
        if (!email.endsWith(`@${ALLOWED_DOMAIN}`)) {
          return false; // Deny signin
        }

        // Find or create user
        let dbUser = await prisma.user.findUnique({
          where: { email },
        });

        if (!dbUser) {
          const namePart = email.split('@')[0];
          const displayName = namePart
            .split(/[._-]/)
            .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
            .join(' ');
          const avatar = displayName
            .split(' ')
            .map((s) => s[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);

          dbUser = await prisma.user.create({
            data: {
              email,
              name: user.name || displayName,
              avatar,
              role: 'MEMBER',
              isActive: true,
            },
          });

          // Give default leave balances
          const currentYear = new Date().getFullYear();
          const leaveTypes = [
            { type: 'ANNUAL' as const, total: 20 },
            { type: 'SICK' as const, total: 10 },
            { type: 'CASUAL' as const, total: 7 },
            { type: 'EMERGENCY' as const, total: 5 },
          ];
          for (const lt of leaveTypes) {
            await prisma.leaveBalance.create({
              data: {
                userId: dbUser.id,
                type: lt.type,
                total: lt.total,
                used: 0,
                year: currentYear,
              },
            });
          }
        }

        if (!dbUser.isActive) {
          return false; // Deny signin
        }

        // Update lastLoginAt
        await prisma.user.update({
          where: { id: dbUser.id },
          data: { lastLoginAt: new Date() } as any,
        });

        // Log the login
        try {
          await prisma.loginLog.create({
            data: {
              userId: dbUser.id,
              email: dbUser.email,
              success: true,
            },
          });
        } catch (logErr) {
          console.error('Login log failed:', logErr);
        }

        // Attach db user id to user
        (user as any).id = dbUser.id;
        (user as any).role = dbUser.role;
        (user as any).avatar = dbUser.avatar;
        (user as any).jobTitle = dbUser.jobTitle;
        (user as any).division = dbUser.division;
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        if (account?.provider === 'google') {
          const { prisma } = require('./db');
          const dbUser = await prisma.user.findUnique({ where: { email: user.email.toLowerCase() }, select: { id: true, role: true, avatar: true, jobTitle: true, division: true } });
          if (dbUser) { token.userId = dbUser.id; token.role = dbUser.role; token.avatar = dbUser.avatar; token.jobTitle = dbUser.jobTitle; token.division = dbUser.division; }
        } else {
          token.userId = (user as any).id;
          token.role = (user as any).role;
          token.avatar = (user as any).avatar;
          token.jobTitle = (user as any).jobTitle;
          token.division = (user as any).division;
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.userId;
        (session.user as any).role = token.role;
        (session.user as any).avatar = token.avatar;
        (session.user as any).jobTitle = token.jobTitle;
        (session.user as any).division = token.division;
        (session.user as any).image = token.image;
      }
      return session;
    },
  },

  pages: {
    signIn: '/login',
    error: '/login',
  },

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  secret: process.env.NEXTAUTH_SECRET,
};

// Helper: check if user is admin
export function isAdmin(session: any): boolean {
  return session?.user?.role === 'ADMIN';
}