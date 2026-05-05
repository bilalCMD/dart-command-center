import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { payrollId } = await req.json();

  if (!payrollId) {
    return NextResponse.json({ error: "Missing payrollId" }, { status: 400 });
  }

  const payroll = await prisma.payroll.update({
    where: { id: payrollId },
    data: { status: "PUBLISHED" },
  });

  return NextResponse.json(payroll);
}