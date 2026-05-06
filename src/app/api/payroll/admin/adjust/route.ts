import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { payrollId, manualBonus, manualDeduction, manualNote } = await req.json();
  if (!payrollId) return NextResponse.json({ error: 'payrollId required' }, { status: 400 });

  const existing = await prisma.payroll.findUnique({ where: { id: payrollId } });
  if (!existing) return NextResponse.json({ error: 'Payroll not found' }, { status: 404 });

  const bonus = parseFloat(manualBonus) || 0;
  const deduction = parseFloat(manualDeduction) || 0;

  // Recalculate final salary
  const breakdown = existing.deductionBreakdown as any || {};
  const baseDeductions = existing.deductions;
  const newFinal = Math.max(0, Math.round(
    existing.baseSalary - baseDeductions + (breakdown.overtimeBonus || 0) + bonus - deduction
  ));

  const updated = await prisma.payroll.update({
    where: { id: payrollId },
    data: {
      manualBonus: bonus,
      manualDeduction: deduction,
      manualNote: manualNote || null,
      finalSalary: newFinal,
    },
  });

  return NextResponse.json({ success: true, payroll: updated });
}