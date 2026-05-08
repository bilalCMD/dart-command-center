import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/session';

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from');
  const to   = searchParams.get('to');

  if (!from || !to) {
    return NextResponse.json({ error: 'from and to dates required' }, { status: 400 });
  }

  const fromDate = new Date(from);
  fromDate.setHours(0, 0, 0, 0);

  const toDate = new Date(to);
  toDate.setHours(23, 59, 59, 999);

  try {
    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        clockEvents: {
          where: { timestamp: { gte: fromDate, lte: toDate } },
          orderBy: { timestamp: 'asc' },
          select: { id: true, type: true, timestamp: true },
        },
      },
    });

    const employees = users.map((user) => {
      // Group events by date
      const byDate: Record<string, typeof user.clockEvents> = {};
      for (const e of user.clockEvents) {
        const key = e.timestamp.toISOString().split('T')[0];
        if (!byDate[key]) byDate[key] = [];
        byDate[key].push(e);
      }

      const days = Object.entries(byDate).map(([date, events]) => {
        const sessions: { clockIn: string; clockOut: string | null; duration: number }[] = [];
        let totalSeconds = 0;
        let activeSince: Date | null = null;

        for (const e of events) {
          if (e.type === 'CLOCK_IN') {
            activeSince = e.timestamp;
          } else if (e.type === 'CLOCK_OUT' && activeSince) {
            const duration = Math.floor((e.timestamp.getTime() - activeSince.getTime()) / 1000);
            totalSeconds += duration;
            sessions.push({ clockIn: activeSince.toISOString(), clockOut: e.timestamp.toISOString(), duration });
            activeSince = null;
          }
        }
        if (activeSince) {
          const duration = Math.floor((Date.now() - activeSince.getTime()) / 1000);
          totalSeconds += duration;
          sessions.push({ clockIn: activeSince.toISOString(), clockOut: null, duration });
        }

        return {
          date,
          sessions,
          totalSeconds,
          firstClockIn: sessions[0]?.clockIn || null,
          lastClockOut: sessions[sessions.length - 1]?.clockOut || null,
        };
      });

      days.sort((a, b) => a.date.localeCompare(b.date));

      return { userId: user.id, name: user.name, email: user.email, avatar: user.avatar, days };
    });

    return NextResponse.json({ employees });
  } catch (err) {
    console.error('Report error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
