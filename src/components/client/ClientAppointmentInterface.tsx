'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { Business, Service, User } from '@/types'
import { DynamicCalendar } from './DynamicCalendar'
import { MapboxMap } from '../ui/MapboxMap'

interface ClientAppointment {
  id: string
  appointment_date: string
  appointment_time: string
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  notes?: string
  service?: {
    id: string
    name: string
    duration_minutes: number
    price: number
  }
}

interface AppointmentSlot {
  date: string
  time: string
}

interface BusinessHour {
  id: string
  day_of_week: number
  open_time: string
  close_time: string
  is_active: boolean
}

interface CheckinCode {
  code: string
  expires_at: string
}

interface ClientAppointmentInterfaceProps {
  business: Business
  services: Service[]
  user: User
  token: string
}

type ScreenType = 'home' | 'services' | 'calendar' | 'appointments' | 'business-info' | 'confirmation' | 'checkin'

/* ── Design tokens ─────────────────────────────────────────────── */
const C = {
  bg: '#F2F2F7',
  card: '#FFFFFF',
  accent: '#6366F1',
  accentHover: '#4F46E5',
  accentLight: '#EEF2FF',
  textPrimary: '#1C1C1E',
  textSecondary: '#8E8E93',
  separator: '#E5E5EA',
  danger: '#FF3B30',
  success: '#34C759',
  warning: '#FF9500',
  shadow: '0 2px 12px rgba(0,0,0,0.08)',
} as const

