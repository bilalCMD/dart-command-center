'use client';
import { PageHeader } from '@/components/ui';
export default function AdminLeaves() {
  return <div><PageHeader title="Leave Requests" /><p className="text-xs text-[var(--muted)]">Wire to GET /api/leaves?status=PENDING — approve/reject with PATCH /api/leaves/[id]</p></div>;
}
