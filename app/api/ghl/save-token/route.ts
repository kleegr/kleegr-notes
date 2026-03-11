import { NextResponse } from 'next/server';
import {
  exchangeCodeForTokens,
  getInstalledLocations,
  getLocationAccessToken,
  upsertToken,
} from '@/lib/ghl';

const APP_ID = process.env.NEXT_PUBLIC_GHL_APP_ID!;

export async function POST(req: Request) {
  try {
    const { code } = await req.json();
    if (!code) return NextResponse.json({ error: 'Missing code' }, { status: 400 });

    // Step 1: Exchange code for tokens
    const ghlData = await exchangeCodeForTokens(code);

    const {
      access_token,
      refresh_token,
      userType,
      companyId,
      locationId,
      userId,
      expires_in,
    } = ghlData;

    // Step 2: If Agency/Company install — fetch and save all locations
    if (userType === 'Company' || userType === 'Agency') {
      const locations = await getInstalledLocations(companyId, APP_ID, access_token);
      const results: any[] = [];

      for (const loc of locations) {
        const locId = loc?.id || loc?.locationId || loc?.location_id || loc?._id;
        if (!locId) continue;

        const locTokenRes = await getLocationAccessToken(locId, companyId, access_token);
        if (!locTokenRes.success) {
          results.push({ locationId: locId, success: false, error: locTokenRes.data });
          continue;
        }

        const saved = await upsertToken({
          app_id: APP_ID,
          access_token: locTokenRes.data.access_token,
          refresh_token: locTokenRes.data.refresh_token,
          user_type: userType,
          company_id: companyId,
          location_id: locId,
          user_id: userId,
          expires_in: locTokenRes.data.expires_in,
        });

        results.push({ locationId: locId, success: true, id: saved.id });
      }

      return NextResponse.json({ success: true, results });
    }

    // Step 3: Location-level install
    if (!locationId) {
      return NextResponse.json({ error: 'Missing locationId for location install' }, { status: 400 });
    }

    const saved = await upsertToken({
      app_id: APP_ID,
      access_token,
      refresh_token,
      user_type: userType,
      company_id: companyId || '',
      location_id: locationId,
      user_id: userId,
      expires_in,
    });

    return NextResponse.json({ success: true, data: saved });
  } catch (err: any) {
    console.error('[save-token]', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
