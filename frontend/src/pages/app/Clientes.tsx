import React from 'react';
import { Users } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { useTenant } from '@/contexts/TenantContext';

export default function Clientes() {
  const { currentClient } = useTenant();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Clientes</h2>
        <p className="text-gray-500 text-sm mt-1">
          Cliente activo: <strong>{currentClient?.name || 'Ninguno'}</strong>
        </p>
      </div>
      <Card>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Users className="w-12 h-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-1">Próximamente</h3>
          <p className="text-gray-500 text-sm">La gestión de clientes estará disponible pronto.</p>
        </div>
      </Card>
    </div>
  );
}
