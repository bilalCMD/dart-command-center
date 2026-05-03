import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/session';

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const [badges, users, userBadges] = await Promise.all([
      prisma.badge.findMany({ orderBy: { name: 'asc' } }),
      prisma.user.findMany({
        where: { isActive: true, role: 'MEMBER' },
        select: { id: true, name: true, avatar: true, email: true },
      }),
      prisma.userBadge.findMany({
        include: {
          user: { select: { id: true, name: true, avatar: true } },
          badge: { select: { id: true, name: true, icon: true, description: true } },
        },
        orderBy: { awardedAt: 'desc' },
      }),
    ]);

    return NextResponse.json({ badges, users, userBadges });
  } catch (err: any) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}