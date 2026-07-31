import React, { useState, useEffect } from 'react';
import { Plus, Download, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Table } from '@/components/ui/Table';
import { api } from '@/lib/api';
import type { PurchaseEntry } from '@/types';

export default function LibroCompras() {
  const [compras, setCompras] = useState<PurchaseEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({
    document_type: 'FACT',
    series: 'A',
    number: '',
    date: new Date().toISOString().split('T')[0],
    nit: '',
    supplier_name: '',
    taxable_amount: '0',
    exempt_amount: '0',
    iva: '0',
    total: '0',
  });

  useEffect(() => {
    loadCompras();
  }, [month, year]);

  const loadCompras = async () => {
    setIsLoading(true);
    try {
      const data = await api.get<PurchaseEntry[]>('/compras', { month, year });
      setCompras(data);
    } catch {
      setCompras([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/compras', form);
      toast.success('Compra registrada exitosamente');
      setShowModal(false);
      loadCompras();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al registrar');
    }
  };

  const filtered = compras.filter((c) =>
    !search || c.supplier_name.toLowerCase().includes(search.toLowerCase()) || c.nit.includes(search) || c.number.includes(search)
  );

  const totals = filtered.reduce((acc, c) => ({
    taxable: acc.taxable + c.taxable_amount,
    exempt: acc.exempt + c.exempt_amount,
    iva: acc.iva + c.iva,
    total: acc.total + c.total,
  }), { taxable: 0, exempt: 0, iva: 0, total: 0 });

  const columns = [
    { key: 'date', header: 'Fecha', render: (r: PurchaseEntry) => new Date(r.date).toLocaleDateString('es-GT'), sortable: true },
    { key: 'document_type', header: 'Tipo' },
    { key: 'number', header: 'Número', render: (r: PurchaseEntry) => `${r.series}-${r.number}` },
    { key: 'nit', header: 'NIT' },
    { key: 'supplier_name', header: 'Proveedor' },
    { key: 'taxable_amount', header: 'Gravado', render: (r: PurchaseEntry) => `Q${r.taxable_amount.toFixed(2)}`, className: 'text-right' },
    { key: 'iva', header: 'IVA', render: (r: PurchaseEntry) => `Q${r.iva.toFixed(2)}`, className: 'text-right' },
    { key: 'total', header: 'Total', render: (r: PurchaseEntry) => `Q${r.total.toFixed(2)}`, className: 'text-right font-medium' },
  ];

  const months = [
    { value: '1', label: 'Enero' }, { value: '2', label: 'Febrero' }, { value: '3', label: 'Marzo' },
    { value: '4', label: 'Abril' }, { value: '5', label: 'Mayo' }, { value: '6', label: 'Junio' },
    { value: '7', label: 'Julio' }, { value: '8', label: 'Agosto' }, { value: '9', label: 'Septiembre' },
    { value: '10', label: 'Octubre' }, { value: '11', label: 'Noviembre' }, { value: '12', label: 'Diciembre' },
  ];

  const years = Array.from({ length: 5 }, (_, i) => ({
    value: String(new Date().getFullYear() - i),
    label: String(new Date().getFullYear() - i),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Libro de Compras</h2>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => toast.success('Exportación iniciada')}>
            <Download className="w-4 h-4" /> Exportar
          </Button>
          <Button size="sm" onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4" /> Nueva compra
          </Button>
        </div>
      </div>

      <Card>
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <Select label="Mes" options={months} value={month} onChange={(e) => setMonth(e.target.value)} className="w-40" />
          <Select label="Año" options={years} value={year} onChange={(e) => setYear(e.target.value)} className="w-32" />
          <div className="flex-1">
            <Input
              label="Buscar"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por NIT, proveedor o número..."
            />
          </div>
        </div>

        <Table
          columns={columns}
          data={filtered}
          isLoading={isLoading}
          emptyMessage="No se encontraron compras para este período"
          keyExtractor={(r) => r.id}
        />

        {filtered.length > 0 && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Total Gravado:</span>
                <p className="font-semibold">Q{totals.taxable.toFixed(2)}</p>
              </div>
              <div>
                <span className="text-gray-500">Total Exento:</span>
                <p className="font-semibold">Q{totals.exempt.toFixed(2)}</p>
              </div>
              <div>
                <span className="text-gray-500">Total IVA:</span>
                <p className="font-semibold text-primary-700">Q{totals.iva.toFixed(2)}</p>
              </div>
              <div>
                <span className="text-gray-500">Total General:</span>
                <p className="font-semibold text-lg">Q{totals.total.toFixed(2)}</p>
              </div>
            </div>
          </div>
        )}
      </Card>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Nueva compra" size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button onClick={handleSubmit}>Guardar</Button>
          </>
        }
      >
        <form className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Select label="Documento" options={[
              { value: 'FACT', label: 'Factura' }, { value: 'FACT-PEQ', label: 'Factura Peq. Contribuyente' },
              { value: 'FACT-ESP', label: 'Factura Especial' }, { value: 'ND', label: 'Nota de Débito' },
            ]} value={form.document_type} onChange={(e) => setForm({ ...form, document_type: e.target.value })} />
            <Input label="Serie" value={form.series} onChange={(e) => setForm({ ...form, series: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Número" value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} placeholder="123456" />
            <Input label="Fecha" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="NIT Proveedor" value={form.nit} onChange={(e) => setForm({ ...form, nit: e.target.value })} placeholder="1234567-8" />
            <Input label="Nombre Proveedor" value={form.supplier_name} onChange={(e) => setForm({ ...form, supplier_name: e.target.value })} placeholder="Nombre del proveedor" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input label="Gravado (Q)" type="number" step="0.01" value={form.taxable_amount} onChange={(e) => setForm({ ...form, taxable_amount: e.target.value })} />
            <Input label="Exento (Q)" type="number" step="0.01" value={form.exempt_amount} onChange={(e) => setForm({ ...form, exempt_amount: e.target.value })} />
            <Input label="IVA (Q)" type="number" step="0.01" value={form.iva} onChange={(e) => setForm({ ...form, iva: e.target.value })} />
          </div>
          <Input label="Total (Q)" type="number" step="0.01" value={form.total} onChange={(e) => setForm({ ...form, total: e.target.value })} />
        </form>
      </Modal>
    </div>
  );
}
