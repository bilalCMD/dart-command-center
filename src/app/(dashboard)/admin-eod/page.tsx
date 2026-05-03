'use client';
import { PageHeader } from '@/components/ui';
export default function AdminEOD() {
  return <div><PageHeader title="EOD Compliance" /><p className="text-xs text-[var(--muted)]">Wire to GET /api/eod/compliance</p></div>;
}
