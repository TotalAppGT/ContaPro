import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FileText, ShoppingCart, ArrowRightLeft, Upload, FileBarChart2,
  Building2, Users, Settings, LogOut, Menu, X, ChevronDown, ChevronLeft,
  Calculator, Globe
} from 'lucide-react';
import { clsx } from 'clsx';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/contexts/TenantContext';

interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
  planRequired?: string[];
}

const allNavItems: NavItem[] = [
  { to: '/app', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/app/grafica-t', icon: Calculator, label: 'Gráfica T', planRequired: ['professional', 'enterprise'] },
  { to: '/app/ventas', icon: ShoppingCart, label: 'Ventas' },
  { to: '/app/compras', icon: ArrowRightLeft, label: 'Compras' },
  { to: '/app/conciliacion', icon: FileText, label: 'Conciliación', planRequired: ['professional', 'enterprise'] },
  { to: '/app/sat-masivo', icon: Upload, label: 'SAT Masivo', planRequired: ['professional', 'enterprise'] },
  { to: '/app/reportes', icon: FileBarChart2, label: 'Reportes', planRequired: ['professional', 'enterprise'] },
  { to: '/app/mi-oficina', icon: Building2, label: 'Mi Oficina', planRequired: ['professional', 'enterprise'] },
  { to: '/app/clientes', icon: Users, label: 'Clientes', planRequired: ['professional', 'enterprise'] },
  { to: '/app/configuracion', icon: Settings, label: 'Configuración' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const { currentClient, clientList, setCurrentClient } = useTenant();
  const navigate = useNavigate();

  const filteredNav = allNavItems.filter(
    (item) => !item.planRequired || (user && item.planRequired.includes(user.plan))
  );

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const sidebar = (
    <div className="flex flex-col h-full bg-sidebar text-white">
      {/* Logo */}
      <div className="flex items-center gap-2 px-6 py-5 border-b border-slate-700">
        <img src="/logo.svg" alt="ContaPro" className="w-8 h-8" />
        {sidebarOpen && <span className="text-lg font-bold text-white">ContaPro</span>}
      </div>

      {/* User info */}
      {sidebarOpen && user && (
        <div className="px-4 py-3 border-b border-slate-700">
          <p className="text-sm font-medium truncate">{user.tenant_name}</p>
          <p className="text-xs text-slate-400 truncate">{user.name}</p>
          <span className={clsx(
            'inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium',
            user.plan === 'professional' ? 'bg-blue-500/20 text-blue-300' :
            user.plan === 'enterprise' ? 'bg-purple-500/20 text-purple-300' :
            'bg-slate-500/20 text-slate-300'
          )}>
            {user.plan === 'personal' ? 'Personal' : user.plan === 'professional' ? 'Profesional' : 'Empresarial'}
          </span>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {filteredNav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/app'}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) => clsx(
              'sidebar-link',
              isActive && 'active'
            )}
          >
            <item.icon className="sidebar-icon" />
            {sidebarOpen && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-slate-700">
        <button
          onClick={handleLogout}
          className="sidebar-link w-full text-left"
        >
          <LogOut className="sidebar-icon" />
          {sidebarOpen && <span>Cerrar sesión</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Desktop sidebar */}
      <aside className={clsx(
        'hidden lg:flex flex-col flex-shrink-0 transition-all duration-300',
        sidebarOpen ? 'w-64' : 'w-20'
      )}>
        {sidebar}
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="fixed left-0 top-0 bottom-0 w-64 z-50">
            {sidebar}
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between h-16 px-4 sm:px-6 bg-white border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hidden lg:flex p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
            >
              {sidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold text-gray-900 hidden sm:block">ContaPro</h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Client selector */}
            {clientList.length > 0 && (
              <div className="relative">
                <select
                  value={currentClient?.nit || ''}
                  onChange={(e) => {
                    const client = clientList.find((c) => c.nit === e.target.value);
                    setCurrentClient(client || null);
                  }}
                  className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
                >
                  <option value="">Seleccionar cliente</option>
                  {clientList.map((c) => (
                    <option key={c.nit} value={c.nit}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-primary-700 flex items-center justify-center text-white text-sm font-medium">
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <span className="hidden sm:block text-sm font-medium text-gray-700">{user?.name}</span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>
              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-20">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                      <p className="text-xs text-gray-500">{user?.email}</p>
                    </div>
                    <button onClick={() => { navigate('/app/configuracion'); setUserMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                      Configuración
                    </button>
                    <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                      Cerrar sesión
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
