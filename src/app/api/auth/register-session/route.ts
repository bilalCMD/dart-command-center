import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sessionToken = req.cookies.get('next-auth.session-token')?.value 
      || req.cookies.get('__Secure-next-auth.session-token')?.value;

    if (!sessionToken) {
      return NextResponse.json({ error: 'No token' }, { status: 400 });
    }

    // Check if user exists first
    const userExists = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true }
    });

    if (!userExists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const uniqueId = `${sessionToken}_${Date.now()}`;

    await prisma.user.update({
      where: { id: session.user.id },
      data: { 
        activeSessionId: uniqueId,
        activeDeviceInfo: req.headers.get('user-agent')?.substring(0, 100) || 'Unknown',
        lastSessionCheck: new Date()
      }
    });

    return NextResponse.json({ success: true, sessionId: uniqueId });
  } catch (err: any) {
    console.error('Register session error:', err.message);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}