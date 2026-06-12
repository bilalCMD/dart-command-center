import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Auto clock-out for forgotten clock-outs.
// Intended to be called hourly by Vercel Cron. When a user's session has been
// open for >= 24h (i.e. they forgot to clock out), it is closed automatically
// with a CLOCK_OUT placed at clock-in + that user's average daily hours — so
// the day reflects a fair estimate instead of a ballooning 24h+ total.
//
// Add `?dryRun=1` to preview what would be closed without writing anything.

const AUTO_CLOSE_AFTER_HOURS = 24; // session open this long = forgotten clock-out
const MAX_CLEAN_HOURS = 14;        // sessions longer than this are themselves forgotten
const HISTORY_DAYS = 60;           // window used to compute the average daily hours

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization');
  // Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` automatically.
  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dryRun = new URL(req.url).searchParams.get('dryRun') === '1';
  const now = Date.now();
  const historyFrom = new Date(now - HISTORY_DAYS * 24 * 3600 * 1000);

  try {
    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        dailyTargetHours: true,
        clockEvents: {
          where: { type: { in: ['CLOCK_IN', 'CLOCK_OUT'] }, timestamp: { gte: historyFrom } },
          orderBy: { timestamp: 'asc' },
          select: { id: true, type: true, timestamp: true },
        },
      },
    });

    const closed: any[] = [];

    for (const user of users) {
      // Find the trailing OPEN session (last event is a CLOCK_IN).
      let openSince: Date | null = null;
      for (const e of user.clockEvents) {
        if (e.type === 'CLOCK_IN') openSince = e.timestamp;
        else if (e.type === 'CLOCK_OUT') openSince = null;
      }
      if (!openSince) continue;

      const openHours = (now - openSince.getTime()) / 3.6e6;
      if (openHours < AUTO_CLOSE_AFTER_HOURS) continue; // still within a plausible (long) shift

      // Average daily hours from clean days (sessions <= MAX_CLEAN_HOURS).
      const cleanByDate: Record<string, number> = {};
      let cur: Date | null = null;
      for (const e of user.clockEvents) {
        if (e.type === 'CLOCK_IN') cur = e.timestamp;
        else if (e.type === 'CLOCK_OUT' && cur) {
          const sec = (e.timestamp.getTime() - cur.getTime()) / 1000;
          if (sec > 0 && sec <= MAX_CLEAN_HOURS * 3600) {
            const key = cur.toISOString().split('T')[0];
            cleanByDate[key] = (cleanByDate[key] || 0) + sec;
          }
          cur = null;
        }
      }
      const totals = Object.values(cleanByDate).filter(v => v > 0);
      const targetHours = user.dailyTargetHours ?? 8;
      const avgSeconds = totals.length
        ? Math.round(totals.reduce((a, b) => a + b, 0) / totals.length)
        : Math.round(targetHours * 3600);

      const clockOutAt = new Date(openSince.getTime() + avgSeconds * 1000);

      const record = {
        userId: user.id,
        name: user.name,
        clockIn: openSince.toISOString(),
        openHours: +openHours.toFixed(1),
        avgHours: +(avgSeconds / 3600).toFixed(2),
        clockOutAt: clockOutAt.toISOString(),
      };

      if (!dryRun) {
        // Idempotency guard: only insert if nothing closed it in the meantime.
        const already = await prisma.clockEvent.findFirst({
          where: { userId: user.id, type: 'CLOCK_OUT', timestamp: { gt: openSince } },
        });
        if (already) continue;
        await prisma.clockEvent.create({
          data: {
            userId: user.id,
            type: 'CLOCK_OUT',
            timestamp: clockOutAt,
            note: 'Auto clock-out — forgotten clock-out (open >= 24h), set to average daily hours',
          },
        });
      }
      closed.push(record);
    }

    return NextResponse.json({ success: true, dryRun, closedCount: closed.length, closed });
  } catch (err: any) {
    console.error('Auto clock-out error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
