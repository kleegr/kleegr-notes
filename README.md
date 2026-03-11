# Kleegr Notes

A Next.js 15 notes app with **GoHighLevel (GHL) Marketplace OAuth** integration and **Supabase** token storage.

## Features
- GHL OAuth 2.0 — agency & location installs
- Auto token refresh (no Prisma — uses Supabase JS client directly)
- SSO decryption to get current user `locationId`, `userId`, etc.
- Dark / light mode toggle
- Company logo upload
- Notes CRUD with search & word count

## Environment Variables

Copy `.env.example` → `.env.local` and fill in your values.

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server only) |
| `NEXT_PUBLIC_GHL_APP_ID` | GHL App ID |
| `NEXT_PUBLIC_GHL_CLIENT_ID` | GHL OAuth Client ID |
| `GHL_CLIENT_SECRET` | GHL OAuth Client Secret (server only) |
| `NEXT_PUBLIC_GHL_REDIRECT_URI` | OAuth callback URL |
| `NEXT_PUBLIC_GHL_SSO_KEY` | GHL SSO decryption key |

## GHL Marketplace Setup

1. Set your **Redirect URI** in GHL to `https://your-domain.com/oauth/callback`
2. Install the app from GHL marketplace — it redirects to `/oauth/callback?code=...`
3. The callback exchanges the code, fetches location tokens, and saves them to Supabase

## SSO Usage

```tsx
import { useSSOHandler } from '@/lib/ssoHandler';

const MyPage = () => {
  const { ssoData, loading } = useSSOHandler();
  // ssoData.activeLocation → locationId
  // ssoData.userId, ssoData.companyId, etc.
};
```

## Token API Routes

| Route | Method | Description |
|---|---|---|
| `/api/ghl/save-token` | POST `{ code }` | Exchange OAuth code, save tokens |
| `/api/ghl/get-token?locationId=` | GET | Get valid token (auto-refreshes if expired) |
| `/api/ghl/refresh-token` | POST `{ locationId }` | Force refresh a location token |

## Getting Started

```bash
npm install
npm run dev
```
