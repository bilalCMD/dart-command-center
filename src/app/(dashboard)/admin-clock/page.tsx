'use client';
import { PageHeader, StatCard } from '@/components/ui';
export default function AdminClock() {
  return <div><PageHeader title="Attendance" /><div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-2"><StatCard label="Present" value="13" accent="#10b981" /><StatCard label="Absent" value="2" accent="#ef4444" /><StatCard label="Late" value="3" accent="#ED671C" /><StatCard label="Avg Hours" value="7.2h" accent="#B71CED" /></div></div>;
}
