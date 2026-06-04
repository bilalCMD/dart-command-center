import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/session';

// Get start of current week (Monday)
function getWeekStart() {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday = 1
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

// Get end of current week (Friday)
function getWeekEnd() {
  const start = getWeekStart();
  const friday = new Date(start);
  friday.setDate(start.getDate() + 4);
  friday.setHours(23, 59, 59, 999);
  return friday;
}

interface UserStats {
  userId: string;
  name: string;
  totalActiveSeconds: number;
  totalIdleSeconds: number;
  workingDays: number;
  lateDays: number;
  eodCount: number;
  kpiScore: number;
  longBreaks: number;
  productivityRatio: number;
}

async function calculateUserStats(userId: string, weekStart: Date, weekEnd: Date): Promise<UserStats> {
  const user = await prisma.user.findUnique({ 
    where: { id: userId },
    select: { id: true, name: true }
  });

  // Get clock events
  const clockEvents = await prisma.clockEvent.findMany({
    where: {
      userId,
      timestamp: { gte: weekStart, lte: weekEnd },
    },
    orderBy: { timestamp: 'asc' },
  });

  // Get activity logs
  const activities = await prisma.appActivity.findMany({
    where: {
      userId,
      date: { gte: weekStart, lte: weekEnd },
    },
  });

  // Get idle logs
  const idleLogs = await prisma.idleLog.findMany({
    where: {
      userId,
      idleFrom: { gte: weekStart, lte: weekEnd },
    },
  });

  // Get EOD reports
  const eodReports = await prisma.eodReport.findMany({
    where: {
      userId,
      date: { gte: weekStart, lte: weekEnd },
    },
  });

  // Get KPI logs
  const kpiLogs = await prisma.kpiLog.findMany({
    where: {
      userId,
      date: { gte: weekStart, lte: weekEnd },
    },
    include: { kpi: true }
  });

  // Calculate active time
  const totalActiveSeconds = activities.reduce((sum, a) => sum + a.seconds, 0);
  const totalIdleSeconds = idleLogs.reduce((sum, i) => sum + i.seconds, 0);

  // Count working days (CLOCK_IN events)
  const workingDaysSet = new Set<string>();
  let lateDays = 0;
  
  clockEvents.forEach(e => {
    if (e.type === 'CLOCK_IN') {
      const dateStr = e.timestamp.toISOString().split('T')[0];
      workingDaysSet.add(dateStr);
      
      // Check if late (after 9:30 AM)
      const hour = e.timestamp.getHours();
      const minute = e.timestamp.getMinutes();
      if (hour > 9 || (hour === 9 && minute > 30)) {
        lateDays++;
      }
    }
  });

  // Count long breaks (over 1 hour)
  let longBreaks = 0;
  let breakStart: Date | null = null;
  for (const e of clockEvents) {
    if (e.type === 'BREAK_START') breakStart = e.timestamp;
    else if (e.type === 'BREAK_END' && breakStart) {
      const duration = (e.timestamp.getTime() - breakStart.getTime()) / 1000;
      if (duration > 3600) longBreaks++;
      breakStart = null;
    }
  }

  // KPI Score (sum of all values)
  const kpiScore = kpiLogs.reduce((sum, log) => sum + log.valueDelta, 0);

  // Productivity ratio
  const totalSeconds = totalActiveSeconds + totalIdleSeconds;
  const productivityRatio = totalSeconds > 0 ? totalActiveSeconds / totalSeconds : 0;

  return {
    userId,
    name: user?.name || 'Unknown',
    totalActiveSeconds,
    totalIdleSeconds,
    workingDays: workingDaysSet.size,
    lateDays,
    eodCount: eodReports.length,
    kpiScore,
    longBreaks,
    productivityRatio,
  };
}

async function awardBadge(userId: string, badgeName: string, awardedBy: string) {
  const badge = await prisma.badge.findUnique({ where: { name: badgeName } });
  if (!badge) return null;

  // Check if already awarded this week
  const weekStart = getWeekStart();
  const existing = await prisma.userBadge.findFirst({
    where: {
      userId,
      badgeId: badge.id,
      awardedAt: { gte: weekStart },
    }
  });

  if (existing) return null; // Already awarded this week

  return await prisma.userBadge.create({
    data: {
      userId,
      badgeId: badge.id,
      awardedBy,
    }
  });
}

export async function POST(req: NextRequest) {
  // Allow either admin session OR valid CRON_SECRET (for Vercel Cron)
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`;

  let awardedById = 'auto-cron';
  if (!isCron) {
    const { user, error } = await requireAdmin();
    if (error) return error;
    awardedById = (user as any)?.id || 'admin';
  }

  try {
    const weekStart = getWeekStart();
    const weekEnd = getWeekEnd();

    // Get all active users
    const users = await prisma.user.findMany({
      where: { isActive: true, role: 'MEMBER' },
      select: { id: true, name: true, division: true }
    });

    // Calculate stats for everyone
    const allStats: UserStats[] = await Promise.all(
      users.map(u => calculateUserStats(u.id, weekStart, weekEnd))
    );

    const awardsGiven: any[] = [];

    // 🌟 Star Performer - Top 1 by KPI score
    const sorted = [...allStats].filter(s => s.kpiScore > 0).sort((a, b) => b.kpiScore - a.kpiScore);
    if (sorted.length > 0) {
      const award = await awardBadge(sorted[0].userId, '🌟 Star Performer', awardedById);
      if (award) awardsGiven.push({ user: sorted[0].name, badge: '🌟 Star Performer', reason: `Highest KPI score: ${sorted[0].kpiScore.toFixed(1)}` });
    }

    // ⏰ Punctuality King - 0 late arrivals (worked at least 4 days)
    for (const stat of allStats) {
      if (stat.workingDays >= 4 && stat.lateDays === 0) {
        const award = await awardBadge(stat.userId, '⏰ Punctuality King', awardedById);
        if (award) awardsGiven.push({ user: stat.name, badge: '⏰ Punctuality King', reason: 'Zero late arrivals this week' });
      }
    }

    // 🎯 EOD Champion - Submitted EOD all 5 days
    for (const stat of allStats) {
      if (stat.eodCount >= 5) {
        const award = await awardBadge(stat.userId, '🎯 EOD Champion', awardedById);
        if (award) awardsGiven.push({ user: stat.name, badge: '🎯 EOD Champion', reason: `${stat.eodCount} EOD reports submitted` });
      }
    }

    // 🚀 Productivity Hero - 90%+ active time
    for (const stat of allStats) {
      if (stat.productivityRatio >= 0.9 && stat.totalActiveSeconds > 14400) { // At least 4 hours
        const award = await awardBadge(stat.userId, '🚀 Productivity Hero', awardedById);
        if (award) awardsGiven.push({ user: stat.name, badge: '🚀 Productivity Hero', reason: `${(stat.productivityRatio * 100).toFixed(0)}% active time` });
      }
    }

    // 💯 Perfect Week - All criteria met
    for (const stat of allStats) {
      if (
        stat.workingDays >= 5 &&
        stat.lateDays === 0 &&
        stat.eodCount >= 5 &&
        stat.kpiScore > 0 &&
        stat.productivityRatio >= 0.85
      ) {
        const award = await awardBadge(stat.userId, '💯 Perfect Week', awardedById);
        if (award) awardsGiven.push({ user: stat.name, badge: '💯 Perfect Week', reason: 'All criteria met!' });
      }
    }

    // ☕ Disciplined - No long breaks
    for (const stat of allStats) {
      if (stat.workingDays >= 4 && stat.longBreaks === 0) {
        const award = await awardBadge(stat.userId, '☕ Disciplined', awardedById);
        if (award) awardsGiven.push({ user: stat.name, badge: '☕ Disciplined', reason: 'Well-managed break times' });
      }
    }

    // 🔥 On Fire - 3 consecutive weekly Star Performer
    const starBadge = await prisma.badge.findUnique({ where: { name: '🌟 Star Performer' } });
    if (starBadge) {
      const threeWeeksAgo = new Date();
      threeWeeksAgo.setDate(threeWeeksAgo.getDate() - 21);
      
      for (const stat of allStats) {
        const recentStars = await prisma.userBadge.count({
          where: {
            userId: stat.userId,
            badgeId: starBadge.id,
            awardedAt: { gte: threeWeeksAgo }
          }
        });
        if (recentStars >= 3) {
          const award = await awardBadge(stat.userId, '🔥 On Fire', awardedById);
          if (award) awardsGiven.push({ user: stat.name, badge: '🔥 On Fire', reason: 'Star Performer 3 weeks in a row!' });
        }
      }
    }

    return NextResponse.json({
      success: true,
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
      totalUsers: users.length,
      totalAwards: awardsGiven.length,
      awards: awardsGiven,
      stats: allStats.map(s => ({
        name: s.name,
        kpiScore: s.kpiScore.toFixed(1),
        eodCount: s.eodCount,
        lateDays: s.lateDays,
        workingDays: s.workingDays,
        activeHours: (s.totalActiveSeconds / 3600).toFixed(1),
        productivity: `${(s.productivityRatio * 100).toFixed(0)}%`,
      }))
    });
  } catch (err: any) {
    console.error('Auto badge error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}