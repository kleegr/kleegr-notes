import axios from 'axios';
import qs from 'qs';
import { supabaseAdmin } from './supabase';

const GHL_BASE = 'https://services.leadconnectorhq.com';
const CLIENT_ID = process.env.NEXT_PUBLIC_GHL_CLIENT_ID!;
const CLIENT_SECRET = process.env.GHL_CLIENT_SECRET!;

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Token DB helpers ─────────────────────────────────────────────────────────

export async function upsertToken(data: {
  app_id: string;
  access_token: string;
  refresh_token: string;
  user_type?: string;
  company_id?: string;
  location_id: string;
  user_id?: string;
  expires_in?: number;
}): Promise<TokenRecord> {
  const expires_at = data.expires_in
    ? new Date(Date.now() + data.expires_in * 1000).toISOString()
    : new Date(Date.now() + 23 * 3600 * 1000).toISOString();

  const { data: row, error } = await supabaseAdmin
    .from('ghl_tokens')
    .upsert(
      {
        app_id: data.app_id,
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        user_type: data.user_type,
        company_id: data.company_id,
        location_id: data.location_id,
        user_id: data.user_id,
        expires_at,
      },
      { onConflict: 'location_id' }
    )
    .select()
    .single();

  if (error) throw new Error(error.message);
  return row as TokenRecord;
}

export async function getTokenByLocation(locationId: string): Promise<TokenRecord | null> {
  const { data, error } = await supabaseAdmin
    .from('ghl_tokens')
    .select('*')
    .eq('location_id', locationId)
    .single();

  if (error || !data) return null;
  return data as TokenRecord;
}

export async function updateToken(
  locationId: string,
  patch: Partial<Pick<TokenRecord, 'access_token' | 'refresh_token' | 'expires_at'>>
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('ghl_tokens')
    .update(patch)
    .eq('location_id', locationId);

  if (error) throw new Error(error.message);
}

// ─── GHL OAuth helpers ────────────────────────────────────────────────────────

export async function exchangeCodeForToken(code: string) {
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

export async function refreshAccessToken(refreshToken: string) {
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
  return data; // { access_token, refresh_token, expires_in, ... }
}

export async function getLocationAccessToken(locationId: string, companyAccessToken: string, companyId: string) {
  const { data } = await axios.post(
    `${GHL_BASE}/oauth/locationToken`,
    new URLSearchParams({ companyId, locationId }),
    {
      headers: {
        Version: '2021-07-28',
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
        Authorization: `Bearer ${companyAccessToken}`,
      },
    }
  );
  return data; // { access_token, refresh_token, expires_in }
}

export async function getInstalledLocations(companyId: string, appId: string, accessToken: string) {
  const { data } = await axios.get(`${GHL_BASE}/oauth/installedLocations`, {
    params: { companyId, appId, limit: 500, isInstalled: true },
    headers: { Accept: 'application/json', Version: '2021-07-28', Authorization: `Bearer ${accessToken}` },
  });
  return (data?.locations || data?.installedLocations || data || []) as any[];
}

// ─── Get valid token (auto-refresh if expired) ────────────────────────────────

export async function getValidToken(locationId: string): Promise<TokenRecord | { success: false; message: string }> {
  const record = await getTokenByLocation(locationId);
  if (!record) return { success: false, message: 'No token found for this location' };

  // Check expiry with a 5-min buffer
  const isExpired = record.expires_at
    ? new Date(record.expires_at).getTime() - Date.now() < 5 * 60 * 1000
    : false;

  if (!isExpired) return record;

  // Token expired — refresh it
  try {
    const refreshed = await refreshAccessToken(record.refresh_token!);
    const expires_at = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();
    await updateToken(locationId, {
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token,
      expires_at,
    });
    return { ...record, access_token: refreshed.access_token, refresh_token: refreshed.refresh_token, expires_at };
  } catch (err: any) {
    return { success: false, message: 'Token refresh failed: ' + err.message };
  }
}
