import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/session';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;
  try {
    const u = user as any;
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get('date');
    const targetDate = dateParam ? new Date(dateParam) : new Date();
    const dateKey = new Date(Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()));
    const nextDay = new Date(dateKey);
    nextDay.setDate(nextDay.getDate() + 1);

    const [activities, idleLogs] = await Promise.all([
      prisma.appActivity.findMany({
        where: { userId: u.id, date: { gte: dateKey, lt: nextDay } },
        orderBy: { seconds: 'desc' },
      }),
      prisma.idleLog.findMany({
        where: { userId: u.id, idleFrom: { gte: dateKey, lt: nextDay } },
        orderBy: { idleFrom: 'asc' },
      }),
    ]);

    const byApp: Record<string, any> = {};
    for (const act of activities) {
      if (!byApp[act.appName]) byApp[act.appName] = { appName: act.appName, seconds: 0, sites: {} };
      byApp[act.appName].seconds += act.seconds;
      if (act.site) byApp[act.appName].sites[act.site] = (byApp[act.appName].sites[act.site] || 0) + act.seconds;
    }

    return NextResponse.json({
      date: dateKey,
      totalSeconds: activities.reduce((s, a) => s + a.seconds, 0),
      totalIdleSeconds: idleLogs.reduce((s, i) => s + i.seconds, 0),
      byApp: Object.values(byApp).sort((a: any, b: any) => b.seconds - a.seconds),
      idleLogs,
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}