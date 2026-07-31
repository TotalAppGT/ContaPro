import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Globe, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import type { PlanType } from '@/types';

const plans: { name: PlanType; label: string; price: number; features: string[] }[] = [
  { name: 'personal', label: 'Personal', price: 79, features: ['1 empresa', 'Ventas y compras', 'Reportes IVA'] },
  { name: 'professional', label: 'Profesional', price: 199, features: ['Hasta 10 empresas', 'Gráfica T', 'Conciliación', 'SAT Masivo'] },
  { name: 'enterprise', label: 'Empresarial', price: 399, features: ['Empresas ilimitadas', 'Usuarios ilimitados', 'API', 'Soporte 24/7'] },
];

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [plan, setPlan] = useState<PlanType>('personal');
  const [name, setName] = useState('');
  const [nit, setNit] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await register({ name, nit, email, password, subdomain, plan });
      toast.success('Cuenta creada exitosamente. ¡Bienvenido!');
      navigate('/login');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al crear la cuenta');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-700 to-primary-900 items-center justify-center p-12">
        <div className="text-center text-white">
          <Globe className="w-16 h-16 mx-auto mb-6 text-primary-200" />
          <h1 className="text-3xl font-bold mb-4">ContaPro</h1>
          <p className="text-primary-100 text-lg max-w-md">
            Comience su prueba gratuita de 14 días. Sin tarjeta de crédito.
          </p>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Crear cuenta</h2>
            <p className="text-gray-600 mt-2">
              {step === 1 ? 'Seleccione un plan' : step === 2 ? 'Complete sus datos' : 'Confirmar registro'}
            </p>
          </div>

          {/* Step indicators */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {[1, 2, 3].map((s) => (
              <div key={s} className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === s ? 'bg-primary-700 text-white' : step > s ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                {step > s ? <CheckCircle2 className="w-4 h-4" /> : s}
              </div>
            ))}
          </div>

          {step === 1 && (
            <div className="space-y-4">
              {plans.map((p) => (
                <button
                  key={p.name}
                  onClick={() => setPlan(p.name)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                    plan === p.name ? 'border-primary-500 bg-primary-50 shadow-md' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">{p.label}</h3>
                      <div className="text-sm text-gray-500 mt-1">
                        {p.features.map((f) => (
                          <span key={f} className="inline-block mr-3">• {f}</span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-bold text-gray-900">Q{p.price}</span>
                      <span className="text-sm text-gray-500">/mes</span>
                    </div>
                  </div>
                </button>
              ))}
              <Button className="w-full mt-4" onClick={() => setStep(2)}>Continuar</Button>
            </div>
          )}

          {step === 2 && (
            <form onSubmit={(e) => { e.preventDefault(); setStep(3); }} className="space-y-4">
              <Input label="Nombre completo" value={name} onChange={(e) => setName(e.target.value)} placeholder="Juan Pérez" required />
              <Input label="NIT" value={nit} onChange={(e) => setNit(e.target.value)} placeholder="1234567-8" required />
              <Input label="Correo electrónico" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="correo@ejemplo.com" required />
              <Input label="Contraseña" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 8 caracteres" required />
              <Input label="Subdominio" value={subdomain} onChange={(e) => setSubdomain(e.target.value)} placeholder="miempresa.contapro.com.gt" hint="Será su dirección de acceso" required />
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">Atrás</Button>
                <Button type="submit" className="flex-1">Continuar</Button>
              </div>
            </form>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-xl p-6 space-y-3">
                <h3 className="font-semibold text-gray-900">Resumen del registro</h3>
                <div className="text-sm space-y-1">
                  <p><span className="text-gray-500">Plan:</span> <strong>{plan.charAt(0).toUpperCase() + plan.slice(1)}</strong></p>
                  <p><span className="text-gray-500">Nombre:</span> <strong>{name}</strong></p>
                  <p><span className="text-gray-500">NIT:</span> <strong>{nit}</strong></p>
                  <p><span className="text-gray-500">Email:</span> <strong>{email}</strong></p>
                  <p><span className="text-gray-500">URL:</span> <strong>{subdomain || '--'}.contapro.com.gt</strong></p>
                </div>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-800">
                <strong>Prueba gratuita de 14 días.</strong> No se requiere tarjeta de crédito. Puede cancelar en cualquier momento.
              </div>
              <Button className="w-full" isLoading={isSubmitting} onClick={handleRegister}>
                Completar registro
              </Button>
              <Button variant="ghost" onClick={() => setStep(2)} className="w-full">Atrás</Button>
            </div>
          )}

          <p className="text-center text-sm text-gray-600 mt-6">
            ¿Ya tiene cuenta?{' '}
            <Link to="/login" className="text-primary-700 font-medium hover:underline">
              Iniciar sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
