import { NextResponse } from 'next/server';
import { getValidToken } from '@/lib/ghl';

// POST /api/ghl/sso
// Body: { locationId, userId, companyId, ... } — the decrypted SSO payload
// Returns the valid access token for this location
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const locationId = body?.activeLocation || body?.locationId;

    if (!locationId) {
      return NextResponse.json({ error: 'Missing activeLocation in SSO data' }, { status: 400 });
    }

    const token = await getValidToken(locationId);
    if (!token) {
      return NextResponse.json({ error: 'No token found for this location. Is the app installed?' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      locationId,
      access_token: token.access_token,
      user: {
        userId: body.userId,
        userName: body.userName,
        email: body.email,
        role: body.role,
        type: body.type,
        companyId: body.companyId,
        activeLocation: locationId,
      },
    });
  } catch (err: any) {
    console.error('[sso]', err.message);
    return NextResponse.json({ error: 'SSO resolution failed' }, { status: 500 });
  }
}
