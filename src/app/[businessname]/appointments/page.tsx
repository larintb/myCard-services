'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { BusinessAdminUser, requireBusinessAdminAuth } from '@/utils/auth'

interface PageProps {
  params: Promise<{ businessname: string }>
}

interface Appointment {
  id: string
  appointment_date: string
  appointment_time: string
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  notes?: string
  users: { first_name: string; last_name: string; phone: string }
  services: { name: string; price: number; duration_minutes: number }
}

const statusBadge = (status: string) => {
  const map: Record<string, { label: string; style: React.CSSProperties }> = {
    pending:   { label: 'Pendiente',   style: { backgroundColor: '#FFFBEB', color: '#B45309' } },
    confirmed: { label: 'Confirmada',  style: { backgroundColor: '#EEF2FF', color: '#6366F1' } },
    completed: { label: 'Completada',  style: { backgroundColor: '#F0FFF4', color: '#15803D' } },
    cancelled: { label: 'Cancelada',   style: { backgroundColor: '#FFF1F0', color: '#FF3B30' } },
  }
  const s = map[status] ?? { label: status, style: { backgroundColor: '#F2F2F7', color: '#8E8E93' } }
  return (
    <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={s.style}>
      {s.label}
    </span>
  )
}

const formatDate = (dateString: string) => {
  const [y, m, d] = dateString.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const today = new Date(); today.setHours(0,0,0,0)
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)
  if (date.getTime() === today.getTime()) return 'Hoy'
  if (date.getTime() === tomorrow.getTime()) return 'Mañana'
  return date.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })
}

const formatTime = (t: string) => {
  const [h, m] = t.split(':')
  const hr = parseInt(h)
  return `${hr % 12 || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`
}

