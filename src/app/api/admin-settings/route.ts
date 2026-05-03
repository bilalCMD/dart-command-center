import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/session';

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const settings = await prisma.companySettings.findUnique({ where: { id: 'default' } });
  const employeeSettings = await prisma.employeeSettings.findMany();
  const users = await prisma.user.findMany({ select: { id: true, name: true, email: true, role: true } });

  return NextResponse.json({ settings, employeeSettings, users });
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;
  if ((user as any).role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { type, data } = body;

  if (type === 'COMPANY') {
    const settings = await prisma.companySettings.upsert({
      where: { id: 'default' },
      update: { ...data, updatedAt: new Date(), updatedBy: (user as any).id },
      create: { id: 'default', ...data },
    });
    return NextResponse.json({ success: true, settings });
  }

  if (type === 'EMPLOYEE') {
    const { userId, ...empData } = data;
    const settings = await prisma.employeeSettings.upsert({
      where: { userId },
      update: { ...empData, updatedAt: new Date() },
      create: { userId, ...empData },
    });
    return NextResponse.json({ success: true, settings });
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
}