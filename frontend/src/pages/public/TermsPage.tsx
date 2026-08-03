import React from 'react';
import { Link } from 'react-router-dom';
import { FileText } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold text-primary-700">ContaPro</Link>
        <Link to="/" className="text-sm text-gray-500 hover:text-primary-700">← Volver al inicio</Link>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="flex items-center gap-3 mb-8">
          <FileText className="w-8 h-8 text-primary-700" />
          <h1 className="text-3xl font-bold text-gray-900">Términos y Condiciones</h1>
        </div>

        <p className="text-gray-500 mb-8">Última actualización: Agosto 2026</p>

        <div className="prose prose-gray max-w-none space-y-6 text-gray-700">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Aceptación de los Términos</h2>
            <p>Al acceder y utilizar ContaPro (contapro.totalappgt.online), usted acepta estos términos y condiciones en su totalidad. Si no está de acuerdo, no utilice el servicio.</p>
            <p className="mt-2">ContaPro es un producto de <strong>TotalAppGT</strong>, con operaciones en Guatemala.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Descripción del Servicio</h2>
            <p>ContaPro es una plataforma SaaS de contabilidad en línea que permite:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Gestión de libros contables (ventas y compras)</li>
              <li>Generación de reportes fiscales SAT-2237</li>
              <li>Conciliación bancaria</li>
              <li>Carga masiva de documentos fiscales</li>
              <li>Notificaciones y alertas vía WhatsApp y correo electrónico</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Registro y Cuenta</h2>
            <p>Para usar ContaPro debe registrarse con datos veraces. Usted es responsable de:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Mantener la confidencialidad de sus credenciales de acceso</li>
              <li>Toda la actividad que ocurra bajo su cuenta</li>
              <li>Notificar inmediatamente cualquier uso no autorizado</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Suscripción y Pagos</h2>
            <p>ContaPro ofrece los siguientes planes de suscripción mensual:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li><strong>Personal:</strong> Q79/mes — 1 usuario</li>
              <li><strong>Profesional:</strong> Q199/mes — 3 usuarios, subdominio personalizado</li>
              <li><strong>Empresarial:</strong> Q399/mes — 10 usuarios, WhatsApp, dominio propio</li>
            </ul>
            <p className="mt-2">Todas las suscripciones incluyen 14 días de prueba gratuita. Los pagos se procesan a través de Recurrente. Las renovaciones son automáticas hasta que usted cancele.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Cancelación y Reembolsos</h2>
            <p>Puede cancelar su suscripción en cualquier momento desde su panel de configuración. La cancelación surte efecto al final del período de facturación actual. No se realizan reembolsos por períodos parciales.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Uso Aceptable</h2>
            <p>Usted se compromete a no utilizar ContaPro para:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Actividades ilegales o fraudulentas</li>
              <li>Almacenar o transmitir malware, virus o código malicioso</li>
              <li>Violar derechos de propiedad intelectual de terceros</li>
              <li>Generar declaraciones fiscales falsas o inexactas</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Propiedad Intelectual</h2>
            <p>ContaPro, su código fuente, diseño, marca y logotipo son propiedad de TotalAppGT. Los datos contables que usted ingresa le pertenecen exclusivamente a usted.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Limitación de Responsabilidad</h2>
            <p>TotalAppGT no será responsable por daños indirectos, incidentales o consecuentes derivados del uso de ContaPro. El servicio se proporciona "tal cual" y "según disponibilidad". No garantizamos que el servicio esté libre de errores o interrupciones.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Ley Aplicable</h2>
            <p>Estos términos se rigen por las leyes de la República de Guatemala. Cualquier disputa será resuelta ante los tribunales competentes de la Ciudad de Guatemala.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Contacto</h2>
            <p>Para dudas sobre estos términos:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Email: info@totalappgt.online</li>
              <li>WhatsApp: <a href="https://wa.me/50258303182" target="_blank" rel="noopener noreferrer" className="text-primary-700 hover:underline">+502 5830-3182</a></li>
            </ul>
          </section>
        </div>
      </main>
    </div>
  );
}
