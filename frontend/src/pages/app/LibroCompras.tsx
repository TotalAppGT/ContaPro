import React, { useState, useEffect } from 'react';
import HelpBar from '@/components/HelpBar';
import { Plus, FileDown, UploadCloud } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { api } from '@/lib/api';

function toNumber(v: FormDataEntryValue): number {
  const n = parseFloat(v as string);
  return isNaN(n) ? 0 : n;
}

function downloadCSV(compras: any[], filename: string) {
  const BOM = '\uFEFF';
  const headers = ['NIT Emisor', 'Nombre', 'Tipo Documento', 'Serie', 'Número', 'Fecha', 'Base Imponible', 'IVA', 'Total'];
  const rows = compras.map((c) => [
    `"${c.nit_proveedor || ''}"`,
    `"${c.nombre_proveedor || ''}"`,
    `"${c.serie || 'FEL'}"`,
    `"${c.serie || ''}"`,
    `"${c.numero_documento || ''}"`,
    `"${c.fecha || ''}"`,
    Number(c.base_imponible || 0).toFixed(2),
    Number(c.iva || 0).toFixed(2),
    Number(c.total || 0).toFixed(2),
  ].join(','));
  const csv = BOM + headers.join(',') + '\n' + rows.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function LibroCompras() {
  const [compras, setCompras] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.get<any>('/compras');
      setCompras(data.compras || []);
    } catch (e: any) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadMsg(`Archivo "${file.name}" seleccionado. Carga de archivos próximamente.`);
      setTimeout(() => setUploadMsg(''), 5000);
    }
    e.target.value = '';
  };

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const body: any = {};
    form.forEach((v, k) => {
      if (k === 'base_imponible' || k === 'iva' || k === 'total' || k === 'exento') {
        body[k] = toNumber(v);
      } else {
        body[k] = v;
      }
    });
    await api.post('/compras', body);
    setShowAdd(false);
    load();
  };

  const handleDownload = () => {
    const now = new Date().toISOString().slice(0, 10);
    downloadCSV(compras, `libro-compras-${now}.csv`);
  };

  const total = compras.reduce((s: number, c: any) => s + (Number(c.total) || 0), 0);
  const iva = compras.reduce((s: number, c: any) => s + (Number(c.iva) || 0), 0);

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary-700 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <HelpBar tips={['Registre todas sus facturas de compra para el credito fiscal.', 'El IVA acreditable se calcula segun su regimen.', 'Descargue el libro en Excel para su contador.', 'Mantenga actualizado este libro para el SAT-2237.']} />
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Libro de Compras</h2>
        <div className="flex items-center gap-2">
          <label className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 cursor-pointer">
            <UploadCloud className="w-4 h-4" /> Cargar archivo
            <input type="file" accept=".csv,.xlsx,.xml" onChange={handleFileUpload} className="hidden" />
          </label>
          {compras.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <FileDown className="w-4 h-4" /> Descargar Excel
            </Button>
          )}
          <Button onClick={() => setShowAdd(true)}><Plus className="w-4 h-4 mr-1" /> Agregar</Button>
        </div>
      </div>

      {uploadMsg && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">{uploadMsg}</div>
      )}

      <div className="grid grid-cols-3 gap-4">
        <Card><CardHeader title="Total Compras" subtitle={`Q ${total.toFixed(2)}`} /></Card>
        <Card><CardHeader title="IVA Acreditable" subtitle={`Q ${iva.toFixed(2)}`} /></Card>
        <Card><CardHeader title="Documentos" subtitle={`${compras.length}`} /></Card>
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

      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Agregar Compra">
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
