import axios from 'axios';
import qs from 'qs';
import { supabaseAdmin } from './supabase';

const GHL_BASE = 'https://services.leadconnectorhq.com';
const CLIENT_ID = process.env.NEXT_PUBLIC_GHL_CLIENT_ID!;
const CLIENT_SECRET = process.env.GHL_CLIENT_SECRET!;

export interface TokenRecord {
  id: number;
  app_id: string;
  access_token: string | null;
  refresh_token: string | null;
  user_type: string | null;
  company_id: string | null;
  location_id: string;
  user_id: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Exchange auth code for tokens ───────────────────────────────────────────
export async function exchangeCodeForTokens(code: string) {
  const { data } = await axios.post(
    `${GHL_BASE}/oauth/token`,
    qs.stringify({
      grant_type: 'authorization_code',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
      redirect_uri: process.env.NEXT_PUBLIC_GHL_REDIRECT_URI,
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' } }
  );
  return data;
}

// ─── Refresh an access token ──────────────────────────────────────────────────
export async function refreshAccessToken(refreshToken: string) {
  try {
    const { data } = await axios.post(
      `${GHL_BASE}/oauth/token`,
      qs.stringify({
        grant_type: 'refresh_token',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        refresh_token: refreshToken,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' } }
    );
    return { success: true, data };
  } catch (err: any) {
    return { success: false, data: err?.response?.data || err.message };
  }
}

// ─── Get a location-scoped token from a company token ───────────────────────
export async function getLocationAccessToken(locationId: string, companyId: string, companyAccessToken: string) {
  try {
    const params = new URLSearchParams();
    params.set('companyId', companyId);
    params.set('locationId', locationId);
    const { data } = await axios.post(`${GHL_BASE}/oauth/locationToken`, params, {
      headers: {
        Version: '2021-07-28',
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
        Authorization: `Bearer ${companyAccessToken}`,
      },
    });
    return { success: true, data };
  } catch (err: any) {
    return { success: false, data: err?.response?.data || err.message };
  }
}

// ─── Fetch installed locations for a company ─────────────────────────────────
export async function getInstalledLocations(companyId: string, appId: string, accessToken: string) {
  const { data } = await axios.get(`${GHL_BASE}/oauth/installedLocations`, {
    params: { companyId, appId, limit: 500, isInstalled: true },
    headers: { Accept: 'application/json', Version: '2021-07-28', Authorization: `Bearer ${accessToken}` },
  });
  const locs = data?.locations || data?.installedLocations || data || [];
  return Array.isArray(locs) ? locs : [locs];
}

// ─── Verify a token works by calling GHL ─────────────────────────────────────
async function isTokenValid(accessToken: string, locationId: string): Promise<boolean> {
  try {
    await axios.post(
      `${GHL_BASE}/contacts/search`,
      { locationId, pageLimit: 1 },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Version: '2021-07-28',
          Accept: 'application/json',
        },
      }
    );
    return true;
  } catch {
    return false;
  }
}

// ─── Upsert token record in Supabase ─────────────────────────────────────────
export async function upsertToken(payload: {
  app_id: string;
  access_token: string;
  refresh_token: string;
  user_type: string;
  company_id: string;
  location_id: string;
  user_id: string;
  expires_in?: number;
}) {
  const expiresAt = payload.expires_in
    ? new Date(Date.now() + payload.expires_in * 1000).toISOString()
    : new Date(Date.now() + 23 * 3600 * 1000).toISOString();

  const { data, error } = await supabaseAdmin
    .from('ghl_tokens')
    .upsert(
      {
        app_id: payload.app_id,
        access_token: payload.access_token,
        refresh_token: payload.refresh_token,
        user_type: payload.user_type,
        company_id: payload.company_id,
        location_id: payload.location_id,
        user_id: payload.user_id,
        expires_at: expiresAt,
      },
      { onConflict: 'location_id' }
    )
    .select()
    .single();

  if (error) throw error;
  return data as TokenRecord;
}

// ─── Get a valid token for a locationId (auto-refresh if expired) ─────────────
export async function getValidToken(locationId: string): Promise<TokenRecord | { success: false; message: string }> {
  const { data: record, error } = await supabaseAdmin
    .from('ghl_tokens')
    .select('*')
    .eq('location_id', locationId)
    .single();

  if (error || !record) return { success: false, message: 'Token not found for this location' };

  // Check if token is still valid
  const valid = await isTokenValid(record.access_token, locationId);
  if (valid) return record as TokenRecord;

  console.log(`[GHL] Token invalid for ${locationId}, refreshing...`);

  // Try refresh
  const refreshResult = await refreshAccessToken(record.refresh_token);
  if (!refreshResult.success) {
    return { success: false, message: 'Failed to refresh token' };
  }

  const refreshed = refreshResult.data;
  const { data: updated, error: updateErr } = await supabaseAdmin
    .from('ghl_tokens')
    .update({
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token,
      expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
    })
    .eq('location_id', locationId)
    .select()
    .single();

  if (updateErr) throw updateErr;
  return updated as TokenRecord;
}
