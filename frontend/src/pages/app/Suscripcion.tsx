import { useEffect, useState } from 'react';
import { Check, Loader2, CreditCard, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';

interface Plan {
  id: string;
  nombre: string;
  precio: number;
  precio_anual: number;
  moneda: string;
  features: string[];
  limits: { users: number; clients: number };
}

export default function Suscripcion() {
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [actual, setActual] = useState<any>(null);
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    api.get<any>('/subscriptions/plans').then((r) => setPlanes(r.planes || [])).catch(() => {});
    api.get<any>('/subscriptions/current').then((r) => setActual(r.subscription || null)).catch(() => {});
  }, []);

  const pagar = async (plan: Plan) => {
    setLoading(plan.id);
    try {
      const r = await api.post<any>('/subscriptions/create-checkout', { plan: plan.id });
      if (r.checkout_url) {
        window.location.href = r.checkout_url;
      } else {
        toast.error('No se pudo crear el link de pago');
      }
    } catch (e: any) {
      toast.error(e.message || 'Error al iniciar el pago');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Plan y facturacion</h2>
        <p className="text-sm text-gray-500">
          {actual ? `Plan actual: ${actual.plan} - Estado: ${actual.estado}` : 'Elige el plan de tu despacho'}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {planes.map((plan) => {
          const esActual = actual?.plan === plan.id;
          const popular = plan.id === 'profesional';
          return (
            <Card key={plan.id} padding="none" className={popular ? 'ring-2 ring-primary-500 shadow-lg' : ''}>
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900">{plan.nombre}</h3>
                  {popular && <span className="rounded-full bg-primary-50 px-2 py-0.5 text-xs font-semibold text-primary-700">Recomendado</span>}
                  {esActual && <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700">Tu plan</span>}
                </div>
                <p className="text-sm text-gray-500">
                  {plan.limits.users} usuario(s) - {plan.limits.clients === 1 ? '1 empresa' : 'empresas ilimitadas'}
                </p>
                <div>
                  <span className="text-4xl font-extrabold text-gray-900">Q{plan.precio}</span>
                  <span className="text-sm text-gray-400"> /mes</span>
                  <p className="text-xs text-gray-400">Anual: Q{plan.precio_anual}</p>
                </div>
                <ul className="space-y-2 text-sm">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                      <span className="text-gray-600">{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={popular ? 'primary' : 'outline'}
                  disabled={loading !== null || esActual}
                  onClick={() => pagar(plan)}
                >
                  {loading === plan.id ? <Loader2 className="w-4 h-4 animate-spin" /> : esActual ? <Sparkles className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />}
                  {esActual ? 'Plan actual' : 'Suscribirme'}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      <p className="text-xs text-gray-400">
        Pago seguro con Recurrente. Al completar el pago, tu plan se activa automaticamente.
      </p>
    </div>
  );
}
