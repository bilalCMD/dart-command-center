import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/session';

// Helper: get local date string YYYY-MM-DD without UTC conversion
function toLocalDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export async function GET(req: Request) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const filter = searchParams.get('filter') || 'week'; // 'day' | 'week' | 'month'

  try {
    const now = new Date();

    // startDate: beginning of range (local midnight)
    const startDate = new Date(now);
    if (filter === 'day') {
      startDate.setHours(0, 0, 0, 0);
    } else if (filter === 'week') {
      startDate.setDate(now.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);
    } else {
      startDate.setDate(now.getDate() - 29);
      startDate.setHours(0, 0, 0, 0);
    }

    // Fetch all events in range for this user
    const events = await prisma.clockEvent.findMany({
      where: {
        userId: user!.id,
        timestamp: { gte: startDate },
      },
      orderBy: { timestamp: 'asc' },
    });

    // Build empty dayMap using LOCAL date keys
    const totalDays = filter === 'day' ? 1 : filter === 'week' ? 7 : 30;
    const dayMap: Record<string, {
      date: string;
      label: string;
      seconds: number;
      sessions: { clockIn: string; clockOut: string | null; duration: number }[];
    }> = {};

    for (let i = totalDays - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const key = toLocalDateKey(d); // ✅ local date, no UTC shift
      dayMap[key] = {
        date: key,
        label: d.toLocaleDateString('en-US', {
          weekday: 'short',
          ...(filter === 'month' ? { day: 'numeric' } : {}),
        }),
        seconds: 0,
        sessions: [],
      };
    }

    // Group events by LOCAL date key
    const eventsByDay: Record<string, typeof events> = {};
    for (const e of events) {
      const key = toLocalDateKey(new Date(e.timestamp)); // ✅ local date
      if (!eventsByDay[key]) eventsByDay[key] = [];
      eventsByDay[key].push(e);
    }

    // Process sessions per day
    const todayKey = toLocalDateKey(now);

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

      // If still clocked in today
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