export default function AppointmentsPage({ params }: PageProps) {
  const router = useRouter()
  const [user, setUser] = useState<BusinessAdminUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loadingAppointments, setLoadingAppointments] = useState(true)
  const [filter, setFilter] = useState<'all' | 'today' | 'pending' | 'confirmed'>('today')
  const [showCheckinModal, setShowCheckinModal] = useState(false)
  const [checkinCode, setCheckinCode] = useState('')
  const [checkinLoading, setCheckinLoading] = useState(false)

  const loadAppointments = useCallback(async (businessId: string) => {
    try {
      setLoadingAppointments(true)
      const response = await fetch(`/api/businesses/${businessId}/appointments`)
      const data = await response.json()
      if (data.success) setAppointments(data.appointments)
    } catch (error) {
      console.error('Error loading appointments:', error)
    } finally {
      setLoadingAppointments(false)
    }
  }, [])

  useEffect(() => {
    const getParams = async () => {
      const resolvedParams = await params
      const businessNameDecoded = decodeURIComponent(resolvedParams.businessname)
      const user = await requireBusinessAdminAuth(businessNameDecoded, router)
      if (user) {
        setUser(user)
        loadAppointments(user.businessId)
      }
      setIsLoading(false)
    }
    getParams()
  }, [params, router, loadAppointments])

  const updateAppointmentStatus = async (appointmentId: string, newStatus: Appointment['status']) => {
    if (!user?.businessId) return
    try {
      const response = await fetch(`/api/businesses/${user.businessId}/appointments/${appointmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      const data = await response.json()
      if (data.success) {
        await loadAppointments(user.businessId)
      } else {
        alert('Error al actualizar: ' + data.error)
      }
    } catch (error) {
      console.error('Error updating appointment:', error)
      alert('Error al actualizar la cita')
    }
  }

  const confirmWithCode = async () => {
    if (checkinCode.trim().length !== 6) {
      alert('Por favor ingresa un código de 6 caracteres válido')
      return
    }
    if (!user?.businessId) return
    setCheckinLoading(true)
    try {
      const response = await fetch('/api/checkin-codes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: checkinCode.trim().toUpperCase(), businessId: user.businessId })
      })
      const data = await response.json()
      if (data.success) {
        await loadAppointments(user.businessId)
        setShowCheckinModal(false)
        setCheckinCode('')
        const statusText = data.appointment.newStatus === 'confirmed' ? 'confirmada' : 'completada'
        alert(`✅ Cita ${statusText}\n\nCliente: ${data.appointment.client}\nServicio: ${data.appointment.service}\nHora: ${data.appointment.time}`)
      } else {
        alert('❌ ' + (data.error || 'Código inválido o expirado'))
      }
    } catch (error) {
      console.error('Error en check-in:', error)
      alert('❌ Error al procesar el check-in')
    } finally {
      setCheckinLoading(false)
    }
  }

  const filteredAppointments = appointments.filter(a => {
    const today = new Date().toISOString().split('T')[0]
    if (filter === 'today') return a.appointment_date === today
    if (filter === 'pending') return a.status === 'pending'
    if (filter === 'confirmed') return a.status === 'confirmed'
    return true
  })

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-poppins" style={{ backgroundColor: '#F2F2F7' }}>
        <div className="w-10 h-10 rounded-full border-[3px] border-transparent animate-spin"
          style={{ borderTopColor: '#6366F1', borderRightColor: '#6366F1' }} />
      </div>
    )
  }

  if (!user) return null

  const filterTabs = [
    { key: 'today', label: 'Hoy' },
    { key: 'all', label: 'Todas' },
    { key: 'pending', label: 'Pendientes' },
    { key: 'confirmed', label: 'Confirmadas' },
  ] as const

  return (
    <div className="min-h-screen font-poppins screen-enter" style={{ backgroundColor: '#F2F2F7' }}>
      <div className="px-4 pt-6 pb-4 max-w-lg mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-xl font-bold" style={{ color: '#1C1C1E' }}>Citas</h1>
          <button
            onClick={() => setShowCheckinModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-xs font-semibold text-white"
            style={{ backgroundColor: '#6366F1' }}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Check-in
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {filterTabs.map(t => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className="flex-shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-all"
              style={{
                backgroundColor: filter === t.key ? '#6366F1' : '#FFFFFF',
                color: filter === t.key ? '#FFFFFF' : '#8E8E93',
                border: filter === t.key ? 'none' : '1px solid #E5E5EA',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Appointments list */}
        {loadingAppointments ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl p-4 animate-pulse" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                <div className="h-4 w-32 rounded mb-2" style={{ backgroundColor: '#F2F2F7' }} />
                <div className="h-3 w-24 rounded mb-3" style={{ backgroundColor: '#F2F2F7' }} />
                <div className="h-3 w-40 rounded" style={{ backgroundColor: '#F2F2F7' }} />
              </div>
            ))}
          </div>
        ) : filteredAppointments.length > 0 ? (
          <div className="space-y-3">
            {filteredAppointments.map(apt => (
              <div key={apt.id} className="bg-white rounded-2xl p-4" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-bold" style={{ color: '#1C1C1E' }}>
                      {apt.users.first_name} {apt.users.last_name}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: '#8E8E93' }}>{apt.users.phone}</p>
                  </div>
                  {statusBadge(apt.status)}
                </div>

                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#6366F1' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-xs font-medium" style={{ color: '#1C1C1E' }}>{formatDate(apt.appointment_date)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#6366F1' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-xs font-medium" style={{ color: '#1C1C1E' }}>{formatTime(apt.appointment_time)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between py-2.5 px-3 rounded-xl mb-3"
                  style={{ backgroundColor: '#F2F2F7' }}>
                  <div>
                    <p className="text-xs font-semibold" style={{ color: '#1C1C1E' }}>{apt.services.name}</p>
                    <p className="text-xs" style={{ color: '#8E8E93' }}>{apt.services.duration_minutes} min</p>
                  </div>
                  <p className="text-sm font-bold" style={{ color: '#6366F1' }}>${apt.services.price}</p>
                </div>

                {apt.notes && (
                  <p className="text-xs mb-3 px-1" style={{ color: '#8E8E93' }}>
                    Nota: {apt.notes}
                  </p>
                )}

                <div className="flex gap-2">
                  {apt.status === 'pending' && (
                    <>
                      <button
                        onClick={() => updateAppointmentStatus(apt.id, 'confirmed')}
                        className="flex-1 py-2 rounded-[10px] text-xs font-semibold text-white"
                        style={{ backgroundColor: '#6366F1' }}
                      >
                        Confirmar
                      </button>
                      <button
                        onClick={() => updateAppointmentStatus(apt.id, 'cancelled')}
                        className="flex-1 py-2 rounded-[10px] text-xs font-semibold"
                        style={{ color: '#FF3B30', backgroundColor: '#FFF1F0', border: '1px solid #FFCDD2' }}
                      >
                        Cancelar
                      </button>
                    </>
                  )}
                  {apt.status === 'confirmed' && (
                    <button
                      onClick={() => updateAppointmentStatus(apt.id, 'completed')}
                      className="flex-1 py-2 rounded-[10px] text-xs font-semibold text-white"
                      style={{ backgroundColor: '#34C759' }}
                    >
                      Completar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: '#F2F2F7' }}>
              <svg className="w-7 h-7" style={{ color: '#C7C7CC' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-sm font-medium" style={{ color: '#8E8E93' }}>Sin citas</p>
            <p className="text-xs mt-1" style={{ color: '#C7C7CC' }}>No hay citas para este filtro</p>
          </div>
        )}
      </div>

      {/* Check-in modal */}
      {showCheckinModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm" style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.2)' }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold" style={{ color: '#1C1C1E' }}>Check-in con código</h3>
              <button
                onClick={() => { setShowCheckinModal(false); setCheckinCode('') }}
                className="w-8 h-8 flex items-center justify-center rounded-full"
                style={{ backgroundColor: '#F2F2F7' }}
              >
                <svg className="w-4 h-4" style={{ color: '#8E8E93' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Available for check-in */}
            {(() => {
              const today = new Date().toISOString().split('T')[0]
              const available = appointments.filter(a =>
                a.appointment_date >= today && (a.status === 'pending' || a.status === 'confirmed')
              )
              if (available.length === 0) return null
              return (
                <div className="rounded-xl p-3 mb-4" style={{ backgroundColor: '#F2F2F7' }}>
                  <p className="text-xs font-semibold mb-2" style={{ color: '#8E8E93' }}>CITAS DISPONIBLES</p>
                  {available.slice(0, 3).map(a => (
                    <div key={a.id} className="flex items-center justify-between py-1">
                      <span className="text-xs font-medium" style={{ color: '#1C1C1E' }}>
                        {a.users.first_name} {a.users.last_name}
                      </span>
                      <span className="text-xs" style={{ color: '#8E8E93' }}>{formatTime(a.appointment_time)}</span>
                    </div>
                  ))}
                  {available.length > 3 && (
                    <p className="text-xs mt-1" style={{ color: '#8E8E93' }}>+{available.length - 3} más</p>
                  )}
                </div>
              )
            })()}

            <div className="mb-5">
              <label className="text-xs font-semibold mb-2 block" style={{ color: '#8E8E93' }}>
                CÓDIGO DEL CLIENTE
              </label>
              <input
                type="text"
                value={checkinCode}
                onChange={e => setCheckinCode(e.target.value.toUpperCase().slice(0, 6))}
                placeholder="A3B2C1"
                maxLength={6}
                className="w-full px-4 py-4 rounded-xl text-center text-2xl font-bold tracking-[0.3em] outline-none"
                style={{
                  border: '1.5px solid #E5E5EA',
                  color: '#1C1C1E',
                  letterSpacing: '0.3em',
                  fontFamily: 'var(--font-poppins), monospace',
                }}
                autoFocus
              />
              <p className="text-xs mt-1.5" style={{ color: '#8E8E93' }}>Ingresa el código de 6 caracteres del cliente</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setShowCheckinModal(false); setCheckinCode('') }}
                className="flex-1 py-3 rounded-[14px] text-sm font-semibold"
                style={{ color: '#8E8E93', backgroundColor: '#F2F2F7' }}
              >
                Cancelar
              </button>
              <button
                onClick={confirmWithCode}
                disabled={checkinCode.length !== 6 || checkinLoading}
                className="flex-1 py-3 rounded-[14px] text-sm font-semibold text-white transition-all"
                style={{
                  backgroundColor: checkinCode.length === 6 && !checkinLoading ? '#6366F1' : '#A5B4FC',
                  cursor: checkinCode.length === 6 && !checkinLoading ? 'pointer' : 'not-allowed',
                }}
              >
                {checkinLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 rounded-full border-2 border-transparent animate-spin"
                      style={{ borderTopColor: 'white', borderRightColor: 'white' }} />
                    Procesando...
                  </span>
                ) : 'Procesar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
