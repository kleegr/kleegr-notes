import { NextResponse } from 'next/server';
import { upsertToken, getInstalledLocations, getLocationAccessToken } from '../../../../lib/ghl';

const APP_ID = process.env.NEXT_PUBLIC_GHL_APP_ID!;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { appId, access_token, refresh_token, userType, companyId, locationId, userId } = body;

    // ── Agency / Company install → save token for each installed location ──
    const isAgency = userType === 'Company' || userType === 'Agency';
    if (isAgency && companyId && access_token) {
      const locations = await getInstalledLocations(companyId, appId || APP_ID, access_token);
      const locArray = Array.isArray(locations) ? locations : [locations];
      const results: any[] = [];

      for (const loc of locArray) {
        const locId = loc?.id || loc?.locationId || loc?.location_id || loc?._id;
        if (!locId) continue;

        try {
          const locToken = await getLocationAccessToken(locId, access_token, companyId);
          const record = await upsertToken({
            app_id: appId || APP_ID,
            access_token: locToken.access_token,
            refresh_token: locToken.refresh_token,
            user_type: userType,
            company_id: companyId,
            location_id: locId,
            user_id: userId,
            expires_in: locToken.expires_in,
          });
          results.push({ locationId: locId, success: true, data: record });
        } catch (e: any) {
          results.push({ locationId: locId, success: false, error: e.message });
        }
      }

      return NextResponse.json({ success: true, results });
    }

    // ── Location install ──────────────────────────────────────────────────────
    if (!locationId || !access_token) {
      return NextResponse.json({ error: 'Missing locationId or access_token' }, { status: 400 });
    }

    const record = await upsertToken({
      app_id: appId || APP_ID,
      access_token,
      refresh_token,
      user_type: userType,
      company_id: companyId,
      location_id: locationId,
      user_id: userId,
    });

    return NextResponse.json({ success: true, message: 'Token saved', data: record });
  } catch (err: any) {
    console.error('save-token error:', err);
    return NextResponse.json({ error: 'Failed to save token', details: err.message }, { status: 500 });
  }
}
