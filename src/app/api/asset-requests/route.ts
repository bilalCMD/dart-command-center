import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET - List requests
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const isAdmin = session.user.role === 'ADMIN';
  
  const requests = await prisma.assetRequest.findMany({
    where: isAdmin ? {} : { userId: session.user.id },
    include: {
      asset: true,
      user: {
        select: { id: true, name: true, email: true, jobTitle: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return NextResponse.json(requests);
}

// POST - Create request (employee)
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  
  const request = await prisma.assetRequest.create({
    data: {
      userId: session.user.id,
      assetId: body.assetId || null,
      type: body.type, // "NEW_REQUEST", "ISSUE_REPORT", "REPAIR"
      description: body.description,
      status: 'PENDING',
    }
  });

  return NextResponse.json(request);
}

// PATCH - Update request status (admin)
export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  
  const request = await prisma.assetRequest.update({
    where: { id: body.id },
    data: {
      status: body.status,
      adminNote: body.adminNote
    }
  });

  return NextResponse.json(request);
}