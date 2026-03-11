'use client';
import { useEffect, useRef, useState } from 'react';
import axios from 'axios';

export default function OAuthCallbackPage() {
  const [message, setMessage] = useState('Installation in Progress...');
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const run = async () => {
      try {
        const code = new URLSearchParams(window.location.search).get('code');
        if (!code) {
          setMessage('❌ No authorization code found in URL.');
          setLoading(false);
          return;
        }

        const res = await axios.post('/api/ghl/save-token', { code });

        if (res.data?.success) {
          setSuccess(true);
          setMessage('✅ App Installed Successfully!');
        } else {
          setMessage('❌ ' + (res.data?.error || 'Installation failed.'));
        }
      } catch (err: any) {
        console.error(err);
        setMessage('❌ ' + (err?.response?.data?.error || 'Installation failed. Check console.'));
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  return (
    <div className="flex flex-col gap-6 w-full h-screen justify-center items-center text-center bg-gray-50">
      {loading ? (
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
          <h1 className="text-2xl font-semibold text-gray-700">{message}</h1>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <h1 className={`text-3xl font-bold ${success ? 'text-green-600' : 'text-red-600'}`}>{message}</h1>
          {success && (
            <p className="text-gray-500 text-sm">You can close this window and return to the app.</p>
          )}
        </div>
      )}
    </div>
  );
}
