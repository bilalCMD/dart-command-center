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
      const lastEvent = allClockEvents[allClockEvents.length - 1];
      const isCurrentlyOut = lastEvent?.type === 'CLOCK_OUT';
      const lastClockOut = isCurrentlyOut ? lastEvent : null;

      const byApp: Record<string, any> = {};
      for (const act of activities) {
        if (!byApp[act.appName]) byApp[act.appName] = { appName: act.appName, seconds: 0, sites: {} };
        byApp[act.appName].seconds += act.seconds;
        if (act.site) byApp[act.appName].sites[act.site] = (byApp[act.appName].sites[act.site] || 0) + act.seconds;
      }

      const totalIdleSeconds = calcIdleWithinSessions(idleLogs, allClockEvents);
      const totalBreakSeconds = calculateBreakSeconds(allClockEvents);
      const totalAwaySeconds = calculateAwaySeconds(allClockEvents);

      return NextResponse.json({
        member: members.find(m => m.id === userId),
        totalSeconds,
        clockIn: firstClockIn?.timestamp || null,
        clockOut: lastClockOut?.timestamp || null,
        isClockedIn: !isCurrentlyOut && !!firstClockIn,
        totalIdleSeconds,
        totalBreakSeconds,
        totalAwaySeconds,
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
        select: { userId: true, type: true, timestamp: true, note: true },
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

      // Use last event to determine current status
      const lastEvent = userClockEvents[userClockEvents.length - 1];
      const lastType: string = (lastEvent?.type as string) || 'NONE';
      const isCurrentlyActive =
        lastType === 'CLOCK_IN' ||
        lastType === 'BREAK_END' ||
        lastType === 'BREAK_START' ||
        lastType === 'AWAY_START' ||
        lastType === 'AWAY_END';
      const isOnBreak = lastType === 'BREAK_START';
      const isAway = lastType === 'AWAY_START';

      // Get away reason from note
      const lastAwayEvent = [...userClockEvents].reverse().find((e: any) => e.type === 'AWAY_START');
      const awayReason = isAway && lastAwayEvent && (lastAwayEvent as any).note ?
        String((lastAwayEvent as any).note).replace('Reason: ', '') : null;

      const totalBreakSeconds = calculateBreakSeconds(userClockEvents);
      const totalAwaySeconds = calculateAwaySeconds(userClockEvents);

      return {
        ...m,
        totalSeconds,
        totalIdleSeconds,
        totalBreakSeconds,
        totalAwaySeconds: calculateAwaySeconds(userClockEvents),
        topApp,
        isTracking: userClockEvents.some(e => e.type === 'CLOCK_IN') && totalSeconds > 0,
        isOnline: isCurrentlyActive,
        isOnBreak,
        isAway,
        awayReason,
      };
    });

    return NextResponse.json({ date: dateKey, members: memberSummary });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

