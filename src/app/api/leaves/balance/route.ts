// src/app/api/leaves/balance/route.ts
// Get current user's leave balance

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/session';

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;

  try {
    const { searchParams } = new URL(req.url);
    const yearParam = searchParams.get('year');
    const userIdParam = searchParams.get('userId');

    const year = yearParam ? parseInt(yearParam) : new Date().getFullYear();

    // Members see own; admins can query any user
    const targetUserId =
      user!.role === 'ADMIN' && userIdParam ? userIdParam : user!.id;

    const balances = await prisma.leaveBalance.findMany({
      where: {
        userId: targetUserId,
        year,
      },
    });

    // Map to include "remaining" field
    const enriched = balances.map((b) => ({
      ...b,
      remaining: b.total - b.used,
    }));

    // If no balances exist, return empty array with all types at 0
    if (enriched.length === 0) {
      const defaultTypes = ['ANNUAL', 'SICK', 'CASUAL', 'EMERGENCY', 'UNPAID'];
      return NextResponse.json({
        balances: defaultTypes.map((type) => ({
          type,
          total: 0,
          used: 0,
          remaining: 0,
          year,
        })),
        year,
      });
    }

    return NextResponse.json({ balances: enriched, year });
  } catch (err: any) {
    console.error('Leave balance error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}