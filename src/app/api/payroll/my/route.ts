import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payrolls = await prisma.payroll.findMany({
      where: {
        userId: session.user.id,
        status: "PUBLISHED",
      },
      orderBy: { month: "desc" },
    });

    return NextResponse.json(payrolls);
  } catch (error: any) {
    console.error("My payroll error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}