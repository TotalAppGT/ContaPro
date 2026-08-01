import React, { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Check } from 'lucide-react';

interface Step {
  title: string;
  desc: string;
  icon: string;
}

const steps: Step[] = [
  { title: 'Bienvenido a ContaPro', desc: 'Tu sistema de contabilidad profesional para Guatemala. 14 dias de prueba gratis con todas las funciones.', icon: '🇬🇹' },
  { title: 'Dashboard', desc: 'Aqui ves tus ingresos, gastos e IVA en tiempo real. Acceso rapido a todos los modulos desde la barra lateral.', icon: '📊' },
  { title: 'Ventas y Compras', desc: 'Registra tus facturas de venta y compra. Descarga el libro en Excel con un clic. Soporta carga masiva de archivos.', icon: '📋' },
  { title: 'Grafica T', desc: 'Registra partidas contables con partida doble. Selecciona la cuenta del catalogo, ingresa Debe y Haber. El sistema valida el cuadre.', icon: '📐' },
  { title: 'Conciliacion Bancaria', desc: 'Concilia tus movimientos bancarios. Agrega transacciones y el sistema calcula el cuadre automaticamente.', icon: '🏦' },
  { title: 'SAT Masivo', desc: 'Carga facturas electronicas por lote. Arrastra tu archivo CSV o Excel y el sistema las procesa en segundos.', icon: '📤' },
  { title: 'Reportes Fiscales', desc: 'Genera SAT-2237, Resumen Cruzado de IVA e Integracion de Saldos. Descarga en Excel o PDF tamano carta.', icon: '📄' },
  { title: 'Clientes y Usuarios', desc: 'Administra tus clientes contables. Invita a tu equipo de trabajo (Plan Profesional: 3, Empresarial: 10).', icon: '👥' },
  { title: 'Notificaciones', desc: 'Recibe alertas por email (Plan Profesional) o WhatsApp (Plan Empresarial) sobre IVA, vencimientos y mas.', icon: '🔔' },
];

export default function OnboardingTour() {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const seen = localStorage.getItem('contapro_tour_seen');
    if (!seen) setShow(true);
  }, []);

  const dismiss = () => {
    localStorage.setItem('contapro_tour_seen', '1');
    setShow(false);
  };

  const next = () => { if (step < steps.length - 1) setStep(step + 1); else dismiss(); };
  const prev = () => { if (step > 0) setStep(step - 1); };

  if (!show) return null;

  const s = steps[step];

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 20, width: 420, maxWidth: '92vw', padding: 32, textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <button onClick={dismiss} style={{ position: 'absolute', right: 16, top: 16, background: 'none', border: 'none', cursor: 'pointer', color: '#999', fontSize: 20 }}><X size={20} /></button>

        <div style={{ fontSize: 48, marginBottom: 12 }}>{s.icon}</div>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#0A2472', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
          Paso {step + 1} de {steps.length}
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111', margin: '0 0 8px' }}>{s.title}</h2>
        <p style={{ fontSize: 14, color: '#666', lineHeight: 1.6, marginBottom: 24 }}>{s.desc}</p>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={prev} disabled={step === 0} style={{ ...navBtn, opacity: step === 0 ? 0.3 : 1 }}><ChevronLeft size={18} /> Anterior</button>
          <div style={{ display: 'flex', gap: 4 }}>
            {steps.map((_, i) => <div key={i} style={{ width: 6, height: 6, borderRadius: 9, background: i === step ? '#0A2472' : '#ddd' }} />)}
          </div>
          <button onClick={next} style={{ ...navBtn, background: step === steps.length - 1 ? '#16a34a' : '#0A2472', color: '#fff' }}>
            {step === steps.length - 1 ? <><Check size={18} /> Listo</> : <>Siguiente <ChevronRight size={18} /></>}
          </button>
        </div>

        <button onClick={dismiss} style={{ marginTop: 16, background: 'none', border: 'none', color: '#999', fontSize: 12, cursor: 'pointer' }}>
          Omitir recorrido
        </button>
      </div>
    </div>
  );
}

const navBtn: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 4, padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, background: '#f1f5f9', color: '#475569' };
