import React, { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';

declare const XLSX: any;

const months = [
  { v: '1', l: 'Enero' }, { v: '2', l: 'Febrero' }, { v: '3', l: 'Marzo' },
  { v: '4', l: 'Abril' }, { v: '5', l: 'Mayo' }, { v: '6', l: 'Junio' },
  { v: '7', l: 'Julio' }, { v: '8', l: 'Agosto' }, { v: '9', l: 'Septiembre' },
  { v: '10', l: 'Octubre' }, { v: '11', l: 'Noviembre' }, { v: '12', l: 'Diciembre' },
];
const cy = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => ({ v: String(cy - i), l: String(cy - i) }));

export default function ReportesFiscales() {
  const [tab, setTab] = useState('sat2237');
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [year, setYear] = useState(String(cy));
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => { fetchData(); }, [tab, month, year]);

  const fetchData = async () => {
    setLoading(true); setError('');
    try {
      if (tab === 'sat2237') setData(await api.get('/sat/sat2237', { mes: month, anio: year }));
      else if (tab === 'cruce') setData(await api.get('/sat/resumen-cruce', { mes: month, anio: year }));
      else setData(await api.get('/contabilidad/reporte-financiero', { mes: month, anio: year }));
    } catch { setError('Sin datos para este período.'); setData(null); }
    setLoading(false);
  };

  const monthName = months.find(m => m.v === month)?.l || '';

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    const rows: any[] = [];

    if (tab === 'sat2237' && data) {
      rows.push(['ContaPro - Sistema de Contabilidad Profesional', '', '']);
      rows.push(['Guatemala, C.A.', '', '']);
      rows.push([`Declaración de IVA - Período: ${monthName} ${year}`, '', '']);
      rows.push(['', '', '']);
      rows.push(['Concepto', 'Monto (Q)', '']);
      rows.push(['VENTAS', '', '']);
      rows.push(['Total Ventas', data.ventas?.total || 0, '']);
      rows.push(['Base Imponible', data.ventas?.base_imponible || 0, '']);
      rows.push(['IVA Débito Fiscal', data.ventas?.iva || 0, '']);
      rows.push(['', '', '']);
      rows.push(['COMPRAS', '', '']);
      rows.push(['Total Compras', data.compras?.total || 0, '']);
      rows.push(['Base Imponible', data.compras?.base_imponible || 0, '']);
      rows.push(['IVA Crédito Fiscal', data.compras?.iva || 0, '']);
      rows.push(['', '', '']);
      rows.push(['LIQUIDACIÓN', '', '']);
      rows.push(['Débito Fiscal', data.calculo?.debito_fiscal || 0, '']);
      rows.push(['Crédito Fiscal', data.calculo?.credito_fiscal || 0, '']);
      rows.push(['Resultado', `${data.calculo?.resultado || ''}: Q${data.calculo?.monto || 0}`, '']);
      rows.push(['', '', '']);
      rows.push([`Generado por ContaPro - ${new Date().toLocaleDateString('es-GT')}`, '', '']);
    } else if (tab === 'cruce' && data) {
      rows.push(['ContaPro - Resumen Cruzado IVA', '', '']);
      rows.push([`Período: ${monthName} ${year}`, '', '']);
      rows.push(['', '', '', '', '']);
      rows.push(['Concepto', 'Ventas (Q)', 'Compras (Q)', 'Variación (Q)', '']);
      rows.push(['IVA en Libros', data.cruce_ventas?.iva_libro || 0, data.cruce_compras?.iva_libro || 0, '', '']);
      rows.push(['IVA en Mayor Contable', data.cruce_ventas?.iva_mayor || 0, data.cruce_compras?.iva_mayor || 0, '', '']);
      rows.push(['Variación', data.cruce_ventas?.variacion || 0, data.cruce_compras?.variacion || 0, '', '']);
    } else if (tab === 'integracion' && data?.reporte) {
      rows.push(['ContaPro - Integración de Saldos', '', '', '', '', '']);
      rows.push([`Período: ${monthName} ${year}`, '', '', '', '', '']);
      rows.push(['', '', '', '', '', '']);
      rows.push(['Código', 'Cuenta', 'Tipo', 'Debe (Q)', 'Haber (Q)', 'Saldo (Q)']);
      data.reporte.filter((r: any) => r.saldo !== 0).forEach((r: any) => {
        rows.push([r.codigo, r.nombre, r.tipo, Number(r.debe || 0).toFixed(2), Number(r.haber || 0).toFixed(2), Number(r.saldo || 0).toFixed(2)]);
      });
      rows.push(['', '', 'TOTALES', '', '', Number(data.resumen?.utilidad || 0).toFixed(2)]);
    }

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 35 }, { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Reporte');
    XLSX.writeFile(wb, `ContaPro_${tab}_${month}_${year}.xlsx`);
  };

  const imprimir = () => window.print();

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '80px 0' }}>
      <div style={spinner} />
      <p style={{ color: '#666', marginTop: 16 }}>Cargando reportes fiscales...</p>
    </div>;
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: 24 }}>
      <style>{printCSS}</style>

      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: '#111', margin: 0 }}>Reportes Fiscales</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={month} onChange={e => setMonth(e.target.value)} style={sel}>{months.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}</select>
          <select value={year} onChange={e => setYear(e.target.value)} style={sel}>{years.map(y => <option key={y.v} value={y.v}>{y.l}</option>)}</select>
        </div>
      </div>

      <div className="no-print" style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {[{ k: 'sat2237', l: 'SAT-2237 IVA' }, { k: 'cruce', l: 'Resumen Cruzado' }, { k: 'integracion', l: 'Integración de Saldos' }].map(t => (
          <button key={t.k} onClick={() => setTab(t.k)} style={{ ...tabBtn, backgroundColor: tab === t.k ? '#0A2472' : '#f1f5f9', color: tab === t.k ? '#fff' : '#475569' }}>{t.l}</button>
        ))}
        <div style={{ flex: 1 }} />
        <button onClick={exportExcel} style={actionBtn} title="Descargar Excel">📥 Excel</button>
        <button onClick={imprimir} style={actionBtn} title="Imprimir / Guardar PDF">🖨️ PDF</button>
      </div>

      {error && <div style={card}><p style={{ color: '#666', textAlign: 'center', padding: 40 }}>{error}</p></div>}

      <div ref={reportRef} className="report-content">
        {/* Print header */}
        <div className="print-only" style={{ textAlign: 'center', marginBottom: 30, borderBottom: '3px double #000', paddingBottom: 16 }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0, letterSpacing: 1 }}>CONTAPRO</h1>
          <p style={{ fontSize: 13, margin: '4px 0', color: '#333' }}>Sistema de Contabilidad Profesional — Guatemala, C.A.</p>
          <p style={{ fontSize: 14, fontWeight: 600, margin: '12px 0 0' }}>
            {tab === 'sat2237' ? 'Declaración de IVA - Formulario SAT-2237' : tab === 'cruce' ? 'Resumen Cruzado de IVA' : 'Integración de Saldos Contables'}
          </p>
          <p style={{ fontSize: 13, color: '#555' }}>Período: {monthName} {year}</p>
        </div>

        {/* SAT-2237 */}
        {tab === 'sat2237' && data && (
          <div style={card}>
            <h3 style={sectionTitle}>Liquidación de IVA — {monthName} {year}</h3>

            <table style={tbl}>
              <thead><tr style={trH}><th style={thL}>Concepto</th><th style={thR}>Monto (Q)</th></tr></thead>
              <tbody>
                <tr style={trB}><td style={tdL} colSpan={2}><strong>Ventas del Período</strong></td></tr>
                <tr><td style={tdL}>Total Ventas</td><td style={tdR}>{fmt(data.ventas?.total)}</td></tr>
                <tr><td style={tdL}>Base Imponible</td><td style={tdR}>{fmt(data.ventas?.base_imponible)}</td></tr>
                <tr style={trB}><td style={tdL}>IVA Débito Fiscal</td><td style={{ ...tdR, fontWeight: 700, color: '#0A2472' }}>{fmt(data.ventas?.iva)}</td></tr>
                <tr style={trB}><td style={tdL} colSpan={2}><strong>Compras del Período</strong></td></tr>
                <tr><td style={tdL}>Total Compras</td><td style={tdR}>{fmt(data.compras?.total)}</td></tr>
                <tr><td style={tdL}>Base Imponible</td><td style={tdR}>{fmt(data.compras?.base_imponible)}</td></tr>
                <tr style={trB}><td style={tdL}>IVA Crédito Fiscal</td><td style={{ ...tdR, fontWeight: 700, color: '#0A2472' }}>{fmt(data.compras?.iva)}</td></tr>
              </tbody>
            </table>

            <div style={{ marginTop: 24, background: data.calculo?.resultado === 'IMPUESTO A PAGAR' ? '#fef2f2' : '#f0fdf4', borderRadius: 12, padding: 24, border: `2px solid ${data.calculo?.resultado === 'IMPUESTO A PAGAR' ? '#fecaca' : '#bbf7d0'}` }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, textAlign: 'center' }}>
                <div><p style={{ fontSize: 12, color: '#666', margin: 0 }}>Débito Fiscal</p><p style={{ fontSize: 20, fontWeight: 700, color: '#dc2626', margin: '4px 0' }}>{fmt(data.calculo?.debito_fiscal)}</p></div>
                <div><p style={{ fontSize: 12, color: '#666', margin: 0 }}>Crédito Fiscal</p><p style={{ fontSize: 20, fontWeight: 700, color: '#16a34a', margin: '4px 0' }}>{fmt(data.calculo?.credito_fiscal)}</p></div>
                <div><p style={{ fontSize: 12, color: '#666', margin: 0 }}>{data.calculo?.resultado}</p><p style={{ fontSize: 24, fontWeight: 800, color: '#0A2472', margin: '4px 0' }}>{fmt(data.calculo?.monto)}</p></div>
              </div>
            </div>

            <div className="print-only" style={{ marginTop: 40, display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ textAlign: 'center' }}><div style={{ borderTop: '1px solid #000', width: 200, margin: '0 auto', paddingTop: 8 }}>Firma del Contribuyente</div></div>
              <div style={{ textAlign: 'center' }}><div style={{ borderTop: '1px solid #000', width: 200, margin: '0 auto', paddingTop: 8 }}>Firma del Contador</div></div>
            </div>
          </div>
        )}

        {/* Cruce */}
        {tab === 'cruce' && data && (
          <div style={card}>
            <h3 style={sectionTitle}>Resumen Cruzado IVA — {monthName} {year}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              <div style={{ background: '#f8fafc', borderRadius: 10, padding: 20 }}>
                <h4 style={{ fontWeight: 600, marginBottom: 12 }}>IVA Ventas</h4>
                <Row label="IVA según Libro de Ventas" value={data.cruce_ventas?.iva_libro} />
                <Row label="IVA según Mayor Contable" value={data.cruce_ventas?.iva_mayor} />
                <Row label="Variación" value={data.cruce_ventas?.variacion} bold color={Math.abs(data.cruce_ventas?.variacion || 0) > 1 ? '#dc2626' : '#16a34a'} />
              </div>
              <div style={{ background: '#f8fafc', borderRadius: 10, padding: 20 }}>
                <h4 style={{ fontWeight: 600, marginBottom: 12 }}>IVA Compras</h4>
                <Row label="IVA según Libro de Compras" value={data.cruce_compras?.iva_libro} />
                <Row label="IVA según Mayor Contable" value={data.cruce_compras?.iva_mayor} />
                <Row label="Variación" value={data.cruce_compras?.variacion} bold color={Math.abs(data.cruce_compras?.variacion || 0) > 1 ? '#dc2626' : '#16a34a'} />
              </div>
            </div>
          </div>
        )}

        {/* Integración */}
        {tab === 'integracion' && data?.reporte && (
          <div style={card}>
            <h3 style={sectionTitle}>Integración de Saldos — {monthName} {year}</h3>
            <table style={tbl}>
              <thead><tr style={trH}><th style={thL}>Código</th><th style={thL}>Cuenta</th><th style={thL}>Tipo</th><th style={thR}>Debe (Q)</th><th style={thR}>Haber (Q)</th><th style={thR}>Saldo (Q)</th></tr></thead>
              <tbody>
                {data.reporte.filter((r: any) => (Number(r.debe) || 0) > 0 || (Number(r.haber) || 0) > 0).map((r: any, i: number) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={tdL}>{r.codigo}</td>
                    <td style={tdL}>{r.nombre}</td>
                    <td style={tdL}>{r.tipo}</td>
                    <td style={tdR}>{fmt(r.debe)}</td>
                    <td style={tdR}>{fmt(r.haber)}</td>
                    <td style={{ ...tdR, fontWeight: 700 }}>{fmt(r.saldo)}</td>
                  </tr>
                ))}
                <tr style={{ background: '#f8fafc', fontWeight: 700 }}>
                  <td style={tdL} colSpan={5}>Utilidad del Período</td>
                  <td style={{ ...tdR, fontSize: 16, color: (data.resumen?.utilidad || 0) >= 0 ? '#16a34a' : '#dc2626' }}>{fmt(data.resumen?.utilidad)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const Row = ({ label, value, bold, color }: any) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #e5e7eb' }}>
    <span style={{ fontSize: 13, color: '#666' }}>{label}</span>
    <span style={{ fontWeight: bold ? 700 : 400, color: color || '#333', fontSize: 14 }}>{fmt(value)}</span>
  </div>
);

const fmt = (v: any) => `Q ${Number(v || 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const card: React.CSSProperties = { background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', padding: 32, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' };
const sectionTitle: React.CSSProperties = { fontSize: 18, fontWeight: 700, color: '#0A2472', marginBottom: 20, borderBottom: '2px solid #F0B90B', paddingBottom: 8, display: 'inline-block' };
const tbl: React.CSSProperties = { width: '100%', borderCollapse: 'collapse' };
const thL: React.CSSProperties = { padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #e2e8f0' };
const thR: React.CSSProperties = { ...thL, textAlign: 'right' };
const tdL: React.CSSProperties = { padding: '10px 14px', fontSize: 14, color: '#334155', borderBottom: '1px solid #f1f5f9' };
const tdR: React.CSSProperties = { ...tdL, textAlign: 'right', fontFamily: 'monospace' };
const trH: React.CSSProperties = { background: '#f8fafc' };
const trB: React.CSSProperties = { background: '#fafbfc' };
const sel: React.CSSProperties = { padding: '8px 14px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 14, background: '#fff', color: '#334155', outline: 'none' };
const tabBtn: React.CSSProperties = { padding: '8px 18px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, transition: 'all 0.2s' };
const actionBtn: React.CSSProperties = { padding: '8px 14px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4, color: '#475569' };
const spinner: React.CSSProperties = { width: 36, height: 36, border: '3px solid #e2e8f0', borderTopColor: '#0A2472', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' };

const printCSS = `
@keyframes spin { to { transform: rotate(360deg); } }
.print-only { display: none; }
@media print {
  .no-print { display: none !important; }
  .print-only { display: block !important; }
  body { font-size: 12pt; color: #000; background: #fff; }
  @page { size: letter; margin: 1.5cm; }
}
`;
