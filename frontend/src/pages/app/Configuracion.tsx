import React, { useState, useEffect } from 'react';
import { Shield, Calendar, CreditCard, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';

const planPrices: Record<string, string> = {
  personal: '79',
  profesional: '199',
  empresarial: '399',
};

export default function Configuracion() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.get<any>('/tenants')
      .then((data) => setSubscription(data.tenant || data))
      .catch(() => setSubscription(null))
      .finally(() => setIsLoading(false));
  }, []);

  const plan = user?.plan || 'personal';
  const planLabel = plan === 'personal' ? 'Personal' : plan === 'profesional' ? 'Profesional' : 'Empresarial';
  const planColor = plan === 'personal' ? 'info' : plan === 'profesional' ? 'purple' : 'success';

  const nextBilling = subscription?.subscription_expires
    ? new Date(subscription.subscription_expires).toLocaleDateString('es-GT')
    : '15/08/2026';

  const price = subscription?.plan ? (planPrices[subscription.plan] || planPrices[plan]) : planPrices[plan] || '79';

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary-600" /></div>;
  }

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
            <Badge variant={planColor as any} size="md">{planLabel}</Badge>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-gray-500 mb-1">Próximo cobro</p>
            <p className="font-semibold flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              {nextBilling}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-gray-500 mb-1">Monto</p>
            <p className="font-semibold">Q{price}/mes</p>
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
