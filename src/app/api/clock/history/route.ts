import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/session';

const PKT_OFFSET = 5 * 60; // PKT = UTC+5 in minutes

function toPKTDateKey(date: Date): string {
  const pkt = new Date(date.getTime() + PKT_OFFSET * 60 * 1000);
  const y = pkt.getUTCFullYear();
  const m = String(pkt.getUTCMonth() + 1).padStart(2, '0');
  const d = String(pkt.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function pktMidnight(daysAgo: number): Date {
  const now = new Date();
  const pktNow = new Date(now.getTime() + PKT_OFFSET * 60 * 1000);
  pktNow.setUTCHours(0, 0, 0, 0);
  pktNow.setUTCDate(pktNow.getUTCDate() - daysAgo);
  return new Date(pktNow.getTime() - PKT_OFFSET * 60 * 1000);
}

export async function GET(req: Request) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const filter = searchParams.get('filter') || 'week';

  try {
    const totalDays = filter === 'day' ? 1 : filter === 'week' ? 7 : 30;
    const startDate = pktMidnight(totalDays - 1);

    const events = await prisma.clockEvent.findMany({
      where: {
        userId: user!.id,
        timestamp: { gte: startDate },
      },
      orderBy: { timestamp: 'asc' },
    });

    const now = new Date();
    const todayKey = toPKTDateKey(now);

    // Build dayMap
    const dayMap: Record<string, {
      date: string;
      label: string;
      seconds: number;
      sessions: { clockIn: string; clockOut: string | null; duration: number }[];
    }> = {};

    for (let i = totalDays - 1; i >= 0; i--) {
      const d = pktMidnight(i);
      const key = toPKTDateKey(d);
      dayMap[key] = {
        date: key,
        label: new Date(d.getTime() + PKT_OFFSET * 60 * 1000).toLocaleDateString('en-US', {
          weekday: 'short',
          ...(filter === 'month' ? { day: 'numeric' } : {}),
        }),
        seconds: 0,
        sessions: [],
      };
    }

    // Group by PKT date
    const eventsByDay: Record<string, typeof events> = {};
    for (const e of events) {
      const key = toPKTDateKey(new Date(e.timestamp));
      if (!eventsByDay[key]) eventsByDay[key] = [];
      eventsByDay[key].push(e);
    }

    // Process sessions
    for (const [date, dayEvents] of Object.entries(eventsByDay)) {
      if (!dayMap[date]) continue;

      let activeSince: Date | null = null;
      let totalSeconds = 0;

      for (const e of dayEvents) {
        if (e.type === 'CLOCK_IN') {
          activeSince = new Date(e.timestamp);
        } else if (e.type === 'CLOCK_OUT' && activeSince) {
          const dur = Math.floor(
            (new Date(e.timestamp).getTime() - activeSince.getTime()) / 1000
          );
          totalSeconds += dur;
          dayMap[date].sessions.push({
            clockIn: activeSince.toISOString(),
            clockOut: new Date(e.timestamp).toISOString(),
            duration: dur,
          });
          activeSince = null;
        }
      }

      if (activeSince && date === todayKey) {
        const dur = Math.floor((Date.now() - activeSince.getTime()) / 1000);
        totalSeconds += dur;
        dayMap[date].sessions.push({
          clockIn: activeSince.toISOString(),
          clockOut: null,
          duration: dur,
        });
      }

      dayMap[date].seconds = totalSeconds;
    }

    const days = Object.values(dayMap);
    const totalSeconds = days.reduce((sum, d) => sum + d.seconds, 0);
    const workedDays = days.filter((d) => d.seconds > 0).length;
    const avgSeconds = workedDays > 0 ? Math.floor(totalSeconds / workedDays) : 0;

    return NextResponse.json({ days, totalSeconds, avgSeconds, workedDays, filter });
  } catch (err: any) {
    console.error('History API error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}