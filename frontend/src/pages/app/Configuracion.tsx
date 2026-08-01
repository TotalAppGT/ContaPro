import React, { useState, useEffect } from 'react';
import HelpBar from '@/components/HelpBar';
import { Shield, Calendar, CreditCard, Loader2, Moon, Sun, Key, Save, Bell, Phone } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
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
  const [alertaDia, setAlertaDia] = useState('1');
  const [alertaHora, setAlertaHora] = useState('08:00');

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
      toast.success('Teléfono guardado');
    } catch { toast.error('Error al guardar'); }
  };

  const handleTestWhatsApp = async () => {
    try { await api.post('/notificaciones/test'); toast.success('Mensaje de prueba enviado'); }
    catch (err: any) { toast.error(err.message || 'Error al enviar'); }
  };

  const handleSaveAlerta = async () => {
    try {
      await api.post('/notificaciones/alerta', { dia: alertaDia, hora: alertaHora });
      toast.success('Alerta programada');
    } catch { toast.error('Error al guardar'); }
  };

  const handleChangePassword = async () => {
    if (!passwordForm.current_password || !passwordForm.new_password) {
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
      <HelpBar tips={['Cambie su contrasena periodicamente.', 'Active el modo oscuro si prefiere temas oscuros.', 'Configure notificaciones segun su plan.', 'Los cambios se guardan automaticamente.']} />
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
              {plan === 'empresarial' ? 'Alertas por WhatsApp activas' :
               plan === 'profesional' ? 'Notificaciones por email activas' :
               'Disponible en Plan Profesional y Empresarial'}
            </p>
          </div>
        </div>

        {plan === 'empresarial' && (
          <div className="space-y-4">
            {/* Paso 1: Enviar mensaje para vincular */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
              <p className="text-sm font-semibold text-blue-900 mb-2">Paso 1: Vincula tu WhatsApp</p>
              <p className="text-xs text-blue-700 mb-3">Envia un mensaje desde tu WhatsApp para registrar tu numero en el sistema.</p>
              <a
                href="https://wa.me/50258309505?text=Registrar%20ContaPro"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors no-underline"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                Abrir WhatsApp
              </a>
            </div>

            {/* Paso 2: Guardar numero */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
              <p className="text-sm font-semibold text-gray-900 mb-2">Paso 2: Registra tu numero</p>
              <p className="text-xs text-gray-500 mb-3">Ingresa el mismo numero que usaste para enviar el mensaje.</p>
              <div className="flex items-end gap-3">
                <Input label="Tu numero WhatsApp" type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="+502 XXXX-XXXX" />
                <Button onClick={handleSavePhone} size="sm"><Save className="w-4 h-4" /> Guardar</Button>
                <Button onClick={handleTestWhatsApp} variant="outline" size="sm" disabled={!telefono}><Bell className="w-4 h-4" /> Probar</Button>
              </div>
              {telefono && (
                <button onClick={async () => { setTelefono(''); await handleSavePhone(); toast.success('Numero desvinculado'); }} className="text-xs text-red-500 hover:underline mt-2">
                  Desvincular numero
                </button>
              )}
            </div>
          </div>
        )}
        {plan === 'profesional' && (
          <p className="text-xs text-gray-400">Las notificaciones se envían al correo registrado. Incluyen alertas de vencimiento y actividad importante.</p>
        )}
        {plan === 'personal' && (
          <p className="text-xs text-gray-400">Actualiza a Plan Profesional o Empresarial para activar notificaciones.</p>
        )}
      </Card>

      {plan === 'empresarial' && (
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <Bell className="w-5 h-5 text-primary-700" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Programar Alertas</h3>
              <p className="text-sm text-gray-500">Personaliza el dia y hora de tus notificaciones</p>
            </div>
          </div>
          <div className="flex items-end gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dia del mes</label>
              <select value={alertaDia} onChange={e => setAlertaDia(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                <option value="1">Dia 1</option><option value="5">Dia 5</option><option value="10">Dia 10</option><option value="15">Dia 15</option><option value="20">Dia 20</option><option value="25">Dia 25</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hora</label>
              <input type="time" value={alertaHora} onChange={e => setAlertaHora(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <Button onClick={handleSaveAlerta} size="sm"><Save className="w-4 h-4" /> Guardar</Button>
          </div>
          <p className="text-xs text-gray-400 mt-2">Se enviara una alerta recordatorio de IVA el dia {alertaDia} de cada mes a las {alertaHora}.</p>
        </Card>
      )}

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
