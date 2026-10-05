import { useState } from 'react';
import { api } from '../../lib/api';

const Q = (n: number) => `Q ${Number(n || 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function IAContable() {
  const [tab, setTab] = useState<'clasificar' | 'ocr'>('clasificar');

  // Clasificador
  const [descripcion, setDescripcion] = useState('');
  const [tipo, setTipo] = useState('gasto');
  const [sug, setSug] = useState<any>(null);
  const [errC, setErrC] = useState('');
  const [cargandoC, setCargandoC] = useState(false);

  async function clasificar() {
    setCargandoC(true); setErrC(''); setSug(null);
    try {
      const r = await api.post<any>('/ia/clasificar', { descripcion, tipo });
      setSug(r.sugerencia);
    } catch (e: any) { setErrC(e.message || 'Error'); }
    finally { setCargandoC(false); }
  }

  // OCR
  const [movs, setMovs] = useState<any[]>([]);
  const [errO, setErrO] = useState('');
  const [cargandoO, setCargandoO] = useState(false);

  function leer(f: File) {
    const r = new FileReader();
    r.onload = async () => {
      const dataUrl = String(r.result || '');
      const base64 = dataUrl.split(',')[1] || '';
      const mime = (dataUrl.match(/data:([^;]+);/) || [])[1] || f.type;
      setCargandoO(true); setErrO(''); setMovs([]);
      try {
        const out = await api.post<any>('/ia/estado-cuenta', { base64, mime });
        setMovs(out?.extraido?.movimientos || []);
      } catch (e: any) { setErrO(e.message || 'Error'); }
      finally { setCargandoO(false); }
    };
    r.readAsDataURL(f);
  }

  const input = 'w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm';
  const btn = (active: boolean) => `px-3 py-2 rounded-lg text-sm font-semibold border ${active ? 'bg-teal-600 text-white border-teal-600' : 'border-gray-300 dark:border-gray-600'}`;

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Contabilidad con IA</h1>
        <p className="text-sm text-gray-500">Clasificá cuentas y leé estados de cuenta con inteligencia artificial. (Requiere plan Profesional o superior.)</p>
      </div>

      <div className="flex gap-2">
        <button onClick={() => setTab('clasificar')} className={btn(tab === 'clasificar')}>Clasificador contable</button>
        <button onClick={() => setTab('ocr')} className={btn(tab === 'ocr')}>Lector de estados de cuenta</button>
      </div>

      {tab === 'clasificar' && (
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Descripción del movimiento</label>
            <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={3} className={input} placeholder="Ej: Pago de energía eléctrica de la bodega" />
            <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={input}>
              <option value="gasto">Gasto</option>
              <option value="ingreso">Ingreso</option>
            </select>
            <button onClick={clasificar} disabled={!descripcion || cargandoC} className="px-5 py-3 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-semibold disabled:opacity-50">
              {cargandoC ? 'Analizando…' : 'Sugerir cuenta con IA'}
            </button>
            {errC && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{errC}</div>}
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <h2 className="font-bold text-teal-700 dark:text-teal-400 mb-3">Sugerencia</h2>
            {!sug && <p className="text-gray-400 text-sm">Escribí una descripción y pedí la sugerencia.</p>}
            {sug && (
              <div className="space-y-3 text-sm">
                <p><span className="text-gray-500">Cuenta:</span> <b>{sug.codigo} — {sug.nombre}</b></p>
                <p><span className="text-gray-500">Confianza:</span> <b className="text-teal-700 dark:text-teal-400">{sug.confianza}%</b></p>
                {sug.razon && <p className="text-gray-600 dark:text-gray-300">{sug.razon}</p>}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'ocr' && (
        <div className="space-y-4 max-w-4xl">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Subí el estado de cuenta (PDF o foto)</label>
            <input type="file" accept="application/pdf,image/*" onChange={(e) => e.target.files?.[0] && leer(e.target.files[0])} className={input} />
            {cargandoO && <p className="text-sm text-gray-400">Leyendo con IA…</p>}
            {errO && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{errO}</div>}
          </div>
          {movs.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900 text-xs uppercase text-gray-500">
                  <tr><th className="text-left px-3 py-2">Fecha</th><th className="text-left px-3 py-2">Documento</th><th className="text-left px-3 py-2">Concepto</th><th className="text-right px-3 py-2">Débito</th><th className="text-right px-3 py-2">Crédito</th></tr>
                </thead>
                <tbody>
                  {movs.map((m, i) => (
                    <tr key={i} className="border-t border-gray-100 dark:border-gray-700">
                      <td className="px-3 py-2">{m.fecha}</td><td className="px-3 py-2">{m.no_documento}</td><td className="px-3 py-2">{m.concepto}</td>
                      <td className="px-3 py-2 text-right">{Q(m.debito)}</td><td className="px-3 py-2 text-right">{Q(m.credito)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-3 py-2 text-xs text-gray-400">Detectados: {movs.length}. Revisá antes de contabilizar.</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
