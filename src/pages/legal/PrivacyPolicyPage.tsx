import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ShieldCheck, 
  Lock, 
  ArrowLeft, 
  Eye, 
  Database, 
  Send, 
  Server,
  Printer,
  Calendar,
  CheckCircle2
} from 'lucide-react';
import { useTenant } from '../../context/TenantContext';

export default function PrivacyPolicyPage() {
  const { tenant } = useTenant();
  const [activeSection, setActiveSection] = useState<string>('intro');

  const salonName = tenant?.name || 'BunnyCure';

  const sections = [
    { id: 'intro', title: '1. Compromiso y Marco Legal (Ley 19.628)' },
    { id: 'data-collected', title: '2. Datos Personales que Recopilamos' },
    { id: 'purpose', title: '3. Finalidad del Tratamiento de Datos' },
    { id: 'storage', title: '4. Seguridad y Almacenamiento Cifrado' },
    { id: 'sharing', title: '5. No Cesión ni Venta a Terceros' },
    { id: 'cookies', title: '6. Cookies y Almacenamiento Local (PWA)' },
    { id: 'whatsapp', title: '7. Notificaciones y Mensajería WhatsApp' },
    { id: 'arco', title: '8. Derechos ARCO del Titular de los Datos' },
    { id: 'retention', title: '9. Plazo de Conservación de Datos' },
    { id: 'contact', title: '10. Contacto y Delegado de Privacidad' },
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
              <span className="text-xl">🔒</span>
              <span className="font-extrabold text-base tracking-tight text-[#5C3D2E]">
                {salonName} <span className="font-normal text-xs text-[#9E7B6E]">Privacidad</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <Link
              to="/terminos"
              className="text-xs font-bold text-[#9E7B6E] hover:text-[#C9897A] transition-colors"
            >
              Términos del Servicio →
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

      {/* ─── Hero Banner Privacidad ─── */}
      <section className="bg-gradient-to-b from-[#FDF0EC] to-[#FDFBF9] py-12 px-4 border-b border-[#F0E0D8]">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white text-[#7C3A2D] border border-[#F0E0D8] text-xs font-bold uppercase tracking-wider mb-4 shadow-xs">
            <Lock className="w-4 h-4 text-[#C9897A]" />
            <span>Privacidad de Datos • Ley N° 19.628 de Chile</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#5C3D2E] tracking-tight mb-3">
            Política de Privacidad y Tratamiento de Datos
          </h1>
          <p className="text-sm text-[#9E7B6E] max-w-2xl mx-auto leading-relaxed">
            Tu confianza y la confidencialidad de tus datos son nuestra prioridad absoluta. 
            Te explicamos con total transparencia qué datos recopilamos, cómo los protegemos y cómo puedes ejercer tus derechos.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-xs text-[#9E7B6E]">
            <span className="inline-flex items-center gap-1 bg-white/80 px-2.5 py-1 rounded-md border border-[#F0E0D8]">
              <Calendar className="w-3 h-3 text-[#C9897A]" /> Última Actualización: Octubre 2026
            </span>
            <span className="inline-flex items-center gap-1 bg-white/80 px-2.5 py-1 rounded-md border border-[#F0E0D8]">
              <Server className="w-3 h-3 text-[#C9897A]" /> Cifrado SSL/TLS 256-bit
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
                <ShieldCheck className="w-4 h-4 text-[#C9897A]" />
                <span>Índice de Privacidad</span>
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
                  Para solicitar rectificación o eliminación inmediata de tus datos personales:{' '}
                  <a href="mailto:privacidad@bunnycure.cl" className="text-[#C9897A] font-bold underline">
                    privacidad@bunnycure.cl
                  </a>
                </div>
              </div>
            </div>
          </aside>

          {/* Contenido Editorial de Privacidad */}
          <article className="lg:col-span-8 bg-white rounded-2xl border border-[#F0E0D8] p-6 sm:p-10 shadow-bunny space-y-10">
            {/* Cláusula 1 */}
            <section id="intro" className="scroll-mt-24 space-y-3">
              <h2 className="text-xl font-extrabold text-[#5C3D2E] flex items-center gap-2 border-b border-[#F0E0D8] pb-3">
                <span className="text-base text-[#C9897A]">01.</span> Compromiso y Marco Legal Chileno
              </h2>
              <p className="text-sm text-[#7A5B50] leading-relaxed">
                En <strong>{salonName}</strong> y a través del ecosistema tecnológico provisto por <strong>BunnyCure</strong>, 
                asumimos un compromiso inquebrantable con la protección de la privacidad de nuestras clientas y usuarios.
              </p>
              <p className="text-sm text-[#7A5B50] leading-relaxed">
                Este tratamiento de datos personales se encuentra estrictamente subordinado a las disposiciones de la 
                <strong> Ley N° 19.628 Sobre Protección de la Vida Privada</strong> de la República de Chile, así como a las mejores 
                prácticas internacionales de ciberseguridad y confidencialidad.
              </p>
            </section>

            {/* Cláusula 2 */}
            <section id="data-collected" className="scroll-mt-24 space-y-3">
              <h2 className="text-xl font-extrabold text-[#5C3D2E] flex items-center gap-2 border-b border-[#F0E0D8] pb-3">
                <span className="text-base text-[#C9897A]">02.</span> Datos Personales que Recopilamos
              </h2>
              <p className="text-sm text-[#7A5B50] leading-relaxed">
                Recopilamos únicamente la información necesaria y pertinente para garantizar una adecuada gestión de reservas y atención personalizada:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="border border-[#F0E0D8] rounded-xl p-3 bg-[#FAF8F5]">
                  <div className="font-bold text-xs text-[#5C3D2E] flex items-center gap-1.5 mb-1">
                    <Database className="w-4 h-4 text-[#C9897A]" /> Datos de Contacto y Agenda
                  </div>
                  <ul className="text-[11px] text-[#7A5B50] space-y-1 list-disc pl-4">
                    <li>Nombre y Apellido.</li>
                    <li>Número de teléfono móvil (para envío de confirmaciones por WhatsApp).</li>
                    <li>Dirección de correo electrónico.</li>
                    <li>RUT (en caso de requerir emisión de boleta o factura de servicios).</li>
                  </ul>
                </div>
                <div className="border border-[#F0E0D8] rounded-xl p-3 bg-[#FAF8F5]">
                  <div className="font-bold text-xs text-[#5C3D2E] flex items-center gap-1.5 mb-1">
                    <Eye className="w-4 h-4 text-[#C9897A]" /> Historial y Preferencias
                  </div>
                  <ul className="text-[11px] text-[#7A5B50] space-y-1 list-disc pl-4">
                    <li>Historial de citas anteriores y servicios solicitados.</li>
                    <li>Registro de sellos acumulados en la tarjeta Bunny Pass.</li>
                    <li>Notas técnicas voluntarias (ej: largo de uña, tonos favoritos, alergias conocidas a esmaltes).</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Cláusula 3 */}
            <section id="purpose" className="scroll-mt-24 space-y-3">
              <h2 className="text-xl font-extrabold text-[#5C3D2E] flex items-center gap-2 border-b border-[#F0E0D8] pb-3">
                <span className="text-base text-[#C9897A]">03.</span> Finalidad del Tratamiento de Datos
              </h2>
              <p className="text-sm text-[#7A5B50] leading-relaxed">
                Los datos personales recabados son tratados con los siguientes fines específicos:
              </p>
              <ul className="space-y-2 text-xs text-[#7A5B50] list-disc pl-5">
                <li>Gestionar, confirmar y registrar las reservas de hora en la agenda del salón.</li>
                <li>Enviar recordatorios automáticos de cita mediante WhatsApp oficial y correo electrónico para evitar olvidos o demoras.</li>
                <li>Permitir a la clienta visualizar su tarjeta Bunny Pass, su saldo de sellos y canjear premios vigentes.</li>
                <li>Emitir y respaldar el documento tributario electrónico correspondiente ante el SII.</li>
                <li>Proveer soporte y atención post-servicio cuando la clienta lo solicite.</li>
              </ul>
            </section>

            {/* Cláusula 4 */}
            <section id="storage" className="scroll-mt-24 space-y-3">
              <h2 className="text-xl font-extrabold text-[#5C3D2E] flex items-center gap-2 border-b border-[#F0E0D8] pb-3">
                <span className="text-base text-[#C9897A]">04.</span> Seguridad y Almacenamiento Cifrado
              </h2>
              <div className="bg-[#FDF0EC]/60 border border-[#F0E0D8] rounded-xl p-4 text-xs text-[#5C3D2E] leading-relaxed flex gap-3 items-start">
                <Lock className="w-5 h-5 text-[#C9897A] shrink-0 mt-0.5" />
                <div>
                  <strong>Estándares Técnicos de Seguridad:</strong> Todas las comunicaciones entre tu navegador/celular y los servidores de BunnyCure 
                  viajan protegidas mediante protocolo cifrado <strong>HTTPS con certificados TLS 1.3</strong>. 
                  Las contraseñas de las cuentas administrativas son almacenadas mediante funciones de dispersión criptográfica irreversibles (BCrypt), 
                  y la base de datos cuenta con controles de acceso restringido y aislamiento estricto por cada salón (arquitectura multitenant aislada).
                </div>
              </div>
            </section>

            {/* Cláusula 5 */}
            <section id="sharing" className="scroll-mt-24 space-y-3">
              <h2 className="text-xl font-extrabold text-[#5C3D2E] flex items-center gap-2 border-b border-[#F0E0D8] pb-3">
                <span className="text-base text-[#C9897A]">05.</span> No Cesión ni Venta de Datos a Terceros
              </h2>
              <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/60 rounded-xl text-xs text-emerald-900 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Garantía Anti-Spam:</strong> Bajo ninguna circunstancia vendemos, arrendamos, comercializamos ni compartimos 
                  las bases de datos de clientas con empresas de publicidad, intermediarios financieros ni terceros ajenos a la prestación del servicio. 
                  Tus datos pertenecen exclusivamente a tu relación con <strong>{salonName}</strong>.
                </span>
              </div>
            </section>

            {/* Cláusula 6 */}
            <section id="cookies" className="scroll-mt-24 space-y-3">
              <h2 className="text-xl font-extrabold text-[#5C3D2E] flex items-center gap-2 border-b border-[#F0E0D8] pb-3">
                <span className="text-base text-[#C9897A]">06.</span> Cookies y Almacenamiento Local (PWA)
              </h2>
              <p className="text-sm text-[#7A5B50] leading-relaxed">
                Nuestra plataforma opera como una Aplicación Web Progresiva (PWA). Empleamos tecnologías de almacenamiento local del navegador 
                (LocalStorage y SessionStorage) exclusivamente para fines técnicos:
              </p>
              <ul className="space-y-1.5 text-xs text-[#7A5B50] list-disc pl-5">
                <li>Mantener activa tu sesión como usuaria o especialista autorizada.</li>
                <li>Recordar tu tarjeta Bunny Pass en tu celular para que puedas acceder a ella sin tener que volver a escanear el código QR.</li>
                <li>Permitir la navegación fluida incluso en condiciones de intermitencia o baja señal móvil.</li>
              </ul>
            </section>

            {/* Cláusula 7 */}
            <section id="whatsapp" className="scroll-mt-24 space-y-3">
              <h2 className="text-xl font-extrabold text-[#5C3D2E] flex items-center gap-2 border-b border-[#F0E0D8] pb-3">
                <span className="text-base text-[#C9897A]">07.</span> Notificaciones y Mensajería WhatsApp
              </h2>
              <p className="text-sm text-[#7A5B50] leading-relaxed">
                Al solicitar una reserva, consientes el envío de mensajes de texto informativos a través de la API oficial de WhatsApp. 
                Dichos mensajes están limitados a:
              </p>
              <div className="flex gap-2 items-center text-xs text-[#7A5B50] bg-[#FAF8F5] p-3 rounded-xl border border-[#F0E0D8]">
                <Send className="w-4 h-4 text-[#C9897A] shrink-0" />
                <span>Confirmación de reserva • Enlace de reprogramación o cancelación • Recordatorio 24h y 2h antes de la cita • Notificación de sellos sumados en tu Bunny Pass.</span>
              </div>
              <p className="text-xs text-[#9E7B6E]">
                Puedes solicitar en cualquier momento la desactivación de avisos automáticos respondiendo a la conversación de WhatsApp del salón.
              </p>
            </section>

            {/* Cláusula 8 */}
            <section id="arco" className="scroll-mt-24 space-y-3">
              <h2 className="text-xl font-extrabold text-[#5C3D2E] flex items-center gap-2 border-b border-[#F0E0D8] pb-3">
                <span className="text-base text-[#C9897A]">08.</span> Derechos ARCO del Titular de los Datos
              </h2>
              <p className="text-sm text-[#7A5B50] leading-relaxed">
                De conformidad con la Ley N° 19.628 de Chile, como titular de los datos personales tienes derecho permanente a:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="p-3 rounded-xl border border-[#F0E0D8] bg-[#FAF8F5]">
                  <div className="font-bold text-xs text-[#5C3D2E]">Acceso e Información</div>
                  <div className="text-[11px] text-[#7A5B50] mt-1">Conocer qué datos personales tuyos se encuentran almacenados y el propósito de su tratamiento.</div>
                </div>
                <div className="p-3 rounded-xl border border-[#F0E0D8] bg-[#FAF8F5]">
                  <div className="font-bold text-xs text-[#5C3D2E]">Rectificación o Actualización</div>
                  <div className="text-[11px] text-[#7A5B50] mt-1">Modificar o corregir datos incompletos, inexactos o desactualizados.</div>
                </div>
                <div className="p-3 rounded-xl border border-[#F0E0D8] bg-[#FAF8F5]">
                  <div className="font-bold text-xs text-[#5C3D2E]">Cancelación o Eliminación</div>
                  <div className="text-[11px] text-[#7A5B50] mt-1">Solicitar la supresión de tus datos de contacto cuando ya no sean requeridos para una cita pendiente.</div>
                </div>
                <div className="p-3 rounded-xl border border-[#F0E0D8] bg-[#FAF8F5]">
                  <div className="font-bold text-xs text-[#5C3D2E]">Bloqueo y Oposición</div>
                  <div className="text-[11px] text-[#7A5B50] mt-1">Oponerte a la recepción de comunicaciones comerciales o promocionales no deseadas.</div>
                </div>
              </div>
            </section>

            {/* Cláusula 9 */}
            <section id="retention" className="scroll-mt-24 space-y-3">
              <h2 className="text-xl font-extrabold text-[#5C3D2E] flex items-center gap-2 border-b border-[#F0E0D8] pb-3">
                <span className="text-base text-[#C9897A]">09.</span> Plazo de Conservación de Datos
              </h2>
              <p className="text-sm text-[#7A5B50] leading-relaxed">
                Conservaremos tus datos mientras mantengas una relación activa como clienta del salón o mientras sea requerido 
                por la normativa tributaria y comercial chilena (por ejemplo, el deber legal de conservar antecedentes contables y facturas por 6 años según el Código Tributario). 
                Posterior a ello, la información será anonimizada de forma segura.
              </p>
            </section>

            {/* Cláusula 10 */}
            <section id="contact" className="scroll-mt-24 space-y-3">
              <h2 className="text-xl font-extrabold text-[#5C3D2E] flex items-center gap-2 border-b border-[#F0E0D8] pb-3">
                <span className="text-base text-[#C9897A]">10.</span> Contacto y Ejercicio de Derechos
              </h2>
              <p className="text-sm text-[#7A5B50] leading-relaxed">
                Para ejercer cualquiera de tus derechos ARCO o plantear cualquier inquietud relativa a la privacidad de tu información, 
                puedes comunicarte directamente con nuestro equipo de cumplimiento:
              </p>
              <div className="p-4 rounded-xl border border-[#F0E0D8] bg-[#FAF8F5] text-xs space-y-1.5">
                <div><strong>Delegado de Privacidad:</strong> Equipo de Seguridad de la Información BunnyCure</div>
                <div><strong>Correo Electrónico:</strong> <a href="mailto:privacidad@bunnycure.cl" className="text-[#C9897A] font-bold underline">privacidad@bunnycure.cl</a></div>
                <div><strong>Dirección:</strong> Santiago de Chile, Región Metropolitana</div>
                <div><strong>Tiempo de Respuesta Estimado:</strong> Máximo 48 horas hábiles</div>
              </div>
            </section>
          </article>
        </div>
      </main>

      {/* ─── Footer Legal ─── */}
      <footer className="mt-16 bg-[#1A0E0A] text-[#A6887D] py-8 px-4 border-t border-white/10 text-xs text-center">
        <div className="max-w-4xl mx-auto space-y-2">
          <p className="text-white font-bold">{salonName} • Privacidad Garantizada por BunnyCure</p>
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
