import { NextResponse } from 'next/server';
import { getTokenByLocation, refreshAccessToken, updateToken } from '@/lib/ghl';

export async function POST(req: Request) {
  try {
    const { locationId } = await req.json();
    if (!locationId) return NextResponse.json({ error: 'locationId required' }, { status: 400 });

    const record = await getTokenByLocation(locationId);
    if (!record?.refresh_token) {
      return NextResponse.json({ error: 'No refresh token found' }, { status: 404 });
    }

    const refreshed = await refreshAccessToken(record.refresh_token);
    const expires_at = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();

    await updateToken(locationId, {
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token,
      expires_at,
    });

    return NextResponse.json({ success: true, access_token: refreshed.access_token, expires_at });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
