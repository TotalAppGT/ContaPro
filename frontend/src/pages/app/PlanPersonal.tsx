import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, TrendingDown, DollarSign, Percent, ShoppingCart, ArrowRightLeft, ArrowRight, Loader2
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardHeader } from '@/components/ui/Card';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import type { FinancialReport } from '@/types';

const monthlyData = [
  { mes: 'Ene', ingresos: 25000, egresos: 15000 },
  { mes: 'Feb', ingresos: 28000, egresos: 16000 },
  { mes: 'Mar', ingresos: 22000, egresos: 14000 },
  { mes: 'Abr', ingresos: 30000, egresos: 18000 },
  { mes: 'May', ingresos: 27000, egresos: 17000 },
  { mes: 'Jun', ingresos: 32000, egresos: 19000 },
];

const summaryCards = [
  { label: 'Ingresos del mes', key: 'income', icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
  { label: 'Egresos del mes', key: 'expenses', icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-50' },
  { label: 'IVA a pagar', key: 'iva_to_pay', icon: DollarSign, color: 'text-blue-600', bg: 'bg-blue-50' },
  { label: 'Margen', key: 'margin', icon: Percent, color: 'text-purple-600', bg: 'bg-purple-50', isPercent: true },
];

const quickLinks = [
  { to: '/app/ventas', icon: ShoppingCart, label: 'Ventas', color: 'bg-blue-500' },
  { to: '/app/compras', icon: ArrowRightLeft, label: 'Compras', color: 'bg-orange-500' },
  { to: '/app/reportes', icon: DollarSign, label: 'Reportes IVA', color: 'bg-green-500' },
  { to: '/app/configuracion', icon: ArrowRight, label: 'Configuración', color: 'bg-gray-500' },
];

export default function PlanPersonal() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [report, setReport] = useState<FinancialReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.get<FinancialReport>('/reports/summary?period=current');
        setReport(data);
      } catch {
        setReport({
          income: 32500.00, expenses: 18500.00, profit: 14000.00,
          margin: 43.1, iva_to_pay: 2240.00, period: 'Julio 2026'
        });
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-50 to-primary-50 rounded-xl p-6 border border-blue-100">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
            <p className="text-gray-500 mt-1">Plan Personal - {user?.tenant_name}</p>
          </div>
          <div className="text-right">
            <span className="inline-block px-3 py-1 bg-primary-100 text-primary-700 text-xs font-medium rounded-full">
              Plan Personal
            </span>
            <p className="text-sm text-gray-500 mt-1">Q79/mes</p>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {report && summaryCards.map((card) => (
          <Card key={card.key} className="hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">{card.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {card.isPercent
                    ? `${(report as any)[card.key]}%`
                    : `Q${((report as any)[card.key] as number)?.toLocaleString('es-GT', { minimumFractionDigits: 2 }) ?? '0.00'}`}
                </p>
              </div>
              <div className={`p-2.5 rounded-lg ${card.bg}`}>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Chart */}
      <Card>
        <CardHeader title="Comparativa mensual" subtitle="Ingresos vs Egresos (Q)" />
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="mes" tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" tickFormatter={(v) => `Q${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                formatter={(value: number) => [`Q${value.toLocaleString('es-GT', { minimumFractionDigits: 2 })}`]}
              />
              <Legend />
              <Bar dataKey="ingresos" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Ingresos" />
              <Bar dataKey="egresos" fill="#ef4444" radius={[4, 4, 0, 0]} name="Egresos" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Quick links + IVA summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Acceso rápido" />
          <div className="space-y-2">
            {quickLinks.map((link) => (
              <button
                key={link.to}
                onClick={() => navigate(link.to)}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
              >
                <div className={`p-2 rounded-lg ${link.color}`}>
                  <link.icon className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-medium text-gray-700 flex-1 text-left">{link.label}</span>
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Resumen IVA del mes" subtitle="Crédito y Débito Fiscal" />
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">IVA Ventas (Débito)</span>
              <span className="font-semibold text-red-600">Q3,600.00</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">IVA Compras (Crédito)</span>
              <span className="font-semibold text-green-600">Q1,360.00</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm font-semibold text-gray-900">IVA a pagar</span>
              <span className="font-bold text-lg text-primary-700">Q2,240.00</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Upgrade CTA */}
      <div className="bg-gradient-to-r from-primary-700 to-primary-900 rounded-xl p-8 text-center text-white">
        <h3 className="text-xl font-bold mb-2">¿Necesita más funcionalidades?</h3>
        <p className="text-primary-100 mb-4 max-w-md mx-auto">
          Actualice a Plan Profesional y obtenga Gráfica T, Conciliación Bancaria, SAT Masivo y gestión de múltiples clientes.
        </p>
        <button
          onClick={() => navigate('/app/configuracion')}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-white text-primary-700 font-medium rounded-lg hover:bg-gray-100 transition-colors"
        >
          Actualizar plan <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
