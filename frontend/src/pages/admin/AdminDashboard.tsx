import React, { useState, useEffect } from 'react';
import { Building2, TrendingUp, DollarSign, Users, Loader2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { api } from '@/lib/api';
import type { Tenant } from '@/types';

const revenueData = [
  { mes: 'Ene', mrr: 15800 },
  { mes: 'Feb', mrr: 18200 },
  { mes: 'Mar', mrr: 21500 },
  { mes: 'Abr', mrr: 24800 },
  { mes: 'May', mrr: 27900 },
  { mes: 'Jun', mrr: 31200 },
  { mes: 'Jul', mrr: 35600 },
];

const stats = [
  { label: 'Total Afiliados', value: '47', icon: Building2, color: 'text-blue-600', bg: 'bg-blue-50' },
  { label: 'Afiliados Activos', value: '38', icon: Users, color: 'text-green-600', bg: 'bg-green-50' },
  { label: 'MRR', value: 'Q35,600', icon: DollarSign, color: 'text-purple-600', bg: 'bg-purple-50' },
  { label: 'Nuevos este mes', value: '12', icon: TrendingUp, color: 'text-orange-600', bg: 'bg-orange-50' },
];

export default function AdminDashboard() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.get<Tenant[]>('/admin/tenants?limit=5')
      .then(setTenants)
      .catch(() => {
        setTenants([
          { id: '1', nit: '1234567-8', name: 'López & Asociados', legal_name: 'López & Asociados S.A.', subdomain: 'lopez', email: 'info@lopez.com.gt', phone: '+502 2222-1111', address: 'Zona 10, Guatemala', regime: 'general', plan: 'professional', status: 'active', created_at: '2026-01-15', subscription_expires: '2026-08-15' },
          { id: '2', nit: '7654321-2', name: 'Comercial XYZ', legal_name: 'Comercial XYZ S.A.', subdomain: 'xyz', email: 'admin@xyz.com.gt', phone: '+502 3333-2222', address: 'Zona 9, Guatemala', regime: 'pequenio', plan: 'personal', status: 'active', created_at: '2026-03-10', subscription_expires: '2026-09-10' },
          { id: '3', nit: '9876543-0', name: 'Servicios 1-2-3', legal_name: 'Servicios 1-2-3 S.A.', subdomain: 'servicios123', email: 'contacto@servicios123.com.gt', phone: '+502 4444-3333', address: 'Mixco, Guatemala', regime: 'simplificado', plan: 'enterprise', status: 'suspended', created_at: '2025-11-20', subscription_expires: '2026-05-20' },
          { id: '4', nit: '1122334-5', name: 'Importadora GT', legal_name: 'Importadora GT S.A.', subdomain: 'importgt', email: 'info@importgt.com.gt', phone: '+502 5555-4444', address: 'Zona 12, Guatemala', regime: 'general', plan: 'professional', status: 'active', created_at: '2026-06-01', subscription_expires: '2026-12-01' },
          { id: '5', nit: '9988776-6', name: 'Consultores Unidos', legal_name: 'Consultores Unidos S.A.', subdomain: 'cunidos', email: 'info@cunidos.com.gt', phone: '+502 6666-5555', address: 'Zona 4, Guatemala', regime: 'general', plan: 'professional', status: 'trial', created_at: '2026-07-25', subscription_expires: '2026-08-08' },
        ]);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const recentColumns = [
    { key: 'name', header: 'Nombre' },
    { key: 'nit', header: 'NIT' },
    { key: 'plan', header: 'Plan', render: (t: Tenant) => <Badge variant="info">{t.plan}</Badge> },
    {
      key: 'status', header: 'Estado', render: (t: Tenant) => (
        <Badge variant={t.status === 'active' ? 'success' : t.status === 'suspended' ? 'warning' : t.status === 'trial' ? 'info' : 'danger'}>
          {t.status === 'active' ? 'Activo' : t.status === 'suspended' ? 'Suspendido' : t.status === 'trial' ? 'Prueba' : 'Cancelado'}
        </Badge>
      ),
    },
    { key: 'created_at', header: 'Registro', render: (t: Tenant) => new Date(t.created_at).toLocaleDateString('es-GT') },
  ];

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary-600" /></div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Dashboard Administrativo</h2>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
              </div>
              <div className={`p-2.5 rounded-lg ${stat.bg}`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Revenue chart */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Ingresos Mensuales Recurrentes (MRR)</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="mes" tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" tickFormatter={(v) => `Q${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                formatter={(value: number) => [`Q${value.toLocaleString()}`]}
              />
              <Line type="monotone" dataKey="mrr" stroke="#1e40af" strokeWidth={2} dot={{ fill: '#1e40af', r: 4 }} name="MRR" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Recent tenants */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Afiliados recientes</h3>
        <Table
          columns={recentColumns}
          data={tenants}
          emptyMessage="No hay afiliados"
          keyExtractor={(t) => t.id}
        />
      </Card>
    </div>
  );
}
