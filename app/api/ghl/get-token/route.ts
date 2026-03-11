import { NextResponse } from 'next/server';
import { getValidToken } from '../../../../lib/ghl';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const locationId = searchParams.get('locationId');

  if (!locationId) {
    return NextResponse.json({ error: 'locationId is required' }, { status: 400 });
  }

  try {
    const token = await getValidToken(locationId);
    if (!token) {
      return NextResponse.json({ error: 'Token not found or refresh failed' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: token });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
