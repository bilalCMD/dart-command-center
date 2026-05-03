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

  const start = month
    ? new Date(year, parseInt(month) - 1, 1)
    : new Date(year, 0, 1);
  const end = month
    ? new Date(year, parseInt(month), 1)
    : new Date(year + 1, 0, 1);

  const events = await prisma.companyCalendar.findMany({
    where: { date: { gte: start, lt: end } },
    orderBy: { date: 'asc' },
  });

  return NextResponse.json({ events });
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