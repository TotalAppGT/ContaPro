import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, PlanType } from '@/types';
import { api } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginAsTenant: (tenantId: string, email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
}

interface RegisterData {
  name: string;
  nit: string;
  email: string;
  password: string;
  subdomain: string;
  plan: PlanType;
}

interface LoginResponse {
  token: string;
  user: { id: string; email: string; nombre: string; rol: string };
  tenant: { id: string; nombre: string; nit: string; subdomain: string; plan: string };
}

interface MeResponse {
  user: { id: string; email: string; nombre: string; rol: string };
  tenant: { id: string; nombre: string; nit: string; subdomain: string; plan: string; logo?: string };
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const storedToken = localStorage.getItem('contapro_token');
    if (!storedToken) { setIsLoading(false); return; }
    try {
      const data = await api.get<MeResponse>('/auth/me');
      const u = data.user; const t = data.tenant;
      setUser({
        id: u.id, email: u.email, name: u.nombre, role: u.rol,
        tenant_id: t.id, tenant_name: t.nombre, plan: t.plan as PlanType
      });
      setToken(storedToken);
    } catch {
      localStorage.removeItem('contapro_token');
      setUser(null); setToken(null);
    } finally { setIsLoading(false); }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = async (email: string, password: string) => {
    const data = await api.post<LoginResponse>('/auth/login', { email, password });
    localStorage.setItem('contapro_token', data.token);
    setToken(data.token);
    const u = data.user; const t = data.tenant;
    setUser({
      id: u.id, email: u.email, name: u.nombre, role: u.rol,
      tenant_id: t.id, tenant_name: t.nombre, plan: t.plan as PlanType
    });
  };

  const loginAsTenant = async (tenantId: string, email: string, password: string) => {
    const data = await api.post<LoginResponse>('/auth/login-as-tenant', { tenant_id: tenantId, email, password });
    localStorage.setItem('contapro_token', data.token);
    setToken(data.token);
    setUser(data.user);
  };

  const register = async (data: RegisterData) => {
    await api.post('/auth/register', data);
  };

  const logout = () => {
    localStorage.removeItem('contapro_token');
    setUser(null);
    setToken(null);
  };

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!user,
    isLoading,
    login,
    loginAsTenant,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
