import React, { useState } from 'react';
import { Save, Shield, Calendar, CreditCard, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';

export default function Configuracion() {
  const { user } = useAuth();
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass !== confirmPass) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    if (newPass.length < 8) {
      toast.error('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    setIsSubmitting(true);
    try {
      await api.patch('/auth/change-password', {
        current_password: currentPass,
        new_password: newPass,
      });
      toast.success('Contraseña actualizada exitosamente');
      setCurrentPass('');
      setNewPass('');
      setConfirmPass('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al cambiar contraseña');
    } finally {
      setIsSubmitting(false);
    }
  };

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

      {/* Change password */}
      <Card>
        <div className="flex items-center gap-3 mb-6">
          <Shield className="w-5 h-5 text-primary-700" />
          <h3 className="text-lg font-semibold text-gray-900">Cambiar contraseña</h3>
        </div>
        <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
          <Input
            label="Contraseña actual"
            type="password"
            value={currentPass}
            onChange={(e) => setCurrentPass(e.target.value)}
            placeholder="••••••••"
            required
          />
          <Input
            label="Nueva contraseña"
            type="password"
            value={newPass}
            onChange={(e) => setNewPass(e.target.value)}
            placeholder="Mínimo 8 caracteres"
            required
          />
          <Input
            label="Confirmar nueva contraseña"
            type="password"
            value={confirmPass}
            onChange={(e) => setConfirmPass(e.target.value)}
            placeholder="Repita la contraseña"
            required
          />
          <Button type="submit" isLoading={isSubmitting}>
            <Save className="w-4 h-4" /> Actualizar contraseña
          </Button>
        </form>
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