export function ClientAppointmentInterface({
  business,
  services,
  user,
  token
}: ClientAppointmentInterfaceProps) {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('home')
  const [appointments, setAppointments] = useState<ClientAppointment[]>([])
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<AppointmentSlot | null>(null)
  const [businessHours, setBusinessHours] = useState<BusinessHour[]>([])
  const [loadingHours, setLoadingHours] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedAppointmentForCheckin, setSelectedAppointmentForCheckin] = useState<ClientAppointment | null>(null)
  const [checkinCode, setCheckinCode] = useState<CheckinCode | null>(null)
  const [checkinInput, setCheckinInput] = useState('')
  const [checkinLoading, setCheckinLoading] = useState(false)

  const getServiceData = (appointment: ClientAppointment) => appointment.service || null

  const parseDateString = (dateString: string) => {
    const [year, month, day] = dateString.split('-').map(num => parseInt(num))
    return new Date(year, month - 1, day)
  }

  const loadUserAppointments = useCallback(async () => {
    try {
      const response = await fetch(`/api/businesses/${business.id}/client-appointments?client_id=${user.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      if (data.success) setAppointments(data.appointments || [])
    } catch (error) {
      console.error('Error loading appointments:', error)
    }
  }, [business.id, user.id, token])

  const loadBusinessHours = useCallback(async () => {
    setLoadingHours(true)
    try {
      const response = await fetch(`/api/businesses/${business.id}/hours`)
      const data = await response.json()
      if (data.success) setBusinessHours(data.hours || [])
    } catch (error) {
      console.error('Error loading business hours:', error)
    } finally {
      setLoadingHours(false)
    }
  }, [business.id])

  useEffect(() => {
    loadUserAppointments()
    loadBusinessHours()
  }, [loadUserAppointments, loadBusinessHours])

  const handleBookAppointment = async () => {
    if (!selectedService || !selectedSlot) return
    setLoading(true)
    try {
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          business_id: business.id,
          service_id: selectedService.id,
          user_id: user.id,
          appointment_date: selectedSlot.date,
          appointment_time: selectedSlot.time
        })
      })
      const data = await response.json()
      if (data.success) {
        setCurrentScreen('confirmation')
        loadUserAppointments()
      } else {
        alert('Error al agendar la cita: ' + (data.error || 'Error desconocido'))
      }
    } catch (error) {
      console.error('Error booking appointment:', error)
      alert('Error al agendar la cita. Por favor intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateCheckinCode = async (appointment: ClientAppointment) => {
    setCheckinLoading(true)
    try {
      const response = await fetch(`/api/appointments/${appointment.id}/checkin`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      if (data.success) {
        setCheckinCode({ code: data.code, expires_at: data.expires_at })
        setSelectedAppointmentForCheckin(appointment)
        setCurrentScreen('checkin')
      } else {
        alert('Error al generar código: ' + (data.error || 'Error desconocido'))
      }
    } catch (error) {
      console.error('Error generating check-in code:', error)
      alert('Error al generar código de check-in. Por favor intenta de nuevo.')
    } finally {
      setCheckinLoading(false)
    }
  }

  const handleCheckin = async () => {
    if (!selectedAppointmentForCheckin || !checkinInput) return
    setCheckinLoading(true)
    try {
      const response = await fetch(`/api/appointments/${selectedAppointmentForCheckin.id}/checkin`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ code: checkinInput })
      })
      const data = await response.json()
      if (data.success) {
        alert('¡Check-in exitoso! Tu cita ha sido confirmada.')
        loadUserAppointments()
        setCurrentScreen('appointments')
        setCheckinCode(null)
        setCheckinInput('')
        setSelectedAppointmentForCheckin(null)
      } else {
        alert('Error en check-in: ' + (data.error || 'Error desconocido'))
      }
    } catch (error) {
      console.error('Error processing check-in:', error)
      alert('Error al procesar check-in. Por favor intenta de nuevo.')
    } finally {
      setCheckinLoading(false)
    }
  }

  const isAppointmentToday = (appointment: ClientAppointment) => {
    const today = new Date().toISOString().split('T')[0]
    return appointment.appointment_date === today
  }

  const canGenerateCheckin = (appointment: ClientAppointment) =>
    appointment.status === 'confirmed' && isAppointmentToday(appointment)

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount)

  const formatTime = (time: string) =>
    new Date(`2000-01-01T${time}`).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })

  const getDayName = (dayOfWeek: number) =>
    ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'][dayOfWeek]

  const isToday = (dayOfWeek: number) => dayOfWeek === new Date().getDay()

  /* ── Shared sub-components ─────────────────────────────────────── */

  const BusinessLogo = ({ size = 48 }: { size?: number }) => (
    <div
      className="rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size, backgroundColor: C.accent }}
    >
      {business.business_image_url ? (
        <Image
          src={business.business_image_url}
          alt={`Logo de ${business.business_name}`}
          width={size}
          height={size}
          className="w-full h-full object-cover"
        />
      ) : (
        <svg
          style={{ width: size * 0.45, height: size * 0.45, color: '#FFFFFF' }}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
      )}
    </div>
  )

  const BackButton = ({ onPress }: { onPress: () => void }) => (
    <button
      onClick={onPress}
      className="w-9 h-9 rounded-full flex items-center justify-center active:scale-95 transition-transform"
      style={{ backgroundColor: C.bg }}
    >
      <svg className="w-4 h-4" style={{ color: C.textPrimary }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
      </svg>
    </button>
  )

  const PrimaryButton = ({
    children, onClick, disabled, className = ''
  }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; className?: string }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`py-3.5 rounded-[14px] font-semibold text-sm text-white transition-opacity active:opacity-80 ${className}`}
      style={{ backgroundColor: disabled ? '#A5B4FC' : C.accent }}
    >
      {children}
    </button>
  )

  const statusBadge = (status: ClientAppointment['status']) => {
    const map = {
      pending:   { bg: '#FFF7ED', color: '#C2410C', label: 'Pendiente' },
      confirmed: { bg: C.accentLight, color: C.accent, label: 'Confirmada' },
      completed: { bg: '#F0FDF4', color: '#15803D', label: 'Completada' },
      cancelled: { bg: '#FEF2F2', color: '#DC2626', label: 'Cancelada' },
    }
    const s = map[status]
    return (
      <span
        className="px-3 py-1 rounded-full text-xs font-semibold"
        style={{ backgroundColor: s.bg, color: s.color }}
      >
        {s.label}
      </span>
    )
  }

  /* ── Bottom Nav ───────────────────────────────────────────────── */
  const showBottomNav = ['home', 'services', 'appointments'].includes(currentScreen)

  const NavTab = ({
    screen, label, icon
  }: { screen: ScreenType; label: string; icon: React.ReactNode }) => {
    const active = currentScreen === screen
    return (
      <button
        onClick={() => setCurrentScreen(screen)}
        className="flex flex-col items-center flex-1 pt-2 pb-1 transition-colors"
        style={{ color: active ? C.accent : C.textSecondary }}
      >
        {icon}
        <span className="text-[10px] font-medium mt-0.5">{label}</span>
      </button>
    )
  }

  const BottomNav = () => (
    <div
      className="fixed bottom-0 left-0 right-0 flex border-t"
      style={{ backgroundColor: C.card, borderColor: C.separator, height: 64 }}
    >
      <NavTab screen="home" label="Inicio" icon={
        <svg className="w-5 h-5" fill={currentScreen === 'home' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={currentScreen === 'home' ? 0 : 2}
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      } />
      <NavTab screen="services" label="Servicios" icon={
        <svg className="w-5 h-5" fill={currentScreen === 'services' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={currentScreen === 'services' ? 0 : 2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      } />
      <NavTab screen="appointments" label="Mis citas" icon={
        <svg className="w-5 h-5" fill={currentScreen === 'appointments' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={currentScreen === 'appointments' ? 0 : 2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      } />
    </div>
  )

  /* ── Screens ──────────────────────────────────────────────────── */

  const renderHome = () => (
    <div className="screen-enter">
      {/* Hero */}
      <div
        className="px-5 pt-10 pb-8 flex flex-col items-center text-center"
        style={{ background: `linear-gradient(160deg, ${C.accent} 0%, #818CF8 100%)` }}
      >
        <BusinessLogo size={68} />
        <h2 className="text-xl font-bold mt-4 text-white">{business.business_name}</h2>
        <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.75)' }}>
          Hola, {user.first_name}
        </p>
        {business.address && (
          <div className="flex items-center gap-1.5 mt-2">
            <svg className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.6)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="text-xs truncate max-w-[220px]" style={{ color: 'rgba(255,255,255,0.6)' }}>
              {business.address}
            </p>
          </div>
        )}
      </div>

      <div className="px-4 pt-4 pb-6 space-y-3">
        {/* Primary CTA */}
        <button
          onClick={() => setCurrentScreen('services')}
          className="w-full rounded-2xl p-4 flex items-center justify-between active:opacity-90 transition-opacity text-white"
          style={{ backgroundColor: C.accent, boxShadow: C.shadow }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="text-left">
              <p className="font-bold text-sm">Agendar cita</p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>
                {services.length} servicio{services.length !== 1 ? 's' : ''} disponible{services.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <svg className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.6)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Secondary cards */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setCurrentScreen('appointments')}
            className="bg-white rounded-2xl p-4 text-left active:opacity-80 transition-opacity"
            style={{ boxShadow: C.shadow }}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
              style={{ backgroundColor: C.accentLight }}>
              <svg className="w-5 h-5" style={{ color: C.accent }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="font-semibold text-sm" style={{ color: C.textPrimary }}>Mis citas</p>
            <p className="text-xs mt-0.5" style={{ color: C.textSecondary }}>
              {appointments.length === 0 ? 'Sin citas' : `${appointments.length} programada${appointments.length !== 1 ? 's' : ''}`}
            </p>
          </button>

          <button
            onClick={() => setCurrentScreen('business-info')}
            className="bg-white rounded-2xl p-4 text-left active:opacity-80 transition-opacity"
            style={{ boxShadow: C.shadow }}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
              style={{ backgroundColor: '#F0F9FF' }}>
              <svg className="w-5 h-5" style={{ color: '#0EA5E9' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="font-semibold text-sm" style={{ color: C.textPrimary }}>Info</p>
            <p className="text-xs mt-0.5" style={{ color: C.textSecondary }}>Detalles del negocio</p>
          </button>
        </div>

        {/* Next appointment banner */}
        {appointments.filter(a => a.status === 'confirmed' || a.status === 'pending').length > 0 && (
          <div
            className="bg-white rounded-2xl p-4"
            style={{ boxShadow: C.shadow, borderLeft: `4px solid ${C.accent}` }}
          >
            <p className="text-xs font-semibold mb-1" style={{ color: C.accent }}>PRÓXIMA CITA</p>
            {(() => {
              const next = appointments.find(a => a.status === 'confirmed' || a.status === 'pending')!
              return (
                <div>
                  <p className="font-semibold text-sm" style={{ color: C.textPrimary }}>
                    {getServiceData(next)?.name || 'Servicio'}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: C.textSecondary }}>
                    {parseDateString(next.appointment_date).toLocaleDateString('es-MX', { weekday: 'long', month: 'long', day: 'numeric' })}
                    {' · '}{formatTime(next.appointment_time)}
                  </p>
                </div>
              )
            })()}
          </div>
        )}
      </div>
    </div>
  )

  const renderServices = () => (
    <div className="screen-enter px-4 pt-6 pb-6">
      <h2 className="text-xl font-bold mb-1" style={{ color: C.textPrimary }}>Servicios</h2>
      <p className="text-sm mb-5" style={{ color: C.textSecondary }}>Elige un servicio para agendar</p>

      <div className="space-y-3">
        {services.map(service => (
          <div
            key={service.id}
            className="bg-white rounded-2xl p-5"
            style={{ boxShadow: C.shadow }}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="font-bold text-base" style={{ color: C.textPrimary }}>{service.name}</h3>
                {service.description && (
                  <p className="text-sm mt-1 leading-relaxed" style={{ color: C.textSecondary }}>{service.description}</p>
                )}
              </div>
              <p className="font-bold text-base ml-4" style={{ color: C.accent }}>
                {formatCurrency(service.price)}
              </p>
            </div>

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-1.5" style={{ color: C.textSecondary }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-xs font-medium">{service.duration_minutes} min</span>
              </div>
              <span className="text-xs font-medium" style={{ color: C.success }}>Disponible</span>
            </div>

            <PrimaryButton
              className="w-full"
              onClick={() => {
                setSelectedService(service)
                setCurrentScreen('calendar')
              }}
            >
              Agendar cita
            </PrimaryButton>
          </div>
        ))}

        {services.length === 0 && (
          <div className="text-center py-16">
            <svg className="w-12 h-12 mx-auto mb-3" style={{ color: C.separator }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <p className="font-semibold" style={{ color: C.textSecondary }}>Sin servicios disponibles</p>
          </div>
        )}
      </div>
    </div>
  )

  const renderCalendar = () => (
    <div className="screen-enter px-4 pt-6 pb-6">
      <div className="flex items-center gap-3 mb-5">
        <BackButton onPress={() => setCurrentScreen('services')} />
        <div>
          <h2 className="text-xl font-bold" style={{ color: C.textPrimary }}>Elige fecha y hora</h2>
          <p className="text-xs" style={{ color: C.textSecondary }}>Para tu cita</p>
        </div>
      </div>

      {/* Service pill */}
      {selectedService && (
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium mb-4"
          style={{ backgroundColor: C.accentLight, color: C.accent }}
        >
          <span>{selectedService.name}</span>
          <span style={{ color: C.accentHover }}>·</span>
          <span>{formatCurrency(selectedService.price)}</span>
          <span style={{ color: C.accentHover }}>·</span>
          <span>{selectedService.duration_minutes} min</span>
        </div>
      )}

      {selectedService && (
        <DynamicCalendar
          businessId={business.id}
          serviceDuration={selectedService.duration_minutes}
          onTimeSlotSelected={(date: string, time: string) => setSelectedSlot({ date, time })}
          onBack={() => setCurrentScreen('services')}
        />
      )}

      {/* Confirm panel */}
      {selectedSlot && selectedService && (
        <div className="mt-4 bg-white rounded-2xl p-5" style={{ boxShadow: C.shadow }}>
          <h3 className="font-bold text-base mb-4" style={{ color: C.textPrimary }}>Confirmar reserva</h3>

          <div className="space-y-2 mb-5">
            {[
              { icon: '🗂', label: 'Servicio', value: selectedService.name },
              { icon: '📅', label: 'Fecha', value: parseDateString(selectedSlot.date).toLocaleDateString('es-MX', { weekday: 'long', month: 'long', day: 'numeric' }) },
              { icon: '🕐', label: 'Hora', value: `${formatTime(selectedSlot.time)} (${selectedService.duration_minutes} min)` },
              { icon: '💰', label: 'Precio', value: formatCurrency(selectedService.price) },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between py-2.5 px-3 rounded-xl"
                style={{ backgroundColor: C.bg }}>
                <span className="text-sm" style={{ color: C.textSecondary }}>{row.label}</span>
                <span className="text-sm font-semibold" style={{ color: C.textPrimary }}>{row.value}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <PrimaryButton
              className="flex-1"
              onClick={handleBookAppointment}
              disabled={loading}
            >
              {loading ? 'Confirmando...' : 'Confirmar cita'}
            </PrimaryButton>
            <button
              onClick={() => setSelectedSlot(null)}
              className="flex-1 py-3.5 rounded-[14px] text-sm font-semibold transition-colors"
              style={{ backgroundColor: C.bg, color: C.textSecondary }}
            >
              Cambiar hora
            </button>
          </div>
        </div>
      )}
    </div>
  )

  const renderAppointments = () => (
    <div className="screen-enter px-4 pt-6 pb-6">
      <h2 className="text-xl font-bold mb-1" style={{ color: C.textPrimary }}>Mis citas</h2>
      <p className="text-sm mb-5" style={{ color: C.textSecondary }}>Gestiona tus reservas</p>

      {appointments.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
            style={{ backgroundColor: C.accentLight }}>
            <svg className="w-8 h-8" style={{ color: C.accent }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="font-bold text-base mb-1" style={{ color: C.textPrimary }}>Sin citas programadas</p>
          <p className="text-sm mb-6" style={{ color: C.textSecondary }}>¡Agenda tu primera cita!</p>
          <PrimaryButton className="px-8" onClick={() => setCurrentScreen('services')}>
            Ver servicios
          </PrimaryButton>
        </div>
      ) : (
        <div className="space-y-3">
          {appointments.map(appointment => (
            <div key={appointment.id} className="bg-white rounded-2xl p-5" style={{ boxShadow: C.shadow }}>
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-bold text-base flex-1 mr-3" style={{ color: C.textPrimary }}>
                  {getServiceData(appointment)?.name || 'Servicio'}
                </h3>
                {statusBadge(appointment.status)}
              </div>

              <div className="space-y-1.5 mb-3">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 flex-shrink-0" style={{ color: C.textSecondary }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm font-medium capitalize" style={{ color: C.textPrimary }}>
                    {parseDateString(appointment.appointment_date).toLocaleDateString('es-MX', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 flex-shrink-0" style={{ color: C.textSecondary }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-medium" style={{ color: C.textPrimary }}>
                    {formatTime(appointment.appointment_time)} · {getServiceData(appointment)?.duration_minutes || 0} min
                  </span>
                </div>
                <p className="text-sm font-bold" style={{ color: C.accent }}>
                  {formatCurrency(getServiceData(appointment)?.price || 0)}
                </p>
              </div>

              {/* Check-in button */}
              {canGenerateCheckin(appointment) && (
                <div className="pt-3 border-t" style={{ borderColor: C.separator }}>
                  <PrimaryButton
                    className="w-full"
                    onClick={() => handleGenerateCheckinCode(appointment)}
                    disabled={checkinLoading}
                  >
                    {checkinLoading ? 'Generando...' : 'Hacer Check-in'}
                  </PrimaryButton>
                </div>
              )}

              {/* Check-in not available today */}
              {appointment.status === 'confirmed' && !isAppointmentToday(appointment) && (
                <div className="mt-3 pt-3 border-t" style={{ borderColor: C.separator }}>
                  <p className="text-xs text-center" style={{ color: C.textSecondary }}>
                    Check-in disponible el día de la cita
                  </p>
                </div>
              )}
            </div>
          ))}

          <PrimaryButton className="w-full mt-2" onClick={() => setCurrentScreen('services')}>
            + Agendar nueva cita
          </PrimaryButton>
        </div>
      )}
    </div>
  )

  const renderBusinessInfo = () => {
    const todayStatus = (() => {
      if (loadingHours || businessHours.length === 0) return null
      const now = new Date()
      const todayHours = businessHours.find(h => h.day_of_week === now.getDay() && h.is_active)
      if (!todayHours) return { isOpen: false, label: 'Cerrado hoy' }
      const [openH, openM] = todayHours.open_time.split(':').map(Number)
      const [closeH, closeM] = todayHours.close_time.split(':').map(Number)
      const cur = now.getHours() * 60 + now.getMinutes()
      if (cur >= openH * 60 + openM && cur < closeH * 60 + closeM) {
        return { isOpen: true, label: `Cierra a las ${formatTime(todayHours.close_time)}` }
      }
      return { isOpen: false, label: `Abre a las ${formatTime(todayHours.open_time)}` }
    })()

    return (
      <div className="screen-enter">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 pt-6 pb-4">
          <BackButton onPress={() => setCurrentScreen('home')} />
          <h2 className="text-xl font-bold" style={{ color: C.textPrimary }}>Información</h2>
        </div>

        <div className="px-4 pb-6 space-y-3">
          {/* Hero card */}
          <div
            className="rounded-2xl p-5 flex items-center gap-4"
            style={{ background: `linear-gradient(135deg, ${C.accent} 0%, #818CF8 100%)`, boxShadow: C.shadow }}
          >
            <BusinessLogo size={56} />
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-lg text-white truncate">{business.business_name}</h3>
              {business.phone && (
                <a href={`tel:${business.phone}`} className="flex items-center gap-1.5 mt-1.5">
                  <svg className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.7)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span className="text-sm" style={{ color: 'rgba(255,255,255,0.85)' }}>{business.phone}</span>
                </a>
              )}
            </div>
          </div>

          {/* Address */}
          {business.address && (
            <div className="bg-white rounded-2xl px-4 py-4 flex items-start gap-3" style={{ boxShadow: C.shadow }}>
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: C.accentLight }}
              >
                <svg className="w-4 h-4" style={{ color: C.accent }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-semibold mb-0.5" style={{ color: C.textSecondary }}>DIRECCIÓN</p>
                <p className="text-sm leading-relaxed" style={{ color: C.textPrimary }}>{business.address}</p>
              </div>
            </div>
          )}

          {/* Map */}
          {business.address && (
            <div className="rounded-2xl overflow-hidden" style={{ boxShadow: C.shadow }}>
              <MapboxMap
                key={`${business.address}-${business.business_name}`}
                address={business.address}
                businessName={business.business_name}
                coords={business.address_longitude && business.address_latitude
                  ? [business.address_longitude, business.address_latitude]
                  : undefined}
                className="h-56 w-full"
              />
            </div>
          )}

          {/* Business hours */}
          <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: C.shadow }}>
            {/* Section header */}
            <div
              className="px-5 py-4 flex items-center justify-between"
              style={{ borderBottom: `1px solid ${C.separator}` }}
            >
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" style={{ color: C.textSecondary }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm font-semibold" style={{ color: C.textPrimary }}>Horario de atención</p>
              </div>
              {todayStatus && (
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: todayStatus.isOpen ? '#22C55E' : '#EF4444' }}
                  />
                  <span
                    className="text-xs font-medium"
                    style={{ color: todayStatus.isOpen ? '#15803D' : '#DC2626' }}
                  >
                    {todayStatus.isOpen ? 'Abierto' : 'Cerrado'} · {todayStatus.label}
                  </span>
                </div>
              )}
            </div>

            {/* Rows */}
            {loadingHours ? (
              <div className="px-5 py-6 flex items-center gap-2">
                <div className="w-4 h-4 rounded-full border-2 border-transparent animate-spin"
                  style={{ borderTopColor: C.accent }} />
                <span className="text-sm" style={{ color: C.textSecondary }}>Cargando...</span>
              </div>
            ) : businessHours.length > 0 ? (
              businessHours.map((hour, index) => {
                const todayRow = isToday(hour.day_of_week)
                const isLast = index === businessHours.length - 1
                return (
                  <div
                    key={hour.id}
                    className="flex items-center justify-between px-5 py-3"
                    style={{
                      backgroundColor: todayRow ? C.accentLight : 'transparent',
                      borderBottom: isLast ? 'none' : `1px solid ${C.separator}`,
                    }}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: todayRow ? C.accent : 'transparent', border: todayRow ? 'none' : `1px solid ${C.separator}` }}
                      />
                      <span
                        className="text-sm w-[90px]"
                        style={{ color: todayRow ? C.accent : C.textPrimary, fontWeight: todayRow ? 600 : 400 }}
                      >
                        {getDayName(hour.day_of_week)}
                      </span>
                      {todayRow && (
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white"
                          style={{ backgroundColor: C.accent }}
                        >
                          HOY
                        </span>
                      )}
                    </div>
                    <span
                      className="text-sm tabular-nums"
                      style={{
                        color: !hour.is_active ? '#C7C7CC' : todayRow ? C.accent : C.textSecondary,
                        fontWeight: todayRow ? 600 : 400,
                      }}
                    >
                      {hour.is_active
                        ? `${formatTime(hour.open_time)} – ${formatTime(hour.close_time)}`
                        : 'Cerrado'}
                    </span>
                  </div>
                )
              })
            ) : (
              <div className="px-5 py-4">
                <p className="text-sm" style={{ color: C.textSecondary }}>Sin horarios configurados</p>
              </div>
            )}
          </div>

          <PrimaryButton className="w-full" onClick={() => setCurrentScreen('services')}>
            Agendar cita
          </PrimaryButton>
        </div>
      </div>
    )
  }

  const renderConfirmation = () => (
    <div className="screen-enter flex flex-col items-center justify-center min-h-[60vh] px-4 pt-6 pb-6">
      <div className="bg-white rounded-2xl p-8 w-full max-w-sm text-center" style={{ boxShadow: C.shadow }}>
        <div
          className="w-16 h-16 rounded-full mx-auto mb-5 flex items-center justify-center"
          style={{ backgroundColor: '#F0FDF4' }}
        >
          <svg className="w-8 h-8" style={{ color: C.success }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h2 className="text-2xl font-bold mb-2" style={{ color: C.textPrimary }}>¡Cita agendada!</h2>
        <p className="text-sm mb-8 leading-relaxed" style={{ color: C.textSecondary }}>
          Tu cita fue programada exitosamente. Recibirás una confirmación pronto.
        </p>

        <div className="space-y-2.5">
          <PrimaryButton className="w-full" onClick={() => setCurrentScreen('appointments')}>
            Ver mis citas
          </PrimaryButton>
          <button
            onClick={() => setCurrentScreen('home')}
            className="w-full py-3.5 text-sm font-semibold rounded-[14px] transition-colors"
            style={{ color: C.accent }}
          >
            Volver al inicio
          </button>
        </div>
      </div>
    </div>
  )

  const renderCheckin = () => (
    <div className="screen-enter px-4 pt-6 pb-6">
      <div className="flex items-center gap-3 mb-5">
        <BackButton onPress={() => setCurrentScreen('appointments')} />
        <div>
          <h2 className="text-xl font-bold" style={{ color: C.textPrimary }}>Check-in</h2>
          <p className="text-xs" style={{ color: C.textSecondary }}>Confirma tu llegada</p>
        </div>
      </div>

      {/* Appointment info pill */}
      {selectedAppointmentForCheckin && (
        <div className="bg-white rounded-2xl p-4 mb-4" style={{ boxShadow: C.shadow, borderLeft: `4px solid ${C.accent}` }}>
          <p className="font-semibold text-sm" style={{ color: C.textPrimary }}>
            {getServiceData(selectedAppointmentForCheckin)?.name || 'Servicio'}
          </p>
          <p className="text-xs mt-0.5" style={{ color: C.textSecondary }}>
            {parseDateString(selectedAppointmentForCheckin.appointment_date).toLocaleDateString('es-MX', { weekday: 'long', month: 'long', day: 'numeric' })}
            {' · '}{formatTime(selectedAppointmentForCheckin.appointment_time)}
          </p>
        </div>
      )}

      {/* Show generated code */}
      {checkinCode && (
        <div className="bg-white rounded-2xl p-5 mb-4" style={{ boxShadow: C.shadow }}>
          <p className="text-xs font-semibold mb-3" style={{ color: C.textSecondary }}>TU CÓDIGO</p>
          <div
            className="text-center py-6 rounded-xl mb-3"
            style={{ backgroundColor: C.bg }}
          >
            <p
              className="text-4xl font-bold tracking-[0.3em]"
              style={{ color: C.textPrimary, fontFamily: 'var(--font-poppins), monospace' }}
            >
              {checkinCode.code}
            </p>
            <p className="text-xs mt-2" style={{ color: C.textSecondary }}>
              Expira: {new Date(checkinCode.expires_at).toLocaleTimeString('es-ES')}
            </p>
          </div>
          <div className="rounded-xl p-3" style={{ backgroundColor: C.accentLight }}>
            <p className="text-xs font-medium" style={{ color: C.accent }}>
              Muestra este código al personal del establecimiento
            </p>
          </div>
        </div>
      )}

      {/* Manual input */}
      <div className="bg-white rounded-2xl p-5" style={{ boxShadow: C.shadow }}>
        <p className="text-sm font-semibold mb-3" style={{ color: C.textPrimary }}>Ingresar código</p>
        <input
          type="text"
          value={checkinInput}
          onChange={e => setCheckinInput(e.target.value.toUpperCase())}
          placeholder="000000"
          maxLength={6}
          className="w-full text-center text-3xl font-bold tracking-[0.4em] py-4 rounded-xl outline-none mb-4"
          style={{
            border: `1.5px solid ${C.separator}`,
            color: C.textPrimary,
            backgroundColor: C.bg,
            fontFamily: 'var(--font-poppins), monospace',
          }}
          onFocus={e => { e.target.style.borderColor = C.accent }}
          onBlur={e => { e.target.style.borderColor = C.separator }}
        />
        <PrimaryButton
          className="w-full"
          onClick={handleCheckin}
          disabled={checkinLoading || checkinInput.length !== 6}
        >
          {checkinLoading ? 'Procesando...' : 'Verificar código'}
        </PrimaryButton>
      </div>
    </div>
  )

  /* ── Main render ─────────────────────────────────────────────── */
  return (
    <div className="min-h-screen font-poppins" style={{ backgroundColor: C.bg }}>
      {/* Content with bottom nav padding */}
      <div style={{ paddingBottom: showBottomNav ? 80 : 24 }}>
        {currentScreen === 'home'          && renderHome()}
        {currentScreen === 'services'      && renderServices()}
        {currentScreen === 'calendar'      && renderCalendar()}
        {currentScreen === 'appointments'  && renderAppointments()}
        {currentScreen === 'business-info' && renderBusinessInfo()}
        {currentScreen === 'confirmation'  && renderConfirmation()}
        {currentScreen === 'checkin'       && renderCheckin()}
      </div>

      {showBottomNav && <BottomNav />}
    </div>
  )
}
