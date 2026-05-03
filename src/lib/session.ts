// src/lib/session.ts
// Helper to get authenticated user in API routes

import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import { NextResponse } from 'next/server';

export async function getAuthUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return session.user;
}

export async function requireAuth() {
  const user = await getAuthUser();
  if (!user) {
    return {
      user: null,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }
  return { user, error: null };
}

export async function requireAdmin() {
  const { user, error } = await requireAuth();
  if (error) return { user: null, error };
  if (user!.role !== 'ADMIN') {
    return {
      user: null,
      error: NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 }),
    };
  }
  return { user, error: null };
}