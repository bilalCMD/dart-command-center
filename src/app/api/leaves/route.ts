import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/session';
import { z } from 'zod';
import nodemailer from 'nodemailer';

const leaveSchema = z.object({
  type: z.enum(['ANNUAL', 'SICK', 'CASUAL', 'EMERGENCY', 'UNPAID']),
  fromDate: z.string(),
  toDate: z.string(),
  reason: z.string().min(3, 'Reason must be at least 3 characters'),
});

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;

  try {
    const body = await req.json();
    const parsed = leaveSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { type, fromDate, toDate, reason } = parsed.data;
    
    // Parse dates as UTC midnight to avoid timezone issues
    const from = new Date(fromDate + 'T00:00:00.000Z');
    const to = new Date(toDate + 'T00:00:00.000Z');

    if (from > to) {
      return NextResponse.json(
        { error: 'From date must be before or equal to to date' },
        { status: 400 }
      );
    }

    // Calculate days inclusive (same day = 1 day, next day = 2 days)
    const msPerDay = 1000 * 60 * 60 * 24;
    const daysRequested = Math.round((to.getTime() - from.getTime()) / msPerDay) + 1;

    if (type !== 'UNPAID') {
      const currentYear = new Date().getFullYear();
      const balance = await prisma.leaveBalance.findUnique({
        where: {
          userId_type_year: {
            userId: user!.id,
            type,
            year: currentYear,
          },
        },
      });

      if (!balance) {
        return NextResponse.json(
          { error: `No ${type} leave balance set for this year` },
          { status: 400 }
        );
      }

      const remaining = balance.total - balance.used;
      if (daysRequested > remaining) {
        return NextResponse.json(
          { error: `Insufficient balance. Requested: ${daysRequested} days, Available: ${remaining} days` },
          { status: 400 }
        );
      }
    }

    const request = await prisma.leaveRequest.create({
      data: {
        userId: user!.id,
        type,
        fromDate: from,
        toDate: to,
        reason,
        status: 'PENDING',
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
    });

    // Email to all admins
    try {
      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN', isActive: true },
        select: { email: true, name: true },
      });

      for (const admin of admins) {
        transporter.sendMail({
          from: `"Dart Command Center" <${process.env.GMAIL_USER}>`,
          to: admin.email,
          subject: `New leave request from ${request.user?.name}`,
          html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #eee;">
              <div style="background:#0a0a0a;color:white;padding:24px;text-align:center;">
                <div style="font-size:11px;letter-spacing:2px;color:#888;">COMMAND CENTER</div>
                <div style="font-size:18px;font-weight:800;">Dart Marketing</div>
              </div>
              <div style="padding:32px;">
                <p style="font-size:15px;">Hi <strong>${admin.name}</strong>,</p>
                <p><strong>${request.user?.name}</strong> has submitted a leave request:</p>
                <table style="width:100%;font-size:13px;color:#555;margin-top:16px;">
                  <tr><td style="padding:4px 0;"><strong>Type:</strong></td><td>${type}</td></tr>
                  <tr><td style="padding:4px 0;"><strong>From:</strong></td><td>${from.toDateString()}</td></tr>
                  <tr><td style="padding:4px 0;"><strong>To:</strong></td><td>${to.toDateString()}</td></tr>
                  <tr><td style="padding:4px 0;"><strong>Days:</strong></td><td>${daysRequested}</td></tr>
                  <tr><td style="padding:4px 0;"><strong>Reason:</strong></td><td>${reason}</td></tr>
                </table>
                <div style="margin-top:24px;text-align:center;">
                  <a href="${process.env.NEXTAUTH_URL}/leaves" style="background:#0a0a0a;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600;">
                    Review Request →
                  </a>
                </div>
              </div>
              <div style="background:#fafafa;padding:16px;text-align:center;font-size:11px;color:#999;">
                Dart Marketing © 2026
              </div>
            </div>
          `,
        }).catch((e: any) => console.error('Admin email failed:', e));
      }
    } catch (emailErr) {
      console.error('Admin notification failed:', emailErr);
    }

    return NextResponse.json({
      request,
      daysRequested,
      message: 'Leave request submitted. Pending admin approval.',
    });
  } catch (err: any) {
    console.error('Leave POST error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;

  try {
    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get('status');
    const userIdParam = searchParams.get('userId');

    const whereClause: any = {};

    if (user!.role === 'ADMIN') {
      if (userIdParam) whereClause.userId = userIdParam;
    } else {
      whereClause.userId = user!.id;
    }

    if (statusParam) {
      whereClause.status = statusParam;
    }

    const requests = await prisma.leaveRequest.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        approver: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json({
      requests,
      count: requests.length,
    });
  } catch (err: any) {
    console.error('Leave GET error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}