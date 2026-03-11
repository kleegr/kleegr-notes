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
  whitelabelDetails?: {
    domain: string;
    logoUrl: string;
  };
}

export function useSSOHandler() {
  const [ssoData, setSsoData] = useState<SSOData | null>(null);
  const [ssoLoading, setSsoLoading] = useState(true);

  useEffect(() => {
    const handleMessage = ({ data }: MessageEvent) => {
      if (data?.message === 'REQUEST_USER_DATA_RESPONSE') {
        try {
          const decrypted = CryptoJS.AES.decrypt(data.payload, SSO_KEY).toString(CryptoJS.enc.Utf8);
          const parsed: SSOData = JSON.parse(decrypted);
          setSsoData(parsed);
        } catch (e) {
          console.error('[SSO] Failed to decrypt/parse SSO payload', e);
        } finally {
          setSsoLoading(false);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    window.parent.postMessage({ message: 'REQUEST_USER_DATA' }, '*');

    // Fallback: if no SSO response in 3s (e.g. running standalone), stop loading
    const timeout = setTimeout(() => setSsoLoading(false), 3000);

    return () => {
      window.removeEventListener('message', handleMessage);
      clearTimeout(timeout);
    };
  }, []);

  return { ssoData, ssoLoading };
}
