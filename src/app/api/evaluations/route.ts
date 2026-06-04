import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/session';

export async function POST(req: NextRequest) {
  const { user, error } = await requireAdmin();
  if (error) return error;

  try {
    const { evaluateeId, month, satisfaction, quality, understanding, approach, ethic, notes } = await req.json();

    if (!evaluateeId || !month) {
      return NextResponse.json({ error: 'evaluateeId and month required' }, { status: 400 });
    }

    const avg = (satisfaction + quality + understanding + approach + ethic) / 5;

    const evaluation = await prisma.evaluation.upsert({
      where: { evaluateeId_evaluatorId_month: { evaluateeId, evaluatorId: user!.id, month } },
      create: { evaluateeId, evaluatorId: user!.id, month, satisfaction, quality, understanding, approach, ethic, averageScore: avg, notes },
      update: { satisfaction, quality, understanding, approach, ethic, averageScore: avg, notes },
    });

    return NextResponse.json({ success: true, evaluation });
  } catch (err: any) {
    console.error('Evaluation error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { user, error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const month = searchParams.get('month');
  const evaluateeId = searchParams.get('evaluateeId');

  const where: any = { evaluatorId: user!.id };
  if (month) where.month = month;
  if (evaluateeId) where.evaluateeId = evaluateeId;

  const evaluations = await prisma.evaluation.findMany({
    where,
    include: { evaluatee: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ evaluations });
}
