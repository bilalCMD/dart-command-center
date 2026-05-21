import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/session';
import { z } from 'zod';

const eodSchema = z.object({
  tasksCompleted: z.string().min(1, 'Tasks completed is required'),
  kpiFocus: z.string().optional(),
  blockers: z.string().optional(),
  tomorrowPlan: z.string().optional(),
  date: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;

  try {
    const body = await req.json();
    const parsed = eodSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { tasksCompleted, kpiFocus, blockers, tomorrowPlan, date } = parsed.data;

    // Use provided date or today (for backdated EOD)
    // Parse date in PKT context to avoid timezone shift
    let reportDate: Date;
    if (date) {
      // date is "YYYY-MM-DD" - treat as PKT date, store as that day's UTC midnight
      reportDate = new Date(date + 'T12:00:00.000Z');
    } else {
      // Today in PKT
      const now = new Date();
      const pktNow = new Date(now.getTime() + 5 * 60 * 60 * 1000);
      reportDate = new Date(pktNow.toISOString().split('T')[0] + 'T12:00:00.000Z');
    }

    // Prevent future dates
    // Today in PKT, at UTC noon (for future-date validation)
    const pktNowCheck = new Date(Date.now() + 5 * 60 * 60 * 1000);
    const todayCheck = new Date(pktNowCheck.toISOString().split('T')[0] + 'T12:00:00.000Z');
    if (reportDate > todayCheck) {
      return NextResponse.json({ error: 'Cannot submit EOD for future dates' }, { status: 400 });
    }

    const report = await prisma.eodReport.upsert({
      where: {
        userId_date: {
          userId: user!.id,
          date: reportDate,
        },
      },
      update: {
        tasksCompleted,
        kpiFocus,
        blockers,
        tomorrowPlan,
        submittedAt: new Date(),
      },
      create: {
        userId: user!.id,
        date: reportDate,
        tasksCompleted,
        kpiFocus,
        blockers,
        tomorrowPlan,
      },
      include: {
        user: {
          select: { name: true, email: true },
        },
      },
    });

    // Email admins
    try {
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD,
        },
      });

      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN', isActive: true },
        select: { email: true, name: true },
      });

      for (const admin of admins) {
        transporter.sendMail({
          from: `"Dart Command Center" <${process.env.GMAIL_USER}>`,
          to: admin.email,
          subject: `EOD Report submitted by ${report.user?.name}`,
          html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #eee;">
              <div style="background:#0a0a0a;color:white;padding:24px;text-align:center;">
                <div style="font-size:11px;letter-spacing:2px;color:#888;">COMMAND CENTER</div>
                <div style="font-size:18px;font-weight:800;">Dart Marketing</div>
              </div>
              <div style="padding:32px;">
                <p>Hi <strong>${admin.name}</strong>,</p>
                <p><strong>${report.user?.name}</strong> has submitted today's EOD report:</p>
                <table style="width:100%;font-size:13px;color:#555;margin-top:16px;">
                  <tr><td style="padding:4px 0;"><strong>Tasks:</strong></td><td>${tasksCompleted}</td></tr>
                  <tr><td style="padding:4px 0;"><strong>KPI:</strong></td><td>${kpiFocus || '—'}</td></tr>
                  <tr><td style="padding:4px 0;"><strong>Blockers:</strong></td><td>${blockers || 'None'}</td></tr>
                  <tr><td style="padding:4px 0;"><strong>Tomorrow:</strong></td><td>${tomorrowPlan || '—'}</td></tr>
                </table>
              </div>
              <div style="background:#fafafa;padding:16px;text-align:center;font-size:11px;color:#999;">
                Dart Marketing © 2026
              </div>
            </div>
          `,
        }).catch((e: any) => console.error('EOD email failed:', e));
      }
    } catch (emailErr) {
      console.error('Email error:', emailErr);
    }

    return NextResponse.json({
      report,
      message: 'EOD report submitted successfully',
    });
  } catch (err: any) {
    console.error('EOD POST error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;

  try {
    const { searchParams } = new URL(req.url);
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');
    const userIdParam = searchParams.get('userId');

    // Admin: sab ki reports, Employee: sirf apni
    const whereClause: any = {};

    if (user!.role === 'ADMIN') {
      if (userIdParam) whereClause.userId = userIdParam;
      // Admin ke liye koi userId filter nahi — sab dikhao
    } else {
      whereClause.userId = user!.id;
    }

    const from = fromParam
      ? new Date(fromParam)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const to = toParam ? new Date(toParam) : new Date();

    whereClause.date = { gte: from, lte: to };

    const reports = await prisma.eodReport.findMany({
      where: whereClause,
      orderBy: { date: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    // Today's PKT date string for comparison
    const pktNowGet = new Date(Date.now() + 5 * 60 * 60 * 1000);
    const todayPKTStr = pktNowGet.toISOString().split('T')[0];
    const submittedToday = reports.some(
      (r) => {
        const rPKTStr = new Date(r.date.getTime() + 5 * 60 * 60 * 1000).toISOString().split('T')[0];
        return rPKTStr === todayPKTStr && r.userId === user!.id;
      }
    );

    return NextResponse.json({
      reports,
      count: reports.length,
      submittedToday,
    });
  } catch (err: any) {
    console.error('EOD GET error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}