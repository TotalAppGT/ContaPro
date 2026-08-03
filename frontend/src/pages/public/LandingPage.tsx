import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2, Calculator, FileSpreadsheet, ShieldCheck, Users, Zap,
  BarChart3, CheckCircle2, ArrowRight, Menu, X, FileText, Upload, Globe
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

const stats = [
  { icon: Users, value: '15,000+', label: 'Contribuyentes activos' },
  { icon: FileText, value: '30,000+', label: 'Facturas procesadas' },
  { icon: ShieldCheck, value: '99.9%', label: 'Disponibilidad' },
  { icon: Globe, value: '22', label: 'Departamentos' },
];

const steps = [
  { icon: Users, title: 'Regístrate', description: 'Cree su cuenta gratis en menos de dos minutos. Sin necesidad de tarjeta de crédito.' },
  { icon: Calculator, title: 'Configura', description: 'Personalice sus libros contables y adapte la plataforma a su régimen fiscal.' },
  { icon: FileSpreadsheet, title: 'Declara', description: 'Genere reportes oficiales SAT-2237 y presente declaraciones en un solo clic.' },
];

const features = [
  { icon: Building2, title: 'Multi-Cliente', description: 'Gestione múltiples empresas desde una sola cuenta. Ideal para contadores y firmas contables.' },
  { icon: FileText, title: 'Gráfica T Inteligente', description: 'Registre partidas contables con búsqueda automática de cuentas y validación de cuadre.' },
  { icon: Upload, title: 'Carga Masiva SAT', description: 'Importe archivos CSV y Excel para cargar ventas y compras al instante.' },
  { icon: Calculator, title: 'Conciliación Bancaria', description: 'Concilie sus movimientos bancarios con un solo clic. Cuadre automático.' },
  { icon: ShieldCheck, title: 'Reportes SAT-2237', description: 'Genere el formulario SAT-2237 y reportes fiscales oficiales automáticamente.' },
  { icon: BarChart3, title: 'Dashboard Gerencial', description: 'Visualice ingresos, gastos e IVA en tiempo real con gráficos interactivos.' },
];

const plans = [
  {
    name: 'Personal', price: '79', description: 'Para emprendedores y pequeños negocios',
    features: ['1 empresa', 'Libro de Ventas', 'Libro de Compras', 'Reportes básicos de IVA', 'Soporte por email'],
    cta: 'Probar 14 días gratis', popular: false,
  },
  {
    name: 'Profesional', price: '199', description: 'Para contadores y PyMEs en crecimiento',
    features: ['Contabilidades ilimitadas', '3 usuarios', 'Gráfica T', 'Conciliación bancaria', 'Carga masiva SAT', 'Reportes fiscales SAT-2237', 'Soporte prioritario'],
    cta: 'Probar 14 días gratis', popular: true,
  },
  {
    name: 'Empresarial', price: '399', description: 'Para firmas contables y empresas grandes',
    features: ['10 usuarios', 'Dominio .com.gt propio', 'API de integración', 'WhatsApp alertas', 'Soporte 24/7', 'Todo lo del plan Profesional'],
    cta: 'Probar 14 días gratis', popular: false,
  },
];

const testimonials = [
  { name: 'María González', role: 'Contadora Pública', text: 'ContaPro ha transformado mi firma contable. Ahora manejo 15 clientes sin esfuerzo.' },
  { name: 'Carlos López', role: 'Empresario', text: 'La carga masiva me ahorra horas cada mes. El SAT-2237 automático es increíble.' },
  { name: 'Ana Martínez', role: 'Auditora', text: 'La conciliación bancaria y los reportes fiscales son exactamente lo que necesitaba.' },
];

