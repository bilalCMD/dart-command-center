// src/app/api/clock/today/route.ts
// Get today's clock + break status for current user

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/session';

export async function GET() {
  const { user, error } = await requireAuth();
  if (error) return error;

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const events = await prisma.clockEvent.findMany({
      where: {
        userId: user!.id,
        timestamp: { gte: today },
      },
      orderBy: { timestamp: 'asc' },
    });

    let workingSeconds = 0;
    let breakSeconds = 0;
    let sessionStart: Date | null = null;
    let breakStart: Date | null = null;
    let firstClockIn: Date | null = null;
    let isClockedInLocal = false;

    for (const e of events) {
      const t = new Date(e.timestamp);
      if (e.type === 'CLOCK_IN') {
        if (!firstClockIn) firstClockIn = t;
        isClockedInLocal = true;
        if (!sessionStart) {
          sessionStart = t;
        }
      } else if (e.type === 'BREAK_START') {
        if (isClockedInLocal && !breakStart) breakStart = t;
      } else if (e.type === 'BREAK_END' && breakStart) {
        breakSeconds += Math.floor((t.getTime() - breakStart.getTime()) / 1000);
        breakStart = null;
      } else if (e.type === 'CLOCK_OUT') {
        if (sessionStart) {
          workingSeconds += Math.floor((t.getTime() - sessionStart.getTime()) / 1000);
          sessionStart = null;
        }
        if (breakStart) {
          breakSeconds += Math.floor((t.getTime() - breakStart.getTime()) / 1000);
          breakStart = null;
        }
        isClockedInLocal = false;
      }
    }

    const now = Date.now();
    if (sessionStart) {
      const elapsed = Math.floor((now - sessionStart.getTime()) / 1000);
      workingSeconds += Math.min(elapsed, 12 * 60 * 60);
    }

    const lastEvent = events[events.length - 1];
    const isOnBreak = lastEvent?.type === 'BREAK_START';
    const isAway = lastEvent?.type === 'AWAY_START';
    const isClockedIn =
      lastEvent?.type === 'CLOCK_IN' ||
      lastEvent?.type === 'BREAK_END' ||
      lastEvent?.type === 'AWAY_END' ||
      isOnBreak ||
      isAway;

    let currentSessionStart: Date | null = null;
    if (isClockedIn && !isOnBreak) {
      for (let i = events.length - 1; i >= 0; i--) {
        if (events[i].type === 'CLOCK_IN' || events[i].type === 'BREAK_END') {
          currentSessionStart = new Date(events[i].timestamp);
          break;
        }
      }
    }

    let currentBreakStart: Date | null = null;
    if (isOnBreak) {
      currentBreakStart = new Date(lastEvent.timestamp);
    }

    const breakCount = events.filter((e) => e.type === 'BREAK_START').length;

    const clockSessions: { start: number; end: number }[] = [];
    let sessStart: Date | null = null;
    for (const e of events) {
      if (e.type === 'CLOCK_IN' || e.type === 'BREAK_END') {
        sessStart = new Date(e.timestamp);
      } else if (e.type === 'BREAK_START' && sessStart) {
        clockSessions.push({ start: sessStart.getTime(), end: new Date(e.timestamp).getTime() });
        sessStart = null;
      } else if (e.type === 'CLOCK_OUT' && sessStart) {
        clockSessions.push({ start: sessStart.getTime(), end: new Date(e.timestamp).getTime() });
        sessStart = null;
      }
    }
    if (sessStart) {
      clockSessions.push({ start: sessStart.getTime(), end: Date.now() });
    }

    const idleLogs = await prisma.idleLog.findMany({
      where: { userId: user!.id, idleFrom: { gte: today } },
      orderBy: { idleFrom: 'asc' },
      select: { idleFrom: true, idleTo: true, seconds: true },
    });

    const breakPeriods: { start: number; end: number }[] = [];
    let breakP: Date | null = null;
    for (const e of events) {
      if (e.type === 'BREAK_START' || e.type === 'AWAY_START') {
        breakP = new Date(e.timestamp);
      } else if ((e.type === 'BREAK_END' || e.type === 'AWAY_END') && breakP) {
        breakPeriods.push({ start: breakP.getTime(), end: new Date(e.timestamp).getTime() });
        breakP = null;
      }
    }
    if (breakP) breakPeriods.push({ start: breakP.getTime(), end: Date.now() });

    const idleSeconds = Math.round(idleLogs.reduce((sum, log) => {
      const from = new Date(log.idleFrom).getTime();
      const to = new Date(log.idleTo).getTime();
      let overlap = 0;
      for (const s of clockSessions) {
        const start = Math.max(from, s.start);
        const end = Math.min(to, s.end);
        if (end > start) {
          let breakOverlap = 0;
          for (const b of breakPeriods) {
            const bs = Math.max(start, b.start);
            const be = Math.min(end, b.end);
            if (be > bs) breakOverlap += (be - bs) / 1000;
          }
          overlap += (end - start) / 1000 - breakOverlap;
        }
      }
      return sum + Math.max(0, overlap);
    }, 0));

    return NextResponse.json({
      isClockedIn,
      isOnBreak,
      isAway,
      workingSeconds,
      breakSeconds,
      totalSeconds: workingSeconds,
      clockInTime: firstClockIn,
      currentSessionStart,
      currentBreakStart,
      breakCount,
      eventCount: events.length,
      idleSeconds,
      idleLogs,
      events,
    });
  } catch (err: any) {
    console.error('Today status error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}