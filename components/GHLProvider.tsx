'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useSSOHandler, SSOData } from '@/lib/ssoHandler';
import axios from 'axios';

interface GHLContextValue {
  ssoData: SSOData | null;
  ssoReady: boolean;
  locationId: string | null;
  accessToken: string | null;
  tokenReady: boolean;
}

const GHLContext = createContext<GHLContextValue>({
  ssoData: null,
  ssoReady: false,
  locationId: null,
  accessToken: null,
  tokenReady: false,
});

export function GHLProvider({ children }: { children: ReactNode }) {
  const { ssoData, ssoReady } = useSSOHandler();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [tokenReady, setTokenReady] = useState(false);

  const locationId = ssoData?.activeLocation ?? null;

  // Once we have locationId from SSO, fetch a valid token from our backend
  useEffect(() => {
    if (!locationId) return;

    axios
      .post('/api/ghl/sso', { locationId })
      .then((res) => {
        if (res.data?.success) {
          setAccessToken(res.data.data.access_token);
        }
      })
      .catch(console.error)
      .finally(() => setTokenReady(true));
  }, [locationId]);

  return (
    <GHLContext.Provider value={{ ssoData, ssoReady, locationId, accessToken, tokenReady }}>
      {children}
    </GHLContext.Provider>
  );
}

export function useGHL() {
  return useContext(GHLContext);
}
