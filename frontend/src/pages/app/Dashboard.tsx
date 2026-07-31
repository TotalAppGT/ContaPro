import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, TrendingDown, DollarSign, Percent, ShoppingCart,
  ArrowRightLeft, Calculator, Upload, FileBarChart2, ArrowRight, Loader2
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { Card, CardHeader } from '@/components/ui/Card';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import type { FinancialReport } from '@/types';

const monthlyData = [
  { mes: 'Ene', ingresos: 45000, egresos: 28000 },
  { mes: 'Feb', ingresos: 52000, egresos: 31000 },
  { mes: 'Mar', ingresos: 48000, egresos: 29000 },
  { mes: 'Abr', ingresos: 61000, egresos: 34000 },
  { mes: 'May', ingresos: 55000, egresos: 32000 },
  { mes: 'Jun', ingresos: 67000, egresos: 38000 },
];

const quickLinks = [
  { to: '/app/ventas', icon: ShoppingCart, label: 'Ventas', color: 'bg-blue-500' },
  { to: '/app/compras', icon: ArrowRightLeft, label: 'Compras', color: 'bg-orange-500' },
  { to: '/app/grafica-t', icon: Calculator, label: 'Gráfica T', color: 'bg-purple-500' },
  { to: '/app/sat-masivo', icon: Upload, label: 'SAT Masivo', color: 'bg-green-500' },
  { to: '/app/reportes', icon: FileBarChart2, label: 'Reportes', color: 'bg-red-500' },
  { to: '/app/conciliacion', icon: DollarSign, label: 'Conciliación', color: 'bg-teal-500' },
];

const summaryCards = [
  { label: 'Ingresos del mes', key: 'income', icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
  { label: 'Egresos del mes', key: 'expenses', icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-50' },
  { label: 'IVA a pagar', key: 'iva_to_pay', icon: DollarSign, color: 'text-blue-600', bg: 'bg-blue-50' },
  { label: 'Margen', key: 'margin', icon: Percent, color: 'text-purple-600', bg: 'bg-purple-50', isPercent: true },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [report, setReport] = useState<FinancialReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.get<FinancialReport>('/contabilidad/reporte-financiero', { mes: '7', anio: '2026' });
        setReport(data);
      } catch {
        setReport({
          income: 67850.00, expenses: 42300.00, profit: 25550.00,
          margin: 37.6, iva_to_pay: 4560.00, period: 'Julio 2026'
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
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-gray-500 mt-1">Resumen financiero de {user?.tenant_name}</p>
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

      {/* Charts and quick links row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <Card className="lg:col-span-2">
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

        {/* Quick links */}
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
      </div>
    </div>
  );
}
