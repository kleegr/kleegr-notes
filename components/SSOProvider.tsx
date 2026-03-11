'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useSSOHandler, SSOData } from '@/lib/ssoHandler';
import axios from 'axios';

interface SSOContext {
  ssoData: SSOData | null;
  accessToken: string | null;
  locationId: string | null;
  ssoLoading: boolean;
  ssoReady: boolean;
}

const Ctx = createContext<SSOContext>({
  ssoData: null,
  accessToken: null,
  locationId: null,
  ssoLoading: true,
  ssoReady: false,
});

export function SSOProvider({ children }: { children: ReactNode }) {
  const { ssoData, ssoLoading } = useSSOHandler();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [ssoReady, setSsoReady] = useState(false);

  useEffect(() => {
    if (!ssoData) return;
    // Exchange SSO data for a validated access token from our backend
    axios
      .post('/api/ghl/sso', ssoData)
      .then((res) => {
        if (res.data?.success) {
          setAccessToken(res.data.access_token);
          setSsoReady(true);
        }
      })
      .catch((err) => console.error('[SSOProvider]', err));
  }, [ssoData]);

  return (
    <Ctx.Provider
      value={{
        ssoData,
        accessToken,
        locationId: ssoData?.activeLocation ?? null,
        ssoLoading,
        ssoReady,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useSSO() {
  return useContext(Ctx);
}
