import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/session';

// Special 6-hour employees
const SIX_HOUR_EMPLOYEES = [
  'ahad@dartmarketing.io',
  'urooj@dartmarketing.io',
];

function getRequiredHours(date: Date, userEmail: string): number {
  const day = date.getDay();
  // Weekend = off (0 required, but bonus if they work)
  if (day === 0 || day === 6) return 0;
  // Special employees = 6 hours
  if (SIX_HOUR_EMPLOYEES.includes(userEmail.toLowerCase())) return 6;
  // Everyone else = 8 hours
  return 8;
}

function getBonus(worked: number, required: number): number {
  if (required === 0) {
    // Weekend — pure bonus
    if (worked >= 6) return 15;
    if (worked >= 4) return 10;
    if (worked >= 2) return 5;
    if (worked > 0) return 3;
    return 0;
  }
  const extra = worked - required;
  if (extra >= 2) return 10;
  if (extra >= 1) return 6;
  if (extra >= 0.5) return 3;
  return 0;
}

function calcDayScore(workedHours: number, requiredHours: number): number {
  if (requiredHours === 0) {
    // Weekend — no penalty, only bonus
    return Math.min(100, getBonus(workedHours, 0));
  }
  const pct = workedHours / requiredHours;
  let base = 0;
  if (pct >= 1) base = 100;
  else if (pct >= 0.9) base = 85;
  else if (pct >= 0.75) base = 70;
  else if (pct >= 0.5) base = 50;
  else if (pct > 0) base = 25;
  return Math.min(100, base + getBonus(workedHours, requiredHours));
}

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;

  try {
    const u = user as any;
    const isAdmin = u.role === 'ADMIN';
    const { searchParams } = new URL(req.url);
    const targetUserId = isAdmin && searchParams.get('userId')
      ? searchParams.get('userId')!
      : u.id;

    // Get target user email
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { email: true, name: true },
    });
    const targetEmail = targetUser?.email || u.email || '';

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const events = await prisma.clockEvent.findMany({
      where: {
        userId: targetUserId,
        timestamp: { gte: startOfMonth },
      },
      orderBy: { timestamp: 'asc' },
    });

    // Group by date
    const byDate: Record<string, any[]> = {};
    for (const e of events) {
      const key = e.timestamp.toISOString().split('T')[0];
      if (!byDate[key]) byDate[key] = [];
      byDate[key].push(e);
    }

    const dailyScores: any[] = [];
    let totalScore = 0;
    let totalWorkingDays = 0;

    for (const [date, dayEvents] of Object.entries(byDate)) {
      const d = new Date(date);
      const required = getRequiredHours(d, targetEmail);
      let workedSeconds = 0;
      let clockIn: Date | null = null;

      for (const e of dayEvents) {
        if (e.type === 'CLOCK_IN') clockIn = e.timestamp;
        else if (e.type === 'CLOCK_OUT' && clockIn) {
          workedSeconds += (e.timestamp.getTime() - clockIn.getTime()) / 1000;
          clockIn = null;
        }
      }
      if (clockIn) {
        workedSeconds += (Date.now() - clockIn.getTime()) / 1000;
      }

      const workedHours = workedSeconds / 3600;
      const score = calcDayScore(workedHours, required);
      const bonus = getBonus(workedHours, required);
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;

      dailyScores.push({
        date,
        workedHours: Math.round(workedHours * 100) / 100,
        requiredHours: required,
        score,
        bonus,
        overtime: Math.max(0, workedHours - required),
        isWeekend,
        label: isWeekend ? 'Weekend Bonus' : undefined,
      });

      // Only count working days for avg score
      if (!isWeekend) {
        totalScore += score;
        totalWorkingDays++;
      }
    }

    const avgScore = totalWorkingDays > 0
      ? Math.round(totalScore / totalWorkingDays)
      : 0;

    // EOD compliance
    const eodReports = await prisma.eodReport.findMany({
      where: { userId: targetUserId, date: { gte: startOfMonth } },
    });
    const eodDays = eodReports.length;
    const eodPct = totalWorkingDays > 0
      ? Math.round((eodDays / totalWorkingDays) * 100)
      : 0;

    // Final score = 70% attendance + 30% EOD
    const finalScore = Math.round(avgScore * 0.7 + eodPct * 0.3);

    // All users for admin
    let allUsers = null;
    if (isAdmin) {
      allUsers = await prisma.user.findMany({
        where: { isActive: true },
        select: { id: true, name: true, avatar: true, email: true },
      });
    }

    return NextResponse.json({
      userId: targetUserId,
      userName: targetUser?.name,
      userEmail: targetEmail,
      month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
      avgScore,
      eodPct,
      finalScore,
      totalDays: dailyScores.length,
      totalWorkingDays,
      eodDays,
      dailyScores: dailyScores.slice(-30),
      allUsers,
      schedule: SIX_HOUR_EMPLOYEES.includes(targetEmail.toLowerCase()) ? '6h' : '8h',
    });
  } catch (err: any) {
    console.error('Score error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}