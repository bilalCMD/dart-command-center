import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/session';

export async function GET() {
  const { user, error } = await requireAuth();
  if (error) return error;
  try {
    const u = user as any;
    const userBadges = await prisma.userBadge.findMany({
      where: { userId: u.id },
      include: { badge: { select: { id: true, name: true, icon: true, description: true } } },
      orderBy: { awardedAt: 'desc' },
    });
    const earnedBadges = userBadges.map((ub: any) => ({
      id: ub.badge.id, name: ub.badge.name, icon: ub.badge.icon,
      description: ub.badge.description, awardedAt: ub.awardedAt, userBadgeId: ub.id,
    }));
    return NextResponse.json({ earnedBadges, badges: earnedBadges.map((b: any) => b.name), count: earnedBadges.length });
  } catch (err: any) {
    console.error('Fetch my badges error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
