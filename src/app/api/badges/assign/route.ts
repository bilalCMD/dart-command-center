// src/app/api/badges/assign/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/session';

// POST: Assign a badge to a user
export async function POST(req: Request) {
  const { user: admin, error } = await requireAdmin();
  if (error) return error;

  try {
    const body = await req.json();
    const { userId, badgeId } = body;

    if (!userId || !badgeId) {
      return NextResponse.json(
        { error: 'userId and badgeId are required' },
        { status: 400 }
      );
    }

    // Verify user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify badge exists
    const targetBadge = await prisma.badge.findUnique({
      where: { id: badgeId },
    });
    if (!targetBadge) {
      return NextResponse.json({ error: 'Badge not found' }, { status: 404 });
    }

    // Check if already assigned
    const existing = await prisma.userBadge.findUnique({
      where: {
        userId_badgeId: {
          userId,
          badgeId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Badge already assigned to this user' },
        { status: 409 }
      );
    }

    // Assign the badge
    const a = admin as any;
    const userBadge = await prisma.userBadge.create({
      data: {
        userId,
        badgeId,
        awardedBy: a?.id || a?.email || 'admin',
      },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
        badge: { select: { id: true, name: true, icon: true, description: true } },
      },
    });

    return NextResponse.json({ success: true, userBadge });
  } catch (err: any) {
    console.error('Badge assign error:', err);
    return NextResponse.json(
      { error: 'Server error', details: err?.message },
      { status: 500 }
    );
  }
}

// DELETE: Remove a badge assignment
// URL: /api/badges/assign?id=<userBadgeId>
export async function DELETE(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'UserBadge id is required' },
        { status: 400 }
      );
    }

    const existing = await prisma.userBadge.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Badge assignment not found' },
        { status: 404 }
      );
    }

    await prisma.userBadge.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Badge delete error:', err);
    return NextResponse.json(
      { error: 'Server error', details: err?.message },
      { status: 500 }
    );
  }
}