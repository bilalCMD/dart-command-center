// src/app/api/clock/route.ts
// Clock in / out + Break tracking API

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/session';
import { z } from 'zod';

const clockSchema = z.object({
  type: z.enum(['CLOCK_IN', 'CLOCK_OUT', 'BREAK_START', 'BREAK_END']),
  note: z.string().optional(),
});

// Sequence validation: which events are allowed after each
const ALLOWED_NEXT: Record<string, string[]> = {
  NONE: ['CLOCK_IN'],
  CLOCK_IN: ['BREAK_START', 'CLOCK_OUT'],
  BREAK_START: ['BREAK_END'],
  BREAK_END: ['BREAK_START', 'CLOCK_OUT'],
  CLOCK_OUT: ['CLOCK_IN'],
};

// Friendly error messages for invalid sequences
function getSequenceError(lastType: string | null, requestedType: string): string {
  if (!lastType && requestedType !== 'CLOCK_IN') {
    return 'You need to clock in first.';
  }
  if (lastType === 'CLOCK_IN' && requestedType === 'CLOCK_IN') {
    return 'Already clocked in.';
  }
  if (lastType === 'CLOCK_OUT' && requestedType === 'CLOCK_OUT') {
    return 'Already clocked out.';
  }
  if (lastType === 'BREAK_START' && requestedType === 'BREAK_START') {
    return 'Already on break. End the current break first.';
  }
  if (lastType === 'BREAK_START' && requestedType === 'CLOCK_IN') {
    return 'You are on break. End the break first.';
  }
  if (lastType === 'BREAK_START' && requestedType === 'CLOCK_OUT') {
    return 'You are on break. End the break before clocking out.';
  }
  if (lastType === 'BREAK_END' && requestedType === 'BREAK_END') {
    return 'No active break to end.';
  }
  if (lastType === 'CLOCK_OUT' && requestedType === 'BREAK_START') {
    return 'Clock in first before taking a break.';
  }
  if (lastType === 'CLOCK_OUT' && requestedType === 'BREAK_END') {
    return 'You are not clocked in.';
  }
  if ((!lastType || lastType === 'CLOCK_OUT') && requestedType === 'BREAK_END') {
    return 'No active break to end.';
  }
  return 'Invalid action for current state.';
}
async function getShiftCutoff(userId: string): Promise<Date> {
  const empSettings = await prisma.employeeSettings.findUnique({ where: { userId } });
  const shiftStart = empSettings?.workStartTime || '09:00';
  const [hours, minutes] = shiftStart.split(':').map(Number);
  const now = new Date();
  const cutoff = new Date();
  cutoff.setHours(hours, minutes, 0, 0);
  if (now < cutoff) {
    cutoff.setDate(cutoff.getDate() - 1);
  }
  return cutoff;
}
// Calculate today's working time + break time
function calculateToday(events: any[]) {
  let workingSeconds = 0;
  let breakSeconds = 0;
  let workStart: Date | null = null;
  let breakStart: Date | null = null;

  for (const e of events) {
    const t = new Date(e.timestamp);
    if (e.type === 'CLOCK_IN') {
      workStart = t;
    } else if (e.type === 'BREAK_START' && workStart) {
      // Pause working timer
      workingSeconds += Math.floor((t.getTime() - workStart.getTime()) / 1000);
      workStart = null;
      breakStart = t;
    } else if (e.type === 'BREAK_END' && breakStart) {
      // Pause break timer, resume work
      breakSeconds += Math.floor((t.getTime() - breakStart.getTime()) / 1000);
      breakStart = null;
      workStart = t;
    } else if (e.type === 'CLOCK_OUT') {
      if (workStart) {
        workingSeconds += Math.floor((t.getTime() - workStart.getTime()) / 1000);
        workStart = null;
      }
      if (breakStart) {
        breakSeconds += Math.floor((t.getTime() - breakStart.getTime()) / 1000);
        breakStart = null;
      }
    }
  }

  // If still running, add ongoing time
  const now = Date.now();
  if (workStart) {
    workingSeconds += Math.floor((now - workStart.getTime()) / 1000);
  }
  if (breakStart) {
    breakSeconds += Math.floor((now - breakStart.getTime()) / 1000);
  }

  return { workingSeconds, breakSeconds };
}

// ═══════════════════════════════════════════════════════════
// POST /api/clock — Clock in/out OR Break start/end
// ═══════════════════════════════════════════════════════════
export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;

  try {
    const body = await req.json();
    const parsed = clockSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { type, note } = parsed.data;

    // Get last event TODAY
// Get last event within 20 hours (handles night shifts crossing midnight)
    const since = await getShiftCutoff(user!.id);

    const lastEvent = await prisma.clockEvent.findFirst({
      where: {
        userId: user!.id,
        timestamp: { gte: since },
        type: { in: ['CLOCK_IN', 'CLOCK_OUT', 'BREAK_START', 'BREAK_END'] },
      },
      orderBy: { timestamp: 'desc' },
    });
    const lastType = lastEvent?.type || 'NONE';

    // Validate sequence
    const allowedNext = ALLOWED_NEXT[lastType] || [];
    if (!allowedNext.includes(type)) {
      return NextResponse.json(
        { error: getSequenceError(lastEvent?.type || null, type) },
        { status: 400 }
      );
    }

    // Create event
    const event = await prisma.clockEvent.create({
      data: { userId: user!.id, type, note },
    });

    // Calculate today summary after this event
const todayEvents = await prisma.clockEvent.findMany({
      where: { userId: user!.id, timestamp: { gte: since } },
      orderBy: { timestamp: 'asc' },
    });

    const { workingSeconds, breakSeconds } = calculateToday(todayEvents);

    // Determine current state
    const onBreak = type === 'BREAK_START';
    const clockedIn = type === 'CLOCK_IN' || type === 'BREAK_END' || onBreak;

    return NextResponse.json({
      event,
      todaySummary: {
        workingSeconds,
        breakSeconds,
        totalSeconds: workingSeconds, // working only (break excluded)
        isClockedIn: clockedIn,
        isOnBreak: onBreak,
      },
    });
  } catch (err: any) {
    console.error('Clock error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// ═══════════════════════════════════════════════════════════
// GET /api/clock — Get clock history
// ═══════════════════════════════════════════════════════════
export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;

  try {
    const { searchParams } = new URL(req.url);
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');
    const userIdParam = searchParams.get('userId');

    const targetUserId =
      user!.role === 'ADMIN' && userIdParam ? userIdParam : user!.id;

    const from = fromParam
      ? new Date(fromParam)
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const to = toParam ? new Date(toParam) : new Date();

    const events = await prisma.clockEvent.findMany({
      where: {
        userId: targetUserId,
        timestamp: { gte: from, lte: to },
      },
      orderBy: { timestamp: 'desc' },
    });

    return NextResponse.json({ events, count: events.length });
  } catch (err: any) {
    console.error('Clock GET error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}