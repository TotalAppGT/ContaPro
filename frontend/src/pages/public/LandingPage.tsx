import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2, Calculator, FileSpreadsheet, ShieldCheck, Users, Zap,
  BarChart3, CheckCircle2, ArrowRight, Menu, X, FileText, Upload, Globe
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

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
    name: 'Personal',
    price: '79',
    description: 'Para emprendedores y pequeños negocios',
    features: ['1 empresa', 'Libro de Ventas', 'Libro de Compras', 'Reportes básicos de IVA', 'Soporte por email'],
    cta: 'Comenzar gratis',
    popular: false,
  },
  {
    name: 'Profesional',
    price: '199',
    description: 'Para contadores y PyMEs en crecimiento',
    features: ['Hasta 10 empresas', 'Gráfica T contable', 'Conciliación bancaria', 'Carga masiva SAT', 'Reportes fiscales completos', 'Soporte prioritario'],
    cta: 'Comenzar gratis',
    popular: true,
  },
  {
    name: 'Empresarial',
    price: '399',
    description: 'Para firmas contables y empresas grandes',
    features: ['Empresas ilimitadas', 'Todo lo del plan Profesional', 'Usuarios ilimitados', 'API de integración', 'Personalización avanzada', 'Soporte 24/7'],
    cta: 'Contáctenos',
    popular: false,
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
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <img src="/logo.svg" alt="ContaPro" className="w-8 h-8" />
              <span className="text-xl font-bold text-gray-900">ContaPro</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm text-gray-600 hover:text-gray-900">Funcionalidades</a>
              <a href="#pricing" className="text-sm text-gray-600 hover:text-gray-900">Planes</a>
              <a href="#testimonials" className="text-sm text-gray-600 hover:text-gray-900">Testimonios</a>
              <Link to="/login">
                <Button variant="ghost" size="sm">Iniciar sesión</Button>
              </Link>
              <Link to="/register">
                <Button size="sm">Comenzar gratis</Button>
              </Link>
            </div>
            <button className="md:hidden p-2" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
        {mobileOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-4 py-4 space-y-3">
            <a href="#features" className="block text-gray-600 py-2" onClick={() => setMobileOpen(false)}>Funcionalidades</a>
            <a href="#pricing" className="block text-gray-600 py-2" onClick={() => setMobileOpen(false)}>Planes</a>
            <Link to="/login" className="block py-2 text-primary-700 font-medium">Iniciar sesión</Link>
            <Link to="/register">
              <Button className="w-full">Comenzar gratis</Button>
            </Link>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-50 text-primary-700 text-sm font-medium mb-6">
            <Zap className="w-4 h-4" /> Contabilidad inteligente para Guatemala
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight mb-6">
            Contabilidad Profesional <br />
            <span className="text-primary-700">para Guatemala</span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto mb-10">
            La plataforma contable multi-empresa diseñada para el régimen fiscal guatemalteco.
            Automatice SAT-2237, conciliación, carga masiva y más.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register">
              <Button size="lg" className="px-8">
                Empezar gratis <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <a href="#features">
              <Button variant="outline" size="lg">
                Ver funcionalidades
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Todo lo que necesita para su contabilidad</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Una plataforma completa con todas las herramientas necesarias para cumplir con las obligaciones fiscales en Guatemala.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feat) => (
              <div key={feat.title} className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-lg bg-primary-50 flex items-center justify-center mb-4">
                  <feat.icon className="w-6 h-6 text-primary-700" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feat.title}</h3>
                <p className="text-gray-600 text-sm">{feat.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Planes para cada necesidad</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Elija el plan que mejor se adapte a su negocio. Todos incluyen 14 días de prueba gratis.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan) => (
              <div key={plan.name} className={`relative bg-white rounded-2xl border-2 p-8 ${plan.popular ? 'border-primary-500 shadow-xl shadow-primary-500/10' : 'border-gray-200'}`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary-600 text-white text-xs font-semibold rounded-full">
                    Más popular
                  </div>
                )}
                <h3 className="text-xl font-bold text-gray-900 mb-1">{plan.name}</h3>
                <p className="text-sm text-gray-500 mb-6">{plan.description}</p>
                <div className="mb-6">
                  <span className="text-4xl font-extrabold text-gray-900">Q{plan.price}</span>
                  <span className="text-gray-500">/mes</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                      <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link to="/register">
                  <Button variant={plan.popular ? 'primary' : 'outline'} className="w-full" size="lg">
                    {plan.cta}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Lo que dicen nuestros clientes</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Contadores y empresarios confían en ContaPro para su gestión contable diaria.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((t) => (
              <div key={t.name} className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-5 h-5 text-yellow-400 fill-current" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-gray-600 text-sm mb-4 italic">"{t.text}"</p>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{t.name}</p>
                  <p className="text-gray-500 text-xs">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="bg-gradient-to-br from-primary-700 to-primary-900 rounded-3xl p-12 shadow-2xl">
            <h2 className="text-3xl font-bold text-white mb-4">¿Listo para simplificar su contabilidad?</h2>
            <p className="text-primary-100 mb-8 max-w-xl mx-auto">
              Únase a cientos de contadores guatemaltecos que ya confían en ContaPro. Prueba gratuita de 14 días.
            </p>
            <Link to="/register">
              <Button size="lg" className="bg-white text-primary-700 hover:bg-gray-100">
                Crear cuenta gratis <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <img src="/logo.svg" alt="ContaPro" className="w-7 h-7" />
                <span className="text-lg font-bold text-white">ContaPro</span>
              </div>
              <p className="text-sm">Contabilidad profesional para Guatemala. Simplifique su gestión fiscal.</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3 text-sm">Producto</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="hover:text-white transition-colors">Funcionalidades</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Planes</a></li>
                <li><Link to="/register" className="hover:text-white transition-colors">Registrarse</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3 text-sm">Soporte</h4>
              <ul className="space-y-2 text-sm">
                <li><span className="hover:text-white transition-colors cursor-pointer">Centro de ayuda</span></li>
                <li><span className="hover:text-white transition-colors cursor-pointer">Contacto</span></li>
                <li><span className="hover:text-white transition-colors cursor-pointer">Términos</span></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3 text-sm">Contacto</h4>
              <ul className="space-y-2 text-sm">
                <li>info@contapro.com.gt</li>
                <li>+502 2222-0000</li>
                <li>Guatemala City, GT</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-sm">
            &copy; {new Date().getFullYear()} ContaPro. Todos los derechos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}
