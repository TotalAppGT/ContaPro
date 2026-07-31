import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { api } from '@/lib/api';

export default function LibroVentas() {
  const [ventas, setVentas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.get<any>('/ventas');
      setVentas(data.ventas || []);
    } catch (e: any) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const body: any = {};
    form.forEach((v, k) => { body[k] = v; });
    await api.post('/ventas', body);
    setShowAdd(false);
    load();
  };

  const total = ventas.reduce((s: number, v: any) => s + (Number(v.total) || 0), 0);
  const iva = ventas.reduce((s: number, v: any) => s + (Number(v.iva) || 0), 0);

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary-700 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Libro de Ventas</h2>
        <Button onClick={() => setShowAdd(true)}><Plus className="w-4 h-4 mr-1" /> Agregar</Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card title="Total Ventas" subtitle={`Q ${total.toFixed(2)}`} />
        <Card title="IVA Generado" subtitle={`Q ${iva.toFixed(2)}`} />
        <Card title="Documentos" subtitle={`${ventas.length}`} />
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left">Fecha</th>
              <th className="px-4 py-3 text-left">Documento</th>
              <th className="px-4 py-3 text-left">Cliente</th>
              <th className="px-4 py-3 text-left">NIT</th>
              <th className="px-4 py-3 text-right">Base</th>
              <th className="px-4 py-3 text-right">IVA</th>
              <th className="px-4 py-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {ventas.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-500">No hay ventas registradas. Agregue su primer documento.</td></tr>
            ) : ventas.map((v: any) => (
              <tr key={v.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">{new Date(v.fecha).toLocaleDateString('es-GT')}</td>
                <td className="px-4 py-3">{v.serie}-{v.numero_documento}</td>
                <td className="px-4 py-3">{v.nombre_cliente}</td>
                <td className="px-4 py-3">{v.nit_cliente}</td>
                <td className="px-4 py-3 text-right">Q {Number(v.base_imponible || 0).toFixed(2)}</td>
                <td className="px-4 py-3 text-right">Q {Number(v.iva || 0).toFixed(2)}</td>
                <td className="px-4 py-3 text-right font-medium">Q {Number(v.total || 0).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Agregar Venta">
        <form onSubmit={handleAdd} className="space-y-3">
          <Input label="Fecha" name="fecha" type="date" required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Serie" name="serie" defaultValue="FEL" />
            <Input label="No. Documento" name="numero_documento" required />
          </div>
          <Input label="NIT Cliente" name="nit_cliente" defaultValue="C/F" />
          <Input label="Nombre Cliente" name="nombre_cliente" defaultValue="Consumidor Final" />
          <div className="grid grid-cols-3 gap-3">
            <Input label="Base Imponible" name="base_imponible" type="number" step="0.01" defaultValue="0" />
            <Input label="IVA" name="iva" type="number" step="0.01" defaultValue="0" />
            <Input label="Total" name="total" type="number" step="0.01" required />
          </div>
          <Button type="submit" className="w-full">Guardar</Button>
        </form>
      </Modal>
    </div>
  );
}
