'use client';
import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import qs from 'qs';

export default function OAuthCallbackPage() {
  const [message, setMessage] = useState('Installation in Progress...');
  const [loading, setLoading] = useState(true);
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;
    install();
  }, []);

  const install = async () => {
    try {
      const code = new URLSearchParams(window.location.search).get('code');
      if (!code) {
        setMessage('No authorization code found.');
        setLoading(false);
        return;
      }

      // Step 1: Exchange code for tokens
      const tokenRes = await axios.post(
        'https://services.leadconnectorhq.com/oauth/token',
        qs.stringify({
          grant_type: 'authorization_code',
          client_id: process.env.NEXT_PUBLIC_GHL_CLIENT_ID!,
          client_secret: process.env.NEXT_PUBLIC_GHL_CLIENT_SECRET!,
          code,
        }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' } }
      );

      const ghl = tokenRes.data;
      if (!ghl) { setMessage('Failed to retrieve GHL tokens.'); setLoading(false); return; }

      // Step 2: Save to DB via API route
      const saveRes = await axios.post('/api/ghl/save-token', {
        appId: process.env.NEXT_PUBLIC_GHL_APP_ID,
        access_token: ghl.access_token,
        refresh_token: ghl.refresh_token,
        userType: ghl.userType,
        companyId: ghl.companyId,
        locationId: ghl.locationId || '',
        userId: ghl.userId,
      });

      if (saveRes.status !== 200 || (!saveRes.data?.success && !saveRes.data?.results)) {
        setMessage('Error saving token to database.');
        setLoading(false);
        return;
      }

      setMessage('✅ App Installed Successfully!');
      setLoading(false);
    } catch (err) {
      console.error(err);
      setMessage('❌ Installation failed. Check console for details.');
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full h-screen justify-center items-center text-center bg-gray-50">
      {loading ? (
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
          <h1 className="text-2xl font-semibold text-gray-700">{message}</h1>
        </div>
      ) : (
        <h1 className="text-3xl font-bold text-gray-800">{message}</h1>
      )}
    </div>
  );
}
