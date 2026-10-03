import { useState } from 'react';
import { api } from '../../lib/api';

export default function ImportarBanco() {
  const [cuenta, setCuenta] = useState('');
  const [contenido, setContenido] = useState('');
  const [res, setRes] = useState<any>(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  function leerArchivo(f: File) {
    const r = new FileReader();
    r.onload = () => setContenido(String(r.result || ''));
    r.readAsText(f);
  }

  async function importar() {
    setCargando(true); setError(''); setRes(null);
    try {
      const out = await api.post<any>('/conciliacion/importar', { numero_cuenta: cuenta, contenido });
      setRes(out);
    } catch (e: any) { setError(e.message || 'Error'); }
    finally { setCargando(false); }
  }

  const input = 'w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm';

  return (
    <div className="p-6 space-y-5 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Importar Estado de Cuenta Bancario</h1>
      <p className="text-sm text-gray-500">Subí un archivo <b>CSV</b> o <b>OFX</b>. Se leen los movimientos, se guardan en la conciliación y se buscan coincidencias con los asientos. (Requiere plan Profesional o superior.)</p>

      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Cuenta bancaria (número o identificador)</label>
      <input value={cuenta} onChange={(e) => setCuenta(e.target.value)} placeholder="Ej: 123456789" className={input} />

      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Archivo CSV / OFX</label>
      <input type="file" accept=".csv,.ofx,.txt" onChange={(e) => e.target.files?.[0] && leerArchivo(e.target.files[0])} className={input} />
      <textarea value={contenido} onChange={(e) => setContenido(e.target.value)} rows={6} placeholder="…o pegá aquí el contenido del archivo" className={input + ' font-mono'} />

      <button onClick={importar} disabled={!cuenta || !contenido || cargando}
        className="px-5 py-3 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-semibold disabled:opacity-50">
        {cargando ? 'Importando…' : 'Importar movimientos'}
      </button>

      {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>}
      {res && <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">✅ Importados {res.insertados} movimientos · {res.asientos_con_monto_coincidente} asientos con monto coincidente.</div>}
    </div>
  );
}
