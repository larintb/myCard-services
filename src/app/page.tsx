'use client';

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'motion/react';
import BlurText from '@/components/ui/BlurText';

// Prism uses WebGL — must be client-only (no SSR)
const Prism = dynamic(() => import('@/components/ui/Prism'), { ssr: false });

// Reusable scroll-reveal wrapper
const FadeUp = ({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 32 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-60px' }}
    transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay }}
    className={className}
  >
    {children}
  </motion.div>
);

// Fade in (no vertical movement) — for section labels / eyebrows
const FadeIn = ({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) => (
  <motion.div
    initial={{ opacity: 0 }}
    whileInView={{ opacity: 1 }}
    viewport={{ once: true, margin: '-60px' }}
    transition={{ duration: 0.5, delay }}
    className={className}
  >
    {children}
  </motion.div>
);

// ─── Feature data ─────────────────────────────────────────────────────────────
const features = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    title: 'Citas sin fricción',
    desc: 'Tus clientes agendan desde su teléfono en segundos. Sin apps que descargar, sin llamadas.'
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
          d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    title: 'Un toque, todo listo',
    desc: 'La tarjeta NFC lleva a tus clientes directo a tu negocio digital. Instantáneo.'
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    title: 'Panel de control claro',
    desc: 'Reportes, clientes, servicios y horarios desde un dashboard limpio y móvil.'
  },
];

