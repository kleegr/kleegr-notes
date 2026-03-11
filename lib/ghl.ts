import axios from 'axios';
import qs from 'qs';
import { supabaseAdmin } from './supabase';

const GHL_BASE = 'https://services.leadconnectorhq.com';
const CLIENT_ID = process.env.NEXT_PUBLIC_GHL_CLIENT_ID!;
const CLIENT_SECRET = process.env.GHL_CLIENT_SECRET!;

// ─── Types ───────────────────────────────────────────────────────────────────
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

// ─── Exchange authorization code for tokens ───────────────────────────────────
export async function exchangeCodeForTokens(code: string) {
  const { data } = await axios.post(
    `${GHL_BASE}/oauth/token`,
    qs.stringify({
      grant_type: 'authorization_code',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
      redirect_uri: process.env.NEXT_PUBLIC_APP_URL + '/oauth/callback',
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' } }
  );
  return data;
}

// ─── Get location-scoped token from agency token ─────────────────────────────
export async function getLocationAccessToken(locationId: string, agencyAccessToken: string, companyId: string) {
  const params = new URLSearchParams({ companyId, locationId });
  const { data } = await axios.post(
    `${GHL_BASE}/oauth/locationToken`,
    params,
    {
      headers: {
        Version: '2021-07-28',
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
        Authorization: `Bearer ${agencyAccessToken}`,
      },
    }
  );
  return data;
}

// ─── Refresh a token ─────────────────────────────────────────────────────────
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

// ─── Get installed locations for agency ──────────────────────────────────────
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

// ─── Upsert token in Supabase ─────────────────────────────────────────────────
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
  const expires_at = payload.expires_in
    ? new Date(Date.now() + payload.expires_in * 1000).toISOString()
    : new Date(Date.now() + 23 * 3600 * 1000).toISOString();

  const { data, error } = await supabaseAdmin
    .from('tokens')
    .upsert(
      {
        app_id: payload.app_id,
        access_token: payload.access_token,
        refresh_token: payload.refresh_token,
        user_type: payload.user_type,
        company_id: payload.company_id,
        location_id: payload.location_id,
        user_id: payload.user_id,
        expires_at,
      },
      { onConflict: 'location_id' }
    )
    .select()
    .single();

  if (error) throw error;
  return data as TokenRecord;
}

// ─── Fetch token from DB, auto-refresh if expired ────────────────────────────
export async function getValidToken(locationId: string): Promise<TokenRecord | null> {
  const { data: record, error } = await supabaseAdmin
    .from('tokens')
    .select('*')
    .eq('location_id', locationId)
    .single();

  if (error || !record) return null;

  // Check expiry — refresh if within 5 minutes of expiring
  const expiresAt = record.expires_at ? new Date(record.expires_at).getTime() : 0;
  const isExpired = expiresAt - Date.now() < 5 * 60 * 1000;

  if (!isExpired) return record as TokenRecord;

  // Refresh
  try {
    const refreshed = await refreshToken(record.refresh_token!);
    const updated = await upsertToken({
      app_id: record.app_id,
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token,
      user_type: record.user_type ?? '',
      company_id: record.company_id ?? '',
      location_id: locationId,
      user_id: record.user_id ?? '',
      expires_in: refreshed.expires_in,
    });
    return updated;
  } catch (e) {
    console.error('Token refresh failed:', e);
    return null;
  }
}
