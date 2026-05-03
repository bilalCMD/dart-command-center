import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/session';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;
  try {
    const u = user as any;
    const body = await req.json();
    const { activities, idleLogs, date } = body;
    const activityDate = date ? new Date(date) : new Date();
    const dateKey = new Date(Date.UTC(activityDate.getFullYear(), activityDate.getMonth(), activityDate.getDate()));

    if (activities?.length) {
      for (const act of activities) {
        const existing = await prisma.appActivity.findFirst({
          where: { userId: u.id, appName: act.appName, site: act.site || null, date: dateKey },
        });
        if (existing) {
          await prisma.appActivity.update({ where: { id: existing.id }, data: { seconds: { increment: act.seconds } } });
        } else {
          await prisma.appActivity.create({ data: { userId: u.id, appName: act.appName, site: act.site || null, seconds: act.seconds, date: dateKey } });
        }
      }
    }

    if (idleLogs?.length) {
      for (const idle of idleLogs) {
        await prisma.idleLog.create({ data: { userId: u.id, idleFrom: new Date(idle.idleFrom), idleTo: new Date(idle.idleTo), seconds: idle.seconds } });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Activity log error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}