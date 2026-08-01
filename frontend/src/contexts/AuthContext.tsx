import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, PlanType } from '@/types';
import { api } from '@/lib/api';
import { firebaseLogin, firebaseRegister, firebaseLogout, firebaseGoogleLogin } from '@/lib/firebase';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<{ needsRegister: boolean; email: string; name: string; fbToken: string }>;
  register: (data: RegisterData) => Promise<void>;
  registerWithGoogle: (data: { name: string; nit: string; subdomain: string; plan: PlanType; email: string; fbToken: string }) => Promise<void>;
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

  const saveSession = (jwt: string, u: any, t: any) => {
    localStorage.setItem('contapro_token', jwt);
    setToken(jwt);
    setUser({
      id: u.id, email: u.email, name: u.nombre, role: u.rol,
      tenant_id: t.id, tenant_name: t.nombre, plan: t.plan as PlanType
    });
  };

  const loadUser = useCallback(async () => {
    const storedToken = localStorage.getItem('contapro_token');
    if (!storedToken) { setIsLoading(false); return; }
    try {
      const data = await api.get<MeResponse>('/auth/me');
      const u = data.user; const t = data.tenant;
      setUser({ id: u.id, email: u.email, name: u.nombre, role: u.rol, tenant_id: t.id, tenant_name: t.nombre, plan: t.plan as PlanType });
      setToken(storedToken);
    } catch {
      localStorage.removeItem('contapro_token');
      setUser(null); setToken(null);
    } finally { setIsLoading(false); }
  }, []);

  useEffect(() => { loadUser(); }, [loadUser]);

  const login = async (email: string, password: string) => {
    try {
      const firebaseToken = await firebaseLogin(email, password);
      const data = await api.post<LoginResponse>('/auth/firebase', { firebaseToken, email });
      saveSession(data.token, data.user, data.tenant);
    } catch (fbError: any) {
      // Fallback: login clásico si Firebase falla (cuentas creadas antes de Firebase)
      const data = await api.post<LoginResponse>('/auth/login', { email, password });
      saveSession(data.token, data.user, data.tenant);
    }
  };

  const loginWithGoogle = async () => {
    const fb = await firebaseGoogleLogin();
    try {
      const data = await api.post<LoginResponse>('/auth/firebase', { firebaseToken: fb.token, email: fb.email });
      saveSession(data.token, data.user, data.tenant);
      return { needsRegister: false, email: fb.email, name: fb.name, fbToken: fb.token };
    } catch (e: any) {
      return { needsRegister: true, email: fb.email, name: fb.name, fbToken: fb.token };
    }
  };

  const registerWithGoogle = async (data: { name: string; nit: string; subdomain: string; plan: PlanType; email: string; fbToken: string }) => {
    const res = await api.post<LoginResponse>('/auth/firebase-register', {
      firebaseToken: data.fbToken, email: data.email,
      name: data.name, nit: data.nit, subdomain: data.subdomain, plan: data.plan,
    });
    saveSession(res.token, res.user, res.tenant);
  };

  const register = async (data: RegisterData) => {
    try {
      const firebaseToken = await firebaseRegister(data.email, data.password);
      const res = await api.post<LoginResponse>('/auth/firebase-register', {
        firebaseToken, email: data.email,
        name: data.name, nit: data.nit, subdomain: data.subdomain, plan: data.plan,
      });
      saveSession(res.token, res.user, res.tenant);
    } catch (e: any) {
      if (e.code === 'auth/email-already-in-use' || e.message?.includes('email-already-in-use')) {
        throw new Error('Este correo ya esta registrado. Inicie sesion o use otro correo.');
      }
      throw new Error(e.message || 'Error al registrar. Intente de nuevo.');
    }
  };

  const logout = async () => {
    try { await firebaseLogout(); } catch {}
    localStorage.removeItem('contapro_token');
    setUser(null); setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!user, isLoading, login, loginWithGoogle, register, registerWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
