import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/session';
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, error } = await requireAdmin();
  if (error) return error;

  try {
    const { status } = await req.json();

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const leave = await prisma.leaveRequest.findUnique({
      where: { id: params.id },
      include: {
        user: { select: { name: true, email: true } },
      },
    });

    if (!leave) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const updated = await prisma.leaveRequest.update({
      where: { id: params.id },
      data: {
        status,
        approver: { connect: { id: user!.id } },
      },
    });

    if (status === 'APPROVED' && leave.type !== 'UNPAID') {
      const days =
        Math.ceil(
          (new Date(leave.toDate).getTime() -
            new Date(leave.fromDate).getTime()) /
            (1000 * 60 * 60 * 24)
        ) + 1;

      await prisma.leaveBalance.updateMany({
        where: {
          userId: leave.userId,
          type: leave.type,
          year: new Date(leave.fromDate).getFullYear(),
        },
        data: { used: { increment: days } },
      });
    }

    // Email to employee
    const statusColor = status === 'APPROVED' ? '#10b981' : '#ef4444';
    const statusText = status === 'APPROVED' ? 'Approved ✅' : 'Rejected ❌';

    try {
      await transporter.sendMail({
        from: `"Dart Command Center" <${process.env.GMAIL_USER}>`,
        to: leave.user.email,
        subject: `Your leave request has been ${status.toLowerCase()}`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #eee;">
            <div style="background:#0a0a0a;color:white;padding:24px;text-align:center;">
              <div style="font-size:11px;letter-spacing:2px;color:#888;">COMMAND CENTER</div>
              <div style="font-size:18px;font-weight:800;">Dart Marketing</div>
            </div>
            <div style="padding:32px;">
              <p style="font-size:15px;">Hi <strong>${leave.user.name}</strong>,</p>
              <p>Your <strong>${leave.type}</strong> leave request has been:</p>
              <div style="text-align:center;padding:20px;background:#f8f8f8;border-radius:8px;margin:20px 0;">
                <span style="font-size:22px;font-weight:800;color:${statusColor};">${statusText}</span>
              </div>
              <table style="width:100%;font-size:13px;color:#555;">
                <tr><td style="padding:4px 0;"><strong>Type:</strong></td><td>${leave.type}</td></tr>
                <tr><td style="padding:4px 0;"><strong>From:</strong></td><td>${new Date(leave.fromDate).toDateString()}</td></tr>
                <tr><td style="padding:4px 0;"><strong>To:</strong></td><td>${new Date(leave.toDate).toDateString()}</td></tr>
                <tr><td style="padding:4px 0;"><strong>Reason:</strong></td><td>${leave.reason}</td></tr>
                <tr><td style="padding:4px 0;"><strong>Actioned by:</strong></td><td>${user!.name}</td></tr>
              </table>
            </div>
            <div style="background:#fafafa;padding:16px;text-align:center;font-size:11px;color:#999;">
              Dart Marketing © 2026
            </div>
          </div>
        `,
      });
    } catch (emailErr) {
      console.error('Email to employee failed:', emailErr);
    }

    return NextResponse.json({
      updated,
      message: `Leave ${status.toLowerCase()} successfully`,
    });
  } catch (err: any) {
    console.error('Leave action error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}