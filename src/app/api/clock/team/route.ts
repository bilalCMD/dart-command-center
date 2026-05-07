import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/session';

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // ✅ SINGLE QUERY: Get users WITH their clock events
    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        role: true,
        // Include today's clock events in the same query
        clockEvents: {
          where: { timestamp: { gte: today } },
          orderBy: { timestamp: 'asc' },
          select: {
            id: true,
            type: true,
            timestamp: true,
          },
        },
      },
    });

    // ✅ Process in memory (fast) instead of database queries
    const team = users.map((user) => {
      const events = user.clockEvents;
      const lastEvent = events[events.length - 1];
      const isOnBreak = lastEvent?.type === 'BREAK_START';
      const isClockedIn =
        lastEvent?.type === 'CLOCK_IN' ||
        lastEvent?.type === 'BREAK_END' ||
        isOnBreak;
      const firstClockIn = events.find((e) => e.type === 'CLOCK_IN');

      let totalSeconds = 0;
      let activeSince: Date | null = null;

      for (const e of events) {
        if (e.type === 'CLOCK_IN') {
          activeSince = e.timestamp;
        } else if (e.type === 'CLOCK_OUT' && activeSince) {
          totalSeconds += Math.floor(
            (e.timestamp.getTime() - activeSince.getTime()) / 1000
          );
          activeSince = null;
        }
      }

      // If still clocked in, add time until now
      if (activeSince) {
        totalSeconds += Math.floor(
          (Date.now() - activeSince.getTime()) / 1000
        );
      }

      return {
        userId: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        isClockedIn,
        totalSeconds,
        clockInTime: firstClockIn?.timestamp || null,
        events: events.map((e) => ({
          id: e.id,
          type: e.type,
          timestamp: e.timestamp,
        })),
      };
    });

    return NextResponse.json({ team });
  } catch (err: any) {
    console.error('Team clock error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}