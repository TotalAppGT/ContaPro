import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';

const months = [
  { v: '1', l: 'Enero' }, { v: '2', l: 'Febrero' }, { v: '3', l: 'Marzo' },
  { v: '4', l: 'Abril' }, { v: '5', l: 'Mayo' }, { v: '6', l: 'Junio' },
  { v: '7', l: 'Julio' }, { v: '8', l: 'Agosto' }, { v: '9', l: 'Septiembre' },
  { v: '10', l: 'Octubre' }, { v: '11', l: 'Noviembre' }, { v: '12', l: 'Diciembre' },
];

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => ({ v: String(currentYear - i), l: String(currentYear - i) }));

export default function ReportesFiscales() {
  const [tab, setTab] = useState('sat2237');
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [year, setYear] = useState(String(currentYear));
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, [tab, month, year]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      if (tab === 'sat2237') {
        const r = await api.get<any>('/sat/sat2237', { mes: month, anio: year });
        setData(r);
      } else if (tab === 'cruce') {
        const r = await api.get<any>('/sat/resumen-cruce', { mes: month, anio: year });
        setData(r);
      } else {
        const r = await api.get<any>('/contabilidad/reporte-financiero', { mes: month, anio: year });
        setData(r);
      }
    } catch (e: any) {
      setError('No se pudieron cargar los datos para este período.');
      setData(null);
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111' }}>Reportes Fiscales</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <select value={month} onChange={e => setMonth(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd' }}>
            {months.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
          </select>
          <select value={year} onChange={e => setYear(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd' }}>
            {years.map(y => <option key={y.v} value={y.v}>{y.l}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        {[
          { key: 'sat2237', label: 'SAT-2237' },
          { key: 'cruce', label: 'Resumen Cruzado' },
          { key: 'integracion', label: 'Integración de Saldos' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '8px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '500',
              backgroundColor: tab === t.key ? '#0A2472' : '#f3f4f6',
              color: tab === t.key ? '#fff' : '#666',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{ width: '32px', height: '32px', border: '3px solid #0A2472', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
          <p style={{ marginTop: '12px', color: '#666' }}>Cargando reportes...</p>
        </div>
      )}

      {!loading && error && (
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #eee', padding: '40px', textAlign: 'center' }}>
          <p style={{ color: '#666' }}>{error}</p>
        </div>
      )}

      {!loading && !error && data && tab === 'sat2237' && (
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #eee', padding: '32px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>Formulario SAT-2237 — IVA Mensual</h3>
          <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '20px', marginBottom: '20px' }}>
            <p><strong>Período:</strong> {months.find(m => m.v === month)?.l} {year}</p>
            <p><strong>Régimen:</strong> {data.regimen || 'No especificado'}</p>
          </div>
          {data.ventas && (
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  <th style={th}>Concepto</th>
                  <th style={thR}>Monto (Q)</th>
                </tr>
              </thead>
              <tbody>
                <tr><td style={td}>Total Ventas</td><td style={tdR}>Q {Number(data.ventas.total || 0).toLocaleString('es-GT', { minimumFractionDigits: 2 })}</td></tr>
                <tr><td style={td}>Base Imponible Ventas</td><td style={tdR}>Q {Number(data.ventas.base_imponible || 0).toLocaleString('es-GT', { minimumFractionDigits: 2 })}</td></tr>
                <tr><td style={td}>IVA Débito Fiscal</td><td style={tdR}>Q {Number(data.ventas.iva || 0).toLocaleString('es-GT', { minimumFractionDigits: 2 })}</td></tr>
              </tbody>
            </table>
          )}
          {data.compras && (
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  <th style={th}>Concepto</th>
                  <th style={thR}>Monto (Q)</th>
                </tr>
              </thead>
              <tbody>
                <tr><td style={td}>Total Compras</td><td style={tdR}>Q {Number(data.compras.total || 0).toLocaleString('es-GT', { minimumFractionDigits: 2 })}</td></tr>
                <tr><td style={td}>Base Imponible Compras</td><td style={tdR}>Q {Number(data.compras.base_imponible || 0).toLocaleString('es-GT', { minimumFractionDigits: 2 })}</td></tr>
                <tr><td style={td}>IVA Crédito Fiscal</td><td style={tdR}>Q {Number(data.compras.iva || 0).toLocaleString('es-GT', { minimumFractionDigits: 2 })}</td></tr>
              </tbody>
            </table>
          )}
          {data.calculo && (
            <div style={{ background: data.calculo.resultado === 'IMPUESTO A PAGAR' ? '#fef2f2' : '#f0fdf4', borderRadius: '8px', padding: '20px', border: '2px solid ' + (data.calculo.resultado === 'IMPUESTO A PAGAR' ? '#fecaca' : '#bbf7d0') }}>
              <p style={{ fontSize: '18px', fontWeight: 'bold' }}>{data.calculo.resultado}: Q {Number(data.calculo.monto || 0).toLocaleString('es-GT', { minimumFractionDigits: 2 })}</p>
              <p style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>Débito: Q {data.calculo.debito_fiscal} | Crédito: Q {data.calculo.credito_fiscal}</p>
            </div>
          )}
        </div>
      )}

      {!loading && !error && data && tab === 'cruce' && (
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #eee', padding: '32px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>Resumen Cruzado IVA — {months.find(m => m.v === month)?.l} {year}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '20px' }}>
              <h4 style={{ fontWeight: '600', marginBottom: '12px' }}>Ventas</h4>
              <p>IVA Libro: Q {Number(data.cruce_ventas?.iva_libro || data.libroVentas?.iva || 0).toLocaleString('es-GT', { minimumFractionDigits: 2 })}</p>
              <p>IVA Mayor: Q {Number(data.cruce_ventas?.iva_mayor || data.mayorContable?.debitoFiscal || 0).toLocaleString('es-GT', { minimumFractionDigits: 2 })}</p>
              <p style={{ fontWeight: 'bold', color: Math.abs(data.cruce_ventas?.variacion || 0) > 1 ? '#dc2626' : '#16a34a' }}>
                Variación: Q {Number(data.cruce_ventas?.variacion || 0).toLocaleString('es-GT', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '20px' }}>
              <h4 style={{ fontWeight: '600', marginBottom: '12px' }}>Compras</h4>
              <p>IVA Libro: Q {Number(data.cruce_compras?.iva_libro || data.libroCompras?.iva || 0).toLocaleString('es-GT', { minimumFractionDigits: 2 })}</p>
              <p>IVA Mayor: Q {Number(data.cruce_compras?.iva_mayor || data.mayorContable?.creditoFiscal || 0).toLocaleString('es-GT', { minimumFractionDigits: 2 })}</p>
              <p style={{ fontWeight: 'bold', color: Math.abs(data.cruce_compras?.variacion || 0) > 1 ? '#dc2626' : '#16a34a' }}>
                Variación: Q {Number(data.cruce_compras?.variacion || 0).toLocaleString('es-GT', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>
      )}

      {!loading && !error && data && tab === 'integracion' && (
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #eee', padding: '32px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>Integración de Saldos — {months.find(m => m.v === month)?.l} {year}</h3>
          {data.reporte ? (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  <th style={th}>Código</th>
                  <th style={th}>Cuenta</th>
                  <th style={th}>Tipo</th>
                  <th style={thR}>Debe</th>
                  <th style={thR}>Haber</th>
                  <th style={thR}>Saldo</th>
                </tr>
              </thead>
              <tbody>
                {data.reporte.filter((r: any) => r.saldo !== 0).map((r: any, i: number) => (
                  <tr key={i}>
                    <td style={td}>{r.codigo}</td>
                    <td style={td}>{r.nombre}</td>
                    <td style={td}>{r.tipo}</td>
                    <td style={tdR}>Q {Number(r.debe || 0).toLocaleString('es-GT', { minimumFractionDigits: 2 })}</td>
                    <td style={tdR}>Q {Number(r.haber || 0).toLocaleString('es-GT', { minimumFractionDigits: 2 })}</td>
                    <td style={{ ...tdR, fontWeight: 'bold' }}>Q {Number(r.saldo || 0).toLocaleString('es-GT', { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '20px' }}>
              <p>Ingresos: Q {Number(data.resumen?.ingresos_total || 0).toLocaleString('es-GT', { minimumFractionDigits: 2 })}</p>
              <p>Gastos: Q {Number(data.resumen?.gastos_total || 0).toLocaleString('es-GT', { minimumFractionDigits: 2 })}</p>
              <p style={{ fontWeight: 'bold', fontSize: '16px', color: (data.resumen?.utilidad || 0) >= 0 ? '#16a34a' : '#dc2626' }}>
                Utilidad: Q {Number(data.resumen?.utilidad || 0).toLocaleString('es-GT', { minimumFractionDigits: 2 })}
              </p>
            </div>
          )}
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const th: React.CSSProperties = { padding: '10px 12px', textAlign: 'left', fontWeight: '600', color: '#666', fontSize: '13px', borderBottom: '2px solid #e5e7eb' };
const thR: React.CSSProperties = { ...th, textAlign: 'right' };
const td: React.CSSProperties = { padding: '10px 12px', fontSize: '14px', borderBottom: '1px solid #f3f4f6' };
const tdR: React.CSSProperties = { ...td, textAlign: 'right' };
