# Kleegr Notes

A Next.js 15 notes app with full GHL Marketplace integration.

## Features
- Create, edit, delete, search notes
- Dark / Light mode toggle
- Company logo upload
- **GHL OAuth 2.0** — installs for Location or Agency (bulk)
- **Auto token refresh** — tokens verified on every use, silently refreshed via Supabase
- **SSO** — reads current user from GHL iframe context (userId, locationId, etc.)
- **Supabase** — stores all tokens without Prisma

## GHL OAuth Flow

```
User clicks Install in GHL Marketplace
  → GHL redirects to /oauth/callback?code=xxx
  → POST /api/ghl/save-token { code }
  → Exchanges code for tokens
  → If Agency: fetches all installed locations + saves each location token
  → If Location: saves location token directly
  → All tokens stored in Supabase ghl_tokens table
```

## SSO Flow

```
App loads inside GHL iframe
  → GHLProvider sends REQUEST_USER_DATA to parent
  → GHL responds with encrypted payload
  → Decrypted with SSO_KEY → { userId, activeLocation, ... }
  → POST /api/ghl/sso { locationId } → returns valid access_token
  → useGHL() hook exposes { ssoData, locationId, accessToken } everywhere
```

## Env Variables

See `.env.example`

## Getting Started

```bash
npm install
npm run dev
```
