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

    // Process ALL events. Session = CLOCK_IN to next CLOCK_OUT.
    // Handles night shifts (session on clock-in day) + caps runaway sessions.
    const MAX_SESSION_SECONDS = 16 * 3600; // max 16h per session (safety cap)
    let activeSince: Date | null = null;

    const addSession = (start: Date, end: Date | null) => {
      const endTime = end ? end.getTime() : Date.now();
      let dur = Math.floor((endTime - start.getTime()) / 1000);
      // Cap runaway sessions (forgot to clock out for days)
      if (dur > MAX_SESSION_SECONDS) dur = MAX_SESSION_SECONDS;
      if (dur < 0) dur = 0;
      const sessionDay = toPKTDateKey(start);
      if (dayMap[sessionDay]) {
        dayMap[sessionDay].sessions.push({
          clockIn: start.toISOString(),
          clockOut: end ? end.toISOString() : null,
          duration: dur,
        });
        dayMap[sessionDay].seconds += dur;
      }
    };

    for (const e of events) {
      if (e.type === 'CLOCK_IN') {
        // If already clocked in without a clock-out (forgot), close old session first
        if (activeSince) {
          addSession(activeSince, new Date(e.timestamp));
        }
        activeSince = new Date(e.timestamp);
      } else if (e.type === 'CLOCK_OUT' && activeSince) {
        addSession(activeSince, new Date(e.timestamp));
        activeSince = null;
      }
    }

    // Still clocked in (ongoing session) - only count if started today
    if (activeSince) {
      const sessionDay = toPKTDateKey(activeSince);
      if (sessionDay === todayKey) {
        addSession(activeSince, null);
      } else {
        // Started on a past day but never clocked out - cap it
        addSession(activeSince, new Date(activeSince.getTime() + MAX_SESSION_SECONDS * 1000));
      }
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