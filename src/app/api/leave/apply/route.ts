import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { type, fromDate, toDate, reason } = await req.json();

  const from = new Date(fromDate);
  const to = new Date(toDate);
  const days = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  const balance = await prisma.leaveBalance.findFirst({
    where: { userId: session.user.id, type, year: new Date().getFullYear() }
  });

  if (!balance) return NextResponse.json({ error: 'Leave balance not found' }, { status: 400 });
  
  if (balance.type !== 'UNPAID') {
    const remaining = balance.total - balance.used;
    if (days > remaining) return NextResponse.json({ error: `Sirf ${remaining} days bache hain` }, { status: 400 });
  }

  const request = await prisma.leaveRequest.create({
    data: {
      userId: session.user.id,
      type,
      fromDate: from,
      toDate: to,
      reason,
      status: 'PENDING',
    }
  });

  return NextResponse.json({ success: true, request, days });
}