import React, { useState, useEffect } from 'react';
import HelpBar from '@/components/HelpBar';
import { Plus, Trash2, Users, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useTenant } from '@/contexts/TenantContext';

interface ClientItem {
  id: string;
  nit: string;
  nombre: string;
  regimen: string;
}

const REGIMENES = [
  { value: 'general', label: 'Régimen General' },
  { value: 'pequenio', label: 'Pequeño Contribuyente' },
  { value: 'simplificado', label: 'Simplificado' },
];

const STORAGE_KEY = 'contapro_clientes';

function loadClientes(): ClientItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveClientes(clientes: ClientItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(clientes));
}

export default function Clientes() {
  const { currentClient } = useTenant();
  const [clientes, setClientes] = useState<ClientItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ nit: '', nombre: '', regimen: 'general' });
  const [filter, setFilter] = useState('');

  useEffect(() => {
    setClientes(loadClientes());
  }, []);

  const resetForm = () => {
    setForm({ nit: '', nombre: '', regimen: 'general' });
    setShowForm(false);
    setEditingId(null);
  };

  const handleSave = () => {
    if (!form.nit.trim() || !form.nombre.trim()) {
      toast.error('NIT y Nombre son requeridos');
      return;
    }
    let updated: ClientItem[];
    if (editingId) {
      updated = clientes.map((c) => (c.id === editingId ? { ...c, ...form } : c));
    } else {
      const nuevo: ClientItem = { id: crypto.randomUUID(), ...form };
      updated = [...clientes, nuevo];
    }
    saveClientes(updated);
    setClientes(updated);
    toast.success(editingId ? 'Cliente actualizado' : 'Cliente agregado');
    resetForm();
  };

  const handleDelete = (id: string) => {
    const updated = clientes.filter((c) => c.id !== id);
    saveClientes(updated);
    setClientes(updated);
    toast.success('Cliente eliminado');
  };

  const handleEdit = (c: ClientItem) => {
    setForm({ nit: c.nit, nombre: c.nombre, regimen: c.regimen });
    setEditingId(c.id);
    setShowForm(true);
  };

  const filtered = filter
    ? clientes.filter((c) => c.nombre.toLowerCase().includes(filter.toLowerCase()) || c.nit.includes(filter))
    : clientes;

  return (
    <div className="space-y-6">
      <HelpBar tips={['Agregue sus clientes con NIT y regimen fiscal.', 'Seleccione el cliente activo para filtrar reportes.', 'Puede editar o eliminar clientes existentes.', 'Cada cliente puede tener su propia configuracion fiscal.']} />
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Clientes</h2>
        <p className="text-gray-500 text-sm mt-1">
          Cliente activo: <strong>{currentClient?.name || 'Ninguno'}</strong>
        </p>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-gray-900">Listado de Clientes</h3>
            <Input
              placeholder="Buscar por NIT o nombre..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-64"
            />
          </div>
          <Button size="sm" onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus className="w-4 h-4" /> Agregar Cliente
          </Button>
        </div>

        {showForm && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-800">{editingId ? 'Editar Cliente' : 'Nuevo Cliente'}</h4>
              <button onClick={resetForm} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <Input
                label="NIT"
                value={form.nit}
                onChange={(e) => setForm({ ...form, nit: e.target.value })}
                placeholder="Ej: 1234567-1"
              />
              <div className="sm:col-span-2">
                <Input
                  label="Nombre"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Nombre del cliente"
                />
              </div>
              <Select
                label="Régimen"
                options={REGIMENES}
                value={form.regimen}
                onChange={(e) => setForm({ ...form, regimen: e.target.value })}
              />
            </div>
            <div className="flex justify-end mt-3">
              <Button size="sm" onClick={handleSave}><Save className="w-4 h-4" /> {editingId ? 'Actualizar' : 'Guardar'}</Button>
            </div>
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="w-12 h-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-1">
              {clientes.length === 0 ? 'No hay clientes registrados' : 'Sin resultados'}
            </h3>
            <p className="text-gray-500 text-sm">
              {clientes.length === 0 ? 'Agregue su primer cliente usando el botón superior.' : 'Intente con otro término de búsqueda.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-y border-gray-200">
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">NIT</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Nombre</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Régimen</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600 w-24">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{c.nit}</td>
                    <td className="px-4 py-3">{c.nombre}</td>
                    <td className="px-4 py-3">
                      <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700">
                        {REGIMENES.find((r) => r.value === c.regimen)?.label || c.regimen}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleEdit(c)} className="px-2 py-1 text-xs text-primary-600 hover:bg-primary-50 rounded">
                          Editar
                        </button>
                        <button onClick={() => handleDelete(c.id)} className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
