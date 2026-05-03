// src/app/api/leaves/pending/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/session';

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;

  // Only admins can see pending leaves
  if (user!.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const pendingLeaves = await prisma.leaveRequest.findMany({
      where: {
        status: 'PENDING',
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ 
      count: pendingLeaves.length,
      requests: pendingLeaves 
    });
  } catch (err: any) {
    console.error('Pending leaves error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}