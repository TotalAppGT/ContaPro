import { useEffect, useState } from 'react';
import { Check, Loader2, CreditCard, Sparkles, Ticket, Calendar } from 'lucide-react';
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
  const [ciclo, setCiclo] = useState<'mensual' | 'anual'>('mensual');
  const [cupon, setCupon] = useState('');

  useEffect(() => {
    api.get<any>('/subscriptions/plans').then((r) => setPlanes(r.planes || [])).catch(() => {});
    api.get<any>('/subscriptions/current').then((r) => setActual(r.subscription || null)).catch(() => {});
  }, []);

  const pagar = async (plan: Plan) => {
    setLoading(plan.id);
    try {
      const r = await api.post<any>('/subscriptions/create-checkout', {
        plan: plan.id,
        ciclo,
        cupon: cupon.trim() || undefined,
      });
      if (r.trial_activado) {
        toast.success(`Trial activado: ${r.dias} dias en el plan ${r.plan}`);
        setActual({ plan: r.plan, estado: 'activo' });
      } else if (r.checkout_url) {
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

      <div className="flex flex-wrap items-center gap-4">
        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
          <button
            type="button"
            onClick={() => setCiclo('mensual')}
            className={`rounded-md px-4 py-1.5 text-sm font-medium ${ciclo === 'mensual' ? 'bg-primary-700 text-white' : 'text-gray-600'}`}
          >
            Mensual
          </button>
          <button
            type="button"
            onClick={() => setCiclo('anual')}
            className={`rounded-md px-4 py-1.5 text-sm font-medium ${ciclo === 'anual' ? 'bg-primary-700 text-white' : 'text-gray-600'}`}
          >
            Anual
          </button>
        </div>
        {ciclo === 'anual' && (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700">
            <Calendar className="h-3 w-3" /> 2 meses gratis
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <Ticket className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={cupon}
            onChange={(e) => setCupon(e.target.value.toUpperCase())}
            placeholder="Codigo de cupon (opcional)"
            className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
        <p className="text-xs text-gray-400">Prueba: BIENVENIDA (30 dias gratis) o LANZAMIENTO20 (20% dcto)</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {planes.map((plan) => {
          const esActual = actual?.plan === plan.id;
          const popular = plan.id === 'profesional';
          const precio = ciclo === 'anual' ? plan.precio_anual : plan.precio;
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
                  <span className="text-4xl font-extrabold text-gray-900">Q{precio}</span>
                  <span className="text-sm text-gray-400"> /{ciclo === 'anual' ? 'ano' : 'mes'}</span>
                  {ciclo === 'anual' && (
                    <p className="text-xs text-gray-400">Equivale a Q{Math.round(precio / 12)}/mes</p>
                  )}
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
