import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ valid: false, reason: 'no_session' });
  }

  const sessionToken = req.cookies.get('next-auth.session-token')?.value 
    || req.cookies.get('__Secure-next-auth.session-token')?.value;

  if (!sessionToken) {
    return NextResponse.json({ valid: false, reason: 'no_token' });
  }

  // Frontend sends its registered ID
  const mySessionId = req.headers.get('x-session-id');

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { activeSessionId: true, activeDeviceInfo: true }
  });

  // First time login - no active session in DB → frontend should register
  if (!user?.activeSessionId) {
    return NextResponse.json({ valid: true, needsRegister: true });
  }

  // Frontend hasn't registered yet → tell it to register
  if (!mySessionId) {
    return NextResponse.json({ valid: true, needsRegister: true });
  }

  // 🔥 KEY FIX: Frontend has an ID but it doesn't match DB → KICKED OUT
  if (user.activeSessionId !== mySessionId) {
    console.log('🚫 Session mismatch - kicking out user:', session.user.id);
    console.log('   My ID:', mySessionId.substring(0, 30));
    console.log('   DB ID:', user.activeSessionId.substring(0, 30));
    return NextResponse.json({ 
      valid: false, 
      reason: 'logged_in_elsewhere',
      device: user.activeDeviceInfo 
    });
  }

  // All good - update last check time
  await prisma.user.update({
    where: { id: session.user.id },
    data: { lastSessionCheck: new Date() }
  });

  return NextResponse.json({ valid: true });
}