import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/session';

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;
  try {
    const { version } = await req.json();
    if (!version) return NextResponse.json({ error: 'version required' }, { status: 400 });
    await prisma.user.update({
      where: { id: (user as any).id },
      data: { appVersion: version, appVersionAt: new Date() },
    });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;
  if ((user as any).role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  try {
    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, appVersion: true, appVersionAt: true },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json({ users });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
