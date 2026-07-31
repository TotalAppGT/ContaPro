import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Save, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import type { ChartAccount, PolicyType } from '@/types';

interface JournalLine {
  id: string;
  account_code: string;
  account_name: string;
  concept: string;
  debit: number;
  credit: number;
}

const policyTypes = [
  { value: 'Diario', label: 'Diario' },
  { value: 'Ajuste', label: 'Ajuste' },
  { value: 'Ingreso', label: 'Ingreso' },
  { value: 'Egreso', label: 'Egreso' },
];

export default function GraficaT() {
  const [policyType, setPolicyType] = useState<PolicyType>('Diario');
  const [concept, setConcept] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [lines, setLines] = useState<JournalLine[]>([
    { id: '1', account_code: '', account_name: '', concept: '', debit: 0, credit: 0 },
    { id: '2', account_code: '', account_name: '', concept: '', debit: 0, credit: 0 },
  ]);
  const [accounts, setAccounts] = useState<ChartAccount[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.get<{ cuentas: any[] }>('/contabilidad/catalogo')
      .then((data) => {
        const mapped = (data.cuentas || []).map((c: any) => ({
          id: c.id,
          code: c.codigo,
          name: c.nombre,
          type: c.tipo,
          parent_id: c.parent_id || null,
          level: c.nivel || 1,
          is_accept_movement: c.acepta_asientos !== false,
          balance: c.saldo || 0,
        }));
        setAccounts(mapped);
      })
      .catch(() => {
        setAccounts([
          { id: '1', code: '1.1.01', name: 'Caja', type: 'Activo', parent_id: null, level: 1, is_accept_movement: true, balance: 0 },
          { id: '2', code: '1.1.02', name: 'Bancos', type: 'Activo', parent_id: null, level: 1, is_accept_movement: true, balance: 0 },
          { id: '3', code: '4.1.01', name: 'Ventas', type: 'Ingreso', parent_id: null, level: 1, is_accept_movement: true, balance: 0 },
          { id: '4', code: '5.1.01', name: 'Compras', type: 'Egreso', parent_id: null, level: 1, is_accept_movement: true, balance: 0 },
        ]);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const totalDebit = lines.reduce((sum, l) => sum + (l.debit || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (l.credit || 0), 0);
  const diff = totalDebit - totalCredit;
  const isBalanced = Math.abs(diff) < 0.01 && totalDebit > 0 && totalCredit > 0;

  const addLine = () => {
    setLines([...lines, { id: crypto.randomUUID(), account_code: '', account_name: '', concept: '', debit: 0, credit: 0 }]);
  };

  const removeLine = (id: string) => {
    if (lines.length <= 2) return;
    setLines(lines.filter((l) => l.id !== id));
  };

  const updateLine = (id: string, field: keyof JournalLine, value: string | number) => {
    setLines(lines.map((l) => {
      if (l.id !== id) return l;
      const updated = { ...l, [field]: value };
      if (field === 'account_code') {
        const acc = accounts.find((a) => a.code === String(value));
        updated.account_name = acc?.name || '';
      }
      return updated;
    }));
  };

  const handleSubmit = async () => {
    if (!isBalanced) {
      toast.error('La partida no está cuadrada. Debe es diferente a Haber.');
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post('/contabilidad/asientos', {
        client_nit: null,
        fecha: date,
        lineas: lines.filter((l) => l.account_code).map((l) => ({
          codigo: l.account_code,
          concepto: l.concept,
          debe: l.debit,
          haber: l.credit,
        })),
        tipoPoliza: policyType,
        conceptoGeneral: concept,
      });
      toast.success('Partida registrada exitosamente');
      setConcept('');
      setLines([
        { id: '1', account_code: '', account_name: '', concept: '', debit: 0, credit: 0 },
        { id: '2', account_code: '', account_name: '', concept: '', debit: 0, credit: 0 },
      ]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al registrar');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary-600" /></div>;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900">Gráfica T - Registro de Partidas</h2>

      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Select
            label="Tipo de póliza"
            options={policyTypes}
            value={policyType}
            onChange={(e) => setPolicyType(e.target.value as PolicyType)}
          />
          <Input
            label="Fecha"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <Input
            label="Concepto general"
            value={concept}
            onChange={(e) => setConcept(e.target.value)}
            placeholder="Descripción de la partida"
          />
        </div>

        {/* Lines table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-y border-gray-200">
                <th className="px-3 py-2.5 text-left font-semibold text-gray-600 w-28">Cuenta</th>
                <th className="px-3 py-2.5 text-left font-semibold text-gray-600 w-36">Nombre</th>
                <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Concepto</th>
                <th className="px-3 py-2.5 text-right font-semibold text-gray-600 w-32">Debe (Q)</th>
                <th className="px-3 py-2.5 text-right font-semibold text-gray-600 w-32">Haber (Q)</th>
                <th className="px-3 py-2.5 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, idx) => (
                <tr key={line.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-3 py-2">
                    <select
                      className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none bg-white"
                      value={line.account_code}
                      onChange={(e) => updateLine(line.id, 'account_code', e.target.value)}
                    >
                      <option value="">-- Seleccionar --</option>
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.code}>
                          {acc.code} - {acc.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2 text-gray-600 text-xs">
                    {line.account_code ? (accounts.find(a => a.code === line.account_code)?.name || line.account_name) : ''}
                  </td>
                  <td className="px-3 py-2">
                    <input
                      className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
                      value={line.concept}
                      onChange={(e) => updateLine(line.id, 'concept', e.target.value)}
                      placeholder="Concepto de la línea"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm text-right focus:ring-2 focus:ring-primary-500 focus:outline-none"
                      value={line.debit || ''}
                      onChange={(e) => updateLine(line.id, 'debit', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm text-right focus:ring-2 focus:ring-primary-500 focus:outline-none"
                      value={line.credit || ''}
                      onChange={(e) => updateLine(line.id, 'credit', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <button onClick={() => removeLine(line.id)} className="p-1 text-gray-400 hover:text-red-500 rounded">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 font-semibold">
                <td colSpan={3} className="px-3 py-2.5 text-right">Totales:</td>
                <td className="px-3 py-2.5 text-right text-primary-700">Q{totalDebit.toFixed(2)}</td>
                <td className="px-3 py-2.5 text-right text-primary-700">Q{totalCredit.toFixed(2)}</td>
                <td></td>
              </tr>
              <tr>
                <td colSpan={3} className="px-3 py-2 text-right text-sm">
                  Diferencia:
                </td>
                <td colSpan={2} className={`px-3 py-2 text-center text-sm font-bold ${isBalanced ? 'text-green-600' : 'text-red-600'}`}>
                  {isBalanced ? 'Cuadrado ✓' : `Q${diff.toFixed(2)}`}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="flex items-center justify-between mt-6">
          <Button variant="outline" size="sm" onClick={addLine}>
            <Plus className="w-4 h-4" /> Agregar línea
          </Button>
          <div className="flex flex-col items-end gap-1">
            <Button onClick={handleSubmit} disabled={!isBalanced} isLoading={isSubmitting}>
              <Save className="w-4 h-4" /> Registrar partida
            </Button>
            {!isBalanced && (
              <p className="text-xs text-gray-400 italic text-right">
                El total del Debe (Q{totalDebit.toFixed(2)}) debe ser igual al Haber (Q{totalCredit.toFixed(2)}).
                {totalDebit === 0 && totalCredit === 0 && ' Ingrese montos en filas separadas: una con Debe y otra con Haber.'}
              </p>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
