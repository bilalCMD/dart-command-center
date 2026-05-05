import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/session';

async function getRequiredHours(date: Date, userEmail: string, userId: string): Promise<number> {
  const day = date.getDay();
  if (day === 0 || day === 6) return 0;

  // Check employee override first
  const empSettings = await prisma.employeeSettings.findUnique({ where: { userId } });
  if (empSettings?.dailyHours) return empSettings.dailyHours;

  // Then company default
  const companySettings = await prisma.companySettings.findUnique({ where: { id: 'default' } });
  if (companySettings?.dailyHours) return companySettings.dailyHours;

  return 8;
}

function getBonus(worked: number, required: number): number {
  if (required === 0) {
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
      const required = await getRequiredHours(d, targetEmail, targetUserId);
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

      if (!isWeekend) {
        totalScore += score;
        totalWorkingDays++;
      }
    }

    const avgScore = totalWorkingDays > 0
      ? Math.round(totalScore / totalWorkingDays)
      : 0;

    const eodReports = await prisma.eodReport.findMany({
      where: { userId: targetUserId, date: { gte: startOfMonth } },
    });
    const eodDays = eodReports.length;
    const eodPct = totalWorkingDays > 0
      ? Math.round((eodDays / totalWorkingDays) * 100)
      : 0;

    const finalScore = Math.round(avgScore * 0.7 + eodPct * 0.3);

    let allUsers = null;
    if (isAdmin) {
      allUsers = await prisma.user.findMany({
        where: { isActive: true },
        select: { id: true, name: true, avatar: true, email: true },
      });
    }

    // Get schedule label from override or company default
    const empSettings = await prisma.employeeSettings.findUnique({ where: { userId: targetUserId } });
    const companySettings = await prisma.companySettings.findUnique({ where: { id: 'default' } });
    const scheduleHours = empSettings?.dailyHours || companySettings?.dailyHours || 8;

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
      schedule: `${scheduleHours}h`,
    });
  } catch (err: any) {
    console.error('Score error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}