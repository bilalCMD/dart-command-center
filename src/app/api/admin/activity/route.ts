import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/session';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;
  const u = user as any;
  if (u.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  try {
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get('date');
    const userId = searchParams.get('userId');

    const dateStr = dateParam || new Date().toISOString().split('T')[0];
    const [yyyy, mm, dd] = dateStr.split('-').map(Number);
    const dateKey = new Date(Date.UTC(yyyy, mm - 1, dd));
    const nextDay = new Date(Date.UTC(yyyy, mm - 1, dd + 1));

    const members = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, email: true, avatar: true, role: true },
      orderBy: { name: 'asc' },
    });

    if (userId) {
      const [activities, idleLogs, allClockEvents] = await Promise.all([
        prisma.appActivity.findMany({
          where: { userId, date: { gte: dateKey, lt: nextDay } },
          orderBy: { seconds: 'desc' },
        }),
        prisma.idleLog.findMany({
          where: { userId, idleFrom: { gte: dateKey, lt: nextDay } },
          orderBy: { idleFrom: 'asc' },
        }),
        prisma.clockEvent.findMany({
          where: { userId, timestamp: { gte: dateKey, lt: nextDay } },
          orderBy: { timestamp: 'asc' },
        }),
      ]);

      const totalSeconds = calculateWorkingSeconds(allClockEvents);
      const firstClockIn = allClockEvents.find(e => e.type === 'CLOCK_IN');
      const lastClockOut = [...allClockEvents].reverse().find(e => e.type === 'CLOCK_OUT');

      const byApp: Record<string, any> = {};
      for (const act of activities) {
        if (!byApp[act.appName]) byApp[act.appName] = { appName: act.appName, seconds: 0, sites: {} };
        byApp[act.appName].seconds += act.seconds;
        if (act.site) byApp[act.appName].sites[act.site] = (byApp[act.appName].sites[act.site] || 0) + act.seconds;
      }

      const totalIdleSeconds = calcIdleWithinSessions(idleLogs, allClockEvents);
      const totalBreakSeconds = calculateBreakSeconds(allClockEvents);

      return NextResponse.json({
        member: members.find(m => m.id === userId),
        totalSeconds,
        clockIn: firstClockIn?.timestamp || null,
        clockOut: lastClockOut?.timestamp || null,
        totalIdleSeconds,
        totalBreakSeconds,
        byApp: Object.values(byApp).sort((a: any, b: any) => b.seconds - a.seconds),
        idleLogs,
      });
    }

    const [allActivities, allIdle, allClockEvents] = await Promise.all([
      prisma.appActivity.findMany({
        where: { date: { gte: dateKey, lt: nextDay } },
        select: { userId: true, seconds: true, appName: true },
      }),
      prisma.idleLog.findMany({
        where: { idleFrom: { gte: dateKey, lt: nextDay } },
        select: { userId: true, seconds: true, idleFrom: true, idleTo: true },
      }),
      prisma.clockEvent.findMany({
        where: { timestamp: { gte: dateKey, lt: nextDay } },
        select: { userId: true, type: true, timestamp: true },
        orderBy: { timestamp: 'asc' },
      }),
    ]);

    const memberSummary = members.map(m => {
      const acts = allActivities.filter(a => a.userId === m.id);
      const idles = allIdle.filter(i => i.userId === m.id);
      const userClockEvents = allClockEvents.filter(e => e.userId === m.id);

      const totalSeconds = calculateWorkingSeconds(userClockEvents);
      const totalIdleSeconds = calcIdleWithinSessions(idles, userClockEvents);
      const topApp = [...acts].sort((a, b) => b.seconds - a.seconds)[0]?.appName || null;

      // Use last event to determine current status (handles multiple sessions in a day)
      const lastEvent = userClockEvents[userClockEvents.length - 1];
      const isCurrentlyActive =
        lastEvent?.type === 'CLOCK_IN' ||
        lastEvent?.type === 'BREAK_END' ||
        lastEvent?.type === 'BREAK_START';

      return {
        ...m,
        totalSeconds,
        totalIdleSeconds,
        topApp,
        isTracking: userClockEvents.some(e => e.type === 'CLOCK_IN') && totalSeconds > 0,
        isOnline: isCurrentlyActive,
      };
    });

    return NextResponse.json({ date: dateKey, members: memberSummary });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

function calcIdleWithinSessions(idleLogs: any[], clockEvents: any[]): number {
  const sessions: { start: number; end: number }[] = [];
  let sessStart: Date | null = null;
  for (const e of clockEvents) {
    if (e.type === 'CLOCK_IN') {
      sessStart = new Date(e.timestamp);
    } else if (e.type === 'CLOCK_OUT' && sessStart) {
      sessions.push({ start: sessStart.getTime(), end: new Date(e.timestamp).getTime() });
      sessStart = null;
    }
  }
  if (sessStart) sessions.push({ start: sessStart.getTime(), end: Date.now() });

  return Math.round(idleLogs.reduce((sum, log) => {
    const from = new Date(log.idleFrom).getTime();
    const to   = new Date(log.idleTo).getTime();
    let overlap = 0;
    for (const s of sessions) {
      const start = Math.max(from, s.start);
      const end   = Math.min(to, s.end);
      if (end > start) overlap += (end - start) / 1000;
    }
    return sum + overlap;
  }, 0));
}

function calculateBreakSeconds(events: any[]): number {
  let totalBreak = 0;
  let breakStart: Date | null = null;
  for (const e of events) {
    const t = new Date(e.timestamp);
    if (e.type === 'BREAK_START') {
      breakStart = t;
    } else if (e.type === 'BREAK_END' && breakStart) {
      totalBreak += Math.floor((t.getTime() - breakStart.getTime()) / 1000);
      breakStart = null;
    } else if (e.type === 'CLOCK_OUT' && breakStart) {
      totalBreak += Math.floor((t.getTime() - breakStart.getTime()) / 1000);
      breakStart = null;
    }
  }
  if (breakStart) {
    totalBreak += Math.floor((Date.now() - breakStart.getTime()) / 1000);
  }
  return totalBreak;
}

// Total office time = CLOCK_IN to CLOCK_OUT including breaks
// Breaks are part of office hours, not subtracted
function calculateWorkingSeconds(events: any[]): number {
  let totalSeconds = 0;
  let sessionStart: Date | null = null;

  for (const e of events) {
    const t = new Date(e.timestamp);
    if (e.type === 'CLOCK_IN') {
      sessionStart = t;
    } else if (e.type === 'CLOCK_OUT' && sessionStart) {
      totalSeconds += Math.floor((t.getTime() - sessionStart.getTime()) / 1000);
      sessionStart = null;
    }
  }

  if (sessionStart) {
    const elapsed = Math.floor((Date.now() - sessionStart.getTime()) / 1000);
    totalSeconds += Math.min(elapsed, 12 * 60 * 60);
  }

  return totalSeconds;
}