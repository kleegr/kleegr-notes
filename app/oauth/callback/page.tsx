'use client';
import { useEffect, useRef, useState } from 'react';
import axios from 'axios';

export default function OAuthCallback() {
  const [message, setMessage] = useState('Installing app...');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const run = async () => {
      const code = new URLSearchParams(window.location.search).get('code');
      if (!code) {
        setMessage('No authorization code found.');
        setStatus('error');
        return;
      }

      try {
        const res = await axios.post('/api/ghl/save-token', { code });
        if (res.data?.success) {
          setMessage('✅ App Installed Successfully!');
          setStatus('success');
        } else {
          setMessage('❌ ' + (res.data?.error || 'Installation failed.'));
          setStatus('error');
        }
      } catch (err: any) {
        console.error(err);
        setMessage('❌ ' + (err?.response?.data?.error || 'Installation failed. Check console.'));
        setStatus('error');
      }
    };

    run();
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        gap: 16,
        fontFamily: 'DM Mono, monospace',
        background: '#0f0e0c',
        color: '#f0ebe0',
      }}
    >
      {status === 'loading' && (
        <>
          <div
            style={{
              width: 48,
              height: 48,
              border: '4px solid #2e2c28',
              borderTop: '4px solid #d4a853',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </>
      )}
      <h1 style={{ fontSize: 22, fontWeight: 600, color: status === 'error' ? '#c0503a' : '#d4a853' }}>
        {message}
      </h1>
      {status !== 'loading' && (
        <p style={{ fontSize: 13, color: '#7a7568' }}>You can close this tab.</p>
      )}
    </div>
  );
}
