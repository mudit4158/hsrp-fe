import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, session, setUnauthorizedHandler } from './api';

export interface Me {
  id: string;
  username: string;
  displayName: string;
  roles: string[];
  permissions: string[];
  orgId?: string | null;
  org?: { code: string; name: string; orgType: string } | null;
}

interface AuthState {
  me: Me | null;
  loading: boolean;
  login(username: string, password: string): Promise<void>;
  logout(): void;
  can(...perms: string[]): boolean;
  hasRole(...roles: string[]): boolean;
}

const Ctx = createContext<AuthState>(null as unknown as AuthState);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    session.token = null;
    setMe(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    if (!session.token) {
      setLoading(false);
      return;
    }
    api
      .get<Me>('/auth/me')
      .then(setMe)
      .catch(() => logout())
      .finally(() => setLoading(false));
  }, [logout]);

  const value = useMemo<AuthState>(
    () => ({
      me,
      loading,
      async login(username, password) {
        const r = await api.post('/auth/login', { username, password });
        session.token = r.token;
        setMe(await api.get<Me>('/auth/me'));
      },
      logout,
      can: (...perms) => Boolean(me && (me.permissions.includes('*') || perms.some((p) => me.permissions.includes(p)))),
      hasRole: (...roles) => Boolean(me && roles.some((r) => me.roles.includes(r))),
    }),
    [me, loading, logout],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