function calcIdleWithinSessions(idleLogs: any[], clockEvents: any[]): number {
  // If no clock events, just sum idle logs as-is
  if (clockEvents.length === 0) {
    return Math.round(idleLogs.reduce((sum, log) => sum + (log.seconds || 0), 0));
  }

  // Build ACTIVE working sessions (CLOCK_IN/BREAK_END to BREAK_START/CLOCK_OUT)
  // This excludes break time from sessions
  const sessions: { start: number; end: number }[] = [];
  let sessStart: Date | null = null;
  for (const e of clockEvents) {
    if (e.type === 'CLOCK_IN' || e.type === 'BREAK_END') {
      if (!sessStart) sessStart = new Date(e.timestamp);
    } else if (e.type === 'BREAK_START' && sessStart) {
      sessions.push({ start: sessStart.getTime(), end: new Date(e.timestamp).getTime() });
      sessStart = null;
    } else if (e.type === 'CLOCK_OUT' && sessStart) {
      sessions.push({ start: sessStart.getTime(), end: new Date(e.timestamp).getTime() });
      sessStart = null;
    }
  }
  if (sessStart) sessions.push({ start: sessStart.getTime(), end: Date.now() });

  // Build break + AWAY periods to exclude from idle
  const breakPeriods: { start: number; end: number }[] = [];
  let breakP: Date | null = null;
  for (const e of clockEvents) {
    if (e.type === 'BREAK_START' || e.type === 'AWAY_START') {
      breakP = new Date(e.timestamp);
    } else if ((e.type === 'BREAK_END' || e.type === 'AWAY_END') && breakP) {
      breakPeriods.push({ start: breakP.getTime(), end: new Date(e.timestamp).getTime() });
      breakP = null;
    }
  }
  if (breakP) breakPeriods.push({ start: breakP.getTime(), end: Date.now() });

  // Sort and merge overlapping idle ranges
  const ranges = idleLogs
    .map(log => ({
      from: new Date(log.idleFrom).getTime(),
      to: new Date(log.idleTo).getTime(),
    }))
    .filter(r => r.to > r.from)
    .sort((a, b) => a.from - b.from);

  const merged: { from: number; to: number }[] = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && r.from <= last.to) {
      last.to = Math.max(last.to, r.to);
    } else {
      merged.push({ ...r });
    }
  }

  // Calculate overlap with active sessions, EXCLUDING break/away time
  let totalIdle = 0;
  for (const range of merged) {
    for (const s of sessions) {
      const start = Math.max(range.from, s.start);
      const end = Math.min(range.to, s.end);
      if (end > start) {
        // Subtract break/away overlaps within this idle range
        let breakOverlap = 0;
        for (const b of breakPeriods) {
          const bs = Math.max(start, b.start);
          const be = Math.min(end, b.end);
          if (be > bs) breakOverlap += (be - bs) / 1000;
        }
        const idleInSession = (end - start) / 1000 - breakOverlap;
        totalIdle += Math.max(0, idleInSession);
      }
    }
  }

  return Math.round(totalIdle);
}

function calculateBreakSeconds(events: any[]): number {
  let totalBreak = 0;
  let breakStart: Date | null = null;
  let isClockedIn = false;

  for (const e of events) {
    const t = new Date(e.timestamp);
    if (e.type === 'CLOCK_IN') {
      isClockedIn = true;
    } else if (e.type === 'CLOCK_OUT') {
      if (breakStart) {
        totalBreak += Math.floor((t.getTime() - breakStart.getTime()) / 1000);
        breakStart = null;
      }
      isClockedIn = false;
    } else if (e.type === 'BREAK_START') {
      if (isClockedIn && !breakStart) {
        breakStart = t;
      }
    } else if (e.type === 'BREAK_END' && breakStart) {
      totalBreak += Math.floor((t.getTime() - breakStart.getTime()) / 1000);
      breakStart = null;
    }
  }

  if (breakStart && isClockedIn) {
    totalBreak += Math.floor((Date.now() - breakStart.getTime()) / 1000);
  }

  return totalBreak;
}

function calculateAwaySeconds(events: any[]): number {
  let totalAway = 0;
  let awayStart: Date | null = null;
  let isClockedIn = false;

  for (const e of events) {
    const t = new Date(e.timestamp);
    if (e.type === 'CLOCK_IN') {
      isClockedIn = true;
    } else if (e.type === 'CLOCK_OUT') {
      if (awayStart) {
        totalAway += Math.floor((t.getTime() - awayStart.getTime()) / 1000);
        awayStart = null;
      }
      isClockedIn = false;
    } else if (e.type === 'AWAY_START') {
      if (!awayStart) awayStart = t;
    } else if (e.type === 'AWAY_END' && awayStart) {
      totalAway += Math.floor((t.getTime() - awayStart.getTime()) / 1000);
      awayStart = null;
    }
  }

  // 🔥 If still away right now (AWAY_START but no AWAY_END yet), count ongoing time
  if (awayStart) {
    totalAway += Math.floor((Date.now() - awayStart.getTime()) / 1000);
  }

  return totalAway;
}

// Total office time = CLOCK_IN to CLOCK_OUT including breaks
// Breaks are part of office hours, not subtracted
function calculateWorkingSeconds(events: any[]): number {
  let totalSeconds = 0;
  let sessionStart: Date | null = null;

  for (const e of events) {
    const t = new Date(e.timestamp);
    if (e.type === 'CLOCK_IN') {
      // Ignore duplicate CLOCK_IN if already in session
      if (!sessionStart) {
        sessionStart = t;
      }
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