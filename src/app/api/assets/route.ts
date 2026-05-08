import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET - List all assets (admin) or my assets (employee)
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const isAdmin = session.user.role === 'ADMIN';
  
  const assets = await prisma.asset.findMany({
    where: isAdmin ? {} : { assignedTo: session.user.id },
    include: {
      assignedUser: {
        select: { id: true, name: true, email: true, jobTitle: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return NextResponse.json(assets);
}

// POST - Create new asset (admin only)
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  
  const asset = await prisma.asset.create({
    data: {
      name: body.name,
      tagId: body.tagId || null,
      photoUrl: body.photoUrl || null,
      category: body.category,
      brand: body.brand,
      model: body.model,
      serialNumber: body.serialNumber,
      condition: body.condition || 'Good',
      status: body.assignedTo ? 'Assigned' : 'Available',
      location: body.location || 'employee',
      assignedTo: body.assignedTo || null,
      assignedAt: body.assignedTo ? new Date() : null,
      purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : null,
      purchasePrice: body.purchasePrice ? parseFloat(body.purchasePrice) : null,
      notes: body.notes,
    }
  });

  return NextResponse.json(asset);
}