import { NextRequest, NextResponse } from 'next/server';

// Called by Vercel Cron every Sunday at 6 PM UTC (11 PM PKT)
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization');

  // Vercel Cron sends the secret automatically
  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Call the auto-assign endpoint internally
    const res = await fetch(`${process.env.NEXTAUTH_URL}/api/badges/auto-assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${secret}`,
      },
    });

    const data = await res.json();
    console.log('✅ Weekly auto-badges cron done:', data.totalAwards, 'awarded');
    return NextResponse.json({ success: true, ...data });
  } catch (err: any) {
    console.error('Cron badge error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
