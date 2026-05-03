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
    const targetDate = dateParam ? new Date(dateParam) : new Date();
    const dateKey = new Date(Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()));
    const nextDay = new Date(dateKey);
    nextDay.setDate(nextDay.getDate() + 1);

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

      // Calculate actual working time from clock events
      let totalSeconds = calculateWorkingSeconds(allClockEvents);
      
      // Fallback to activity data if no clock data
      if (totalSeconds === 0) {
        totalSeconds = activities.reduce((s, a) => s + a.seconds, 0);
      }

      const firstClockIn = allClockEvents.find(e => e.type === 'CLOCK_IN');
      const lastClockOut = [...allClockEvents].reverse().find(e => e.type === 'CLOCK_OUT');

      const byApp: Record<string, any> = {};
      for (const act of activities) {
        if (!byApp[act.appName]) byApp[act.appName] = { appName: act.appName, seconds: 0, sites: {} };
        byApp[act.appName].seconds += act.seconds;
        if (act.site) byApp[act.appName].sites[act.site] = (byApp[act.appName].sites[act.site] || 0) + act.seconds;
      }

      return NextResponse.json({
        member: members.find(m => m.id === userId),
        totalSeconds,
        clockIn: firstClockIn?.timestamp || null,
        clockOut: lastClockOut?.timestamp || null,
        totalIdleSeconds: idleLogs.reduce((s, i) => s + i.seconds, 0),
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
        select: { userId: true, seconds: true },
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

      let totalSeconds = calculateWorkingSeconds(userClockEvents);
      if (totalSeconds === 0) {
        totalSeconds = acts.reduce((s, a) => s + a.seconds, 0);
      }

      const totalIdleSeconds = idles.reduce((s, i) => s + i.seconds, 0);
      const topApp = [...acts].sort((a, b) => b.seconds - a.seconds)[0]?.appName || null;
      return { ...m, totalSeconds, totalIdleSeconds, topApp, isTracking: totalSeconds > 0 };
    });

    return NextResponse.json({ date: dateKey, members: memberSummary });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

function calculateWorkingSeconds(events: any[]): number {
  let totalSeconds = 0;
  let workStart: Date | null = null;
  let breakStart: Date | null = null;

  for (const e of events) {
    const t = new Date(e.timestamp);
    if (e.type === 'CLOCK_IN') {
      workStart = t;
    } else if (e.type === 'BREAK_START' && workStart) {
      totalSeconds += Math.floor((t.getTime() - workStart.getTime()) / 1000);
      workStart = null;
      breakStart = t;
    } else if (e.type === 'BREAK_END' && breakStart) {
      breakStart = null;
      workStart = t;
    } else if (e.type === 'CLOCK_OUT') {
      if (workStart) {
        totalSeconds += Math.floor((t.getTime() - workStart.getTime()) / 1000);
        workStart = null;
      }
      breakStart = null;
    }
  }

  // Still clocked in - add ongoing time
  if (workStart) {
    totalSeconds += Math.floor((Date.now() - workStart.getTime()) / 1000);
  }

  return totalSeconds;
}