import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/session';

export async function GET() {
  const { user, error } = await requireAuth();
  if (error) return error;

  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const yesterdayEnd = new Date(yesterday);
    yesterdayEnd.setHours(23, 59, 59, 999);

    const events = await prisma.clockEvent.findMany({
      where: {
        userId: user!.id,
        timestamp: { gte: yesterday, lte: yesterdayEnd },
      },
      orderBy: { timestamp: 'asc' },
    });

    let totalSeconds = 0;
    let activeSince: Date | null = null;
    let firstClockIn: Date | null = null;
    let lastClockOut: Date | null = null;

    for (const e of events) {
      if (e.type === 'CLOCK_IN') {
        if (!firstClockIn) firstClockIn = e.timestamp;
        activeSince = e.timestamp;
      } else if (e.type === 'CLOCK_OUT' && activeSince) {
        totalSeconds += Math.floor(
          (e.timestamp.getTime() - activeSince.getTime()) / 1000
        );
        lastClockOut = e.timestamp;
        activeSince = null;
      }
    }

    return NextResponse.json({
      totalSeconds,
      firstClockIn,
      lastClockOut,
      worked: totalSeconds > 0,
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}