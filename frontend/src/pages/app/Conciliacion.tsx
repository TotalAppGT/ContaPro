import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Download, Printer, CheckCircle2, Loader2, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Table } from '@/components/ui/Table';
import { api } from '@/lib/api';
import type { BankAccount, BankTransaction } from '@/types';

export default function Conciliacion() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [reconciling, setReconciling] = useState<Set<string>>(new Set());

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    reference: '',
    debit: '0',
    credit: '0',
  });

  useEffect(() => {
    api.get<{ cuentas: BankAccount[] }>('/conciliacion/cuentas')
      .then((data) => {
        setAccounts(data.cuentas);
        if (data.cuentas.length > 0) setSelectedAccount(data.cuentas[0].id);
      })
      .catch(() => {
        setAccounts([
          { id: '1', bank_name: 'Banco Industrial', account_number: '001-000123-4', initial_balance: 50000, current_balance: 78500, currency: 'GTQ' },
          { id: '2', bank_name: 'Banco G&T', account_number: '002-000456-7', initial_balance: 25000, current_balance: 32000, currency: 'GTQ' },
        ]);
        setSelectedAccount('1');
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (selectedAccount) loadTransactions();
  }, [selectedAccount, statusFilter, dateFrom, dateTo]);

  const loadTransactions = async () => {
    try {
      const params: Record<string, string> = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      const data = await api.get<{ transacciones: BankTransaction[] }>('/conciliacion/transacciones', { ...params, cuenta_id: selectedAccount });
      setTransactions(data.transacciones);
    } catch {
      setTransactions(generateDummy(selectedAccount));
    }
  };

  const generateDummy = (id: string): BankTransaction[] => {
    const base = id === '1' ? 50000 : 25000;
    return [
      { id: 't1', bank_account_id: id, date: '2026-07-15', description: 'Pago proveedor A', reference: 'CHQ-1001', debit: 0, credit: 15000, is_reconciled: true, reconciled_at: '2026-07-15' },
      { id: 't2', bank_account_id: id, date: '2026-07-20', description: 'Cobro cliente B', reference: 'DEP-2001', debit: 25000, credit: 0, is_reconciled: true, reconciled_at: '2026-07-20' },
      { id: 't3', bank_account_id: id, date: '2026-07-25', description: 'Servicios públicos', reference: 'ACH-3001', debit: 0, credit: 3500, is_reconciled: false, reconciled_at: null },
      { id: 't4', bank_account_id: id, date: '2026-07-28', description: 'Venta mercadería', reference: 'DEP-2002', debit: 12000, credit: 0, is_reconciled: false, reconciled_at: null },
      { id: 't5', bank_account_id: id, date: '2026-07-30', description: 'Pago alquiler', reference: 'CHQ-1002', debit: 0, credit: 8000, is_reconciled: false, reconciled_at: null },
    ];
  };

  const toggleReconcile = (id: string) => {
    setReconciling((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleBulkReconcile = async () => {
    if (reconciling.size === 0) return;
    try {
      await Promise.all(Array.from(reconciling).map((id) => api.patch(`/conciliacion/transacciones/${id}`)));
      toast.success(`${reconciling.size} transacciones conciliadas`);
      setReconciling(new Set());
      loadTransactions();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al conciliar');
    }
  };

  const handleAdd = async (e: React.FormEvent | React.MouseEvent) => {
    e.preventDefault();
    try {
      await api.post('/conciliacion/transacciones', {
        cuenta_id: selectedAccount,
        date: form.date,
        description: form.description,
        reference: form.reference,
        debit: parseFloat(form.debit) || 0,
        credit: parseFloat(form.credit) || 0,
      });
      toast.success('Transacción agregada');
      setShowModal(false);
      loadTransactions();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al agregar');
    }
  };

  const selectedAccountData = accounts.find((a) => a.id === selectedAccount);
  const totalCredits = transactions.reduce((s, t) => s + t.credit, 0);
  const totalDebits = transactions.reduce((s, t) => s + t.debit, 0);
  const adminBalance = (selectedAccountData?.initial_balance || 0) + totalDebits - totalCredits;

  const columns = [
    {
      key: 'checkbox', header: '', render: (r: BankTransaction) => (
        <input
          type="checkbox"
          checked={reconciling.has(r.id) || r.is_reconciled}
          disabled={r.is_reconciled}
          onChange={() => toggleReconcile(r.id)}
          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
        />
      ),
      className: 'w-10'
    },
    { key: 'date', header: 'Fecha', render: (r: BankTransaction) => new Date(r.date).toLocaleDateString('es-GT'), sortable: true },
    { key: 'description', header: 'Descripción' },
    { key: 'reference', header: 'Referencia' },
    { key: 'debit', header: 'Débito (Q)', render: (r: BankTransaction) => r.debit > 0 ? `Q${r.debit.toFixed(2)}` : '-', className: 'text-right' },
    { key: 'credit', header: 'Crédito (Q)', render: (r: BankTransaction) => r.credit > 0 ? `Q${r.credit.toFixed(2)}` : '-', className: 'text-right' },
    {
      key: 'is_reconciled', header: 'Estado', render: (r: BankTransaction) => (
        <Badge variant={r.is_reconciled ? 'success' : 'warning'}>
          {r.is_reconciled ? 'Conciliado' : 'Pendiente'}
        </Badge>
      ),
    },
  ];

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary-600" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Conciliación Bancaria</h2>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="w-4 h-4" /> Imprimir
          </Button>
          <Button size="sm" onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4" /> Agregar movimiento
          </Button>
        </div>
      </div>

      {/* Cuadre panel */}
      <Card className="bg-gradient-to-br from-primary-50 to-blue-50 border-primary-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Panel de Cuadre</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500">Saldo Inicial</p>
            <p className="text-lg font-bold text-gray-900">Q{(selectedAccountData?.initial_balance || 0).toLocaleString('es-GT', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="bg-white rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500">Total Débitos</p>
            <p className="text-lg font-bold text-green-600">Q{totalDebits.toLocaleString('es-GT', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="bg-white rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500">Total Créditos</p>
            <p className="text-lg font-bold text-red-600">Q{totalCredits.toLocaleString('es-GT', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="bg-white rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500">Saldo Administrado</p>
            <p className="text-lg font-bold text-primary-700">Q{adminBalance.toLocaleString('es-GT', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <p className="text-sm text-gray-600">
            <strong>Saldo según banco:</strong> Q{(selectedAccountData?.current_balance || 0).toLocaleString('es-GT', { minimumFractionDigits: 2 })}
          </p>
          <Badge variant={Math.abs(adminBalance - (selectedAccountData?.current_balance || 0)) < 0.01 ? 'success' : 'danger'}>
            {Math.abs(adminBalance - (selectedAccountData?.current_balance || 0)) < 0.01 ? 'Cuadrado' : 'Descuadrado'}
          </Badge>
        </div>
      </Card>

      <Card>
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <Select
            label="Cuenta bancaria"
            options={accounts.map((a) => ({ value: a.id, label: `${a.bank_name} - ${a.account_number}` }))}
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            className="w-64"
          />
          <Select
            label="Estado"
            options={[
              { value: 'all', label: 'Todos' },
              { value: 'reconciled', label: 'Conciliados' },
              { value: 'pending', label: 'Pendientes' },
            ]}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-40"
          />
          <Input label="Desde" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <Input label="Hasta" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>

        {reconciling.size > 0 && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg flex items-center justify-between">
            <span className="text-sm text-blue-700">{reconciling.size} transacciones seleccionadas</span>
            <Button size="sm" onClick={handleBulkReconcile}>
              <CheckCircle2 className="w-4 h-4" /> Conciliar seleccionadas
            </Button>
          </div>
        )}

        <Table
          columns={columns}
          data={transactions}
          emptyMessage="No hay transacciones para esta cuenta"
          keyExtractor={(r) => r.id}
        />
      </Card>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Nuevo movimiento" size="sm">
        <form onSubmit={(e) => { e.preventDefault(); handleAdd(e); }} className="space-y-4">
          <Input label="Fecha" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <Input label="Descripción" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Input label="Referencia" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="CHQ-XXXX" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Débito (Q)" type="number" step="0.01" value={form.debit} onChange={(e) => setForm({ ...form, debit: e.target.value })} />
            <Input label="Crédito (Q)" type="number" step="0.01" value={form.credit} onChange={(e) => setForm({ ...form, credit: e.target.value })} />
          </div>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <Button variant="outline" type="button" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button type="submit">Guardar</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
