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
        dailyTargetHours: true,
        clockEvents: {
          where: { timestamp: { gte: fromDate, lte: toDate } },
          orderBy: { timestamp: 'asc' },
          select: { id: true, type: true, timestamp: true },
        },
      },
    });

    // A session open longer than this is treated as a forgotten clock-out
    // (someone left without clocking out) rather than real worked time.
    const MAX_OPEN_HOURS = 14;
    const MAX_OPEN_SECONDS = MAX_OPEN_HOURS * 3600;

    const employees = users.map((user) => {
      const targetHours = user.dailyTargetHours ?? 8;
      // 🌙 Pair CLOCK_IN → CLOCK_OUT across the FULL event list first.
      // This handles night shifts where clock-out is on the next calendar day.
      type Sess = { clockIn: Date; clockOut: Date | null; duration: number; forgotten: boolean };
      const allSessions: Sess[] = [];
      let activeSince: Date | null = null;

      const pushSession = (clockIn: Date, clockOut: Date | null, rawDuration: number) => {
        // Forgotten clock-out: an unrealistically long session. We keep the raw
        // duration here and substitute the user's average below.
        const forgotten = rawDuration > MAX_OPEN_SECONDS;
        allSessions.push({ clockIn, clockOut, duration: rawDuration, forgotten });
      };

      for (const e of user.clockEvents) {
        if (e.type === 'CLOCK_IN') {
          // If a previous session was left open (orphan clock-in), close it at this point
          if (activeSince) {
            const dur = Math.floor((e.timestamp.getTime() - activeSince.getTime()) / 1000);
            pushSession(activeSince, e.timestamp, dur);
          }
          activeSince = e.timestamp;
        } else if (e.type === 'CLOCK_OUT' && activeSince) {
          const duration = Math.floor((e.timestamp.getTime() - activeSince.getTime()) / 1000);
          pushSession(activeSince, e.timestamp, duration);
          activeSince = null;
        }
      }
      // Only the genuinely last unclosed clock-in counts as currently active
      if (activeSince) {
        const duration = Math.floor((Date.now() - activeSince.getTime()) / 1000);
        pushSession(activeSince, null, duration);
      }

      // 📊 Average daily total from days WITHOUT a forgotten clock-out.
      // Used to estimate fair hours for any forgotten day.
      const cleanByDate: Record<string, number> = {};
      for (const s of allSessions) {
        if (s.forgotten) continue;
        const key = s.clockIn.toISOString().split('T')[0];
        cleanByDate[key] = (cleanByDate[key] || 0) + s.duration;
      }
      const cleanTotals = Object.values(cleanByDate).filter(v => v > 0);
      const avgDailySeconds = cleanTotals.length
        ? Math.round(cleanTotals.reduce((a, b) => a + b, 0) / cleanTotals.length)
        : Math.round(targetHours * 3600); // fallback to target when no clean day exists

      // Effective duration: forgotten sessions counted as the user's average day.
      const effective = (s: Sess) => (s.forgotten ? avgDailySeconds : s.duration);

      // Attribute each session to its CLOCK-IN date
      const byDate: Record<string, Sess[]> = {};
      for (const s of allSessions) {
        const key = s.clockIn.toISOString().split('T')[0];
        if (!byDate[key]) byDate[key] = [];
        byDate[key].push(s);
      }

      const days = Object.entries(byDate).map(([date, sessions]) => {
        const totalSeconds = sessions.reduce((sum, s) => sum + effective(s), 0);
        const estimated = sessions.some(s => s.forgotten);
        // Genuinely active = an open session that is NOT a forgotten clock-out.
        const isActive = sessions.some(s => s.clockOut === null && !s.forgotten);
        return {
          date,
          sessions: sessions.map(s => ({
            clockIn: s.clockIn.toISOString(),
            clockOut: s.clockOut ? s.clockOut.toISOString() : null,
            duration: effective(s),
            estimated: s.forgotten,
          })),
          totalSeconds,
          estimated,
          isActive,
          firstClockIn: sessions[0]?.clockIn.toISOString() || null,
          lastClockOut: sessions[sessions.length - 1]?.clockOut?.toISOString() || null,
        };
      });

      days.sort((a, b) => a.date.localeCompare(b.date));

      return {
        userId: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        dailyTargetHours: targetHours,
        days,
      };
    });

    return NextResponse.json({ employees });
  } catch (err) {
    console.error('Report error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
