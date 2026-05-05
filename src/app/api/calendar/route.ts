import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
  const month = searchParams.get('month');

  const start = month ? new Date(year, parseInt(month) - 1, 1) : new Date(year, 0, 1);
  const end   = month ? new Date(year, parseInt(month), 1)     : new Date(year + 1, 0, 1);

  const events = await prisma.companyCalendar.findMany({
    where: { date: { gte: start, lt: end } },
    orderBy: { date: 'asc' },
  });

  const leaves = await prisma.leaveRequest.findMany({
    where: {
      status: 'APPROVED',
      fromDate: { lt: end },
      toDate:   { gte: start },
    },
    include: {
      user: { select: { name: true, avatar: true } },
    },
  });

  const leaveEvents: any[] = [];
  for (const leave of leaves) {
    const from = new Date(leave.fromDate);
    const to   = new Date(leave.toDate);
    const cur  = new Date(from);
    while (cur <= to) {
      if (cur >= start && cur < end) {
        leaveEvents.push({
          id:        `leave-${leave.id}-${cur.toISOString().split('T')[0]}`,
          date:      new Date(cur),
          title:     `${leave.user.name} — On Leave`,
          type:      'LEAVE',
          leaveType: leave.type,
          userName:  leave.user.name,
          avatar:    leave.user.avatar,
        });
      }
      cur.setDate(cur.getDate() + 1);
    }
  }

  return NextResponse.json({ events: [...events, ...leaveEvents] });
}
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { date, title, type, description, isRecurring } = await req.json();

  const event = await prisma.companyCalendar.create({
    data: {
      date: new Date(date),
      title,
      type,
      description: description || null,
      isRecurring: isRecurring || false,
      createdBy: (session.user as any).id,
    },
  });

  return NextResponse.json({ success: true, event });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await req.json();
  await prisma.companyCalendar.delete({ where: { id } });

  return NextResponse.json({ success: true });
}