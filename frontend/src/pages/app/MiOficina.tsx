import React, { useState } from 'react';
import { Upload, Save, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

export default function MiOficina() {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    office_name: user?.tenant_name || '',
    nit: '',
    address: '',
    phone: '',
    email: user?.email || '',
    signature_name: '',
    colegiado_number: '',
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (logoFile) {
        const formData = new FormData();
        formData.append('logo', logoFile);
        await api.upload('/tenants/logo', formData);
      }
      await api.patch('/tenants', form);
      toast.success('Datos de la oficina actualizados');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900">Mi Oficina</h2>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Logo section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Logo de la oficina</label>
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 overflow-hidden">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo preview" className="w-full h-full object-cover" />
                ) : (
                  <Upload className="w-8 h-8 text-gray-400" />
                )}
              </div>
              <div>
                <Button variant="outline" size="sm" type="button" onClick={() => document.getElementById('logo-upload')?.click()}>
                  <Upload className="w-4 h-4" /> Subir logo
                </Button>
                <p className="text-xs text-gray-500 mt-1">PNG, JPG - Máximo 2MB</p>
                <input id="logo-upload" type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Nombre de la oficina"
              value={form.office_name}
              onChange={(e) => setForm({ ...form, office_name: e.target.value })}
              placeholder="Ej: López & Asociados"
            />
            <Input
              label="NIT"
              value={form.nit}
              onChange={(e) => setForm({ ...form, nit: e.target.value })}
              placeholder="1234567-8"
            />
          </div>

          <Input
            label="Dirección"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="Dirección fiscal"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Teléfono"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+502 2222-0000"
            />
            <Input
              label="Correo electrónico"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <hr className="border-gray-200" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Nombre para firma"
              value={form.signature_name}
              onChange={(e) => setForm({ ...form, signature_name: e.target.value })}
              placeholder="Ej: Lic. Juan Pérez"
            />
            <Input
              label="Número de colegiado"
              value={form.colegiado_number}
              onChange={(e) => setForm({ ...form, colegiado_number: e.target.value })}
              placeholder="Ej: CPA-12345"
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" isLoading={isSubmitting}>
              <Save className="w-4 h-4" /> Guardar cambios
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
