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
    if (!code) {
      return NextResponse.json({ error: 'Missing authorization code' }, { status: 400 });
    }

    // Step 1: Exchange code for tokens
    const ghlData = await exchangeCodeForTokens(code);
    const { access_token, refresh_token, userType, companyId, locationId, userId, expires_in } = ghlData;

    // Step 2A: Company/Agency install — fetch all sub-locations
    if (userType === 'Company' || userType === 'Agency') {
      const locations = await getInstalledLocations(companyId, APP_ID, access_token);
      const results: any[] = [];

      for (const loc of locations) {
        const locId = loc?.id || loc?.locationId || loc?.location_id || loc?._id;
        if (!locId) continue;

        try {
          const locTokenData = await getLocationAccessToken(locId, companyId, access_token);
          await upsertToken({
            app_id: APP_ID,
            access_token: locTokenData.access_token,
            refresh_token: locTokenData.refresh_token || refresh_token,
            user_type: 'Location',
            company_id: companyId,
            location_id: locId,
            user_id: userId,
            expires_in: locTokenData.expires_in || expires_in,
          });
          results.push({ locationId: locId, success: true });
        } catch (err: any) {
          results.push({ locationId: locId, success: false, error: err.message });
        }
      }

      // Also save the company-level token under a synthetic "company" location key
      await upsertToken({
        app_id: APP_ID,
        access_token,
        refresh_token,
        user_type: userType,
        company_id: companyId,
        location_id: `company_${companyId}`,
        user_id: userId,
        expires_in,
      });

      return NextResponse.json({ success: true, results });
    }

    // Step 2B: Single location install
    if (!locationId) {
      return NextResponse.json({ error: 'Missing locationId in GHL response' }, { status: 400 });
    }

    await upsertToken({
      app_id: APP_ID,
      access_token,
      refresh_token,
      user_type: userType,
      company_id: companyId,
      location_id: locationId,
      user_id: userId,
      expires_in,
    });

    return NextResponse.json({ success: true, locationId });
  } catch (err: any) {
    console.error('[save-token]', err?.response?.data || err.message);
    return NextResponse.json(
      { error: 'Failed to save token', details: err?.response?.data || err.message },
      { status: 500 }
    );
  }
}
