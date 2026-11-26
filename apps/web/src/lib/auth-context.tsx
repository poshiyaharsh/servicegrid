'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiClient, ApiClientError, type AuthUserSummary } from '@servicegrid/api-client';
import { hasPermission, type Permission } from '@servicegrid/permissions';
import { BrandLoader } from '../components/branding/BrandLoader';

export interface TenantSummary {
  id: string;
  name: string;
  currency?: string;
  timezone?: string;
}

interface AuthContextValue {
  user: AuthUserSummary | null;
  tenant: TenantSummary | null;
  loading: boolean;
  sessionExpired: boolean;
  api: ApiClient;
  login: (email: string, password: string) => Promise<void>;
  register: (input: {
    organizationName: string;
    fullName: string;
    email: string;
    password: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  can: (permission: Permission) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.trim() || 'http://localhost:4000';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const accessTokenRef = useRef<string | null>(null);
  const [user, setUser] = useState<AuthUserSummary | null>(null);
  const [tenant, setTenant] = useState<TenantSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  const api = useMemo(
    () =>
      new ApiClient({
        baseUrl: API_BASE_URL,
        getAccessToken: () => accessTokenRef.current,
        onAccessTokenRefreshed: (token) => {
          accessTokenRef.current = token;
          setSessionExpired(false);
        },
        onUnauthorized: () => {
          accessTokenRef.current = null;
          setUser(null);
          setTenant(null);
          setSessionExpired(true);
        },
      }),
    [],
  );

  // Restore session via HttpOnly refresh cookie without exposing refresh token to browser storage
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const refreshed = await api.refresh();
        accessTokenRef.current = refreshed.data.accessToken;
        const me = await api.me();
        if (!active) return;
        setUser(me.data.user);
        setTenant(me.data.tenant);
        setSessionExpired(false);
      } catch {
        if (!active) return;
        accessTokenRef.current = null;
        setUser(null);
        setTenant(null);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [api]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api.login({ email, password });
      accessTokenRef.current = res.data.accessToken;
      setSessionExpired(false);
      const me = await api.me();
      setUser(me.data.user);
      setTenant(me.data.tenant);
    },
    [api],
  );

  const register = useCallback(
    async (input: { organizationName: string; fullName: string; email: string; password: string }) => {
      const res = await api.register(input);
      accessTokenRef.current = res.data.accessToken;
      setSessionExpired(false);
      setUser(res.data.user);
      setTenant(res.data.tenant);
    },
    [api],
  );

  const logout = useCallback(async () => {
    try {
      if (accessTokenRef.current) {
        await api.logout();
      }
    } catch {
      // Ignore logout API errors during local session cleanup
    } finally {
      accessTokenRef.current = null;
      setUser(null);
      setTenant(null);
      setSessionExpired(false);
      router.push('/login');
    }
  }, [api, router]);

  const can = useCallback(
    (permission: Permission) => {
      if (!user) return false;
      return hasPermission(user.roles, permission);
    },
    [user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({ user, tenant, loading, sessionExpired, api, login, register, logout, can }),
    [user, tenant, loading, sessionExpired, api, login, register, logout, can],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}

export function getErrorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (err instanceof ApiClientError) return err.message;
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading, sessionExpired } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace(sessionExpired ? '/login?expired=1' : '/login');
    }
  }, [loading, user, sessionExpired, router]);

  if (loading || !user) {
    return <BrandLoader variant="fullscreen" label="Verifying FieldSutra session…" />;
  }

  return <>{children}</>;
}
