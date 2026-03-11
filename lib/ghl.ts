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

// ─── Exchange auth code for tokens ────────────────────────────────────────────
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

// ─── Refresh a token ──────────────────────────────────────────────────────────
export async function refreshToken(refresh_token: string) {
  const { data } = await axios.post(
    `${GHL_BASE}/oauth/token`,
    qs.stringify({
      grant_type: 'refresh_token',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token,
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' } }
  );
  return data;
}

// ─── Get location-scoped access token from company token ─────────────────────
export async function getLocationAccessToken(locationId: string, companyId: string, companyAccessToken: string) {
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
  return data;
}

// ─── Get installed locations for a company ────────────────────────────────────
export async function getInstalledLocations(companyId: string, appId: string, accessToken: string) {
  const url = `${GHL_BASE}/oauth/installedLocations?companyId=${encodeURIComponent(companyId)}&appId=${encodeURIComponent(appId)}&limit=500&isInstalled=true`;
  const { data } = await axios.get(url, {
    headers: {
      Accept: 'application/json',
      Version: '2021-07-28',
      Authorization: `Bearer ${accessToken}`,
    },
  });
  return data?.locations || data?.installedLocations || data || [];
}

// ─── Validate a token by calling GHL ─────────────────────────────────────────
export async function validateToken(accessToken: string, locationId: string): Promise<boolean> {
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

// ─── Upsert token in Supabase ─────────────────────────────────────────────────
export async function upsertToken(record: {
  app_id: string;
  access_token: string;
  refresh_token: string;
  user_type: string;
  company_id: string;
  location_id: string;
  user_id: string;
  expires_in?: number;
}) {
  const expires_at = record.expires_in
    ? new Date(Date.now() + record.expires_in * 1000).toISOString()
    : new Date(Date.now() + 23 * 3600 * 1000).toISOString();

  const { data, error } = await supabaseAdmin
    .from('tokens')
    .upsert(
      {
        app_id: record.app_id,
        access_token: record.access_token,
        refresh_token: record.refresh_token,
        user_type: record.user_type,
        company_id: record.company_id,
        location_id: record.location_id,
        user_id: record.user_id,
        expires_at,
      },
      { onConflict: 'location_id' }
    )
    .select()
    .single();

  if (error) throw error;
  return data as TokenRecord;
}

// ─── Get valid token for a location (auto-refresh) ───────────────────────────
export async function getValidToken(locationId: string): Promise<TokenRecord | null> {
  const { data: record, error } = await supabaseAdmin
    .from('tokens')
    .select('*')
    .eq('location_id', locationId)
    .single();

  if (error || !record) return null;

  // Check if token is still valid (5-min buffer)
  const expiresAt = record.expires_at ? new Date(record.expires_at).getTime() : 0;
  const isExpired = expiresAt < Date.now() + 5 * 60 * 1000;

  if (!isExpired) {
    // Also do a quick GHL validation
    const valid = await validateToken(record.access_token!, locationId);
    if (valid) return record as TokenRecord;
  }

  // Token expired or invalid — refresh it
  console.log(`[ghl] Refreshing token for location ${locationId}`);
  try {
    const refreshed = await refreshToken(record.refresh_token!);
    const updated = await upsertToken({
      app_id: record.app_id,
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token,
      user_type: record.user_type!,
      company_id: record.company_id!,
      location_id: locationId,
      user_id: record.user_id!,
      expires_in: refreshed.expires_in,
    });
    return updated;
  } catch (err) {
    console.error('[ghl] Token refresh failed:', err);
    return null;
  }
}
