import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { api } from '@/lib/api';

export default function LibroCompras() {
  const [compras, setCompras] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.get<any>('/compras');
      setCompras(data.compras || []);
    } catch (e: any) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const body: any = {};
    form.forEach((v, k) => { body[k] = v; });
    await api.post('/compras', body);
    setShowAdd(false);
    load();
  };

  const total = compras.reduce((s: number, c: any) => s + (Number(c.total) || 0), 0);
  const iva = compras.reduce((s: number, c: any) => s + (Number(c.iva) || 0), 0);

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary-700 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Libro de Compras</h2>
        <Button onClick={() => setShowAdd(true)}><Plus className="w-4 h-4 mr-1" /> Agregar</Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card title="Total Compras" subtitle={`Q ${total.toFixed(2)}`} />
        <Card title="IVA Acreditable" subtitle={`Q ${iva.toFixed(2)}`} />
        <Card title="Documentos" subtitle={`${compras.length}`} />
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left">Fecha</th>
              <th className="px-4 py-3 text-left">Documento</th>
              <th className="px-4 py-3 text-left">Proveedor</th>
              <th className="px-4 py-3 text-left">NIT</th>
              <th className="px-4 py-3 text-right">Base</th>
              <th className="px-4 py-3 text-right">IVA</th>
              <th className="px-4 py-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {compras.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-500">No hay compras registradas. Agregue su primer documento.</td></tr>
            ) : compras.map((c: any) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">{new Date(c.fecha).toLocaleDateString('es-GT')}</td>
                <td className="px-4 py-3">{c.serie}-{c.numero_documento}</td>
                <td className="px-4 py-3">{c.nombre_proveedor}</td>
                <td className="px-4 py-3">{c.nit_proveedor}</td>
                <td className="px-4 py-3 text-right">Q {Number(c.base_imponible || 0).toFixed(2)}</td>
                <td className="px-4 py-3 text-right">Q {Number(c.iva || 0).toFixed(2)}</td>
                <td className="px-4 py-3 text-right font-medium">Q {Number(c.total || 0).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Agregar Compra">
        <form onSubmit={handleAdd} className="space-y-3">
          <Input label="Fecha" name="fecha" type="date" required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Serie" name="serie" defaultValue="FEL" />
            <Input label="No. Documento" name="numero_documento" required />
          </div>
          <Input label="NIT Proveedor" name="nit_proveedor" defaultValue="C/F" />
          <Input label="Nombre Proveedor" name="nombre_proveedor" defaultValue="Proveedor" />
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
