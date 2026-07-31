import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ email: '', nombre: '', password: '', rol: 'auxiliar' });
  const [plan, setPlan] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const du = await api.get<any>('/users');
      setUsuarios(du.usuarios || []);
      const dt = await api.get<any>('/tenants');
      setPlan(dt.tenants?.[0]?.plan || 'personal');
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const maxUsers = plan === 'empresarial' ? 10 : plan === 'profesional' ? 3 : 1;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/users', form);
      toast.success('Usuario creado');
      setShowAdd(false);
      setForm({ email: '', nombre: '', password: '', rol: 'auxiliar' });
      load();
    } catch (err: any) { toast.error(err.message || 'Error al crear'); }
  };

  const handleDelete = async (id: string, email: string) => {
    if (!confirm(`¿Eliminar usuario ${email}?`)) return;
    try {
      await api.del(`/users/${id}`);
      toast.success('Usuario eliminado');
      load();
    } catch (err: any) { toast.error(err.message || 'Error'); }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '80px 0' }}><div style={{ width: 32, height: 32, border: '3px solid #e2e8f0', borderTopColor: '#0A2472', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} /></div>;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 24 }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: '#111', margin: 0 }}>Usuarios</h2>
          <p style={{ color: '#666', margin: '4px 0 0', fontSize: 14 }}>Plan {plan === 'empresarial' ? 'Empresarial' : plan === 'profesional' ? 'Profesional' : 'Personal'} — {usuarios.length} de {maxUsers} usuarios</p>
        </div>
        {usuarios.length < maxUsers && (
          <button onClick={() => setShowAdd(true)} style={btn}>
            <Plus size={16} /> Agregar usuario
          </button>
        )}
      </div>

      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
              <th style={th}>Nombre</th>
              <th style={th}>Email</th>
              <th style={th}>Rol</th>
              <th style={th}>Estado</th>
              <th style={{ ...th, width: 60 }}></th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u: any) => (
              <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={td}>{u.nombre}</td>
                <td style={td}>{u.email}</td>
                <td style={td}><span style={{ padding: '2px 8px', borderRadius: 99, fontSize: 12, background: u.rol === 'owner' ? '#fef3c7' : '#e0e7ff', color: u.rol === 'owner' ? '#92400e' : '#3730a3' }}>{u.rol === 'owner' ? 'Admin' : 'Auxiliar'}</span></td>
                <td style={td}><span style={{ color: u.activo ? '#16a34a' : '#dc2626', fontSize: 13 }}>{u.activo ? 'Activo' : 'Inactivo'}</span></td>
                <td style={td}>
                  {u.rol !== 'owner' && (
                    <button onClick={() => handleDelete(u.id, u.email)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 4 }}>
                      <Trash2 size={16} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }} onClick={() => setShowAdd(false)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: 400, maxWidth: '90vw' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Agregar Usuario</h3>
            <form onSubmit={handleAdd}>
              <div style={{ marginBottom: 12 }}><label style={lbl}>Nombre</label><input style={inp} value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} required /></div>
              <div style={{ marginBottom: 12 }}><label style={lbl}>Email</label><input style={inp} type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required /></div>
              <div style={{ marginBottom: 12 }}><label style={lbl}>Contraseña</label><input style={inp} type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required minLength={4} /></div>
              <div style={{ marginBottom: 20 }}><label style={lbl}>Rol</label>
                <select style={inp} value={form.rol} onChange={e => setForm({ ...form, rol: e.target.value })}>
                  <option value="auxiliar">Auxiliar Contable</option>
                  <option value="contador">Contador</option>
                  <option value="cliente_viewer">Solo Lectura</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowAdd(false)} style={{ ...btn, background: '#f1f5f9', color: '#475569' }}>Cancelar</button>
                <button type="submit" style={btn}>Crear Usuario</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const btn: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#0A2472', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 500 };
const th: React.CSSProperties = { padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#64748b', fontSize: 12, textTransform: 'uppercase' };
const td: React.CSSProperties = { padding: '10px 14px', fontSize: 14, color: '#334155' };
const lbl: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 500, color: '#475569', marginBottom: 4 };
const inp: React.CSSProperties = { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none', boxSizing: 'border-box' };
