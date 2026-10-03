import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

const BASE_URL = (import.meta as any).env?.VITE_API_URL || '/api';
function descargar(path: string, nombre: string) {
  const token = localStorage.getItem('contapro_token');
  fetch(`${BASE_URL}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
    .then(async (r) => { if (!r.ok) throw new Error('No se pudo descargar'); const b = await r.blob(); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = nombre; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(u); })
    .catch((e) => alert(e.message));
}

export default function Auditoria() {
  const [eventos, setEventos] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  function cargar() {
    const p: Record<string, string> = {};
    if (desde) p.desde = desde;
    if (hasta) p.hasta = hasta;
    setError('');
    api.get<any>('/auditoria', p).then((r) => setEventos(r.eventos || [])).catch((e) => setError(e.message));
  }
  useEffect(() => { cargar(); /* eslint-disable-next-line */ }, []);

  return (
    <div className="p-6 space-y-5">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bitácora de Auditoría</h1>
      <p className="text-sm text-gray-500">Registro de acciones del sistema (requiere plan Empresarial o Despacho).</p>
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-sm">Desde <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="ml-1 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800" /></label>
        <label className="text-sm">Hasta <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="ml-1 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800" /></label>
        <button onClick={cargar} className="px-3 py-2 rounded-lg text-sm font-semibold border border-gray-300 dark:border-gray-600">Filtrar</button>
        <button onClick={() => descargar('/auditoria/xlsx', 'bitacora-auditoria.xlsx')} className="px-3 py-2 rounded-lg text-sm font-semibold border border-gray-300 dark:border-gray-600">⬇️ Excel</button>
      </div>
      {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900 text-xs uppercase text-gray-500">
            <tr><th className="text-left px-3 py-2">Fecha</th><th className="text-left px-3 py-2">Acción</th><th className="text-left px-3 py-2">Descripción</th><th className="text-left px-3 py-2">Usuario</th></tr>
          </thead>
          <tbody>
            {eventos.length === 0 && <tr><td colSpan={4} className="px-3 py-4 text-gray-400">Sin eventos.</td></tr>}
            {eventos.map((e) => (
              <tr key={e.id} className="border-t border-gray-100 dark:border-gray-700">
                <td className="px-3 py-2 whitespace-nowrap">{new Date(e.created_at).toLocaleString('es-GT')}</td>
                <td className="px-3 py-2 font-medium">{e.accion}</td>
                <td className="px-3 py-2">{e.descripcion}</td>
                <td className="px-3 py-2 text-gray-500">{e.usuario || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
