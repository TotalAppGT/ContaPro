import React from 'react';
import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold text-primary-700">ContaPro</Link>
        <Link to="/" className="text-sm text-gray-500 hover:text-primary-700">← Volver al inicio</Link>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="flex items-center gap-3 mb-8">
          <Shield className="w-8 h-8 text-primary-700" />
          <h1 className="text-3xl font-bold text-gray-900">Política de Privacidad</h1>
        </div>

        <p className="text-gray-500 mb-8">Última actualización: Agosto 2026</p>

        <div className="prose prose-gray max-w-none space-y-6 text-gray-700">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Responsable del Tratamiento</h2>
            <p><strong>TotalAppGT</strong>, con domicilio en Guatemala, es el responsable del tratamiento de los datos personales recopilados a través de la plataforma ContaPro y el sitio web contapro.totalappgt.online.</p>
            <p className="mt-2">Correo de contacto: info@totalappgt.online</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Datos que Recopilamos</h2>
            <p>Para prestar el servicio de sistema contable SaaS, recopilamos:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Nombre de la empresa o persona natural</li>
              <li>NIT (Número de Identificación Tributaria)</li>
              <li>Correo electrónico</li>
              <li>Número de teléfono (WhatsApp, opcional)</li>
              <li>Datos contables: facturas, ventas, compras, declaraciones</li>
              <li>Información de suscripción y pagos</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Finalidad del Tratamiento</h2>
            <p>Utilizamos sus datos exclusivamente para:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Proveer el servicio de contabilidad en línea</li>
              <li>Generar reportes fiscales (SAT-2237)</li>
              <li>Enviar notificaciones de vencimientos y alertas</li>
              <li>Gestionar su suscripción y pagos</li>
              <li>Mejorar la plataforma y la experiencia de usuario</li>
            </ul>
            <p className="mt-2">No compartimos, vendemos ni alquilamos sus datos a terceros.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Seguridad de los Datos</h2>
            <p>Implementamos medidas técnicas y organizativas para proteger sus datos:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Cifrado en tránsito (HTTPS/TLS)</li>
              <li>Cifrado en reposo (PostgreSQL)</li>
              <li>Autenticación segura (Firebase + JWT)</li>
              <li>Aislamiento multi-tenant por base de datos</li>
              <li>Copias de seguridad automáticas</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Retención de Datos</h2>
            <p>Conservamos sus datos mientras su cuenta esté activa. Al cancelar su cuenta, los datos contables se retienen por 90 días para cumplir con obligaciones legales, tras lo cual se eliminan permanentemente.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Sus Derechos</h2>
            <p>Como titular de los datos, usted tiene derecho a:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Acceder a sus datos personales</li>
              <li>Rectificar datos inexactos</li>
              <li>Solicitar la eliminación de sus datos</li>
              <li>Oponerse al tratamiento</li>
              <li>Solicitar la portabilidad de sus datos</li>
            </ul>
            <p className="mt-2">Para ejercer estos derechos, escriba a info@totalappgt.online.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Cambios a esta Política</h2>
            <p>TotalAppGT se reserva el derecho de modificar esta política. Los cambios serán notificados por correo electrónico y publicados en esta página.</p>
          </section>
        </div>
      </main>
    </div>
  );
}
