import React, { useState, useEffect } from 'react';
import { Plus, Search, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Table } from '@/components/ui/Table';
import { useTenant } from '@/contexts/TenantContext';
import { api } from '@/lib/api';

interface ClientItem {
  nit: string;
  name: string;
  regime: string;
}

export default function Clientes() {
  const { currentClient, setCurrentClient, clientList, setClientList } = useTenant();
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ nit: '', name: '', regime: 'general' });

  useEffect(() => {
    api.get<ClientItem[]>('/clients')
      .then((data) => setClientList(data))
      .catch(() => {
        setClientList([
          { nit: '1234567-8', name: 'Empresa ABC, S.A.', regime: 'general' },
          { nit: '7654321-2', name: 'Comercial XYZ', regime: 'pequenio' },
          { nit: '9876543-0', name: 'Servicios 1-2-3', regime: 'simplificado' },
        ]);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/clients', form);
      toast.success('Cliente agregado');
      const updated = [...clientList, { ...form }];
      setClientList(updated);
      setShowModal(false);
      setForm({ nit: '', name: '', regime: 'general' });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al agregar');
    }
  };

  const filtered = clientList.filter((c) =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.nit.includes(search)
  );

  const columns = [
    { key: 'nit', header: 'NIT' },
    { key: 'name', header: 'Nombre' },
    {
      key: 'regime', header: 'Régimen', render: (c: ClientItem) => (
        <Badge variant={c.regime === 'general' ? 'info' : c.regime === 'pequenio' ? 'warning' : 'purple'}>
          {c.regime === 'general' ? 'General' : c.regime === 'pequenio' ? 'Pequeño' : 'Simplificado'}
        </Badge>
      ),
    },
    {
      key: 'action', header: 'Acción', render: (c: ClientItem) => (
        <Button
          size="sm"
          variant={currentClient?.nit === c.nit ? 'primary' : 'outline'}
          onClick={() => setCurrentClient(c)}
        >
          {currentClient?.nit === c.nit ? 'Activo' : 'Seleccionar'}
        </Button>
      ),
    },
  ];

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary-600" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Clientes</h2>
          <p className="text-gray-500 text-sm mt-1">
            Cliente activo: <strong>{currentClient?.name || 'Ninguno'}</strong>
          </p>
        </div>
        <Button size="sm" onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4" /> Agregar cliente
        </Button>
      </div>

      <Card>
        <div className="mb-4 max-w-sm">
          <Input
            label="Buscar cliente"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por NIT o nombre..."
          />
        </div>
        <Table
          columns={columns}
          data={filtered}
          emptyMessage="No hay clientes registrados"
          keyExtractor={(c) => c.nit}
        />
      </Card>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Agregar cliente" size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button onClick={handleAdd}>Guardar</Button>
          </>
        }
      >
        <form className="space-y-4">
          <Input
            label="NIT"
            value={form.nit}
            onChange={(e) => setForm({ ...form, nit: e.target.value })}
            placeholder="1234567-8"
            required
          />
          <Input
            label="Nombre o razón social"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Nombre del cliente"
            required
          />
          <Select
            label="Régimen"
            options={[
              { value: 'general', label: 'General' },
              { value: 'pequenio', label: 'Pequeño Contribuyente' },
              { value: 'simplificado', label: 'Simplificado' },
            ]}
            value={form.regime}
            onChange={(e) => setForm({ ...form, regime: e.target.value })}
          />
        </form>
      </Modal>
    </div>
  );
}
