import React from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { Card } from '@/components/ui/Card';

export default function LibroCompras() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Libro de Compras</h2>
      <Card>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileSpreadsheet className="w-12 h-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-1">Próximamente</h3>
          <p className="text-gray-500 text-sm">El libro de compras estará disponible pronto.</p>
        </div>
      </Card>
    </div>
  );
}
