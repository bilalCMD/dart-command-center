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
      // 🌙 Pair CLOCK_IN → CLOCK_OUT across the FULL event list first.
      // This handles night shifts where clock-out is on the next calendar day.
      type Sess = { clockIn: Date; clockOut: Date | null; duration: number };
      const allSessions: Sess[] = [];
      let activeSince: Date | null = null;

      for (const e of user.clockEvents) {
        if (e.type === 'CLOCK_IN') {
          // If a previous session was left open (orphan clock-in), close it at this point
          if (activeSince) {
            const dur = Math.floor((e.timestamp.getTime() - activeSince.getTime()) / 1000);
            allSessions.push({ clockIn: activeSince, clockOut: e.timestamp, duration: dur });
          }
          activeSince = e.timestamp;
        } else if (e.type === 'CLOCK_OUT' && activeSince) {
          const duration = Math.floor((e.timestamp.getTime() - activeSince.getTime()) / 1000);
          allSessions.push({ clockIn: activeSince, clockOut: e.timestamp, duration });
          activeSince = null;
        }
      }
      // Only the genuinely last unclosed clock-in counts as currently active
      if (activeSince) {
        const duration = Math.floor((Date.now() - activeSince.getTime()) / 1000);
        allSessions.push({ clockIn: activeSince, clockOut: null, duration });
      }

      // Attribute each session to its CLOCK-IN date
      const byDate: Record<string, Sess[]> = {};
      for (const s of allSessions) {
        const key = s.clockIn.toISOString().split('T')[0];
        if (!byDate[key]) byDate[key] = [];
        byDate[key].push(s);
      }

      const days = Object.entries(byDate).map(([date, sessions]) => {
        const totalSeconds = sessions.reduce((sum, s) => sum + s.duration, 0);
        return {
          date,
          sessions: sessions.map(s => ({
            clockIn: s.clockIn.toISOString(),
            clockOut: s.clockOut ? s.clockOut.toISOString() : null,
            duration: s.duration,
          })),
          totalSeconds,
          firstClockIn: sessions[0]?.clockIn.toISOString() || null,
          lastClockOut: sessions[sessions.length - 1]?.clockOut?.toISOString() || null,
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
