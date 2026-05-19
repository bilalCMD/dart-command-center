import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/session';
import { z } from 'zod';

const clockSchema = z.object({
  type: z.enum(['CLOCK_IN', 'CLOCK_OUT', 'BREAK_START', 'BREAK_END', 'AWAY_START', 'AWAY_END']),
  note: z.string().optional(),
});

async function getShiftCutoff(userId: string): Promise<Date> {
  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  return cutoff;
}

function calculateToday(events: any[]) {
  let workingSeconds = 0, breakSeconds = 0;
  let workStart: Date | null = null, breakStart: Date | null = null;
  for (const e of events) {
    const t = new Date(e.timestamp);
    if (e.type === 'CLOCK_IN') workStart = t;
    else if (e.type === 'BREAK_START' && workStart) {
      workingSeconds += Math.floor((t.getTime() - workStart.getTime()) / 1000);
      workStart = null; breakStart = t;
    } else if (e.type === 'BREAK_END' && breakStart) {
      breakSeconds += Math.floor((t.getTime() - breakStart.getTime()) / 1000);
      breakStart = null; workStart = t;
    } else if (e.type === 'CLOCK_OUT') {
      if (workStart) { workingSeconds += Math.floor((t.getTime() - workStart.getTime()) / 1000); workStart = null; }
      if (breakStart) { breakSeconds += Math.floor((t.getTime() - breakStart.getTime()) / 1000); breakStart = null; }
    }
  }
  const now = Date.now();
  if (workStart) workingSeconds += Math.floor((now - workStart.getTime()) / 1000);
  if (breakStart) breakSeconds += Math.floor((now - breakStart.getTime()) / 1000);
  return { workingSeconds, breakSeconds };
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;
  try {
    const body = await req.json();
    const parsed = clockSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

    const { type, note } = parsed.data;
    const since = await getShiftCutoff(user!.id);

    const lastEvent = await prisma.clockEvent.findFirst({
      where: { userId: user!.id, timestamp: { gte: since }, type: { in: ['CLOCK_IN', 'CLOCK_OUT', 'BREAK_START', 'BREAK_END', 'AWAY_START', 'AWAY_END'] } },
      orderBy: { timestamp: 'desc' },
    });
    const lastType = (lastEvent?.type || 'NONE') as string;

  // 🔒 STRICT MODE - No automatic event creation
    // Only allow valid state transitions
    
    if (type === 'CLOCK_IN') {
      // Already clocked in? Return success silently (no duplicate)
      if (lastType === 'CLOCK_IN' || lastType === 'BREAK_END' || lastType === 'AWAY_END') {
        return NextResponse.json({
          event: lastEvent,
          todaySummary: { workingSeconds: 0, breakSeconds: 0, totalSeconds: 0, isClockedIn: true, isOnBreak: false },
          message: 'Already clocked in',
        });
      }
      // On break? Don't allow clock-in (user must end break first)
      if (lastType === 'BREAK_START') {
        return NextResponse.json({
          event: lastEvent,
          todaySummary: { workingSeconds: 0, breakSeconds: 0, totalSeconds: 0, isClockedIn: true, isOnBreak: true },
          message: 'You are on break',
        });
      }
      // On AWAY? Don't allow clock-in (user must end away first)
      if (lastType === 'AWAY_START') {
        return NextResponse.json({
          event: lastEvent,
          todaySummary: { workingSeconds: 0, breakSeconds: 0, totalSeconds: 0, isClockedIn: true, isOnBreak: false },
          message: 'You are away - end away first',
        });
      }
    }
    else if (type === 'CLOCK_OUT') {
      // Already out? Silent success
      if (lastType === 'CLOCK_OUT' || lastType === 'NONE') {
        return NextResponse.json({
          event: null,
          todaySummary: { workingSeconds: 0, breakSeconds: 0, totalSeconds: 0, isClockedIn: false, isOnBreak: false },
          message: 'Already clocked out',
        });
      }
      // On break? Allow direct clock-out (no auto break-end)
    }
    else if (type === 'BREAK_START') {
      // Not clocked in? Reject silently
      if (lastType === 'NONE' || lastType === 'CLOCK_OUT') {
        return NextResponse.json({
          event: null,
          todaySummary: { workingSeconds: 0, breakSeconds: 0, totalSeconds: 0, isClockedIn: false, isOnBreak: false },
          message: 'Not clocked in - please clock in first',
        }, { status: 200 });
      }
      // Already on break? Silent success
      if (lastType === 'BREAK_START') {
        return NextResponse.json({
          event: lastEvent,
          todaySummary: { workingSeconds: 0, breakSeconds: 0, totalSeconds: 0, isClockedIn: true, isOnBreak: true },
          message: 'Already on break',
        });
      }
    }
    else if (type === 'BREAK_END') {
      // Not on break? Silent success
      if (lastType !== 'BREAK_START') {
        return NextResponse.json({
          event: null,
          todaySummary: { workingSeconds: 0, breakSeconds: 0, totalSeconds: 0, isClockedIn: lastType === 'CLOCK_IN' || lastType === 'BREAK_END', isOnBreak: false },
          message: 'No active break',
        });
      }
    }
    else if (type === 'AWAY_START') {
      // Not clocked in? Reject silently
      if (lastType === 'NONE' || lastType === 'CLOCK_OUT') {
        return NextResponse.json({
          event: null,
          todaySummary: { workingSeconds: 0, breakSeconds: 0, totalSeconds: 0, isClockedIn: false, isOnBreak: false },
          message: 'Not clocked in - please clock in first',
        });
      }
      // Already away? Silent success
      if (lastType === 'AWAY_START') {
        return NextResponse.json({
          event: lastEvent,
          todaySummary: { workingSeconds: 0, breakSeconds: 0, totalSeconds: 0, isClockedIn: true, isOnBreak: false },
          message: 'Already away',
        });
      }
    }
    else if (type === 'AWAY_END') {
      // Not away? Silent success
      if (lastType !== 'AWAY_START') {
        return NextResponse.json({
          event: null,
          todaySummary: { workingSeconds: 0, breakSeconds: 0, totalSeconds: 0, isClockedIn: lastType === 'CLOCK_IN' || lastType === 'BREAK_END' || lastType === 'AWAY_END', isOnBreak: false },
          message: 'Not away',
        });
      }
    }

    const event = await prisma.clockEvent.create({ data: { userId: user!.id, type, note } });
    const todayEvents = await prisma.clockEvent.findMany({ where: { userId: user!.id, timestamp: { gte: since } }, orderBy: { timestamp: 'asc' } });
    const { workingSeconds, breakSeconds } = calculateToday(todayEvents);
    const onBreak = type === 'BREAK_START';
    const clockedIn = type === 'CLOCK_IN' || type === 'BREAK_END' || onBreak;

    return NextResponse.json({ event, todaySummary: { workingSeconds, breakSeconds, totalSeconds: workingSeconds, isClockedIn: clockedIn, isOnBreak: onBreak } });
  } catch (err: any) {
    console.error('Clock error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;
  try {
    const { searchParams } = new URL(req.url);
    const targetUserId = user!.role === 'ADMIN' && searchParams.get('userId') ? searchParams.get('userId')! : user!.id;
    const from = searchParams.get('from') ? new Date(searchParams.get('from')!) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const to = searchParams.get('to') ? new Date(searchParams.get('to')!) : new Date();
    const events = await prisma.clockEvent.findMany({ where: { userId: targetUserId, timestamp: { gte: from, lte: to } }, orderBy: { timestamp: 'desc' } });
    return NextResponse.json({ events, count: events.length });
  } catch (err: any) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}