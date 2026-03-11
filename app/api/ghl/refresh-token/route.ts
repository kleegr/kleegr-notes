import { NextResponse } from 'next/server';
import { getValidToken } from '../../../../lib/ghl';

// Force a refresh for a given locationId — called by cron or manually
export async function POST(req: Request) {
  try {
    const { locationId } = await req.json();
    if (!locationId) return NextResponse.json({ error: 'locationId required' }, { status: 400 });

    // getValidToken auto-refreshes if expired
    const token = await getValidToken(locationId);
    if (!token) return NextResponse.json({ error: 'Refresh failed or token not found' }, { status: 404 });

    return NextResponse.json({ success: true, data: token });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
