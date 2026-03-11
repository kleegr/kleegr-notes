import { NextResponse } from 'next/server';
import { getValidToken } from '@/lib/ghl';

// Accepts a locationId from SSO and returns a valid access token for that location
export async function POST(req: Request) {
  try {
    const { locationId } = await req.json();
    if (!locationId) return NextResponse.json({ error: 'Missing locationId' }, { status: 400 });

    const result = await getValidToken(locationId);

    if ('success' in result && !result.success) {
      return NextResponse.json(result, { status: 404 });
    }

    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
