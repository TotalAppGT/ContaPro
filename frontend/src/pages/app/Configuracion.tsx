import React from 'react';
import { Shield, Calendar, CreditCard } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/contexts/AuthContext';

export default function Configuracion() {
  const { user } = useAuth();

  const planLabel = user?.plan === 'personal' ? 'Personal' : user?.plan === 'professional' ? 'Profesional' : 'Empresarial';
  const planColor = user?.plan === 'personal' ? 'info' : user?.plan === 'professional' ? 'purple' : 'success';

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900">Configuración</h2>

      {/* Subscription info */}
      <Card>
        <div className="flex items-center gap-3 mb-6">
          <CreditCard className="w-5 h-5 text-primary-700" />
          <h3 className="text-lg font-semibold text-gray-900">Información de suscripción</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-gray-500 mb-1">Plan actual</p>
            <Badge variant={planColor} size="md">{planLabel}</Badge>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-gray-500 mb-1">Próximo cobro</p>
            <p className="font-semibold flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              15/08/2026
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-gray-500 mb-1">Monto</p>
            <p className="font-semibold">
              Q{user?.plan === 'personal' ? '79' : user?.plan === 'professional' ? '199' : '399'}/mes
            </p>
          </div>
        </div>
        <div className="mt-4">
          <Button variant="outline" size="sm">Gestionar suscripción</Button>
        </div>
      </Card>

      {/* Change password - próximamente */}
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-5 h-5 text-primary-700" />
          <h3 className="text-lg font-semibold text-gray-900">Cambiar contraseña</h3>
        </div>
        <p className="text-sm text-gray-500">Cambiar contraseña próximamente.</p>
      </Card>

      {/* Theme (placeholder) */}
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-5 h-5 text-primary-700" />
          <h3 className="text-lg font-semibold text-gray-900">Apariencia</h3>
        </div>
        <p className="text-sm text-gray-500">Personalización de tema disponible próximamente.</p>
      </Card>
    </div>
  );
}
