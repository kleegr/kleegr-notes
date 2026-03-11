'use client';
import { useState } from 'react';
import CryptoJS from 'crypto-js';

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

const SSO_KEY = process.env.NEXT_PUBLIC_GHL_SSO_KEY!;

export function useSSOHandler() {
  const [ssoData, setSsoData] = useState<SSOData | null>(null);

  const decryptPayload = (payload: string): SSOData | null => {
    try {
      const decrypted = CryptoJS.AES.decrypt(payload, SSO_KEY).toString(CryptoJS.enc.Utf8);
      return JSON.parse(decrypted) as SSOData;
    } catch (e) {
      console.error('SSO decrypt failed', e);
      return null;
    }
  };

  const requestSSO = () => {
    if (typeof window === 'undefined') return;

    window.parent.postMessage({ message: 'REQUEST_USER_DATA' }, '*');

    const handler = (event: MessageEvent) => {
      if (event.data?.message === 'REQUEST_USER_DATA_RESPONSE') {
        window.removeEventListener('message', handler);
        const parsed = decryptPayload(event.data.payload);
        if (parsed) setSsoData(parsed);
      }
    };

    window.addEventListener('message', handler);
  };

  return { ssoData, requestSSO };
}
