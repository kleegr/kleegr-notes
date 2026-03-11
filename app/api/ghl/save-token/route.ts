import { NextResponse } from 'next/server';
import {
  exchangeCodeForToken,
  getInstalledLocations,
  getLocationAccessToken,
  upsertToken,
} from '@/lib/ghl';

const APP_ID = process.env.NEXT_PUBLIC_GHL_APP_ID!;

export async function POST(req: Request) {
  try {
    const { code } = await req.json();
    if (!code) return NextResponse.json({ error: 'Missing code' }, { status: 400 });

    // Step 1: Exchange code → tokens
    const ghl = await exchangeCodeForToken(code);

    // Step 2a: Agency / Company install → iterate all installed locations
    if (ghl.userType === 'Company' || ghl.userType === 'Agency') {
      const locations = await getInstalledLocations(ghl.companyId, APP_ID, ghl.access_token);
      const results: any[] = [];

      for (const loc of locations) {
        const locId: string = loc?.id || loc?.locationId || loc?._id;
        if (!locId) continue;

        try {
          const locToken = await getLocationAccessToken(locId, ghl.access_token, ghl.companyId);
          const saved = await upsertToken({
            app_id: APP_ID,
            access_token: locToken.access_token,
            refresh_token: locToken.refresh_token,
            user_type: ghl.userType,
            company_id: ghl.companyId,
            location_id: locId,
            user_id: ghl.userId,
            expires_in: locToken.expires_in,
          });
          results.push({ locationId: locId, success: true, id: saved.id });
        } catch (e: any) {
          results.push({ locationId: locId, success: false, error: e.message });
        }
      }

      return NextResponse.json({ success: true, results });
    }

    // Step 2b: Location install
    if (!ghl.locationId) {
      return NextResponse.json({ error: 'Missing locationId in token response' }, { status: 400 });
    }

    const saved = await upsertToken({
      app_id: APP_ID,
      access_token: ghl.access_token,
      refresh_token: ghl.refresh_token,
      user_type: ghl.userType,
      company_id: ghl.companyId,
      location_id: ghl.locationId,
      user_id: ghl.userId,
      expires_in: ghl.expires_in,
    });

    return NextResponse.json({ success: true, data: saved });
  } catch (err: any) {
    console.error('[save-token]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
