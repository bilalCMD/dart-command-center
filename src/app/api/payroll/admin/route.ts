import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const employees = await prisma.user.findMany({
      where: { role: "MEMBER" },
      select: {
        id: true,
        name: true,
        email: true,
        salary: true,
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(employees);
  } catch (error: any) {
    console.error("Payroll admin GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId, monthlySalary } = await req.json();

    if (!userId || !monthlySalary) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const salary = await prisma.employeeSalary.upsert({
      where: { userId },
      update: {
        monthlySalary: parseFloat(monthlySalary),
        updatedBy: session.user.id,
      },
      create: {
        userId,
        monthlySalary: parseFloat(monthlySalary),
        updatedBy: session.user.id,
      },
    });

    return NextResponse.json(salary);
  } catch (error: any) {
    console.error("Payroll admin POST error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}