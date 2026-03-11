import { NextResponse } from 'next/server';
import { getValidToken } from '@/lib/ghl';

// GET /api/ghl/token?locationId=xxx
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const locationId = searchParams.get('locationId');

  if (!locationId) {
    return NextResponse.json({ error: 'Missing locationId' }, { status: 400 });
  }

  const token = await getValidToken(locationId);
  if (!token) {
    return NextResponse.json({ error: 'Token not found or refresh failed' }, { status: 404 });
  }

  return NextResponse.json({ success: true, token });
}
