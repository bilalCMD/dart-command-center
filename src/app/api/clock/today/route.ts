// src/app/api/clock/today/route.ts
// Get today's clock + break status for current user

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/session';

export async function GET() {
  const { user, error } = await requireAuth();
  if (error) return error;

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Fetch all today's events for this user
    const events = await prisma.clockEvent.findMany({
      where: {
        userId: user!.id,
        timestamp: { gte: today },
      },
      orderBy: { timestamp: 'asc' },
    });

    // Calculate working time + break time
    let workingSeconds = 0;
    let breakSeconds = 0;
    let workStart: Date | null = null;
    let breakStart: Date | null = null;
    let firstClockIn: Date | null = null;

    for (const e of events) {
      const t = new Date(e.timestamp);

      if (e.type === 'CLOCK_IN') {
        if (!firstClockIn) firstClockIn = t;
        workStart = t;
      } else if (e.type === 'BREAK_START' && workStart) {
        // Pause working timer
        workingSeconds += Math.floor((t.getTime() - workStart.getTime()) / 1000);
        workStart = null;
        breakStart = t;
      } else if (e.type === 'BREAK_END' && breakStart) {
        // End break, resume work
        breakSeconds += Math.floor((t.getTime() - breakStart.getTime()) / 1000);
        breakStart = null;
        workStart = t;
      } else if (e.type === 'CLOCK_OUT') {
        if (workStart) {
          workingSeconds += Math.floor((t.getTime() - workStart.getTime()) / 1000);
          workStart = null;
        }
        if (breakStart) {
          breakSeconds += Math.floor((t.getTime() - breakStart.getTime()) / 1000);
          breakStart = null;
        }
      }
    }

    // Add ongoing time
    const now = Date.now();
    if (workStart) {
      workingSeconds += Math.floor((now - workStart.getTime()) / 1000);
    }
    if (breakStart) {
      breakSeconds += Math.floor((now - breakStart.getTime()) / 1000);
    }

    // Determine current state
    const lastEvent = events[events.length - 1];
    const isOnBreak = lastEvent?.type === 'BREAK_START';
    const isClockedIn =
      lastEvent?.type === 'CLOCK_IN' ||
      lastEvent?.type === 'BREAK_END' ||
      isOnBreak;

    // Find current session start (last CLOCK_IN or BREAK_END)
    let currentSessionStart: Date | null = null;
    if (isClockedIn && !isOnBreak) {
      for (let i = events.length - 1; i >= 0; i--) {
        if (events[i].type === 'CLOCK_IN' || events[i].type === 'BREAK_END') {
          currentSessionStart = new Date(events[i].timestamp);
          break;
        }
      }
    }

    // Find current break start
    let currentBreakStart: Date | null = null;
    if (isOnBreak) {
      currentBreakStart = new Date(lastEvent.timestamp);
    }

    // Count breaks today
    const breakCount = events.filter((e) => e.type === 'BREAK_START').length;

    return NextResponse.json({
      // State flags
      isClockedIn,
      isOnBreak,

      // Times (in seconds)
      workingSeconds,
      breakSeconds,
      totalSeconds: workingSeconds, // working time only

      // Timestamps
      clockInTime: firstClockIn,
      currentSessionStart,
      currentBreakStart,

      // Counts
      breakCount,
      eventCount: events.length,

      // All events for activity log
      events,
    });
  } catch (err: any) {
    console.error('Today status error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}