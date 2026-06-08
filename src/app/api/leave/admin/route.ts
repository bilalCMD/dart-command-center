import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const requests = await prisma.leaveRequest.findMany({
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { fromDate: 'desc' }
  });

  return NextResponse.json({ requests });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { requestId, status } = await req.json();

  const leaveReq = await prisma.leaveRequest.findUnique({ where: { id: requestId } });
  if (!leaveReq) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // 🔒 Prevent double-action: skip if already in requested state
  if (leaveReq.status === status) {
    return NextResponse.json({ success: true, updated: leaveReq, skipped: true });
  }

  // Update request status
  const updated = await prisma.leaveRequest.update({
    where: { id: requestId },
    data: { status }
  });

  // Only deduct when moving FROM non-approved INTO approved
  if (status === 'APPROVED' && leaveReq.status !== 'APPROVED') {
    const fullDays = Math.ceil(
      (new Date(leaveReq.toDate).getTime() - new Date(leaveReq.fromDate).getTime())
      / (1000 * 60 * 60 * 24)
    ) + 1;
    const days = (leaveReq as any).isHalfDay ? 0.5 : fullDays;

    await prisma.leaveBalance.updateMany({
      where: {
        userId: leaveReq.userId,
        type: leaveReq.type,
        year: new Date(leaveReq.fromDate).getFullYear()
      },
      data: { used: { increment: days } }
    });
  }

  return NextResponse.json({ success: true, updated });
}