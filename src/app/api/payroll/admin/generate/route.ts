import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId, month } = await req.json();
    if (!userId || !month) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const salaryRecord = await prisma.employeeSalary.findUnique({ where: { userId } });
    if (!salaryRecord) {
      return NextResponse.json({ error: "Salary not set for this employee" }, { status: 400 });
    }

    const [year, mon] = month.split("-").map(Number);
    const startDate = new Date(year, mon - 1, 1);
    const endDate = new Date(year, mon, 0, 23, 59, 59);

    // Working days count (Mon-Fri)
    let workingDays = 0;
    const d = new Date(startDate);
    while (d <= endDate) {
      const day = d.getDay();
      if (day !== 0 && day !== 6) workingDays++;
      d.setDate(d.getDate() + 1);
    }

    // Per minute rates
    const perMinuteNormal = salaryRecord.monthlySalary / workingDays / 8 / 60;
    const perMinuteBonus = perMinuteNormal * 3; // Triple rate for overtime

    // Approved leaves
    const approvedLeaves = await prisma.leaveRequest.findMany({
      where: {
        userId,
        status: "APPROVED",
        fromDate: { lte: endDate },
        toDate: { gte: startDate },
      },
    });

    const leaveDatesSet = new Set<string>();
    for (const leave of approvedLeaves) {
      const from = new Date(leave.fromDate);
      const to = new Date(leave.toDate);
      const cur = new Date(from);
      while (cur <= to) {
        const day = cur.getDay();
        if (day !== 0 && day !== 6) {
          leaveDatesSet.add(cur.toISOString().split("T")[0]);
        }
        cur.setDate(cur.getDate() + 1);
      }
    }
    const leaveDays = leaveDatesSet.size;

    // Clock events
    const clockEvents = await prisma.clockEvent.findMany({
      where: {
        userId,
        timestamp: { gte: startDate, lte: endDate },
      },
      orderBy: { timestamp: "asc" },
    });

    // Group events by date and calculate worked seconds per day
    const dayMap = new Map<string, { clockIn: Date | null; totalSeconds: number }>();

    for (const ev of clockEvents) {
      const dateStr = ev.timestamp.toISOString().split("T")[0];
      if (!dayMap.has(dateStr)) dayMap.set(dateStr, { clockIn: null, totalSeconds: 0 });
      const entry = dayMap.get(dateStr)!;

      if (ev.type === "CLOCK_IN") {
        entry.clockIn = ev.timestamp;
      } else if (ev.type === "CLOCK_OUT" && entry.clockIn) {
        entry.totalSeconds += (ev.timestamp.getTime() - entry.clockIn.getTime()) / 1000;
        entry.clockIn = null;
      }
    }

    // If still clocked in today, count until now
    for (const [, entry] of dayMap) {
      if (entry.clockIn) {
        entry.totalSeconds += (Date.now() - entry.clockIn.getTime()) / 1000;
        entry.clockIn = null;
      }
    }

    const presentDaysSet = new Set<string>(dayMap.keys());
    const presentDays = presentDaysSet.size;
    const absentDays = Math.max(0, workingDays - presentDays - leaveDays);

    // Calculate bonus and deductions per day
    const TARGET_SECONDS = 8 * 3600;       // 8 hours
    const BONUS_THRESHOLD = 8.5 * 3600;    // 8h 30min
    const DEDUCT_THRESHOLD = 7 * 3600;     // 7 hours

    let totalBonusAmount = 0;
    let totalShortDeduction = 0;
    let overtimeDays = 0;
    let shortDays = 0;

    for (const [dateStr, entry] of dayMap) {
      // Skip leave days
      if (leaveDatesSet.has(dateStr)) continue;

      const workedSeconds = entry.totalSeconds;
      const workedMinutes = workedSeconds / 60;

      // Bonus: worked more than 8h 30min
      if (workedSeconds > BONUS_THRESHOLD) {
        const extraMinutes = (workedSeconds - BONUS_THRESHOLD) / 60;
        totalBonusAmount += extraMinutes * perMinuteBonus;
        overtimeDays++;
      }

      // Deduction: worked less than 7h (but was present)
      if (workedSeconds < DEDUCT_THRESHOLD && workedSeconds > 0) {
        const shortMinutes = (DEDUCT_THRESHOLD - workedSeconds) / 60;
        totalShortDeduction += shortMinutes * perMinuteNormal;
        shortDays++;
      }
    }

    // Absent deduction
    const perDaySalary = salaryRecord.monthlySalary / workingDays;
    const absentDeduction = absentDays * perDaySalary;

    const totalDeductions = Math.round(absentDeduction + totalShortDeduction);
    const finalSalary = Math.max(0, salaryRecord.monthlySalary - totalDeductions + totalBonusAmount);

    const deductionBreakdown = {
      absentDays,
      absentDeduction: Math.round(absentDeduction),
      leavedays: leaveDays,
      leaveDeduction: 0,
      shortDays,
      shortDeduction: Math.round(totalShortDeduction),
      overtimeDays,
      overtimeBonus: Math.round(totalBonusAmount),
      perMinuteNormal: Math.round(perMinuteNormal * 100) / 100,
      perMinuteBonus: Math.round(perMinuteBonus * 100) / 100,
    };

    const payroll = await prisma.payroll.upsert({
      where: { userId_month: { userId, month } },
      update: {
        baseSalary: salaryRecord.monthlySalary,
        workingDays,
        presentDays,
        absentDays,
        leavedays: leaveDays,
        deductions: totalDeductions,
        deductionBreakdown,
        finalSalary: Math.round(finalSalary),
        status: "DRAFT",
      },
      create: {
        userId,
        month,
        baseSalary: salaryRecord.monthlySalary,
        workingDays,
        presentDays,
        absentDays,
        leavedays: leaveDays,
        deductions: totalDeductions,
        deductionBreakdown,
        finalSalary: Math.round(finalSalary),
        status: "DRAFT",
      },
    });

    return NextResponse.json(payroll);
  } catch (error: any) {
    console.error("Generate payroll error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}