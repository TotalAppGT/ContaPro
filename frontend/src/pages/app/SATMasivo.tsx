import React, { useState, useRef } from 'react';
import HelpBar from '@/components/HelpBar';
import { Upload, FileSpreadsheet, Clipboard, Loader2, Play, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Table } from '@/components/ui/Table';
import { api } from '@/lib/api';

interface ParsedRow {
  id: string;
  type: string;
  series: string;
  number: string;
  date: string;
  nit: string;
  name: string;
  taxable: number;
  exempt: number;
  iva: number;
  total: number;
}

export default function SATMasivo() {
  const [activeTab, setActiveTab] = useState<'file' | 'paste'>('file');
  const [data, setData] = useState<ParsedRow[]>([]);
  const [pasteText, setPasteText] = useState('');
  const [grouping, setGrouping] = useState('Por Factura');
  const [regime, setRegime] = useState('General 12%');
  const [type, setType] = useState<'Ventas' | 'Compras'>('Ventas');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInput = useRef<HTMLInputElement>(null);

  const parseCSV = (text: string): ParsedRow[] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];
    return lines.slice(1).map((line, i) => {
      const cols = line.split(',').map((c) => c.trim().replace(/"/g, ''));
      return {
        id: `r${i}`,
        type: cols[0] || 'FACT',
        series: cols[1] || 'A',
        number: cols[2] || '',
        date: cols[3] || '',
        nit: cols[4] || '',
        name: cols[5] || '',
        taxable: parseFloat(cols[6]) || 0,
        exempt: parseFloat(cols[7]) || 0,
        iva: parseFloat(cols[8]) || 0,
        total: parseFloat(cols[9]) || 0,
      };
    });
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = parseCSV(reader.result as string);
      if (result.length === 0) {
        toast.error('No se pudieron leer datos del archivo');
        return;
      }
      setData(result);
      toast.success(`${result.length} registros cargados`);
    };
    reader.readAsText(file);
  };

  const handlePaste = () => {
    const result = parseCSV(pasteText);
    if (result.length === 0) {
      toast.error('No se pudieron leer los datos pegados');
      return;
    }
    setData(result);
    toast.success(`${result.length} registros cargados`);
  };

  const handleProcess = async () => {
    if (data.length === 0) {
      toast.error('No hay datos para procesar');
      return;
    }
    setIsProcessing(true);
    setProgress(0);

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) { clearInterval(interval); return prev; }
        return prev + Math.random() * 15;
      });
    }, 400);

    try {
      await api.post('/sat/carga-masiva', {
        entries: data,
        type,
        grouping,
        regime,
      });
      clearInterval(interval);
      setProgress(100);
      toast.success(`${data.length} registros procesados exitosamente`);
      setTimeout(() => { setData([]); setProgress(0); }, 1500);
    } catch (err) {
      clearInterval(interval);
      toast.error(err instanceof Error ? err.message : 'Error al procesar');
    } finally {
      setIsProcessing(false);
    }
  };

  const columns = [
    { key: 'type', header: 'Tipo' },
    { key: 'number', header: 'Número', render: (r: ParsedRow) => `${r.series}-${r.number}` },
    { key: 'date', header: 'Fecha' },
    { key: 'nit', header: 'NIT' },
    { key: 'name', header: 'Nombre' },
    { key: 'taxable', header: 'Gravado', render: (r: ParsedRow) => `Q${r.taxable.toFixed(2)}`, className: 'text-right' },
    { key: 'iva', header: 'IVA', render: (r: ParsedRow) => `Q${r.iva.toFixed(2)}`, className: 'text-right' },
    { key: 'total', header: 'Total', render: (r: ParsedRow) => `Q${r.total.toFixed(2)}`, className: 'text-right font-medium' },
  ];

  const totalRegistros = data.length;
  const totalIVA = data.reduce((s, r) => s + r.iva, 0);
  const totalGeneral = data.reduce((s, r) => s + r.total, 0);

  return (
    <div className="space-y-6">
      <HelpBar tips={['Arrastre su archivo CSV o Excel a la zona de carga.', 'Seleccione el tipo: Ventas o Compras.', 'Elija la agrupacion: Por Factura, Diario, Semanal o Mensual.', 'Verifique el resumen antes de procesar.']} />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Carga Masiva SAT</h2>
        <div className="text-sm text-gray-500">
          Formatos aceptados: CSV, XLS, XLSX
        </div>
      </div>

      {/* Upload zone */}
      <Card>
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('file')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'file' ? 'bg-primary-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Upload className="w-4 h-4" /> Subir archivo
          </button>
          <button
            onClick={() => setActiveTab('paste')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'paste' ? 'bg-primary-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Clipboard className="w-4 h-4" /> Pegar datos
          </button>
        </div>

        {activeTab === 'file' ? (
          <div
            className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-primary-400 transition-colors cursor-pointer"
            onClick={() => fileInput.current?.click()}
          >
            <FileSpreadsheet className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 font-medium">Arrastre su archivo aquí o haga clic para seleccionar</p>
            <p className="text-gray-400 text-sm mt-1">CSV, XLS, XLSX - Máximo 10MB</p>
            <input ref={fileInput} type="file" accept=".csv,.xls,.xlsx" onChange={handleFile} className="hidden" />
          </div>
        ) : (
          <div>
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="Pegue aquí los datos CSV (Tipo,Serie,Número,Fecha,NIT,Nombre,Gravado,Exento,IVA,Total)..."
              rows={6}
              className="w-full p-4 border border-gray-300 rounded-xl text-sm resize-none focus:ring-2 focus:ring-primary-500 focus:outline-none"
            />
            <Button onClick={handlePaste} className="mt-3" size="sm">
              <Clipboard className="w-4 h-4" /> Procesar datos pegados
            </Button>
          </div>
        )}
      </Card>

      {/* Preview */}
      {data.length > 0 && !isProcessing && (
        <>
          <Card>
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <Select
                label="Agrupación"
                options={[
                  { value: 'Por Factura', label: 'Por Factura' },
                  { value: 'Diario', label: 'Diario' },
                  { value: 'Semanal', label: 'Semanal' },
                  { value: 'Mensual', label: 'Mensual' },
                ]}
                value={grouping}
                onChange={(e) => setGrouping(e.target.value)}
                className="w-44"
              />
              <Select
                label="Régimen"
                options={[
                  { value: 'General 12%', label: 'General 12%' },
                  { value: 'Pequeño 5%', label: 'Pequeño 5%' },
                ]}
                value={regime}
                onChange={(e) => setRegime(e.target.value)}
                className="w-44"
              />
              <Select
                label="Tipo"
                options={[
                  { value: 'Ventas', label: 'Ventas' },
                  { value: 'Compras', label: 'Compras' },
                ]}
                value={type}
                onChange={(e) => setType(e.target.value as 'Ventas' | 'Compras')}
                className="w-40"
              />
              <div className="flex items-end">
                <Button onClick={handleProcess}>
                  <Play className="w-4 h-4" /> Procesar {totalRegistros} registros
                </Button>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Vista previa ({totalRegistros} registros)</h3>
              <div className="flex gap-3 text-sm">
                <span className="text-gray-500">Total IVA: <strong className="text-primary-700">Q{totalIVA.toFixed(2)}</strong></span>
                <span className="text-gray-500">Total: <strong>Q{totalGeneral.toFixed(2)}</strong></span>
              </div>
            </div>
            <Table
              columns={columns}
              data={data.slice(0, 50)}
              emptyMessage="Sin datos para mostrar"
              keyExtractor={(r) => r.id}
            />
            {data.length > 50 && (
              <p className="text-sm text-gray-500 mt-3 text-center">
                Mostrando 50 de {data.length} registros
              </p>
            )}
          </Card>
        </>
      )}

      {/* Progress */}
      {isProcessing && (
        <Card>
          <div className="text-center py-8">
            <Loader2 className="w-10 h-10 animate-spin text-primary-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Procesando datos...</h3>
            <div className="max-w-md mx-auto bg-gray-200 rounded-full h-3 mb-4">
              <div
                className="bg-primary-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
            <p className="text-sm text-gray-500">{Math.min(progress, 100).toFixed(0)}% completado</p>
          </div>
        </Card>
      )}
    </div>
  );
}