const steps = [
  { n: '01', title: 'Configura tu negocio', desc: 'Sube tu info, servicios y horarios en minutos.' },
  { n: '02', title: 'Reparte tus tarjetas', desc: 'Entregamos tarjetas NFC personalizadas para tus clientes.' },
  { n: '03', title: 'Empieza a crecer', desc: 'Citas automáticas, menos llamadas y clientes recurrentes.' },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function Home() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', business_name: '', email: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [submitError, setSubmitError] = useState('');
  const heroRef = useRef<HTMLElement>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if ('scrollRestoration' in history) history.scrollRestoration = 'auto';
    };
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setMenuOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    if (submitError) setSubmitError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError('');
    setSubmitMessage('');
    try {
      const res = await fetch('/api/demo-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const result = await res.json();
      if (result.success) {
        setSubmitMessage(result.message || '¡Mensaje enviado! Te contactamos pronto.');
        setFormData({ name: '', business_name: '', email: '', message: '' });
      } else {
        setSubmitError(result.error || 'Error al enviar.');
      }
    } catch {
      setSubmitError('Error de conexión. Inténtalo de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="font-poppins" style={{ backgroundColor: '#ffffff', color: '#1C1C1E' }}>

      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <header
        className="fixed top-0 inset-x-0 z-50 transition-all duration-300"
        style={{
          backgroundColor: scrolled ? 'rgba(255,255,255,0.85)' : 'transparent',
          backdropFilter: scrolled ? 'blur(20px)' : 'none',
          borderBottom: scrolled ? '1px solid #E5E5EA' : '1px solid transparent',
        }}
      >
        <nav className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-2 cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: '#6366F1' }}>
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <span className="text-base font-semibold" style={{ color: '#1C1C1E' }}>myCard</span>
          </button>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-8">
            {[['features', 'Características'], ['how-it-works', 'Cómo funciona'], ['pricing', 'Precios']].map(([id, label]) => (
              <button key={id} onClick={() => scrollTo(id)}
                className="text-sm transition-colors cursor-pointer"
                style={{ color: '#8E8E93' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#1C1C1E')}
                onMouseLeave={e => (e.currentTarget.style.color = '#8E8E93')}
              >
                {label}
              </button>
            ))}
          </div>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={() => scrollTo('contact')}
              className="text-sm font-semibold px-5 py-2 rounded-full text-white transition-all cursor-pointer"
              style={{ backgroundColor: '#6366F1' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#4F46E5')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#6366F1')}
            >
              Solicitar Demo
            </button>
          </div>

          {/* Mobile hamburger */}
          <button className="md:hidden p-2" onClick={() => setMenuOpen(o => !o)}>
            <svg className="w-5 h-5" fill="none" stroke="#8E8E93" viewBox="0 0 24 24">
              {menuOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </nav>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t px-6 py-4 space-y-3"
            style={{ backgroundColor: 'rgba(255,255,255,0.97)', borderColor: '#E5E5EA' }}>
            {[['features', 'Características'], ['how-it-works', 'Cómo funciona'], ['pricing', 'Precios']].map(([id, label]) => (
              <button key={id} onClick={() => scrollTo(id)}
                className="block w-full text-left text-sm py-2 cursor-pointer"
                style={{ color: '#8E8E93' }}>
                {label}
              </button>
            ))}
            <button onClick={() => scrollTo('contact')}
              className="block w-full text-sm font-semibold py-2.5 rounded-full text-white text-center mt-2 cursor-pointer"
              style={{ backgroundColor: '#6366F1' }}>
              Solicitar Demo
            </button>
          </div>
        )}
      </header>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section ref={heroRef} className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden"
        style={{ backgroundColor: '#000000' }}>

        {/* Prism background — fills entire section */}
        <div className="absolute inset-0">
          <Prism
            animationType="3drotate"
            timeScale={0.4}
            scale={4.2}
            glow={1.2}
            bloom={1.1}
            noise={0.18}
            colorFrequency={0.9}
            transparent={true}
          />
        </div>

        {/* Dark gradient overlay — bottom fade for section transition */}
        <div className="absolute inset-x-0 bottom-0 h-48 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, transparent, #000000)' }} />

        {/* Hero content */}
        <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
          {/* Eyebrow chip */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-8"
            style={{ backgroundColor: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)' }}>
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#6366F1' }} />
            <span className="text-xs font-medium" style={{ color: '#A5B4FC' }}>
              NFC · Citas · Panel de administración
            </span>
          </div>

          {/* Main headline */}
          <BlurText
            text="Empieza a ahorrar tiempo."
            animateBy="words"
            direction="top"
            delay={120}
            stepDuration={0.5}
            className="text-5xl md:text-7xl font-bold tracking-tight text-white leading-tight justify-center mb-6"
          />

          {/* Subtitle */}
          <BlurText
            text="Tarjetas NFC + agenda online para tu negocio. Tus clientes reservan con un toque, tú gestionas todo desde el celular."
            animateBy="words"
            direction="bottom"
            delay={40}
            stepDuration={0.4}
            className="text-base md:text-lg max-w-xl mx-auto leading-relaxed justify-center mb-10"
            animationFrom={{ filter: 'blur(8px)', opacity: 0, y: 20 }}
            animationTo={[{ filter: 'blur(0px)', opacity: 0.7, y: 0 }]}
          />

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => scrollTo('contact')}
              className="px-8 py-3.5 rounded-full text-sm font-semibold text-white transition-all cursor-pointer"
              style={{ backgroundColor: '#6366F1' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#4F46E5')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#6366F1')}
            >
              Solicitar Demo gratis →
            </button>
            <button
              onClick={() => scrollTo('how-it-works')}
              className="px-8 py-3.5 rounded-full text-sm font-medium transition-all cursor-pointer"
              style={{ color: 'rgba(255,255,255,0.65)', border: '1px solid rgba(255,255,255,0.15)' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.35)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.65)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; }}
            >
              Ver cómo funciona
            </button>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 opacity-40">
          <span className="text-xs text-white">scroll</span>
          <svg className="w-4 h-4 text-white animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────────────────── */}
      <section id="features" style={{ backgroundColor: '#ffffff' }}>
        <div className="max-w-6xl mx-auto px-6 py-28">

          <FadeIn className="text-center">
            <p className="text-xs font-semibold uppercase tracking-widest mb-4"
              style={{ color: '#6366F1' }}>
              Lo que incluye
            </p>
          </FadeIn>
          <FadeUp delay={0.05} className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: '#1C1C1E' }}>
              Todo en un solo lugar
            </h2>
          </FadeUp>
          <FadeUp delay={0.1} className="text-center">
            <p className="max-w-lg mx-auto mb-16 text-sm leading-relaxed" style={{ color: '#8E8E93' }}>
              Sin apps extras, sin complicaciones. Un sistema pensado para negocios locales que quieren verse profesionales.
            </p>
          </FadeUp>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <FadeUp key={i} delay={i * 0.1}>
                <div className="rounded-2xl p-8 transition-all duration-300 h-full"
                  style={{ backgroundColor: '#F2F2F7', border: '1px solid #E5E5EA' }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLDivElement).style.backgroundColor = '#ffffff';
                    (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 30px rgba(99,102,241,0.08)';
                    (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(99,102,241,0.2)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLDivElement).style.backgroundColor = '#F2F2F7';
                    (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                    (e.currentTarget as HTMLDivElement).style.borderColor = '#E5E5EA';
                  }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-5"
                    style={{ backgroundColor: '#EEF2FF', color: '#6366F1' }}>
                    {f.icon}
                  </div>
                  <h3 className="text-base font-semibold mb-2" style={{ color: '#1C1C1E' }}>{f.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: '#8E8E93' }}>{f.desc}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────────────────── */}
      <section id="how-it-works" style={{ backgroundColor: '#F2F2F7' }}>
        <div className="max-w-6xl mx-auto px-6 py-28">
          <FadeIn className="text-center">
            <p className="text-xs font-semibold uppercase tracking-widest mb-4"
              style={{ color: '#6366F1' }}>
              Proceso
            </p>
          </FadeIn>
          <FadeUp delay={0.05} className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: '#1C1C1E' }}>
              En tres pasos
            </h2>
          </FadeUp>
          <FadeUp delay={0.1} className="text-center">
            <p className="max-w-lg mx-auto mb-16 text-sm leading-relaxed" style={{ color: '#8E8E93' }}>
              Desde la configuración hasta el primer cliente que reserva, todo fluye solo.
            </p>
          </FadeUp>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((s, i) => (
              <FadeUp key={i} delay={i * 0.12}>
                <div className="relative">
                  {i < steps.length - 1 && (
                    <div className="hidden md:block absolute top-5 left-full w-full h-px -translate-x-4"
                      style={{ background: 'linear-gradient(to right, #E5E5EA, transparent)', zIndex: 0 }} />
                  )}
                  <div className="relative z-10">
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center mb-5 text-sm font-bold"
                      style={{ backgroundColor: '#6366F1', color: '#fff' }}>
                      {s.n}
                    </div>
                    <h3 className="text-base font-semibold mb-2" style={{ color: '#1C1C1E' }}>{s.title}</h3>
                    <p className="text-sm leading-relaxed" style={{ color: '#8E8E93' }}>{s.desc}</p>
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ────────────────────────────────────────────────────────── */}
      <section id="pricing" style={{ backgroundColor: '#ffffff' }}>
        <div className="max-w-6xl mx-auto px-6 py-28">
          <FadeIn className="text-center">
            <p className="text-xs font-semibold uppercase tracking-widest mb-4"
              style={{ color: '#6366F1' }}>
              Planes
            </p>
          </FadeIn>
          <FadeUp delay={0.05} className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: '#1C1C1E' }}>
              Precios transparentes
            </h2>
          </FadeUp>
          <FadeUp delay={0.1} className="text-center">
            <p className="max-w-lg mx-auto mb-16 text-sm" style={{ color: '#8E8E93' }}>
              Sin tarifas ocultas. Cancela cuando quieras.
            </p>
          </FadeUp>

          <div className="flex flex-col lg:flex-row items-stretch justify-center gap-6 max-w-3xl mx-auto">

            {/* Inicial */}
            <FadeUp delay={0.1} className="flex-1">
            <div className="h-full rounded-2xl p-8 flex flex-col"
              style={{ border: '1px solid #E5E5EA', backgroundColor: '#F2F2F7' }}>
              <p className="text-xs font-semibold uppercase tracking-widest mb-3"
                style={{ color: '#8E8E93' }}>Inicial</p>
              <div className="flex items-end gap-1 mb-1">
                <span className="text-4xl font-bold" style={{ color: '#1C1C1E' }}>$1,200</span>
                <span className="text-sm mb-1" style={{ color: '#8E8E93' }}>MXN / mes</span>
              </div>
              <p className="text-sm mb-6" style={{ color: '#8E8E93' }}>
                Para negocios individuales y equipos pequeños.
              </p>
              <ul className="space-y-3 flex-1 mb-8">
                {['5 tarjetas NFC para clientes', 'Centro de negocios online', 'Agendamiento de citas', 'Lista de servicios y precios'].map(item => (
                  <li key={item} className="flex items-center gap-2.5 text-sm" style={{ color: '#1C1C1E' }}>
                    <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: '#EEF2FF' }}>
                      <svg className="w-2.5 h-2.5" style={{ color: '#6366F1' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
              <button onClick={() => scrollTo('contact')}
                className="w-full py-3 rounded-[14px] text-sm font-semibold transition-all cursor-pointer"
                style={{ border: '1.5px solid #6366F1', color: '#6366F1', backgroundColor: 'transparent' }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#EEF2FF'; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}>
                Elegir Inicial
              </button>
            </div>
            </FadeUp>

            {/* Pro */}
            <FadeUp delay={0.2} className="flex-1">
            <div className="h-full rounded-2xl p-8 flex flex-col relative overflow-hidden"
              style={{ backgroundColor: '#6366F1' }}>
              {/* Subtle glow */}
              <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full opacity-20 pointer-events-none"
                style={{ backgroundColor: '#A5B4FC', filter: 'blur(40px)' }} />
              <div className="flex items-center gap-2 mb-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-white opacity-70">Pro</p>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff' }}>
                  Popular
                </span>
              </div>
              <div className="flex items-end gap-1 mb-1">
                <span className="text-4xl font-bold text-white">$2,000</span>
                <span className="text-sm mb-1 text-white opacity-70">MXN / mes</span>
              </div>
              <p className="text-sm mb-6 text-white opacity-70">
                Para negocios en crecimiento que necesitan más.
              </p>
              <ul className="space-y-3 flex-1 mb-8">
                {['Hasta 10 tarjetas NFC', 'Todo en Inicial, más:', 'Analíticas avanzadas', 'Soporte prioritario'].map(item => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-white">
                    <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                      <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
              <button onClick={() => scrollTo('contact')}
                className="w-full py-3 rounded-[14px] text-sm font-semibold bg-white transition-all cursor-pointer"
                style={{ color: '#6366F1' }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
                Elegir Pro
              </button>
            </div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* ── Contact / Demo form ─────────────────────────────────────────────── */}
      <section id="contact" style={{ backgroundColor: '#F2F2F7' }}>
        <div className="max-w-2xl mx-auto px-6 py-28">
          <FadeIn className="text-center">
            <p className="text-xs font-semibold uppercase tracking-widest mb-4"
              style={{ color: '#6366F1' }}>
              Contacto
            </p>
          </FadeIn>
          <FadeUp delay={0.05} className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-3" style={{ color: '#1C1C1E' }}>
              ¿Listo para empezar?
            </h2>
          </FadeUp>
          <FadeUp delay={0.1} className="text-center">
            <p className="text-sm mb-10" style={{ color: '#8E8E93' }}>
              Cuéntanos de tu negocio y te contactamos para configurar todo.
            </p>
          </FadeUp>

          <FadeUp delay={0.15}>
          <div className="bg-white rounded-2xl p-8" style={{ boxShadow: '0 2px 24px rgba(0,0,0,0.06)' }}>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold mb-1.5 block uppercase tracking-wide"
                    style={{ color: '#8E8E93' }}>Tu nombre</label>
                  <input
                    type="text" name="name" value={formData.name}
                    onChange={handleInputChange} required
                    placeholder="Ana García"
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                    style={{ backgroundColor: '#F2F2F7', border: '1.5px solid #E5E5EA', color: '#1C1C1E' }}
                    onFocus={e => (e.currentTarget.style.borderColor = '#6366F1')}
                    onBlur={e => (e.currentTarget.style.borderColor = '#E5E5EA')}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold mb-1.5 block uppercase tracking-wide"
                    style={{ color: '#8E8E93' }}>Negocio</label>
                  <input
                    type="text" name="business_name" value={formData.business_name}
                    onChange={handleInputChange} required
                    placeholder="Salón de belleza"
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                    style={{ backgroundColor: '#F2F2F7', border: '1.5px solid #E5E5EA', color: '#1C1C1E' }}
                    onFocus={e => (e.currentTarget.style.borderColor = '#6366F1')}
                    onBlur={e => (e.currentTarget.style.borderColor = '#E5E5EA')}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold mb-1.5 block uppercase tracking-wide"
                  style={{ color: '#8E8E93' }}>Correo electrónico</label>
                <input
                  type="email" name="email" value={formData.email}
                  onChange={handleInputChange} required
                  placeholder="ana@ejemplo.com"
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                  style={{ backgroundColor: '#F2F2F7', border: '1.5px solid #E5E5EA', color: '#1C1C1E' }}
                  onFocus={e => (e.currentTarget.style.borderColor = '#6366F1')}
                  onBlur={e => (e.currentTarget.style.borderColor = '#E5E5EA')}
                />
              </div>

              <div>
                <label className="text-xs font-semibold mb-1.5 block uppercase tracking-wide"
                  style={{ color: '#8E8E93' }}>Mensaje (opcional)</label>
                <textarea
                  name="message" value={formData.message}
                  onChange={handleInputChange} rows={3}
                  placeholder="Cuéntanos sobre tu negocio..."
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all resize-none"
                  style={{ backgroundColor: '#F2F2F7', border: '1.5px solid #E5E5EA', color: '#1C1C1E' }}
                  onFocus={e => (e.currentTarget.style.borderColor = '#6366F1')}
                  onBlur={e => (e.currentTarget.style.borderColor = '#E5E5EA')}
                />
              </div>

              {submitMessage && (
                <div className="p-3 rounded-xl text-sm" style={{ backgroundColor: '#F0FDF4', color: '#166534' }}>
                  {submitMessage}
                </div>
              )}
              {submitError && (
                <div className="p-3 rounded-xl text-sm" style={{ backgroundColor: '#FFF1F0', color: '#FF3B30' }}>
                  {submitError}
                </div>
              )}

              <button
                type="submit" disabled={isSubmitting}
                className="w-full py-3.5 rounded-[14px] text-sm font-semibold text-white transition-all active:scale-[0.98] mt-2 cursor-pointer"
                style={{ backgroundColor: isSubmitting ? '#A5B4FC' : '#6366F1', cursor: isSubmitting ? 'not-allowed' : 'pointer' }}
              >
                {isSubmitting
                  ? <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 rounded-full border-2 border-transparent animate-spin"
                        style={{ borderTopColor: 'white', borderRightColor: 'white' }} />
                      Enviando...
                    </span>
                  : 'Solicitar Demo gratis'}
              </button>
            </form>
          </div>
          </FadeUp>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer style={{ backgroundColor: '#ffffff', borderTop: '1px solid #E5E5EA' }}>
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md flex items-center justify-center"
              style={{ backgroundColor: '#6366F1' }}>
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <span className="text-sm font-semibold" style={{ color: '#1C1C1E' }}>myCard Services</span>
            <span className="text-sm" style={{ color: '#8E8E93' }}>© 2025</span>
          </div>
          <div className="flex gap-6">
            {[
              { href: 'https://facebook.com/mycardservices', label: 'Facebook' },
              { href: 'https://twitter.com/mycardservices', label: 'Twitter' },
              { href: 'https://linkedin.com/company/mycardservices', label: 'LinkedIn' },
            ].map(({ href, label }) => (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer"
                className="text-sm transition-colors"
                style={{ color: '#8E8E93' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#6366F1')}
                onMouseLeave={e => (e.currentTarget.style.color = '#8E8E93')}>
                {label}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
