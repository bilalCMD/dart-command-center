import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/session';
import { prisma } from '@/lib/db';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = await requireAuth();
  if (error) return error;
  if ((user as any).role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const { date, content } = await req.json();

  const report = await prisma.eodReport.update({
    where: { id: params.id },
    data: {
      ...(date && { date: new Date(date) }),
      ...(content && { tasksCompleted: content }),
    },
  });

  return NextResponse.json({ success: true, report });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = await requireAuth();
  if (error) return error;
  if ((user as any).role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  await prisma.eodReport.delete({ where: { id: params.id } });

  return NextResponse.json({ success: true });
}