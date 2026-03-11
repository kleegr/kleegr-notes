'use client';
import { useEffect, useRef, useState } from 'react';
import axios from 'axios';

export default function OAuthCallback() {
  const [message, setMessage] = useState('Installing app...');
  const [success, setSuccess] = useState<boolean | null>(null);
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const run = async () => {
      const code = new URLSearchParams(window.location.search).get('code');
      if (!code) {
        setMessage('❌ No authorization code found.');
        setSuccess(false);
        return;
      }

      try {
        const res = await axios.post('/api/ghl/save-token', { code });
        if (res.data?.success) {
          setMessage('✅ App Installed Successfully!');
          setSuccess(true);
        } else {
          setMessage('❌ Installation failed: ' + (res.data?.error || 'Unknown error'));
          setSuccess(false);
        }
      } catch (err: any) {
        setMessage('❌ ' + (err.response?.data?.error || err.message));
        setSuccess(false);
      }
    };

    run();
  }, []);

  return (
    <div className="flex flex-col gap-6 w-full h-screen justify-center items-center text-center bg-gray-50">
      {success === null ? (
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin mb-4" />
          <p className="text-xl font-semibold text-gray-700">{message}</p>
        </div>
      ) : (
        <p className="text-3xl font-bold text-gray-800">{message}</p>
      )}
    </div>
  );
}
