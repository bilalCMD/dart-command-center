import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const year = new Date().getFullYear();

  const balances = await prisma.leaveBalance.findMany({
    where: { userId: session.user.id, year }
  });

  const requests = await prisma.leaveRequest.findMany({
    where: { userId: session.user.id },
    orderBy: { fromDate: 'desc' }
  });

  return NextResponse.json({ balances, requests });
}