'use client';
import { useEffect, useState } from 'react';
import CryptoJS from 'crypto-js';

const SSO_KEY = process.env.NEXT_PUBLIC_GHL_SSO_KEY!;

export interface SSOData {
  userId: string;
  companyId: string;
  activeLocation: string;
  createdAt: string;
  userName: string;
  email: string;
  role: string;
  type: string;
  isAgencyOwner: boolean;
  versionId: string;
  appStatus: string;
  whitelabelDetails?: { domain: string; logoUrl: string };
}

export function useSSOHandler() {
  const [ssoData, setSsoData] = useState<SSOData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleMessage = ({ data }: MessageEvent) => {
      if (data?.message === 'REQUEST_USER_DATA_RESPONSE' && data?.payload) {
        try {
          const decrypted = CryptoJS.AES.decrypt(data.payload, SSO_KEY).toString(CryptoJS.enc.Utf8);
          const parsed: SSOData = JSON.parse(decrypted);
          setSsoData(parsed);
        } catch (e) {
          console.error('SSO decrypt error:', e);
        } finally {
          setLoading(false);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    // Request SSO data from the GHL parent frame
    window.parent.postMessage({ message: 'REQUEST_USER_DATA' }, '*');

    // Fallback — stop spinner after 3s if no SSO response (e.g. running outside GHL)
    const timeout = setTimeout(() => setLoading(false), 3000);

    return () => {
      window.removeEventListener('message', handleMessage);
      clearTimeout(timeout);
    };
  }, []);

  return { ssoData, loading };
}