export default function LandingPage() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white selection:bg-primary-100 selection:text-primary-950">

      {/* ────────── Navbar ────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/85 backdrop-blur-xl border-b border-gray-100/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-18">
            <Link to="/" className="flex items-center gap-2.5 group">
              <img
                src="/logo.svg"
                alt="ContaPro"
                className="w-9 h-9 transition-transform duration-300 group-hover:scale-105"
              />
              <span className="text-xl font-bold text-gray-900 tracking-tight">ContaPro</span>
            </Link>

            {/* Desktop nav */}
            <div className="hidden lg:flex items-center gap-10">
              <a href="#como-funciona" className="text-sm font-medium text-gray-600 hover:text-primary-700 transition-colors">Cómo funciona</a>
              <a href="#features" className="text-sm font-medium text-gray-600 hover:text-primary-700 transition-colors">Funcionalidades</a>
              <a href="#pricing" className="text-sm font-medium text-gray-600 hover:text-primary-700 transition-colors">Planes</a>
              <a href="#testimonials" className="text-sm font-medium text-gray-600 hover:text-primary-700 transition-colors">Testimonios</a>
              <Link to="/login">
                <Button variant="ghost" size="sm">Iniciar sesión</Button>
              </Link>
              <Link to="/register">
                <Button size="md" className="shadow-md shadow-primary-700/20">Comenzar gratis</Button>
              </Link>
            </div>

            {/* Mobile hamburger */}
            <button
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="lg:hidden border-t border-gray-100 bg-white/95 backdrop-blur-xl px-4 py-5 space-y-1 shadow-lg">
            <a href="#como-funciona" className="block px-3 py-2.5 text-gray-600 font-medium rounded-lg hover:bg-gray-50 hover:text-primary-700 transition-colors" onClick={() => setMobileOpen(false)}>Cómo funciona</a>
            <a href="#features" className="block px-3 py-2.5 text-gray-600 font-medium rounded-lg hover:bg-gray-50 hover:text-primary-700 transition-colors" onClick={() => setMobileOpen(false)}>Funcionalidades</a>
            <a href="#pricing" className="block px-3 py-2.5 text-gray-600 font-medium rounded-lg hover:bg-gray-50 hover:text-primary-700 transition-colors" onClick={() => setMobileOpen(false)}>Planes</a>
            <a href="#testimonials" className="block px-3 py-2.5 text-gray-600 font-medium rounded-lg hover:bg-gray-50 hover:text-primary-700 transition-colors" onClick={() => setMobileOpen(false)}>Testimonios</a>
            <div className="pt-3 space-y-2">
              <Link to="/login" className="block w-full text-center py-2.5 text-sm font-semibold text-primary-700 hover:bg-primary-50 rounded-lg transition-colors">Iniciar sesión</Link>
              <Link to="/register">
                <Button className="w-full" size="md">Comenzar gratis</Button>
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* ────────── Hero ────────── */}
      <section className="relative pt-28 pb-24 lg:pt-40 lg:pb-32 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary-50/80 via-primary-50/20 to-transparent pointer-events-none" />
        <div className="absolute top-0 right-0 -mr-48 -mt-32 w-[700px] h-[700px] bg-primary-500/[0.04] rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-48 -mb-32 w-[600px] h-[600px] bg-accent-500/[0.04] rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-4xl mx-auto text-center">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent-500/10 text-accent-600 text-sm font-semibold mb-8 border border-accent-500/20">
            <Zap className="w-4 h-4" /> Contabilidad inteligente para Guatemala
          </span>

          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold text-gray-900 tracking-tight leading-[1.1] mb-6">
            Contabilidad profesional<br />
            <span className="text-primary-950">simplificada al máximo</span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            La plataforma contable multi-empresa diseñada para el régimen fiscal guatemalteco.
            Automatice SAT-2237, conciliación bancaria, carga masiva y más.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register">
              <Button size="lg" className="px-10 py-4 text-lg font-semibold shadow-xl shadow-primary-700/25 hover:shadow-2xl hover:shadow-primary-700/30 hover:-translate-y-0.5 transition-all duration-300">
                Probar 14 días gratis <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <p className="text-sm text-gray-400">Sin tarjeta de crédito · Cancela cuando quieras</p>
          </div>
        </div>
      </section>

      {/* ────────── Statistics ────────── */}
      <section className="py-16 border-y border-gray-100 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center group">
                <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-primary-50 flex items-center justify-center group-hover:bg-primary-100 transition-colors duration-300">
                  <stat.icon className="w-6 h-6 text-primary-700" />
                </div>
                <div className="text-3xl lg:text-4xl font-extrabold text-primary-950 tracking-tight mb-1">{stat.value}</div>
                <div className="text-sm text-gray-500 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ────────── Cómo funciona ────────── */}
      <section id="como-funciona" className="py-20 lg:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-sm font-semibold text-primary-700 uppercase tracking-[0.2em]">Cómo funciona</span>
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mt-3 mb-4">Empiece en tres simples pasos</h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              No necesita conocimientos técnicos. Configure su contabilidad en minutos.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-14 max-w-4xl mx-auto">
            {steps.map((step, i) => (
              <div key={step.title} className="relative text-center group">
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-10 left-[60%] w-[80%] h-px bg-gradient-to-r from-gray-200 to-transparent" />
                )}
                <div className="relative inline-flex">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-primary-50 flex items-center justify-center group-hover:bg-primary-100 group-hover:scale-105 transition-all duration-300">
                    <step.icon className="w-9 h-9 text-primary-700" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-primary-700 text-white text-xs font-bold flex items-center justify-center shadow-md">
                    {i + 1}
                  </div>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{step.title}</h3>
                <p className="text-gray-500 leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ────────── Features ────────── */}
      <section id="features" className="py-20 lg:py-28 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-sm font-semibold text-primary-700 uppercase tracking-[0.2em]">Funcionalidades</span>
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mt-3 mb-4">Todo lo que necesita para su contabilidad</h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              Una plataforma completa con todas las herramientas necesarias para cumplir con las obligaciones fiscales en Guatemala.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feat) => (
              <div key={feat.title} className="group bg-white rounded-2xl p-8 border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center mb-5 group-hover:bg-primary-100 group-hover:scale-110 transition-all duration-300">
                  <feat.icon className="w-6 h-6 text-primary-700" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{feat.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{feat.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ────────── Trial Banner ────────── */}
      <section className="relative py-16 lg:py-20 bg-gradient-to-br from-primary-900 via-primary-950 to-slate-900 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(240,185,11,0.08),transparent_60%)] pointer-events-none" />
        <div className="relative max-w-4xl mx-auto px-4 text-center">
          <span className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white px-5 py-2 rounded-full text-sm font-medium mb-6 border border-white/10">
            <ShieldCheck className="w-4 h-4 text-accent-500" /> Sin riesgo · Sin tarjeta de crédito
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 tracking-tight">
            14 días de prueba completamente gratis
          </h2>
          <p className="text-lg text-primary-200/80 mb-10 max-w-xl mx-auto">
            Acceda a todas las funcionalidades del plan Profesional. Cancele cuando quiera, sin compromisos.
          </p>
          <Link to="/register">
            <Button
              size="lg"
              className="bg-accent-500 hover:bg-accent-600 text-gray-900 font-bold px-12 py-5 text-lg shadow-xl shadow-accent-500/25 hover:shadow-2xl hover:shadow-accent-500/30 hover:-translate-y-0.5 transition-all duration-300"
            >
              Comenzar prueba gratis <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* ────────── Pricing ────────── */}
      <section id="pricing" className="py-20 lg:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-sm font-semibold text-primary-700 uppercase tracking-[0.2em]">Planes</span>
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mt-3 mb-4">Planes para cada necesidad</h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              Elija el plan que mejor se adapte a su negocio. Todos incluyen 14 días de prueba gratis.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto items-start">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-2xl p-8 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
                  plan.popular
                    ? 'bg-white border-2 border-primary-600 shadow-xl shadow-primary-600/10 ring-1 ring-primary-600/10'
                    : plan.name === 'Empresarial'
                      ? 'bg-gradient-to-b from-slate-50 to-amber-50/30 border border-amber-200 shadow-md'
                      : 'bg-white border border-gray-200 shadow-sm'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-5 py-1.5 bg-primary-600 text-white text-xs font-bold rounded-full shadow-md shadow-primary-600/20">
                    Más popular
                  </div>
                )}
                {plan.name === 'Empresarial' && !plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-5 py-1.5 bg-amber-500 text-amber-900 text-xs font-bold rounded-full shadow-md shadow-amber-500/20">
                    Premium
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-1">{plan.name}</h3>
                  <p className="text-sm text-gray-500">{plan.description}</p>
                </div>

                <div className="mb-8">
                  <span className={`text-5xl font-extrabold tracking-tight ${plan.popular ? 'text-primary-700' : plan.name === 'Empresarial' ? 'text-amber-700' : 'text-gray-900'}`}>Q{plan.price}</span>
                  <span className="text-gray-400 font-medium">/mes</span>
                </div>

                <ul className="space-y-3.5 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-sm text-gray-600">
                      <CheckCircle2 className={`w-5 h-5 mt-0.5 flex-shrink-0 ${plan.popular ? 'text-primary-600' : plan.name === 'Empresarial' ? 'text-amber-500' : 'text-gray-400'}`} />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <Link to="/register">
                  <Button
                    variant={plan.popular ? 'primary' : 'outline'}
                    className={`w-full font-semibold ${plan.popular ? 'bg-primary-600 hover:bg-primary-700 shadow-lg shadow-primary-600/20' : plan.name === 'Empresarial' ? 'border-amber-400 text-amber-700 hover:bg-amber-50' : ''}`}
                    size="lg"
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ────────── Testimonials ────────── */}
      <section id="testimonials" className="py-20 lg:py-28 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-sm font-semibold text-primary-700 uppercase tracking-[0.2em]">Testimonios</span>
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mt-3 mb-4">Lo que dicen nuestros clientes</h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              Contadores y empresarios confían en ContaPro para su gestión contable diaria.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((t) => (
              <div key={t.name} className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300">
                <div className="flex items-center gap-1 mb-5">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-5 h-5 text-accent-500 fill-current" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-gray-600 leading-relaxed mb-6 italic">&ldquo;{t.text}&rdquo;</p>
                <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                  <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-sm flex-shrink-0">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{t.name}</p>
                    <p className="text-gray-500 text-xs">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ────────── CTA ────────── */}
      <section className="py-20 lg:py-28">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="relative bg-gradient-to-br from-primary-800 to-primary-950 rounded-3xl p-12 lg:p-16 shadow-2xl shadow-primary-950/25 overflow-hidden">
            <div className="absolute top-0 right-0 w-[350px] h-[350px] bg-accent-500/[0.06] rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[250px] h-[250px] bg-primary-500/[0.08] rounded-full blur-3xl translate-y-1/2 -translate-x-1/4 pointer-events-none" />

            <div className="relative">
              <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
                ¿Listo para simplificar su contabilidad?
              </h2>
              <p className="text-primary-200 mb-2 max-w-xl mx-auto text-lg leading-relaxed">
                Todos los planes incluyen 14 días de prueba gratis. Sin tarjeta de crédito, cancele cuando quiera.
              </p>
              <p className="text-primary-400/60 text-sm mb-10">
                ContaPro es parte de <span className="text-white font-semibold">TotalAppGT</span> — soluciones SaaS para Guatemala
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to="/register">
                  <Button
                    size="lg"
                    className="bg-white text-primary-900 font-bold px-10 py-5 text-lg shadow-xl hover:bg-gray-100 hover:text-primary-900 hover:-translate-y-0.5 transition-all duration-300"
                  >
                    Crear cuenta gratis <ArrowRight className="w-5 h-5" />
                  </Button>
                </Link>
                <Link to="/login">
                  <Button
                    size="lg"
                    variant="ghost"
                    className="text-white/80 hover:text-white border border-white/20 hover:bg-white/10 hover:-translate-y-0.5 transition-all duration-300"
                  >
                    Iniciar sesión
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ────────── Footer ────────── */}
      <footer className="bg-gray-950 text-gray-400 pt-20 pb-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12 mb-14">
            {/* Brand */}
            <div className="lg:col-span-1">
              <Link to="/" className="inline-flex items-center gap-2.5 mb-5 group">
                <img src="/logo.svg" alt="ContaPro" className="w-8 h-8 transition-transform group-hover:scale-105" />
                <span className="text-xl font-bold text-white tracking-tight">ContaPro</span>
              </Link>
              <p className="text-sm text-gray-500 leading-relaxed mb-6">
                Contabilidad profesional para Guatemala. ContaPro es parte de <span className="text-white font-medium">TotalAppGT</span>, plataforma de soluciones SaaS.
              </p>
              <div className="flex items-center gap-5 text-xs">
                <span className="text-gray-600 hover:text-gray-400 transition-colors cursor-pointer">Facebook</span>
                <span className="text-gray-600 hover:text-gray-400 transition-colors cursor-pointer">LinkedIn</span>
                <span className="text-gray-600 hover:text-gray-400 transition-colors cursor-pointer">Twitter</span>
              </div>
            </div>

            {/* Producto */}
            <div>
              <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Producto</h4>
              <ul className="space-y-3 text-sm">
                <li><a href="#como-funciona" className="hover:text-white transition-colors">Cómo funciona</a></li>
                <li><a href="#features" className="hover:text-white transition-colors">Funcionalidades</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Planes</a></li>
                <li><Link to="/register" className="hover:text-white transition-colors">Registrarse</Link></li>
              </ul>
            </div>

            {/* Soporte */}
            <div>
              <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Legal</h4>
              <ul className="space-y-3 text-sm">
                <li><Link to="/privacidad" className="hover:text-white transition-colors">Política de Privacidad</Link></li>
                <li><Link to="/terminos" className="hover:text-white transition-colors">Términos y Condiciones</Link></li>
                <li><span className="hover:text-white transition-colors cursor-pointer">Cookies</span></li>
              </ul>
            </div>

            {/* Contacto */}
            <div>
              <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Contacto</h4>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-2.5">
                  <span className="text-gray-500">WhatsApp:</span>
                  <a href="https://wa.me/50258303182" target="_blank" rel="noopener noreferrer" className="text-green-400 hover:text-green-300 transition-colors">+502 5830-3182</a>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="text-gray-500">Email:</span>
                  <a href="mailto:info@totalappgt.online" className="hover:text-white transition-colors">info@totalappgt.online</a>
                </li>
                <li className="text-gray-500">Guatemala, C.A.</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
            <p>&copy; {new Date().getFullYear()} <span className="text-white font-medium">TotalAppGT</span> — ContaPro. Todos los derechos reservados.</p>
            <div className="flex items-center gap-6 text-xs">
              <Link to="/terminos" className="hover:text-white transition-colors">Términos</Link>
              <Link to="/privacidad" className="hover:text-white transition-colors">Privacidad</Link>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
