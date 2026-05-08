import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// PATCH - Update asset (admin only)
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  
  const asset = await prisma.asset.update({
    where: { id: params.id },
    data: {
      name: body.name,
      tagId: body.tagId || null,
      photoUrl: body.photoUrl || null,
      category: body.category,
      brand: body.brand || null,
      model: body.model || null,
      serialNumber: body.serialNumber || null,
      condition: body.condition || 'Good',
      notes: body.notes ?? null,
      status: body.assignedTo ? 'Assigned' : 'Available',
      assignedTo: body.assignedTo || null,
      assignedAt: body.assignedTo ? new Date() : null,
      purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : null,
      purchasePrice: body.purchasePrice ? parseFloat(body.purchasePrice) : null,
    }
  });

  return NextResponse.json(asset);
}

// DELETE - Delete asset (admin only)
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await prisma.asset.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}