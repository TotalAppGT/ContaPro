import React, { useState, useEffect } from 'react';
import { Search, Eye, Ban, CheckCircle, XCircle, Loader2, LogIn } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Table } from '@/components/ui/Table';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import type { Tenant } from '@/types';

export default function AdminTenants() {
  const { loginAsTenant } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    loadTenants();
  }, []);

  const loadTenants = async () => {
    setIsLoading(true);
    try {
      const data = await api.get<Tenant[]>('/admin/tenants');
      setTenants(data);
    } catch {
      setTenants([
        { id: '1', nit: '1234567-8', name: 'López & Asociados', legal_name: 'López & Asociados S.A.', subdomain: 'lopez', email: 'info@lopez.com.gt', phone: '+502 2222-1111', address: 'Zona 10, Guatemala', regime: 'general', plan: 'professional', status: 'active', created_at: '2026-01-15', subscription_expires: '2026-08-15' },
        { id: '2', nit: '7654321-2', name: 'Comercial XYZ', legal_name: 'Comercial XYZ S.A.', subdomain: 'xyz', email: 'admin@xyz.com.gt', phone: '+502 3333-2222', address: 'Zona 9, Guatemala', regime: 'pequenio', plan: 'personal', status: 'active', created_at: '2026-03-10', subscription_expires: '2026-09-10' },
        { id: '3', nit: '9876543-0', name: 'Servicios 1-2-3', legal_name: 'Servicios 1-2-3 S.A.', subdomain: 'servicios123', email: 'contacto@servicios123.com.gt', phone: '+502 4444-3333', address: 'Mixco, Guatemala', regime: 'simplificado', plan: 'enterprise', status: 'suspended', created_at: '2025-11-20', subscription_expires: '2026-05-20' },
        { id: '4', nit: '1122334-5', name: 'Importadora GT', legal_name: 'Importadora GT S.A.', subdomain: 'importgt', email: 'info@importgt.com.gt', phone: '+502 5555-4444', address: 'Zona 12, Guatemala', regime: 'general', plan: 'professional', status: 'active', created_at: '2026-06-01', subscription_expires: '2026-12-01' },
        { id: '5', nit: '9988776-6', name: 'Consultores Unidos', legal_name: 'Consultores Unidos S.A.', subdomain: 'cunidos', email: 'info@cunidos.com.gt', phone: '+502 6666-5555', address: 'Zona 4, Guatemala', regime: 'general', plan: 'professional', status: 'trial', created_at: '2026-07-25', subscription_expires: '2026-08-08' },
        { id: '6', nit: '5566778-9', name: 'Distribuidora Nacional', legal_name: 'Distribuidora Nacional S.A.', subdomain: 'dnsa', email: 'ventas@dnsa.com.gt', phone: '+502 7777-6666', address: 'Villa Nueva, Guatemala', regime: 'general', plan: 'professional', status: 'cancelled', created_at: '2025-06-01', subscription_expires: '2026-06-01' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (tenantId: string, newStatus: string) => {
    try {
      await api.patch(`/admin/tenants/${tenantId}/status`, { status: newStatus });
      toast.success(`Afiliado ${newStatus === 'active' ? 'activado' : newStatus === 'suspended' ? 'suspendido' : 'cancelado'}`);
      loadTenants();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al actualizar');
    }
  };

  const handleImpersonate = async (tenant: Tenant) => {
    try {
      await loginAsTenant(tenant.id, tenant.email, '');
      toast.success(`Ingresando como ${tenant.name}`);
      window.location.href = '/app';
    } catch (err) {
      toast.error('No se pudo acceder como el afiliado');
    }
  };

  const filtered = tenants.filter((t) => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (planFilter !== 'all' && t.plan !== planFilter) return false;
    if (search && !t.name.toLowerCase().includes(search.toLowerCase()) && !t.nit.includes(search)) return false;
    return true;
  });

  const tenantColumns = [
    { key: 'name', header: 'Nombre', sortable: true },
    { key: 'nit', header: 'NIT' },
    {
      key: 'plan', header: 'Plan', render: (t: Tenant) => (
        <Badge variant={t.plan === 'enterprise' ? 'purple' : t.plan === 'professional' ? 'info' : 'default'}>
          {t.plan === 'personal' ? 'Personal' : t.plan === 'professional' ? 'Profesional' : 'Empresarial'}
        </Badge>
      ),
    },
    {
      key: 'status', header: 'Estado', render: (t: Tenant) => (
        <Badge variant={t.status === 'active' ? 'success' : t.status === 'suspended' ? 'warning' : t.status === 'trial' ? 'info' : 'danger'}>
          {t.status === 'active' ? 'Activo' : t.status === 'suspended' ? 'Suspendido' : t.status === 'trial' ? 'Prueba' : 'Cancelado'}
        </Badge>
      ),
    },
    { key: 'created_at', header: 'Creado', render: (t: Tenant) => new Date(t.created_at).toLocaleDateString('es-GT') },
    {
      key: 'actions', header: 'Acciones', render: (t: Tenant) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); setSelectedTenant(t); setShowDetail(true); }}
            className="p-1.5 text-gray-400 hover:text-primary-600 rounded-lg hover:bg-gray-100"
            title="Ver detalle"
          >
            <Eye className="w-4 h-4" />
          </button>
          {t.status !== 'active' && (
            <button
              onClick={(e) => { e.stopPropagation(); handleStatusChange(t.id, 'active'); }}
              className="p-1.5 text-gray-400 hover:text-green-600 rounded-lg hover:bg-gray-100"
              title="Activar"
            >
              <CheckCircle className="w-4 h-4" />
            </button>
          )}
          {t.status === 'active' && (
            <button
              onClick={(e) => { e.stopPropagation(); handleStatusChange(t.id, 'suspended'); }}
              className="p-1.5 text-gray-400 hover:text-yellow-600 rounded-lg hover:bg-gray-100"
              title="Suspender"
            >
              <Ban className="w-4 h-4" />
            </button>
          )}
          {t.status !== 'cancelled' && (
            <button
              onClick={(e) => { e.stopPropagation(); handleStatusChange(t.id, 'cancelled'); }}
              className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-100"
              title="Cancelar"
            >
              <XCircle className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); handleImpersonate(t); }}
            className="p-1.5 text-gray-400 hover:text-primary-600 rounded-lg hover:bg-gray-100"
            title="Ingresar como afiliado"
          >
            <LogIn className="w-4 h-4" />
          </button>
        </div>
      ),
      className: 'w-40',
    },
  ];

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary-600" /></div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Gestión de Afiliados</h2>

      <Card>
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="flex-1">
            <Input
              label="Buscar"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre o NIT..."
            />
          </div>
          <Select
            label="Estado"
            options={[
              { value: 'all', label: 'Todos' },
              { value: 'active', label: 'Activos' },
              { value: 'suspended', label: 'Suspendidos' },
              { value: 'trial', label: 'En prueba' },
              { value: 'cancelled', label: 'Cancelados' },
            ]}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-40"
          />
          <Select
            label="Plan"
            options={[
              { value: 'all', label: 'Todos' },
              { value: 'personal', label: 'Personal' },
              { value: 'professional', label: 'Profesional' },
              { value: 'enterprise', label: 'Empresarial' },
            ]}
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="w-40"
          />
        </div>

        <Table
          columns={tenantColumns}
          data={filtered}
          emptyMessage="No se encontraron afiliados"
          keyExtractor={(t) => t.id}
          onRowClick={(t) => { setSelectedTenant(t); setShowDetail(true); }}
        />
      </Card>

      {/* Detail modal */}
      <Modal isOpen={showDetail && !!selectedTenant} onClose={() => setShowDetail(false)} title="Detalle del Afiliado" size="md"
        footer={
          <Button variant="outline" onClick={() => setShowDetail(false)}>Cerrar</Button>
        }
      >
        {selectedTenant && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Nombre</p>
                <p className="font-semibold">{selectedTenant.name}</p>
              </div>
              <div>
                <p className="text-gray-500">Razón Social</p>
                <p className="font-semibold">{selectedTenant.legal_name}</p>
              </div>
              <div>
                <p className="text-gray-500">NIT</p>
                <p className="font-semibold">{selectedTenant.nit}</p>
              </div>
              <div>
                <p className="text-gray-500">Subdominio</p>
                <p className="font-semibold">{selectedTenant.subdomain}.contapro.com.gt</p>
              </div>
              <div>
                <p className="text-gray-500">Email</p>
                <p className="font-semibold">{selectedTenant.email}</p>
              </div>
              <div>
                <p className="text-gray-500">Teléfono</p>
                <p className="font-semibold">{selectedTenant.phone}</p>
              </div>
              <div>
                <p className="text-gray-500">Dirección</p>
                <p className="font-semibold">{selectedTenant.address}</p>
              </div>
              <div>
                <p className="text-gray-500">Régimen</p>
                <p className="font-semibold">{selectedTenant.regime === 'general' ? 'General' : selectedTenant.regime === 'pequenio' ? 'Pequeño' : 'Simplificado'}</p>
              </div>
              <div>
                <p className="text-gray-500">Plan</p>
                <Badge variant={selectedTenant.plan === 'enterprise' ? 'purple' : selectedTenant.plan === 'professional' ? 'info' : 'default'}>
                  {selectedTenant.plan === 'personal' ? 'Personal' : selectedTenant.plan === 'professional' ? 'Profesional' : 'Empresarial'}
                </Badge>
              </div>
              <div>
                <p className="text-gray-500">Estado</p>
                <Badge variant={selectedTenant.status === 'active' ? 'success' : selectedTenant.status === 'suspended' ? 'warning' : selectedTenant.status === 'trial' ? 'info' : 'danger'}>
                  {selectedTenant.status === 'active' ? 'Activo' : selectedTenant.status === 'suspended' ? 'Suspendido' : selectedTenant.status === 'trial' ? 'Prueba' : 'Cancelado'}
                </Badge>
              </div>
              <div>
                <p className="text-gray-500">Fecha de registro</p>
                <p className="font-semibold">{new Date(selectedTenant.created_at).toLocaleDateString('es-GT')}</p>
              </div>
              <div>
                <p className="text-gray-500">Suscripción expira</p>
                <p className="font-semibold">{new Date(selectedTenant.subscription_expires).toLocaleDateString('es-GT')}</p>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
