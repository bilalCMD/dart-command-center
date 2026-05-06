import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/session';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;
  if ((user as any).role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  const where: any = { userId };
  if (from || to) {
    where.date = {};
    if (from) where.date.gte = new Date(from);
    if (to) where.date.lte = new Date(to + 'T23:59:59');
  }

  const reports = await prisma.eodReport.findMany({
    where,
    orderBy: { date: 'desc' },
    select: { id: true, date: true, tasksCompleted: true, kpiFocus: true, blockers: true, tomorrowPlan: true, submittedAt: true },
  });

  // Map to unified format for frontend
  const mapped = reports.map(r => ({
    id: r.id,
    date: r.date,
    content: r.tasksCompleted,
    kpiFocus: r.kpiFocus,
    blockers: r.blockers,
    tomorrowPlan: r.tomorrowPlan,
    createdAt: r.submittedAt,
  }));

  return NextResponse.json({ reports: mapped });
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;
  if ((user as any).role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const { userId, date, content } = await req.json();
  if (!userId || !date || !content) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  // Check if already exists for this date
  const existing = await prisma.eodReport.findUnique({
    where: { userId_date: { userId, date: new Date(date) } },
  });

  if (existing) {
    // Update instead
    const updated = await prisma.eodReport.update({
      where: { id: existing.id },
      data: { tasksCompleted: content },
    });
    return NextResponse.json({ success: true, report: updated });
  }

  const report = await prisma.eodReport.create({
    data: {
      userId,
      date: new Date(date),
      tasksCompleted: content,
    },
  });

  return NextResponse.json({ success: true, report });
}