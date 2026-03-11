'use client';
import { createContext, useContext, useEffect, useState } from 'react';
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
  whitelabelDetails?: { domain: string; logoUrl: string };
}

interface SSOContextValue {
  ssoData: SSOData | null;
  locationId: string | null;
  userId: string | null;
  companyId: string | null;
  isReady: boolean;
}

const SSOContext = createContext<SSOContextValue>({
  ssoData: null,
  locationId: null,
  userId: null,
  companyId: null,
  isReady: false,
});

export function SSOProvider({ children }: { children: React.ReactNode }) {
  const [ssoData, setSsoData] = useState<SSOData | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const SSO_KEY = process.env.NEXT_PUBLIC_GHL_SSO_KEY!;
    if (!SSO_KEY) { setIsReady(true); return; }

    const handler = (event: MessageEvent) => {
      if (event.data?.message === 'REQUEST_USER_DATA_RESPONSE') {
        try {
          const decrypted = CryptoJS.AES.decrypt(event.data.payload, SSO_KEY).toString(CryptoJS.enc.Utf8);
          const parsed = JSON.parse(decrypted) as SSOData;
          setSsoData(parsed);
        } catch (e) {
          console.error('SSO decrypt error:', e);
        } finally {
          setIsReady(true);
        }
      }
    };

    window.addEventListener('message', handler);
    window.parent.postMessage({ message: 'REQUEST_USER_DATA' }, '*');

    // Fallback — if no response in 3s (running outside GHL iframe), still mark ready
    const t = setTimeout(() => setIsReady(true), 3000);

    return () => {
      window.removeEventListener('message', handler);
      clearTimeout(t);
    };
  }, []);

  return (
    <SSOContext.Provider
      value={{
        ssoData,
        locationId: ssoData?.activeLocation ?? null,
        userId: ssoData?.userId ?? null,
        companyId: ssoData?.companyId ?? null,
        isReady,
      }}
    >
      {children}
    </SSOContext.Provider>
  );
}

export function useSSO() {
  return useContext(SSOContext);
}
