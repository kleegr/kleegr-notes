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
  const [ssoReady, setSsoReady] = useState(false);

  useEffect(() => {
    const handleMessage = ({ data }: MessageEvent) => {
      if (data?.message === 'REQUEST_USER_DATA_RESPONSE') {
        try {
          const decrypted = CryptoJS.AES.decrypt(data.payload, SSO_KEY).toString(CryptoJS.enc.Utf8);
          const parsed: SSOData = JSON.parse(decrypted);
          setSsoData(parsed);
          setSsoReady(true);
        } catch (e) {
          console.error('[SSO] Failed to decrypt/parse SSO payload', e);
          setSsoReady(true);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    window.parent.postMessage({ message: 'REQUEST_USER_DATA' }, '*');

    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return { ssoData, ssoReady };
}
