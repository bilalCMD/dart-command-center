import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/session';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;
  try {
    const u = user as any;
    const body = await req.json();
    const { activities, idleLogs, date } = body;
    const activityDate = date ? new Date(date) : new Date();
    const dateKey = new Date(Date.UTC(activityDate.getFullYear(), activityDate.getMonth(), activityDate.getDate()));

    if (activities?.length) {
      for (const act of activities) {
        const existing = await prisma.appActivity.findFirst({
          where: { userId: u.id, appName: act.appName, site: act.site || null, date: dateKey },
        });
        if (existing) {
          await prisma.appActivity.update({ where: { id: existing.id }, data: { seconds: { increment: act.seconds } } });
        } else {
          await prisma.appActivity.create({ data: { userId: u.id, appName: act.appName, site: act.site || null, seconds: act.seconds, date: dateKey } });
        }
      }
    }

    if (idleLogs?.length) {
      // 🔒 Fetch today's BREAK/AWAY periods — idle DURING break must NOT count
      const dayStart = new Date(dateKey);
      const dayEnd = new Date(dateKey); dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);
      const events = await prisma.clockEvent.findMany({
        where: { userId: u.id, timestamp: { gte: dayStart, lt: dayEnd } },
        orderBy: { timestamp: 'asc' },
        select: { type: true, timestamp: true },
      });
      // Build break/away intervals (in ms)
      const pauseIntervals: { start: number; end: number }[] = [];
      let pStart: number | null = null;
      for (const e of events) {
        if (e.type === 'BREAK_START' || e.type === 'AWAY_START') pStart = e.timestamp.getTime();
        else if ((e.type === 'BREAK_END' || e.type === 'AWAY_END') && pStart !== null) {
          pauseIntervals.push({ start: pStart, end: e.timestamp.getTime() });
          pStart = null;
        }
      }
      if (pStart !== null) pauseIntervals.push({ start: pStart, end: Date.now() }); // still on break

      // Subtract break/away from an idle interval → returns remaining clean sub-intervals
      const subtractPauses = (from: number, to: number): { from: number; to: number }[] => {
        let segments = [{ from, to }];
        for (const p of pauseIntervals) {
          const next: { from: number; to: number }[] = [];
          for (const seg of segments) {
            if (p.end <= seg.from || p.start >= seg.to) { next.push(seg); continue; }
            if (p.start > seg.from) next.push({ from: seg.from, to: Math.max(seg.from, p.start) });
            if (p.end < seg.to) next.push({ from: Math.min(seg.to, p.end), to: seg.to });
          }
          segments = next;
        }
        return segments;
      };

      for (const idle of idleLogs) {
        const idleFromDate = new Date(idle.idleFrom);
        const idleToDate = new Date(idle.idleTo);

        // ✂️ Remove any portion that overlaps a break/away period
        const cleanSegments = subtractPauses(idleFromDate.getTime(), idleToDate.getTime());

        for (const seg of cleanSegments) {
          const segSeconds = Math.round((seg.to - seg.from) / 1000);
          if (segSeconds < 30) continue; // ignore tiny leftovers

          const segFrom = new Date(seg.from);
          const segTo = new Date(seg.to);

          // 🔒 dedup: check overlapping idle log exists
          const existing = await prisma.idleLog.findFirst({
            where: {
              userId: u.id,
              OR: [
                { idleFrom: { gte: new Date(seg.from - 120000), lte: new Date(seg.from + 120000) } },
                { AND: [{ idleFrom: { lte: segTo } }, { idleTo: { gte: segFrom } }] },
              ],
            },
          });

          if (!existing) {
            try {
              await prisma.idleLog.create({
                data: { userId: u.id, idleFrom: segFrom, idleTo: segTo, seconds: segSeconds },
              });
            } catch { /* constraint — skip */ }
          }
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Activity log error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}