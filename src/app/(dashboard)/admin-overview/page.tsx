'use client';
import { PageHeader, StatCard } from '@/components/ui';
export default function AdminOverview() {
  return <div><PageHeader title="Team Overview" /><div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-2"><StatCard label="Team" value="17" accent="#B71CED" /><StatCard label="Present" value="13/15" accent="#10b981" /><StatCard label="EOD MTD" value="74%" accent="#ED671C" /><StatCard label="Pending Leaves" value="2" accent="#ef4444" /></div><p className="text-xs text-[var(--muted)] mt-4">Wire to GET /api/admin/dashboard and GET /api/admin/team</p></div>;
}
