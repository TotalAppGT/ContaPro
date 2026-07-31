import React, { useState, useEffect } from 'react';
import { Shield, Calendar, CreditCard, Loader2, Moon, Sun, Key, Save, Bell, Phone } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
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
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('contapro_theme') as 'light' | 'dark') || 'light';
  });
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [telefono, setTelefono] = useState('');
  const [prefs, setPrefs] = useState<any>({});

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  useEffect(() => {
    api.get<any>('/tenants')
      .then((data) => setSubscription(data.tenant || data))
      .catch(() => setSubscription(null))
      .finally(() => setIsLoading(false));
    api.get<any>('/notificaciones/preferencias').then(d => { setPrefs(d); setTelefono(d.telefono || ''); }).catch(() => {});
  }, []);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('contapro_theme', next);
    if (next === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    toast.success(`Tema ${next === 'dark' ? 'oscuro' : 'claro'} activado`);
  };

  const handleSavePhone = async () => {
    try {
      await api.post('/notificaciones/telefono', { telefono });
      toast.success('Teléfono guardado para notificaciones');
    } catch { toast.error('Error al guardar'); }
  };

  const handleChangePassword = async () => {
      toast.error('Complete todos los campos');
      return;
    }
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    if (passwordForm.new_password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    setIsChangingPassword(true);
    try {
      await api.post('/auth/change-password', {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      });
      toast.success('Contraseña actualizada exitosamente');
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al cambiar contraseña');
    } finally {
      setIsChangingPassword(false);
    }
  };

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

      {/* Change password */}
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <Key className="w-5 h-5 text-primary-700" />
          <h3 className="text-lg font-semibold text-gray-900">Cambiar contraseña</h3>
        </div>
        <div className="space-y-3 max-w-md">
          <Input
            label="Contraseña actual"
            type="password"
            value={passwordForm.current_password}
            onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
            placeholder="Ingrese su contraseña actual"
          />
          <Input
            label="Nueva contraseña"
            type="password"
            value={passwordForm.new_password}
            onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
            placeholder="Mínimo 6 caracteres"
          />
          <Input
            label="Confirmar nueva contraseña"
            type="password"
            value={passwordForm.confirm_password}
            onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
            placeholder="Repita la nueva contraseña"
          />
          <Button onClick={handleChangePassword} isLoading={isChangingPassword}>
            <Save className="w-4 h-4" /> Actualizar contraseña
          </Button>
        </div>
      </Card>

      {/* Notificaciones */}
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <Bell className="w-5 h-5 text-primary-700" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Notificaciones</h3>
            <p className="text-sm text-gray-500">
              {prefs.tipo === 'whatsapp' ? 'Alertas por WhatsApp activas (Plan Empresarial)' :
               prefs.tipo === 'email' ? 'Notificaciones por email activas (Plan Profesional)' :
               'Actualice a Plan Profesional o Empresarial para recibir alertas'}
            </p>
          </div>
        </div>
        <div className="flex items-end gap-3 max-w-md">
          <Input
            label="Teléfono WhatsApp (solo Plan Empresarial)"
            type="tel"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            placeholder="+502 XXXX-XXXX"
          />
          <Button onClick={handleSavePhone} size="sm">
            <Save className="w-4 h-4" /> Guardar
          </Button>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          {plan === 'empresarial' ? '📱 Recibirás alertas de IVA, vencimientos y más por WhatsApp.' :
           plan === 'profesional' ? '📧 Recibirás notificaciones por correo electrónico.' :
           '🔒 Disponible en planes Profesional y Empresarial.'}
        </p>
      </Card>

      {/* Theme toggle */}
      <Card>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {theme === 'light' ? <Sun className="w-5 h-5 text-primary-700" /> : <Moon className="w-5 h-5 text-primary-700" />}
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Apariencia</h3>
              <p className="text-sm text-gray-500">Tema actual: {theme === 'light' ? 'Claro' : 'Oscuro'}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={toggleTheme}>
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            <span className="ml-1">{theme === 'light' ? 'Modo oscuro' : 'Modo claro'}</span>
          </Button>
        </div>
      </Card>
    </div>
  );
}
