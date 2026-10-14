import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ShieldCheck, 
  FileText, 
  ArrowLeft, 
  CheckCircle2, 
  Calendar, 
  CreditCard, 
  AlertCircle,
  Building2,
  Printer
} from 'lucide-react';
import { useTenant } from '../../context/TenantContext';

export default function TermsOfServicePage() {
  const { tenant } = useTenant();
  const [activeSection, setActiveSection] = useState<string>('intro');

  const salonName = tenant?.name || 'BunnyCure';

  const sections = [
    { id: 'intro', title: '1. Objeto y Ámbito de Aplicación' },
    { id: 'nature', title: '2. Naturaleza del Servicio y Rol de la Plataforma' },
    { id: 'accounts', title: '3. Registro y Cuentas de Usuario' },
    { id: 'bookings', title: '4. Agendamiento de Citas y Reservas' },
    { id: 'cancellations', title: '5. Cancelaciones, No-Show y Retracto' },
    { id: 'payments', title: '6. Tarifas, Señas y Medios de Pago' },
    { id: 'loyalty', title: '7. Tarjetas de Lealtad (Bunny Pass) y Gift Cards' },
    { id: 'sanitary', title: '8. Responsabilidad Sanitaria y Bioseguridad' },
    { id: 'data', title: '9. Privacidad y Tratamiento de Datos (Ley 19.628)' },
    { id: 'ip', title: '10. Propiedad Intelectual' },
    { id: 'jurisdiction', title: '11. Ley Aplicable y Jurisdicción' },
  ];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-[#FDFBF9] text-[#5C3D2E] selection:bg-[#C9897A] selection:text-white">
      {/* ─── Encabezado Superior ─── */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-[#F0E0D8] py-4 px-4 sm:px-8 shadow-xs">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#7C3A2D] hover:text-[#C9897A] px-3 py-1.5 rounded-full bg-[#FDF0EC] border border-[#F0E0D8] transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Volver</span>
            </Link>
            <div className="h-4 w-px bg-[#F0E0D8] hidden sm:block" />
            <div className="flex items-center gap-2">
              <span className="text-xl">💅</span>
              <span className="font-extrabold text-base tracking-tight text-[#5C3D2E]">
                {salonName} <span className="font-normal text-xs text-[#9E7B6E]">Legal</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <Link
              to="/privacidad"
              className="text-xs font-bold text-[#9E7B6E] hover:text-[#C9897A] transition-colors"
            >
              Política de Privacidad →
            </Link>
            <button
              onClick={handlePrint}
              type="button"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#F0E0D8] bg-white text-[#5C3D2E] hover:bg-[#FDF0EC] transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir</span>
            </button>
          </div>
        </div>
      </header>

      {/* ─── Hero Banner Legal ─── */}
      <section className="bg-gradient-to-b from-[#FDF0EC] to-[#FDFBF9] py-12 px-4 border-b border-[#F0E0D8]">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white text-[#7C3A2D] border border-[#F0E0D8] text-xs font-bold uppercase tracking-wider mb-4 shadow-xs">
            <ShieldCheck className="w-4 h-4 text-[#C9897A]" />
            <span>Marco Regulatorio Chile • Ley 19.496 y Ley 19.628</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#5C3D2E] tracking-tight mb-3">
            Términos y Condiciones del Servicio
          </h1>
          <p className="text-sm text-[#9E7B6E] max-w-2xl mx-auto leading-relaxed">
            Reglas de uso del ecosistema digital, reservas online, políticas de atención presencial, 
            garantías, cancelaciones y derechos del consumidor para <strong>{salonName}</strong> y la plataforma <strong>BunnyCure</strong>.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-xs text-[#9E7B6E]">
            <span className="inline-flex items-center gap-1 bg-white/80 px-2.5 py-1 rounded-md border border-[#F0E0D8]">
              <Calendar className="w-3 h-3 text-[#C9897A]" /> Vigencia: Octubre 2026
            </span>
            <span className="inline-flex items-center gap-1 bg-white/80 px-2.5 py-1 rounded-md border border-[#F0E0D8]">
              <Building2 className="w-3 h-3 text-[#C9897A]" /> Jurisdicción: República de Chile
            </span>
          </div>
        </div>
      </section>

      {/* ─── Cuerpo Principal con Navegación Lateral y Contenido ─── */}
      <main className="max-w-6xl mx-auto py-10 px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Navegación lateral (Índice de Cláusulas) */}
          <aside className="lg:col-span-4 hidden lg:block">
            <div className="sticky top-24 bg-white rounded-2xl border border-[#F0E0D8] p-5 shadow-bunny">
              <div className="flex items-center gap-2 text-xs font-bold text-[#7C3A2D] uppercase tracking-wider mb-3">
                <FileText className="w-4 h-4 text-[#C9897A]" />
                <span>Contenido de las Cláusulas</span>
              </div>
              <nav className="space-y-1">
                {sections.map((sec) => (
                  <a
                    key={sec.id}
                    href={`#${sec.id}`}
                    onClick={() => setActiveSection(sec.id)}
                    className={`block text-xs py-2 px-3 rounded-lg transition-all ${
                      activeSection === sec.id
                        ? 'bg-[#FDF0EC] text-[#7C3A2D] font-bold border-l-3 border-[#C9897A]'
                        : 'text-[#9E7B6E] hover:bg-[#FAF4F0] hover:text-[#5C3D2E]'
                    }`}
                  >
                    {sec.title}
                  </a>
                ))}
              </nav>

              <div className="mt-6 pt-5 border-t border-[#F0E0D8]">
                <div className="text-[11px] text-[#9E7B6E] leading-normal">
                  ¿Tienes dudas legales o consultas específicas? Escríbenos a{' '}
                  <a href="mailto:legal@bunnycure.cl" className="text-[#C9897A] font-bold underline">
                    legal@bunnycure.cl
                  </a>
                </div>
              </div>
            </div>
          </aside>

          {/* Contenido Editorial Legal */}
          <article className="lg:col-span-8 bg-white rounded-2xl border border-[#F0E0D8] p-6 sm:p-10 shadow-bunny space-y-10">
            {/* Cláusula 1 */}
            <section id="intro" className="scroll-mt-24 space-y-3">
              <h2 className="text-xl font-extrabold text-[#5C3D2E] flex items-center gap-2 border-b border-[#F0E0D8] pb-3">
                <span className="text-base text-[#C9897A]">01.</span> Objeto y Ámbito de Aplicación
              </h2>
              <p className="text-sm text-[#7A5B50] leading-relaxed">
                El presente documento establece los Términos y Condiciones que rigen el acceso y uso del sitio web, 
                aplicación web progresiva (PWA), módulo de agendamiento en línea, pasarelas de pago y tarjeta de lealtad digital 
                proporcionados por <strong>BunnyCure</strong> para <strong>{salonName}</strong> (en adelante, el &quot;Salón&quot;) a favor de sus clientas y usuarios finales (en adelante, el &quot;Usuario&quot; o &quot;Cliente&quot;).
              </p>
              <p className="text-sm text-[#7A5B50] leading-relaxed">
                La utilización de la plataforma y el agendamiento presencial de servicios estéticos implica la aceptación plena, 
                expresa e incondicional de la totalidad de las cláusulas aquí descritas.
              </p>
            </section>

            {/* Cláusula 2 */}
            <section id="nature" className="scroll-mt-24 space-y-3">
              <h2 className="text-xl font-extrabold text-[#5C3D2E] flex items-center gap-2 border-b border-[#F0E0D8] pb-3">
                <span className="text-base text-[#C9897A]">02.</span> Naturaleza del Servicio y Rol de la Plataforma
              </h2>
              <div className="bg-[#FDF0EC]/60 border border-[#F0E0D8] rounded-xl p-4 text-xs text-[#5C3D2E] leading-relaxed flex gap-3 items-start">
                <Building2 className="w-5 h-5 text-[#C9897A] shrink-0 mt-0.5" />
                <div>
                  <strong>Distinción de Roles Legales:</strong> BunnyCure es un proveedor tecnológico SaaS (Software as a Service) 
                  que suministra el software de gestión. La ejecución material de los servicios de manicura, pedicura, peluquería, pestañas, cejas y estética general, 
                  así como la emisión del documento tributario correspondiente (Boleta Electrónica de Ventas y Servicios ante el SII), 
                  es de exclusiva responsabilidad comercial y jurídica de <strong>{salonName}</strong>.
                </div>
              </div>
            </section>

            {/* Cláusula 3 */}
            <section id="accounts" className="scroll-mt-24 space-y-3">
              <h2 className="text-xl font-extrabold text-[#5C3D2E] flex items-center gap-2 border-b border-[#F0E0D8] pb-3">
                <span className="text-base text-[#C9897A]">03.</span> Registro y Cuentas de Usuario
              </h2>
              <p className="text-sm text-[#7A5B50] leading-relaxed">
                Para solicitar una reserva en línea o activar la tarjeta digital Bunny Pass, el Usuario debe proporcionar datos fidedignos, 
                completos y actualizados (nombre completo, teléfono celular y correo electrónico de contacto).
              </p>
              <ul className="space-y-2 text-xs text-[#7A5B50] list-disc pl-5">
                <li>El Usuario se compromete a no suplantar la identidad de terceros.</li>
                <li>Los datos de contacto se utilizarán exclusivamente para la notificación de confirmaciones, recordatorios de cita por WhatsApp/correo y promociones consentidas.</li>
                <li>El personal del Salón se reserva el derecho de rechazar reservas generadas con información deliberadamente falsa o engañosa.</li>
              </ul>
            </section>

            {/* Cláusula 4 */}
            <section id="bookings" className="scroll-mt-24 space-y-3">
              <h2 className="text-xl font-extrabold text-[#5C3D2E] flex items-center gap-2 border-b border-[#F0E0D8] pb-3">
                <span className="text-base text-[#C9897A]">04.</span> Agendamiento de Citas y Puntualidad
              </h2>
              <p className="text-sm text-[#7A5B50] leading-relaxed">
                Toda cita solicitada a través de la plataforma queda sujeta a confirmación en tiempo real según la disponibilidad 
                de los puestos de trabajo y el personal especialista.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="border border-[#F0E0D8] rounded-xl p-3 bg-[#FAF8F5]">
                  <div className="font-bold text-xs text-[#5C3D2E] flex items-center gap-1.5 mb-1">
                    <CheckCircle2 className="w-4 h-4 text-[#4B856E]" /> Tolerancia de Llegada
                  </div>
                  <p className="text-[11px] text-[#7A5B50]">
                    Se otorga un margen de tolerancia máximo de <strong>10 minutos</strong>. Pasado dicho plazo, por respeto a las clientas siguientes, el salón podrá reducir la complejidad del servicio o considerar la cita como inasistida.
                  </p>
                </div>
                <div className="border border-[#F0E0D8] rounded-xl p-3 bg-[#FAF8F5]">
                  <div className="font-bold text-xs text-[#5C3D2E] flex items-center gap-1.5 mb-1">
                    <CheckCircle2 className="w-4 h-4 text-[#4B856E]" /> Asignación de Profesional
                  </div>
                  <p className="text-[11px] text-[#7A5B50]">
                    Si bien el sistema permite seleccionar a la profesional de preferencia, en caso de fuerza mayor (licencia médica o imprevisto de salud), el salón podrá coordinar un reemplazo capacitado previa notificación.
                  </p>
                </div>
              </div>
            </section>

            {/* Cláusula 5 */}
            <section id="cancellations" className="scroll-mt-24 space-y-3">
              <h2 className="text-xl font-extrabold text-[#5C3D2E] flex items-center gap-2 border-b border-[#F0E0D8] pb-3">
                <span className="text-base text-[#C9897A]">05.</span> Cancelaciones, No-Show y Derecho a Retracto
              </h2>
              <p className="text-sm text-[#7A5B50] leading-relaxed">
                Conforme a la Ley N° 19.496 de Protección de los Derechos de los Consumidores y a las buenas prácticas de la industria estética:
              </p>
              <ul className="space-y-2 text-xs text-[#7A5B50] list-disc pl-5">
                <li>
                  <strong>Aviso Anticipado:</strong> Las cancelaciones o reprogramaciones deben realizarse con un mínimo de <strong>24 horas de anticipación</strong> a la hora fijada, a través del enlace de autogestión de la cita o vía WhatsApp oficial del salón.
                </li>
                <li>
                  <strong>Derecho a Retracto (Art. 3 bis Ley 19.496):</strong> Al tratarse de servicios programados con bloqueo exclusivo de bloques de tiempo y recursos humanos, el derecho a retracto no aplicará si el aviso de desistimiento ocurre con menos de 12 horas previas a la cita o si el servicio ya ha comenzado a prestarse.
                </li>
                <li>
                  <strong>Incomparecencia (No-Show):</strong> La no presentación a la hora acordada sin previo aviso facultará al Salón a disponer del abono o seña de garantía como indemnización compensatoria por la hora perdida de la especialista.
                </li>
              </ul>
            </section>

            {/* Cláusula 6 */}
            <section id="payments" className="scroll-mt-24 space-y-3">
              <h2 className="text-xl font-extrabold text-[#5C3D2E] flex items-center gap-2 border-b border-[#F0E0D8] pb-3">
                <span className="text-base text-[#C9897A]">06.</span> Tarifas, Señas de Reserva y Medios de Pago
              </h2>
              <p className="text-sm text-[#7A5B50] leading-relaxed">
                Todos los precios exhibidos en la plataforma se encuentran expresados en <strong>Pesos Chilenos (CLP)</strong> e incluyen el Impuesto al Valor Agregado (IVA) correspondiente, salvo indicación expresa de exención conforme a la normativa del Servicio de Impuestos Internos (SII).
              </p>
              <div className="flex gap-3 items-start p-3 bg-[#FAF8F5] rounded-xl border border-[#F0E0D8]">
                <CreditCard className="w-5 h-5 text-[#C9897A] shrink-0 mt-0.5" />
                <div className="text-xs text-[#7A5B50] leading-relaxed">
                  <strong>Medios Aceptados:</strong> Transferencia bancaria electrónica directa, tarjetas de débito (Redcompra), 
                  tarjetas de crédito bancarias mediante pasarelas autorizadas (Transbank Webpay Plus, Mercado Pago, Flow) y efectivo en caja física del salón.
                </div>
              </div>
            </section>

            {/* Cláusula 7 */}
            <section id="loyalty" className="scroll-mt-24 space-y-3">
              <h2 className="text-xl font-extrabold text-[#5C3D2E] flex items-center gap-2 border-b border-[#F0E0D8] pb-3">
                <span className="text-base text-[#C9897A]">07.</span> Tarjetas de Lealtad (Bunny Pass) y Gift Cards
              </h2>
              <div className="space-y-2 text-xs text-[#7A5B50] leading-relaxed">
                <p>
                  <strong>Bunny Pass (Fidelización Digital):</strong> Los sellos digitales se asignan únicamente tras la finalización efectiva y pago de un servicio en el salón. Los sellos son personales, intransferibles, carecen de valor monetario comercial y no pueden ser canjeados por dinero en efectivo. Cada beneficio o descuento acumulado posee una vigencia definida por las políticas del Salón emisor.
                </p>
                <p>
                  <strong>Gift Cards Digitales:</strong> Las tarjetas de regalo electrónicas poseen un código alfanumérico único. Tienen una validez legal de 6 meses desde su fecha de emisión, son al portador y pueden aplicarse a cualquier servicio o producto disponible en el salón emisor. En ningún caso serán reembolsables en dinero en efectivo.
                </p>
              </div>
            </section>

            {/* Cláusula 8 */}
            <section id="sanitary" className="scroll-mt-24 space-y-3">
              <h2 className="text-xl font-extrabold text-[#5C3D2E] flex items-center gap-2 border-b border-[#F0E0D8] pb-3">
                <span className="text-base text-[#C9897A]">08.</span> Responsabilidad Sanitaria y Bioseguridad
              </h2>
              <p className="text-sm text-[#7A5B50] leading-relaxed">
                La seguridad y bienestar de nuestras clientas es primordial. <strong>{salonName}</strong> cumple con los protocolos de esterilización, 
                uso de material desechable y desinfección exigidos por las autoridades sanitarias (SEREMI de Salud).
              </p>
              <div className="p-3 bg-rose-50/70 border border-rose-200/60 rounded-xl text-xs text-rose-900 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Declaración de Alergias o Patologías:</strong> La clienta tiene el deber de informar a la profesional con anterioridad al inicio de cualquier procedimiento si padece alergias a componentes químicos (acrílicos, metacrilatos, esmaltes, acetonas), micosis ungueal, diabetes u otras afecciones dermatológicas. El salón se reserva el derecho de denegar la realización del servicio si este pudiese comprometer la salud de la clienta.
                </span>
              </div>
            </section>

            {/* Cláusula 9 */}
            <section id="data" className="scroll-mt-24 space-y-3">
              <h2 className="text-xl font-extrabold text-[#5C3D2E] flex items-center gap-2 border-b border-[#F0E0D8] pb-3">
                <span className="text-base text-[#C9897A]">09.</span> Privacidad y Protección de Datos (Ley N° 19.628)
              </h2>
              <p className="text-sm text-[#7A5B50] leading-relaxed">
                En cumplimiento riguroso de la Ley N° 19.628 Sobre Protección de la Vida Privada de la República de Chile, 
                los datos recabados son tratados de forma confidencial y en servidores de alta seguridad provistos con cifrado SSL/TLS.
              </p>
              <p className="text-xs text-[#7A5B50] leading-relaxed">
                Para conocer el detalle exhaustivo del tratamiento, finalidades y mecanismos de ejercicio de derechos de acceso, rectificación, 
                cancelación y bloqueo, consulte nuestra{' '}
                <Link to="/privacidad" className="text-[#C9897A] font-bold underline">
                  Política de Privacidad
                </Link>.
              </p>
            </section>

            {/* Cláusula 10 */}
            <section id="ip" className="scroll-mt-24 space-y-3">
              <h2 className="text-xl font-extrabold text-[#5C3D2E] flex items-center gap-2 border-b border-[#F0E0D8] pb-3">
                <span className="text-base text-[#C9897A]">10.</span> Propiedad Intelectual
              </h2>
              <p className="text-sm text-[#7A5B50] leading-relaxed">
                El software, código fuente, diseño gráfico, arquitectura de base de datos, marcas comerciales, logotipos 
                e interfaces de usuario de <strong>BunnyCure</strong> son propiedad intelectual exclusiva de sus creadores y licenciantes, 
                protegidos por la Ley N° 17.336 de Propiedad Intelectual de Chile y convenios internacionales.
              </p>
            </section>

            {/* Cláusula 11 */}
            <section id="jurisdiction" className="scroll-mt-24 space-y-3">
              <h2 className="text-xl font-extrabold text-[#5C3D2E] flex items-center gap-2 border-b border-[#F0E0D8] pb-3">
                <span className="text-base text-[#C9897A]">11.</span> Ley Aplicable y Jurisdicción
              </h2>
              <p className="text-sm text-[#7A5B50] leading-relaxed">
                Estos Términos y Condiciones se rigen e interpretan en su totalidad por las leyes de la <strong>República de Chile</strong>. 
                Cualquier controversia que surja con motivo de la validez, aplicación o interpretación del presente contrato 
                será sometida a la competencia de los Tribunales Ordinarios de Justicia de la comuna de Santiago de Chile.
              </p>
            </section>
          </article>
        </div>
      </main>

      {/* ─── Footer Legal ─── */}
      <footer className="mt-16 bg-[#1A0E0A] text-[#A6887D] py-8 px-4 border-t border-white/10 text-xs text-center">
        <div className="max-w-4xl mx-auto space-y-2">
          <p className="text-white font-bold">{salonName} • Operado en plataforma BunnyCure</p>
          <p>© {new Date().getFullYear()} Santiago de Chile • Todos los derechos reservados.</p>
          <div className="flex justify-center gap-4 pt-2 text-[#C9897A]">
            <Link to="/terminos" className="underline hover:text-white">Términos del Servicio</Link>
            <span>•</span>
            <Link to="/privacidad" className="underline hover:text-white">Política de Privacidad</Link>
            <span>•</span>
            <Link to="/reservar" className="underline hover:text-white">Portal de Reservas</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
