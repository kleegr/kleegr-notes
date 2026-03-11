import { NextResponse } from 'next/server';
import { getValidToken } from '@/lib/ghl';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const locationId = searchParams.get('locationId');

  if (!locationId) {
    return NextResponse.json({ error: 'Missing locationId' }, { status: 400 });
  }

  const result = await getValidToken(locationId);

  if ('success' in result && !result.success) {
    return NextResponse.json(result, { status: 404 });
  }

  return NextResponse.json({ success: true, data: result });
}
