import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { TenantProvider } from '@/contexts/TenantContext';
import { ToastProvider } from '@/components/ui/Toast';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import AdminLayout from '@/components/layouts/AdminLayout';

const LandingPage = lazy(() => import('@/pages/public/LandingPage'));
const LoginPage = lazy(() => import('@/pages/public/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/public/RegisterPage'));
const Dashboard = lazy(() => import('@/pages/app/Dashboard'));
const GraficaT = lazy(() => import('@/pages/app/GraficaT'));
const LibroVentas = lazy(() => import('@/pages/app/LibroVentas'));
const LibroCompras = lazy(() => import('@/pages/app/LibroCompras'));
const Conciliacion = lazy(() => import('@/pages/app/Conciliacion'));
const SATMasivo = lazy(() => import('@/pages/app/SATMasivo'));
const ReportesFiscales = lazy(() => import('@/pages/app/ReportesFiscales'));
const MiOficina = lazy(() => import('@/pages/app/MiOficina'));
const Clientes = lazy(() => import('@/pages/app/Clientes'));
const Configuracion = lazy(() => import('@/pages/app/Configuracion'));
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'));
const AdminTenants = lazy(() => import('@/pages/admin/AdminTenants'));

function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) return <Loading />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/app" replace />;
  }
  return <>{children}</>;
}

function AuthenticatedApp() {
  return (
    <DashboardLayout>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route index element={<Dashboard />} />
          <Route path="grafica-t" element={<GraficaT />} />
          <Route path="ventas" element={<LibroVentas />} />
          <Route path="compras" element={<LibroCompras />} />
          <Route path="conciliacion" element={<Conciliacion />} />
          <Route path="sat-masivo" element={<SATMasivo />} />
          <Route path="reportes" element={<ReportesFiscales />} />
          <Route path="mi-oficina" element={<MiOficina />} />
          <Route path="clientes" element={<Clientes />} />
          <Route path="configuracion" element={<Configuracion />} />
        </Routes>
      </Suspense>
    </DashboardLayout>
  );
}

function AdminApp() {
  return (
    <AdminLayout>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route index element={<AdminDashboard />} />
          <Route path="tenants" element={<AdminTenants />} />
        </Routes>
      </Suspense>
    </AdminLayout>
  );
}

function detectSubdomain(): 'main' | 'app' | 'admin' | 'client' {
  const host = window.location.hostname;
  const parts = host.split('.');
  if (parts[0] === 'app' || host === 'app.contapro.local') return 'app';
  if (parts[0] === 'admin' || host === 'admin.contapro.local') return 'admin';
  if (parts[0] === 'contapro' || parts[0] === 'www' || parts[0] === 'localhost' || host === '127.0.0.1') return 'main';
  return 'client';
}

export default function App() {
  const subdomain = detectSubdomain();

  return (
    <AuthProvider>
      <TenantProvider>
        <ToastProvider />
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={subdomain === 'app' ? <Navigate to="/app" replace /> : subdomain === 'admin' ? <Navigate to="/admin" replace /> : <LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route
              path="/app/*"
              element={
                <ProtectedRoute>
                  <AuthenticatedApp />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/*"
              element={
                <ProtectedRoute allowedRoles={['owner']}>
                  <AdminApp />
                </ProtectedRoute>
              }
            />
          </Routes>
        </Suspense>
      </TenantProvider>
    </AuthProvider>
  );
}
