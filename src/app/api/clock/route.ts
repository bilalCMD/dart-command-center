import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/session';
import { z } from 'zod';

const clockSchema = z.object({
  type: z.enum(['CLOCK_IN', 'CLOCK_OUT', 'BREAK_START', 'BREAK_END']),
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
      where: { userId: user!.id, timestamp: { gte: since }, type: { in: ['CLOCK_IN', 'CLOCK_OUT', 'BREAK_START', 'BREAK_END'] } },
      orderBy: { timestamp: 'desc' },
    });
    const lastType = lastEvent?.type || 'NONE';

    if (type === 'CLOCK_IN') {
      // No auto clock-out — just allow clock in
      if (lastType === 'BREAK_START') {
        await prisma.clockEvent.create({ data: { userId: user!.id, type: 'BREAK_END', note: 'Auto: end break' } });
      }
    } else if (type === 'CLOCK_OUT') {
      if (lastType === 'CLOCK_OUT' || lastType === 'NONE') {
        return NextResponse.json({ event: null, todaySummary: { workingSeconds: 0, breakSeconds: 0, totalSeconds: 0, isClockedIn: false, isOnBreak: false }, message: 'Already clocked out' });
      }
      if (lastType === 'BREAK_START') {
        await prisma.clockEvent.create({ data: { userId: user!.id, type: 'BREAK_END', note: 'Auto: end break before clock-out' } });
      }
    } else if (type === 'BREAK_START') {
      if (lastType === 'NONE' || lastType === 'CLOCK_OUT') {
        await prisma.clockEvent.create({ data: { userId: user!.id, type: 'CLOCK_IN', note: 'Auto: clock-in before break' } });
      } else if (lastType === 'BREAK_START') {
        return NextResponse.json({ event: null, todaySummary: { workingSeconds: 0, breakSeconds: 0, totalSeconds: 0, isClockedIn: true, isOnBreak: true }, message: 'Already on break' });
      }
    } else if (type === 'BREAK_END') {
      if (lastType !== 'BREAK_START') {
        return NextResponse.json({ event: null, todaySummary: { workingSeconds: 0, breakSeconds: 0, totalSeconds: 0, isClockedIn: lastType === 'CLOCK_IN' || lastType === 'BREAK_END', isOnBreak: false }, message: 'No active break' });
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