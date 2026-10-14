import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  FiCalendar,
  FiAward,
  FiFileText,
  FiTrendingUp,
  FiCheck,
  FiArrowRight,
  FiChevronDown,
  FiChevronUp,
  FiGlobe,
  FiZap,
} from 'react-icons/fi';
import { FaWhatsapp, FaApple, FaGoogle } from 'react-icons/fa';

export default function DemoLandingPage() {
  // Estado para el calculador interactivo de ROI
  const [specialistsCount, setSpecialistsCount] = useState<number>(3);
  const [dailyAppointments, setDailyAppointments] = useState<number>(12);
  const [averageTicket, setAverageTicket] = useState<number>(22000);

  // Estado para FAQ Accordion
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Cálculos automáticos de ahorro
  const calculatedSavings = useMemo(() => {
    // Estimación: 15% de no-shows habituales reducidos a un 2% gracias a confirmación por WhatsApp
    const monthlyAppointments = dailyAppointments * 26; // 26 días laborales
    const savedNoShows = Math.round(monthlyAppointments * 0.13);
    const recoveredRevenueMonthly = savedNoShows * averageTicket;
    // Horas de personal ahorradas en responder y confirmar manualmente citas (aprox 3.5 min por cita)
    const savedHoursMonthly = Math.round((monthlyAppointments * 3.5) / 60);

    return {
      monthlyAppointments,
      savedNoShows,
      recoveredRevenueMonthly,
      savedHoursMonthly,
      annualRecovered: recoveredRevenueMonthly * 12,
    };
  }, [dailyAppointments, averageTicket]);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const whatsappDemoLink = `https://wa.me/56927978078?text=${encodeURIComponent(
    '¡Hola! Vi la demostración de la plataforma BunnyCure y me gustaría solicitar una prueba para mi salón.'
  )}`;

  return (
    <div className="min-h-screen bg-[#FDFBF9] text-[#2D1E18] font-sans antialiased selection:bg-[#EAD8D0] selection:text-[#5C3D2E]">
      {/* ─── 1. FLOATING GLASS ISLAND NAVBAR ─── */}
      <header className="fixed top-4 inset-x-0 z-50 px-4 pointer-events-none">
        <nav className="max-w-6xl mx-auto backdrop-blur-xl bg-white/85 border border-[#EAD8D0]/80 shadow-[0_8px_30px_rgb(0,0,0,0.06)] rounded-full px-4 sm:px-6 py-3 flex items-center justify-between pointer-events-auto transition-all">
          <div className="flex items-center gap-3">
            <span className="text-2xl select-none">💅</span>
            <div className="flex flex-col">
              <span className="font-extrabold text-lg tracking-tight text-[#5C3D2E] leading-none">
                BunnyCure <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#F5ECE7] text-[#C9897A] border border-[#EAD8D0]">SaaS</span>
              </span>
              <span className="text-[10px] font-medium text-[#8C6052] tracking-wider uppercase">Plataforma Multi-Salón</span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-7 text-xs font-semibold tracking-wide text-[#7C5A4E]">
            <a href="#funciones" className="hover:text-[#C9897A] transition-colors">Funciones</a>
            <a href="#beneficios" className="hover:text-[#C9897A] transition-colors">Beneficios</a>
            <a href="#wallet" className="hover:text-[#C9897A] transition-colors">Tarjeta Wallet</a>
            <a href="#roi" className="hover:text-[#C9897A] transition-colors">Calculadora ROI</a>
            <a href="#precios" className="hover:text-[#C9897A] transition-colors">Planes & Precios</a>
            <a href="#faq" className="hover:text-[#C9897A] transition-colors">Preguntas</a>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/login"
              className="text-xs font-semibold px-3.5 py-2 rounded-full text-[#7C5A4E] hover:text-[#5C3D2E] hover:bg-[#F5ECE7] transition-all"
            >
              Iniciar Sesión
            </Link>
            <a
              href={whatsappDemoLink}
              target="_blank"
              rel="noreferrer"
              className="group inline-flex items-center gap-2 text-xs font-bold px-4 sm:px-5 py-2.5 rounded-full bg-[#5C3D2E] text-white shadow-md shadow-[#5C3D2E]/20 hover:bg-[#482E22] active:scale-[0.98] transition-all"
            >
              <span>Solicitar Demo</span>
              <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] group-hover:translate-x-0.5 transition-transform">
                ↗
              </span>
            </a>
          </div>
        </nav>
      </header>

      {/* ─── 2. HERO SECTION ─── */}
      <section className="relative pt-32 sm:pt-40 pb-20 px-4 overflow-hidden">
        {/* Ambient atmospheric glow */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-tr from-[#F8DED5]/50 via-[#EBD0C6]/30 to-transparent blur-3xl rounded-full -z-10 pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center">
          {/* Eyebrow Tag */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F5ECE7] border border-[#EAD8D0] text-[#8C4E3F] text-xs font-bold tracking-widest uppercase mb-6 shadow-xs animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-[#4B856E] animate-pulse" />
            Software de Gestión Profesional para Salones & Spas
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-[#3B2219] leading-[1.08] mb-6">
            El sistema operativo definitivo para <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-[#8C4E3F] via-[#C9897A] to-[#B56754] bg-clip-text text-transparent">
              multiplicar la rentabilidad
            </span> de tu salón
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-xl text-[#7A5B50] max-w-2xl mx-auto leading-relaxed mb-10 font-normal">
            Elimina el desorden de agendas en papel, reduce el 90% de las inasistencias con WhatsApp automático y fideliza a tus clientas con tarjetas digitales en Apple y Google Wallet.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
            <a
              href={whatsappDemoLink}
              target="_blank"
              rel="noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 rounded-full bg-[#8C4E3F] text-white text-sm sm:text-base font-bold shadow-lg shadow-[#8C4E3F]/30 hover:bg-[#783F32] hover:shadow-xl hover:shadow-[#8C4E3F]/40 active:scale-[0.98] transition-all"
            >
              <FaWhatsapp className="text-xl text-[#25D366]" />
              <span>Agendar Demostración Personalizada</span>
              <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs">
                ↗
              </span>
            </a>
            <a
              href="#funciones"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 rounded-full bg-white border border-[#EAD8D0] text-[#5C3D2E] text-sm sm:text-base font-bold hover:bg-[#F5ECE7] transition-all shadow-xs"
            >
              <span>Explorar Funciones</span>
              <FiArrowRight />
            </a>
          </div>

          {/* Social Proof Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto pt-6 border-t border-[#EAD8D0]/60">
            <div className="p-3">
              <p className="text-2xl sm:text-3xl font-extrabold text-[#5C3D2E]">98%</p>
              <p className="text-xs text-[#8C6052] font-medium mt-0.5">Asistencia confirmada vía WhatsApp</p>
            </div>
            <div className="p-3">
              <p className="text-2xl sm:text-3xl font-extrabold text-[#5C3D2E]">&lt; 48 hrs</p>
              <p className="text-xs text-[#8C6052] font-medium mt-0.5">Puesta en marcha y migración</p>
            </div>
            <div className="p-3">
              <p className="text-2xl sm:text-3xl font-extrabold text-[#5C3D2E]">100%</p>
              <p className="text-xs text-[#8C6052] font-medium mt-0.5">En la nube, sin instalaciones</p>
            </div>
            <div className="p-3">
              <p className="text-2xl sm:text-3xl font-extrabold text-[#5C3D2E]">SII & DTE</p>
              <p className="text-xs text-[#8C6052] font-medium mt-0.5">Emisión automática en Chile</p>
            </div>
          </div>
        </div>

        {/* ─── HERO SHOWCASE MOCKUP (DOUBLE-BEZEL HARDWARE SHELL) ─── */}
        <div className="max-w-6xl mx-auto mt-14 px-2 sm:px-4">
          <div className="relative rounded-[2.5rem] bg-gradient-to-b from-[#EBD8D0] to-[#DFCCC3] p-2.5 sm:p-4 shadow-[0_25px_70px_rgba(92,61,46,0.18)] border border-[#F3E5DE]">
            <div className="relative rounded-[1.8rem] overflow-hidden bg-[#1E1614] border border-black/10">
              <img
                src="/images/demo/hero-dashboard.jpg"
                alt="Panel Administrativo de Salón de Belleza"
                className="w-full h-auto object-cover select-none"
                loading="eager"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-6 sm:p-10 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 text-white">
                <div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#8C4E3F] text-white uppercase tracking-wider mb-2">
                    Vista en Tiempo Real
                  </span>
                  <h3 className="text-xl sm:text-2xl font-bold">Control total de citas, recaudación diaria y especialistas</h3>
                </div>
                <Link
                  to="/login"
                  className="px-5 py-2.5 rounded-full bg-white text-[#5C3D2E] text-xs font-bold hover:bg-[#F5ECE7] transition-all shadow-md shrink-0"
                >
                  Probar Interfaz ↗
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 3. INTERACTIVE FEATURE MATRIX (BENTO GRID) ─── */}
      <section id="funciones" className="py-24 px-4 bg-[#F8F4F0] border-y border-[#EAD8D0]/80">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-[#8C4E3F] bg-[#F5ECE7] px-3.5 py-1.5 rounded-full border border-[#EAD8D0]">
              Módulos Integrales
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-[#3B2219] tracking-tight mt-4 mb-4">
              Todo lo que tu centro de belleza necesita para operar como una franquicia de élite
            </h2>
            <p className="text-base sm:text-lg text-[#7A5B50]">
              Diseñado exclusivamente para la dinámica real de los salones: manicuristas, tiempos de secado, servicios combinados y clientas que exigen inmediatez.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Bento Card 1: Agenda & Calendario Inteligente (8 cols) */}
            <div className="md:col-span-8 rounded-[2rem] bg-white border border-[#EAD8D0] p-6 sm:p-8 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-[#F5ECE7] text-[#8C4E3F] flex items-center justify-center text-2xl mb-6">
                  <FiCalendar />
                </div>
                <h3 className="text-2xl font-bold text-[#3B2219] mb-3">
                  Agenda Visual con Detección de Bloqueos y Especialistas
                </h3>
                <p className="text-sm sm:text-base text-[#7A5B50] leading-relaxed mb-6">
                  Programa citas sin solapamientos. El sistema calcula automáticamente la duración de cada servicio (ej: Manicure Rusa + Kapping + Nail Art) y reserva el puesto exacto de la profesional seleccionada.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-semibold text-[#5C3D2E]">
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#FDFBF9] border border-[#EAD8D0]/60">
                    <FiCheck className="text-[#4B856E] text-base shrink-0" />
                    <span>Multi-servicio inteligente simultáneo</span>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#FDFBF9] border border-[#EAD8D0]/60">
                    <FiCheck className="text-[#4B856E] text-base shrink-0" />
                    <span>Control de horarios y días libres</span>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#FDFBF9] border border-[#EAD8D0]/60">
                    <FiCheck className="text-[#4B856E] text-base shrink-0" />
                    <span>Vistas diarias, semanales y por manicurista</span>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#FDFBF9] border border-[#EAD8D0]/60">
                    <FiCheck className="text-[#4B856E] text-base shrink-0" />
                    <span>Historial clínico y ficha técnica de uñas</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bento Card 2: Tarjeta Digital de Fidelización (4 cols) */}
            <div id="wallet" className="md:col-span-4 rounded-[2rem] bg-gradient-to-br from-[#5C3D2E] to-[#3B2219] text-white p-6 sm:p-8 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 text-rose-200 flex items-center justify-center text-2xl">
                    <FiAward />
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-white/15">
                    <FaApple className="text-sm" />
                    <FaGoogle className="text-sm" />
                    <span>Wallet</span>
                  </div>
                </div>
                <h3 className="text-2xl font-bold mb-3">Tarjeta Bunny Pass Digital</h3>
                <p className="text-xs sm:text-sm text-rose-100/80 leading-relaxed mb-6">
                  Di adiós a las tarjetas de cartón que se pierden en la cartera. Tus clientas guardan su pase en Apple Wallet o Android con 10 sellos acumulables y premio en la visita #11.
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-xs text-center">
                <span className="text-xs font-bold text-[#EAD8D0] block">Código QR Único por Clienta</span>
                <span className="text-[11px] text-rose-200/70 mt-0.5 block">Escaneo rápido al terminar el servicio</span>
              </div>
            </div>

            {/* Bento Card 3: WhatsApp Bot & Recordatorios Automáticos (4 cols) */}
            <div className="md:col-span-4 rounded-[2rem] bg-white border border-[#EAD8D0] p-6 sm:p-8 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-[#E8F8EE] text-[#25D366] flex items-center justify-center text-2xl mb-6">
                  <FaWhatsapp />
                </div>
                <h3 className="text-xl font-bold text-[#3B2219] mb-3">
                  WhatsApp Oficial Meta Business
                </h3>
                <p className="text-xs sm:text-sm text-[#7A5B50] leading-relaxed mb-4">
                  Envía recordatorios automáticos 24 hrs y 2 hrs antes de la cita con botones interactivos de <em>Confirmar</em> o <em>Reagendar</em>.
                </p>
                <div className="space-y-2 text-xs text-[#5C3D2E]">
                  <div className="p-2.5 rounded-xl bg-[#FDFBF9] border border-[#EAD8D0]/60 flex items-center gap-2">
                    <span className="text-[#25D366] font-bold">✓</span>
                    <span>Confirmación instantánea en la agenda</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#FDFBF9] border border-[#EAD8D0]/60 flex items-center gap-2">
                    <span className="text-[#25D366] font-bold">✓</span>
                    <span>Aviso automático de cumpleaños del mes</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bento Card 4: Facturación Electrónica SII & GiftCards (8 cols) */}
            <div className="md:col-span-8 rounded-[2rem] bg-white border border-[#EAD8D0] p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6 hover:shadow-md transition-shadow overflow-hidden">
              <div className="sm:w-1/2">
                <div className="w-12 h-12 rounded-2xl bg-[#F5ECE7] text-[#8C4E3F] flex items-center justify-center text-2xl mb-6">
                  <FiFileText />
                </div>
                <h3 className="text-2xl font-bold text-[#3B2219] mb-3">
                  Boletas de Honorarios SII & GiftCards Digitales
                </h3>
                <p className="text-sm text-[#7A5B50] leading-relaxed mb-4">
                  Emite boletas automáticas vía API Gateway Chile con cálculo exacto de retención. Vende GiftCards de regalo con código PIN inviolable y canje por QR.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#F5ECE7] text-[#8C4E3F]">
                    🇨🇱 Integración SII Chile
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#F5ECE7] text-[#8C4E3F]">
                    🎁 GiftCards con PIN Seguro
                  </span>
                </div>
              </div>
              <div className="sm:w-1/2 rounded-2xl overflow-hidden border border-[#EAD8D0] shadow-sm">
                <img
                  src="/images/demo/pos-invoicing.jpg"
                  alt="Terminal de Boletas SII y GiftCards"
                  className="w-full h-auto object-cover hover:scale-105 transition-transform duration-500"
                />
              </div>
            </div>

            {/* Bento Card 5: Rendimiento & Comisiones por Manicurista (6 cols) */}
            <div className="md:col-span-6 rounded-[2rem] bg-white border border-[#EAD8D0] p-6 sm:p-8 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-[#F5ECE7] text-[#8C4E3F] flex items-center justify-center text-2xl mb-6">
                  <FiTrendingUp />
                </div>
                <h3 className="text-xl font-bold text-[#3B2219] mb-3">
                  Liquidación de Comisiones & Arqueo Diario
                </h3>
                <p className="text-sm text-[#7A5B50] leading-relaxed mb-4">
                  Evita discusiones de fin de mes. El sistema calcula en tiempo real los servicios realizados por cada manicurista, su porcentaje de comisión y el flujo de caja diario en efectivo, débito o transferencias.
                </p>
              </div>
            </div>

            {/* Bento Card 6: Multi-Salón Whitelabel (6 cols) */}
            <div className="md:col-span-6 rounded-[2rem] bg-gradient-to-br from-[#F5ECE7] to-[#EAD8D0] border border-[#DFC4B8] p-6 sm:p-8 shadow-sm flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-white text-[#8C4E3F] flex items-center justify-center text-2xl mb-6 shadow-xs">
                  <FiGlobe />
                </div>
                <h3 className="text-xl font-bold text-[#3B2219] mb-3">
                  Arquitectura Multi-Salón con Marca Propia
                </h3>
                <p className="text-sm text-[#7A5B50] leading-relaxed mb-4">
                  ¿Tienes 2 o más sucursales? Gestiona cada salón de forma 100% aislada con su propio logo, subdominio, colores de marca y equipo, manteniendo una consola centralizada de Super-Admin.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 4. INTERACTIVE SAVINGS & ROI CALCULATOR ─── */}
      <section id="roi" className="py-24 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-widest text-[#8C4E3F] bg-[#F5ECE7] px-3.5 py-1.5 rounded-full border border-[#EAD8D0]">
              Calculadora de Rentabilidad
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#3B2219] tracking-tight mt-4 mb-3">
              ¿Cuánto dinero pierde tu salón por inasistencias y gestión manual?
            </h2>
            <p className="text-sm sm:text-base text-[#7A5B50]">
              Mueve los controles según el tamaño de tu equipo y descubre el retorno de inversión mensual estimado.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-[#FDFBF9] border border-[#EAD8D0] rounded-[2.5rem] p-6 sm:p-10 shadow-sm">
            {/* Controles de Entrada (Sliders) */}
            <div className="lg:col-span-7 space-y-6">
              <div>
                <div className="flex justify-between text-sm font-bold text-[#5C3D2E] mb-2">
                  <span>Especialistas / Puestos de Trabajo:</span>
                  <span className="text-lg text-[#8C4E3F] font-extrabold">{specialistsCount} profesionales</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="12"
                  value={specialistsCount}
                  onChange={(e) => setSpecialistsCount(Number(e.target.value))}
                  className="w-full accent-[#8C4E3F] cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-sm font-bold text-[#5C3D2E] mb-2">
                  <span>Citas Totales Promedio por Día:</span>
                  <span className="text-lg text-[#8C4E3F] font-extrabold">{dailyAppointments} citas/día</span>
                </div>
                <input
                  type="range"
                  min="4"
                  max="40"
                  value={dailyAppointments}
                  onChange={(e) => setDailyAppointments(Number(e.target.value))}
                  className="w-full accent-[#8C4E3F] cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-sm font-bold text-[#5C3D2E] mb-2">
                  <span>Ticket Promedio por Servicio (CLP):</span>
                  <span className="text-lg text-[#8C4E3F] font-extrabold">
                    ${averageTicket.toLocaleString('es-CL')} CLP
                  </span>
                </div>
                <input
                  type="range"
                  min="10000"
                  max="60000"
                  step="2000"
                  value={averageTicket}
                  onChange={(e) => setAverageTicket(Number(e.target.value))}
                  className="w-full accent-[#8C4E3F] cursor-pointer"
                />
              </div>

              <div className="p-4 rounded-2xl bg-[#F5ECE7]/60 border border-[#EAD8D0] text-xs text-[#7A5B50] flex items-center gap-3">
                <FiZap className="text-xl text-[#8C4E3F] shrink-0" />
                <span>
                  Los salones que implementan recordatorios automatizados reducen las inasistencias no avisadas del 15% al 2%, recuperando en promedio 1 a 2 citas diarias por especialista.
                </span>
              </div>
            </div>

            {/* Tarjeta de Resultados */}
            <div className="lg:col-span-5 rounded-[2rem] bg-[#5C3D2E] text-white p-6 sm:p-8 flex flex-col justify-between shadow-md">
              <div>
                <span className="text-xs uppercase tracking-wider text-rose-200 font-bold block mb-1">
                  Retorno Estimado Mensual
                </span>
                <p className="text-3xl sm:text-4xl font-extrabold text-[#F8DED5] tracking-tight">
                  +${calculatedSavings.recoveredRevenueMonthly.toLocaleString('es-CL')} <span className="text-xs text-rose-200 font-normal">CLP/mes</span>
                </p>
                <p className="text-xs text-rose-200/70 mt-1">Ingresos recuperados que antes se perdían en horas vacías</p>

                <div className="mt-6 pt-6 border-t border-white/15 space-y-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-rose-100">Citas recuperadas al mes:</span>
                    <strong className="text-white font-bold">{calculatedSavings.savedNoShows} citas</strong>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-rose-100">Tiempo de WhatsApp ahorrado:</span>
                    <strong className="text-white font-bold">{calculatedSavings.savedHoursMonthly} horas/mes</strong>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-rose-100">Impacto Proyectado al Año:</span>
                    <strong className="text-[#F8DED5] font-extrabold text-sm">
                      +${calculatedSavings.annualRecovered.toLocaleString('es-CL')} CLP
                    </strong>
                  </div>
                </div>
              </div>

              <a
                href={whatsappDemoLink}
                target="_blank"
                rel="noreferrer"
                className="mt-8 block text-center py-3.5 px-6 rounded-full bg-[#EBD0C6] text-[#5C3D2E] font-bold text-xs hover:bg-white active:scale-95 transition-all shadow-md"
              >
                Empezar a Recuperar Citas Hoy ↗
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 5. PLANES & DETALLE DE IMPLEMENTACIÓN ─── */}
      <section id="precios" className="py-24 px-4 bg-[#F8F4F0] border-t border-[#EAD8D0]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-[#8C4E3F] bg-[#F5ECE7] px-3.5 py-1.5 rounded-full border border-[#EAD8D0]">
              Inversión Transparente
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-[#3B2219] tracking-tight mt-4 mb-4">
              Planes a tu medida, sin contratos forzosos ni comisiones ocultas
            </h2>
            <p className="text-base sm:text-lg text-[#7A5B50]">
              Paga solo por lo que usas. Todos los planes incluyen actualizaciones continuas y soporte técnico en Chile.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Plan 1: Emprendedora */}
            <div className="rounded-[2rem] bg-white border border-[#EAD8D0] p-8 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <h3 className="text-xl font-bold text-[#3B2219]">Plan Emprendedora</h3>
                <p className="text-xs text-[#7A5B50] mt-1 mb-6">Para manicuristas independientes o salones de hasta 2 puestos.</p>

                <div className="mb-6">
                  <span className="text-4xl font-extrabold text-[#3B2219]">$29.900</span>
                  <span className="text-xs text-[#7A5B50] ml-1">CLP / mes</span>
                </div>

                <ul className="space-y-3 text-xs text-[#5C3D2E] mb-8">
                  <li className="flex items-center gap-2">
                    <FiCheck className="text-[#4B856E] text-base shrink-0" />
                    <span>Hasta 2 especialistas o puestos</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <FiCheck className="text-[#4B856E] text-base shrink-0" />
                    <span>Agenda y Calendario PWA móvil</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <FiCheck className="text-[#4B856E] text-base shrink-0" />
                    <span>Base de datos de clientes ilimitada</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <FiCheck className="text-[#4B856E] text-base shrink-0" />
                    <span>Tarjeta de fidelización digital básica</span>
                  </li>
                  <li className="flex items-center gap-2 text-[#9E7B6E]">
                    <span className="text-gray-300">✕</span>
                    <span>Sin WhatsApp Bot automático</span>
                  </li>
                  <li className="flex items-center gap-2 text-[#9E7B6E]">
                    <span className="text-gray-300">✕</span>
                    <span>Sin facturación electrónica SII</span>
                  </li>
                </ul>
              </div>

              <a
                href={whatsappDemoLink}
                target="_blank"
                rel="noreferrer"
                className="w-full text-center py-3 rounded-full border border-[#EAD8D0] text-[#5C3D2E] text-xs font-bold hover:bg-[#F5ECE7] transition-all"
              >
                Contratar Plan Emprendedora
              </a>
            </div>

            {/* Plan 2: Studio Pro (DESTACADO) */}
            <div className="relative rounded-[2rem] bg-gradient-to-b from-[#5C3D2E] to-[#432A1F] text-white p-8 shadow-xl border-2 border-[#C9897A] flex flex-col justify-between scale-105 z-10">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-[#8C4E3F] text-white text-[11px] font-extrabold tracking-wider uppercase shadow-md">
                ⭐ Más Elegido por Salones
              </div>

              <div>
                <h3 className="text-2xl font-bold text-white">Studio Pro</h3>
                <p className="text-xs text-rose-200 mt-1 mb-6">Para salones establecidos que buscan automatización total.</p>

                <div className="mb-6">
                  <span className="text-5xl font-extrabold text-white">$49.900</span>
                  <span className="text-xs text-rose-200 ml-1">CLP / mes</span>
                </div>

                <ul className="space-y-3.5 text-xs text-rose-100 mb-8">
                  <li className="flex items-center gap-2">
                    <FiCheck className="text-[#4B856E] text-base shrink-0" />
                    <span className="font-semibold text-white">Hasta 6 especialistas simultáneas</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <FiCheck className="text-[#4B856E] text-base shrink-0" />
                    <span className="font-semibold text-white">Recordatorios WhatsApp Bot Oficial</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <FiCheck className="text-[#4B856E] text-base shrink-0" />
                    <span className="font-semibold text-white">Boletas de Honorarios SII automáticas</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <FiCheck className="text-[#4B856E] text-base shrink-0" />
                    <span>Bunny Pass Apple & Google Wallet</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <FiCheck className="text-[#4B856E] text-base shrink-0" />
                    <span>Cálculo de comisiones por manicurista</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <FiCheck className="text-[#4B856E] text-base shrink-0" />
                    <span>GiftCards digitales con PIN y canje QR</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <FiCheck className="text-[#4B856E] text-base shrink-0" />
                    <span>Control de insumos e inventario</span>
                  </li>
                </ul>
              </div>

              <a
                href={whatsappDemoLink}
                target="_blank"
                rel="noreferrer"
                className="w-full text-center py-3.5 rounded-full bg-[#EBD0C6] text-[#5C3D2E] text-xs font-bold hover:bg-white active:scale-95 transition-all shadow-md"
              >
                Comenzar con Studio Pro ↗
              </a>
            </div>

            {/* Plan 3: Franquicia / Multi-Salón */}
            <div className="rounded-[2rem] bg-white border border-[#EAD8D0] p-8 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <h3 className="text-xl font-bold text-[#3B2219]">Plan Franquicias</h3>
                <p className="text-xs text-[#7A5B50] mt-1 mb-6">Para cadenas con 2 o más sucursales o centros de estética.</p>

                <div className="mb-6">
                  <span className="text-4xl font-extrabold text-[#3B2219]">$89.900</span>
                  <span className="text-xs text-[#7A5B50] ml-1">CLP / mes</span>
                </div>

                <ul className="space-y-3 text-xs text-[#5C3D2E] mb-8">
                  <li className="flex items-center gap-2">
                    <FiCheck className="text-[#4B856E] text-base shrink-0" />
                    <span className="font-semibold">Múltiples sucursales independientes</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <FiCheck className="text-[#4B856E] text-base shrink-0" />
                    <span>Especialistas y recepcionistas ilimitadas</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <FiCheck className="text-[#4B856E] text-base shrink-0" />
                    <span>Consola Super-Admin consolidada</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <FiCheck className="text-[#4B856E] text-base shrink-0" />
                    <span>Dominio propio personalizado (.cl)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <FiCheck className="text-[#4B856E] text-base shrink-0" />
                    <span>Colores y logotipo exclusivo de marca</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <FiCheck className="text-[#4B856E] text-base shrink-0" />
                    <span>Soporte prioritario 24/7 y SLA garantizado</span>
                  </li>
                </ul>
              </div>

              <a
                href={whatsappDemoLink}
                target="_blank"
                rel="noreferrer"
                className="w-full text-center py-3 rounded-full border border-[#EAD8D0] text-[#5C3D2E] text-xs font-bold hover:bg-[#F5ECE7] transition-all"
              >
                Contactar por Franquicias
              </a>
            </div>
          </div>

          {/* ─── DETALLE DE IMPLEMENTACIÓN LLAVE EN MANO ─── */}
          <div className="mt-16 bg-white border border-[#EAD8D0] rounded-[2.5rem] p-8 sm:p-12 shadow-sm">
            <h3 className="text-2xl font-bold text-[#3B2219] mb-2 text-center">
              ¿Cómo funciona la implementación? (Puesta en marcha en 48 horas)
            </h3>
            <p className="text-sm text-[#7A5B50] text-center max-w-xl mx-auto mb-10">
              Nosotros nos encargamos del trabajo técnico para que tú no pierdas tiempo ni te enredes con configuraciones complejas.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              <div className="p-4 rounded-2xl bg-[#FDFBF9] border border-[#EAD8D0]/80">
                <span className="w-8 h-8 rounded-full bg-[#8C4E3F] text-white text-xs font-bold flex items-center justify-center mb-3">1</span>
                <h4 className="font-bold text-sm text-[#3B2219] mb-1">Diagnóstico & Setup</h4>
                <p className="text-xs text-[#7A5B50]">
                  Relevamos tu lista de precios, duración de servicios, especialistas y horarios de atención.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#FDFBF9] border border-[#EAD8D0]/80">
                <span className="w-8 h-8 rounded-full bg-[#8C4E3F] text-white text-xs font-bold flex items-center justify-center mb-3">2</span>
                <h4 className="font-bold text-sm text-[#3B2219] mb-1">Migración de Datos</h4>
                <p className="text-xs text-[#7A5B50]">
                  Importamos tu base de clientas existente (desde Excel, Instagram o WhatsApp) sin perder historiales.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#FDFBF9] border border-[#EAD8D0]/80">
                <span className="w-8 h-8 rounded-full bg-[#8C4E3F] text-white text-xs font-bold flex items-center justify-center mb-3">3</span>
                <h4 className="font-bold text-sm text-[#3B2219] mb-1">WhatsApp & SII</h4>
                <p className="text-xs text-[#7A5B50]">
                  Conectamos tu número de WhatsApp y las credenciales del SII para facturación automática.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#FDFBF9] border border-[#EAD8D0]/80">
                <span className="w-8 h-8 rounded-full bg-[#8C4E3F] text-white text-xs font-bold flex items-center justify-center mb-3">4</span>
                <h4 className="font-bold text-sm text-[#3B2219] mb-1">Capacitación en Vivo</h4>
                <p className="text-xs text-[#7A5B50]">
                  Sesión personalizada por videollamada para ti y tu equipo de manicuristas. ¡Listas para operar!
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 6. COMPARATIVA: BUNNYCURE VS SISTEMAS TRADICIONALES ─── */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-[#3B2219] tracking-tight">
              ¿Por qué los mejores salones se cambian a BunnyCure?
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="border-b border-[#EAD8D0] text-[#7A5B50]">
                  <th className="py-4 px-4 font-bold">Característica</th>
                  <th className="py-4 px-4 font-bold text-[#8C4E3F]">BunnyCure SaaS</th>
                  <th className="py-4 px-4 font-medium text-gray-500">Agendas en Papel / Excel</th>
                  <th className="py-4 px-4 font-medium text-gray-500">Softwares Genéricos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAD8D0]/60 text-[#5C3D2E]">
                <tr>
                  <td className="py-3.5 px-4 font-semibold">Recordatorios WhatsApp Oficiales</td>
                  <td className="py-3.5 px-4 font-bold text-[#4B856E]">✓ 24h y 2h automáticos</td>
                  <td className="py-3.5 px-4 text-gray-400">Manual mensaje por mensaje</td>
                  <td className="py-3.5 px-4 text-gray-500">SMS que nadie lee o costo extra</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-semibold">Tarjeta de Sellos para iPhone y Android</td>
                  <td className="py-3.5 px-4 font-bold text-[#4B856E]">✓ Apple & Google Wallet PWA</td>
                  <td className="py-3.5 px-4 text-gray-400">Cartón que se pierde o ensucia</td>
                  <td className="py-3.5 px-4 text-gray-400">No disponible</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-semibold">Emisión de Boletas SII (Chile)</td>
                  <td className="py-3.5 px-4 font-bold text-[#4B856E]">✓ Integrada con 1 click</td>
                  <td className="py-3.5 px-4 text-gray-400">Entrar a sii.cl cada vez</td>
                  <td className="py-3.5 px-4 text-gray-400">No localizado para Chile</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-semibold">Multi-servicio por Puesto</td>
                  <td className="py-3.5 px-4 font-bold text-[#4B856E]">✓ Cálculo exacto de minutos</td>
                  <td className="py-3.5 px-4 text-gray-400">Errores de sobre-agendamiento</td>
                  <td className="py-3.5 px-4 text-gray-500">Bloques rígidos de 1 hora</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-semibold">Instalación en el teléfono</td>
                  <td className="py-3.5 px-4 font-bold text-[#4B856E]">✓ PWA ultraligera sin Play/AppStore</td>
                  <td className="py-3.5 px-4 text-gray-400">No aplica</td>
                  <td className="py-3.5 px-4 text-gray-500">Descargas pesadas de 150MB</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ─── 7. PREGUNTAS FRECUENTES (FAQ INTERACTIVO) ─── */}
      <section id="faq" className="py-20 px-4 bg-[#F8F4F0] border-t border-[#EAD8D0]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center max-w-xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-widest text-[#8C4E3F] bg-[#F5ECE7] px-3.5 py-1.5 rounded-full border border-[#EAD8D0]">
              Respuestas Claras
            </span>
            <h2 className="text-3xl font-extrabold text-[#3B2219] tracking-tight mt-4 mb-2">
              Preguntas Frecuentes
            </h2>
          </div>

          <div className="space-y-3">
            {[
              {
                q: '¿Cómo acceden mis clientas a su tarjeta de fidelización?',
                a: 'Al agendar o terminar su atención, la clienta recibe un enlace directo por WhatsApp (ej: app.tusalon.cl/mi-tarjeta/id). En iPhone puede anclarla con 1 toque o añadirla a Apple Wallet, y en Android a Google Wallet.',
              },
              {
                q: '¿Necesito comprar algún computador o terminal especial?',
                a: 'No. BunnyCure funciona en cualquier navegador (Chrome, Safari, Edge) y dispositivo: computador de escritorio, notebook, iPad o celular de las manicuristas.',
              },
              {
                q: '¿Se conecta realmente con el Servicio de Impuestos Internos (SII)?',
                a: 'Sí. En los planes Studio Pro y Franquicias se conecta mediante API Gateway oficial para generar boletas electrónicas de honorarios con validación de RUT y descarga de PDF.',
              },
              {
                q: '¿Qué pasa si mis manicuristas no son expertas en tecnología?',
                a: 'La interfaz fue diseñada para ser intuitiva y limpia, similar a usar WhatsApp o Instagram. En menos de 20 minutos de capacitación cualquier persona aprende a crear citas y registrar clientas.',
              },
              {
                q: '¿Puedo conservar mi base de clientas actual?',
                a: '¡Por supuesto! Nuestro equipo importa tu archivo Excel o lista de contactos de forma confidencial y segura durante el proceso de instalación.',
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className="rounded-2xl bg-white border border-[#EAD8D0] overflow-hidden shadow-xs transition-colors"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-5 text-left font-bold text-sm text-[#3B2219] flex items-center justify-between gap-4 cursor-pointer"
                >
                  <span>{item.q}</span>
                  {openFaq === idx ? (
                    <FiChevronUp className="text-[#8C4E3F] shrink-0 text-lg" />
                  ) : (
                    <FiChevronDown className="text-gray-400 shrink-0 text-lg" />
                  )}
                </button>
                {openFaq === idx && (
                  <div className="px-5 pb-5 text-xs sm:text-sm text-[#7A5B50] leading-relaxed border-t border-[#F5ECE7] pt-3">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 8. CLOSING CTA BANNER ─── */}
      <section className="py-24 px-4 bg-gradient-to-br from-[#5C3D2E] via-[#482E22] to-[#2B1814] text-white text-center relative overflow-hidden">
        <div className="max-w-3xl mx-auto relative z-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-rose-200 border border-white/15 uppercase tracking-wider mb-6">
            Eleva el estándar de tu salón
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-6">
            Lleva tu salón al siguiente nivel hoy mismo
          </h2>
          <p className="text-base sm:text-lg text-rose-100/90 leading-relaxed max-w-xl mx-auto mb-10">
            Agenda una demostración de 15 minutos sin compromiso. Te mostraremos el sistema en vivo adaptado a la dinámica de tu negocio.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href={whatsappDemoLink}
              target="_blank"
              rel="noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 rounded-full bg-[#EAD8D0] text-[#5C3D2E] font-extrabold text-sm hover:bg-white active:scale-98 transition-all shadow-xl"
            >
              <FaWhatsapp className="text-xl text-[#25D366]" />
              <span>Hablar por WhatsApp con un Asesor</span>
            </a>
            <Link
              to="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center px-7 py-4 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-sm border border-white/20 transition-all"
            >
              Acceso a Clientes Existentes
            </Link>
          </div>
        </div>
      </section>

      {/* ─── 9. FOOTER ─── */}
      <footer className="py-10 px-4 bg-[#231510] text-[#A6887D] text-xs border-t border-white/10">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span>💅</span>
            <span className="font-bold text-white">BunnyCure Technologies</span>
            <span>• Software SaaS para Centros de Estética</span>
          </div>

          <div className="flex items-center gap-6">
            <Link to="/login" className="hover:text-white transition-colors">Portal Administrativo</Link>
            <Link to="/reservar" className="hover:text-white transition-colors">Portal de Reservas</Link>
            <a href="https://instagram.com/bunnycure.cl" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">
              Instagram @bunnycure.cl
            </a>
          </div>

          <div>
            <span>Santiago de Chile © {new Date().getFullYear()} • Todos los derechos reservados</span>
          </div>
        </div>
      </footer>

      {/* ─── 10. STICKY FLOATING WHATSAPP BUTTON (BOTTOM RIGHT) ─── */}
      <a
        href={whatsappDemoLink}
        target="_blank"
        rel="noreferrer"
        aria-label="Contactar por WhatsApp"
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-full bg-[#25D366] text-white font-bold text-xs shadow-2xl hover:scale-105 active:scale-95 transition-all"
      >
        <FaWhatsapp className="text-xl" />
        <span className="hidden sm:inline">¿Dudas? Habla con nosotros</span>
      </a>
    </div>
  );
}
