import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

const BASE_URL = (import.meta as any).env?.VITE_API_URL || '/api';

function descargar(path: string, nombre: string) {
  const token = localStorage.getItem('contapro_token');
  fetch(`${BASE_URL}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
    .then(async (r) => {
      if (!r.ok) throw new Error('No se pudo descargar');
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = nombre;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    })
    .catch((e) => alert(e.message));
}

const Q = (n: number) => `Q ${Number(n || 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function EstadosFinancieros() {
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [mes, setMes] = useState('');
  const [tab, setTab] = useState<'estados' | 'antiguedad'>('estados');
  const [tipoAg, setTipoAg] = useState<'cxc' | 'cxp'>('cxc');
  const [estados, setEstados] = useState<any>(null);
  const [antig, setAntig] = useState<any>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  async function cargar() {
    setCargando(true);
    setError('');
    try {
      const params: Record<string, string> = { anio: String(anio) };
      if (mes) params.mes = mes;
      if (tab === 'estados') setEstados(await api.get('/reportes-financieros/estados', params));
      else setAntig(await api.get('/reportes-financieros/antiguedad', { tipo: tipoAg }));
    } catch (e: any) {
      setError(e.message || 'Error');
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargar(); /* eslint-disable-next-line */ }, [anio, mes, tab, tipoAg]);

  const btn = 'px-3 py-2 rounded-lg text-sm font-semibold border transition-colors';

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Informes Financieros</h1>
        <div className="flex gap-2">
          <input type="number" value={anio} onChange={(e) => setAnio(Number(e.target.value))}
            className="w-24 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" />
          <select value={mes} onChange={(e) => setMes(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm">
            <option value="">Todo el año</option>
            {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
          </select>
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={() => setTab('estados')} className={`${btn} ${tab === 'estados' ? 'bg-teal-600 text-white border-teal-600' : 'border-gray-300 dark:border-gray-600'}`}>Estados Financieros</button>
        <button onClick={() => { setTab('antiguedad'); }} className={`${btn} ${tab === 'antiguedad' ? 'bg-teal-600 text-white border-teal-600' : 'border-gray-300 dark:border-gray-600'}`}>Antigüedad de Saldos</button>
      </div>

      {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>}

      {tab === 'estados' && estados && (
        <div className="space-y-6">
          <div className="flex gap-2">
            <button onClick={() => descargar(`/reportes-financieros/estados/xlsx?anio=${anio}${mes ? '&mes=' + mes : ''}`, `estados-financieros-${anio}.xlsx`)} className={`${btn} border-gray-300 dark:border-gray-600`}>⬇️ Descargar Excel</button>
            <button onClick={() => descargar(`/reportes-financieros/estados/pdf?anio=${anio}${mes ? '&mes=' + mes : ''}`, `estados-financieros-${anio}.pdf`)} className={`${btn} border-gray-300 dark:border-gray-600`}>⬇️ Descargar PDF</button>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <h2 className="font-bold text-teal-700 dark:text-teal-400 mb-3">Estado de Resultados</h2>
              <table className="w-full text-sm">
                <tbody>
                  <tr><td className="py-1 font-semibold">Ingresos</td><td className="text-right font-semibold">{Q(estados.resultado.ingresos)}</td></tr>
                  <tr><td className="py-1 font-semibold pl-4">Costos</td><td className="text-right">{Q(estados.resultado.costos)}</td></tr>
                  <tr><td className="py-1 font-semibold pl-4">Gastos</td><td className="text-right">{Q(estados.resultado.gastos)}</td></tr>
                  <tr className="border-t border-gray-200 dark:border-gray-700"><td className="py-2 font-bold">Utilidad del período</td><td className="text-right font-bold text-teal-700 dark:text-teal-400">{Q(estados.resultado.utilidad)}</td></tr>
                </tbody>
              </table>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <h2 className="font-bold text-teal-700 dark:text-teal-400 mb-3">Balance General</h2>
              <table className="w-full text-sm">
                <tbody>
                  <tr><td className="py-1 font-semibold">Activo</td><td className="text-right font-semibold">{Q(estados.balance.activo)}</td></tr>
                  <tr><td className="py-1 font-semibold pl-4">Pasivo</td><td className="text-right">{Q(estados.balance.pasivo)}</td></tr>
                  <tr><td className="py-1 font-semibold pl-4">Capital</td><td className="text-right">{Q(estados.balance.capital)}</td></tr>
                  <tr><td className="py-1 pl-4">Utilidad del período</td><td className="text-right">{Q(estados.balance.utilidad)}</td></tr>
                  <tr className="border-t border-gray-200 dark:border-gray-700"><td className="py-2 font-bold">Total Pasivo + Capital</td><td className="text-right font-bold text-teal-700 dark:text-teal-400">{Q(estados.balance.pasivoCapital)}</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'antiguedad' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <select value={tipoAg} onChange={(e) => setTipoAg(e.target.value as any)}
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm">
              <option value="cxc">Cuentas por cobrar (CxC)</option>
              <option value="cxp">Cuentas por pagar (CxP)</option>
            </select>
            <button onClick={() => descargar(`/reportes-financieros/antiguedad/xlsx?tipo=${tipoAg}`, `antiguedad-${tipoAg}.xlsx`)} className={`${btn} border-gray-300 dark:border-gray-600`}>⬇️ Excel</button>
            <button onClick={() => descargar(`/reportes-financieros/antiguedad/pdf?tipo=${tipoAg}`, `antiguedad-${tipoAg}.pdf`)} className={`${btn} border-gray-300 dark:border-gray-600`}>⬇️ PDF</button>
          </div>
          {antig && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900 text-xs uppercase text-gray-500">
                  <tr><th className="text-left px-3 py-2">NIT</th><th className="text-left px-3 py-2">Nombre</th><th className="text-right px-3 py-2">Corriente</th><th className="text-right px-3 py-2">1-30</th><th className="text-right px-3 py-2">31-60</th><th className="text-right px-3 py-2">61-90</th><th className="text-right px-3 py-2">+90</th><th className="text-right px-3 py-2">Total</th></tr>
                </thead>
                <tbody>
                  {antig.clientes.length === 0 && <tr><td colSpan={8} className="px-3 py-4 text-gray-400">Sin saldos pendientes.</td></tr>}
                  {antig.clientes.map((c: any, i: number) => (
                    <tr key={i} className="border-t border-gray-100 dark:border-gray-700">
                      <td className="px-3 py-2">{c.nit}</td><td className="px-3 py-2">{c.nombre}</td>
                      <td className="px-3 py-2 text-right">{Q(c.corriente)}</td><td className="px-3 py-2 text-right">{Q(c.d1_30)}</td>
                      <td className="px-3 py-2 text-right">{Q(c.d31_60)}</td><td className="px-3 py-2 text-right">{Q(c.d61_90)}</td>
                      <td className="px-3 py-2 text-right">{Q(c.d90_plus)}</td><td className="px-3 py-2 text-right font-semibold">{Q(c.total)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-300 dark:border-gray-600 font-bold">
                    <td className="px-3 py-2" colSpan={2}>TOTAL</td>
                    <td className="px-3 py-2 text-right">{Q(antig.totales.corriente)}</td><td className="px-3 py-2 text-right">{Q(antig.totales.d1_30)}</td>
                    <td className="px-3 py-2 text-right">{Q(antig.totales.d31_60)}</td><td className="px-3 py-2 text-right">{Q(antig.totales.d61_90)}</td>
                    <td className="px-3 py-2 text-right">{Q(antig.totales.d90_plus)}</td><td className="px-3 py-2 text-right">{Q(antig.totales.total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {cargando && <div className="text-sm text-gray-400">Cargando…</div>}
    </div>
  );
}
