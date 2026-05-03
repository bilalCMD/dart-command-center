// src/app/api/auth/send-otp/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendOtpEmail, generateOtp } from '@/lib/email';
import bcrypt from 'bcryptjs';

const ALLOWED_DOMAIN = 'dartmarketing.io';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (!normalizedEmail.endsWith(`@${ALLOWED_DOMAIN}`)) {
      return NextResponse.json(
        { error: `Only @${ALLOWED_DOMAIN} emails are allowed` },
        { status: 403 }
      );
    }

    // Rate limit — max 3 OTPs per email in last 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const recentOtps = await prisma.otpCode.count({
      where: {
        email: normalizedEmail,
        createdAt: { gt: tenMinutesAgo },
      },
    });

    if (recentOtps >= 3) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a few minutes.' },
        { status: 429 }
      );
    }

    // Generate and hash OTP
    const code = generateOtp();
    const hashedCode = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    // Save to database
    await prisma.otpCode.create({
      data: {
        email: normalizedEmail,
        code: hashedCode,
        expiresAt,
        ipAddress:
          req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
          req.headers.get('x-real-ip') ||
          null,
      },
    });

    // Send email
    await sendOtpEmail(normalizedEmail, code);

    return NextResponse.json({
      success: true,
      message: 'Code sent to your email',
    });
  } catch (err: any) {
    console.error('Send OTP error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to send code' },
      { status: 500 }
    );
  }
}