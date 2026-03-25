'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { BusinessAdminUser, requireBusinessAdminAuth } from '@/utils/auth'

interface PageProps {
  params: Promise<{ businessname: string }>
}

interface BusinessHour {
  id?: string
  day_of_week: number
  open_time: string
  close_time: string
  is_active: boolean
}

const DAYS_OF_WEEK = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

const normalizeTimeFromDB = (t: string): string => {
  if (!t) return '09:00'
  if (t.match(/^\d{2}:\d{2}$/)) return t
  const m = t.match(/^(\d{2}):(\d{2}):\d{2}$/)
  if (m) return `${m[1]}:${m[2]}`
  return '09:00'
}

const generateTimeOptions = () => {
  const times = []
  for (let h = 0; h < 24; h++) {
    for (const m of ['00', '30']) {
      const t = `${h.toString().padStart(2, '0')}:${m}`
      times.push(t)
    }
  }
  return times
}

const timeOptions = generateTimeOptions()

export default function BusinessHoursPage({ params }: PageProps) {
  const router = useRouter()
  const [businessName, setBusinessName] = useState<string>('')
  const [user, setUser] = useState<BusinessAdminUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [businessHours, setBusinessHours] = useState<BusinessHour[]>([])
  const [loadingHours, setLoadingHours] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const loadBusinessHours = useCallback(async (businessId: string) => {
    try {
      setLoadingHours(true)
      const response = await fetch(`/api/businesses/${businessId}/hours`)
      const data = await response.json()
      if (data.success) {
        if (!data.hours || data.hours.length === 0) {
          setBusinessHours(Array.from({ length: 7 }, (_, i) => ({
            day_of_week: i, open_time: '09:00', close_time: '17:00', is_active: false
          })))
        } else {
          const complete: BusinessHour[] = []
          for (let day = 0; day < 7; day++) {
            const existing = data.hours.find((h: BusinessHour) => h.day_of_week === day)
            if (existing) {
              complete.push({
                ...existing,
                open_time: normalizeTimeFromDB(existing.open_time || '09:00'),
                close_time: normalizeTimeFromDB(existing.close_time || '17:00'),
              })
            } else {
              complete.push({ day_of_week: day, open_time: '09:00', close_time: '17:00', is_active: false })
            }
          }
          setBusinessHours(complete)
        }
      }
    } catch (error) {
      console.error('Error loading business hours:', error)
      setBusinessHours(Array.from({ length: 7 }, (_, i) => ({
        day_of_week: i, open_time: '09:00', close_time: '17:00', is_active: false
      })))
    } finally {
      setLoadingHours(false)
    }
  }, [])

  useEffect(() => {
    const getParams = async () => {
      const resolvedParams = await params
      const businessNameDecoded = decodeURIComponent(resolvedParams.businessname)
      setBusinessName(businessNameDecoded)
      const user = await requireBusinessAdminAuth(businessNameDecoded, router)
      if (user) {
        setUser(user)
        loadBusinessHours(user.businessId)
      }
      setIsLoading(false)
    }
    getParams()
  }, [params, router, loadBusinessHours])

  const updateDayHours = (dayIndex: number, field: keyof BusinessHour, value: string | boolean) => {
    setBusinessHours(prev => prev.map(h => {
      if (h.day_of_week !== dayIndex) return h
      const updated = { ...h, [field]: value }
      if (field === 'is_active' && value === true) {
        if (!updated.open_time || updated.open_time === '00:00') updated.open_time = '09:00'
        if (!updated.close_time || updated.close_time === '00:00') updated.close_time = '17:00'
      }
      return updated
    }))
  }

  const validateBusinessHours = (): string[] => {
    const errors: string[] = []
    businessHours.forEach(h => {
      if (h.is_active) {
        if (!h.open_time || !h.close_time) {
          errors.push(`${DAYS_OF_WEEK[h.day_of_week]}: Selecciona horario de apertura y cierre`)
          return
        }
        if (h.open_time >= h.close_time) {
          errors.push(`${DAYS_OF_WEEK[h.day_of_week]}: La hora de cierre debe ser después de la apertura`)
        }
      }
    })
    return errors
  }

  const saveBusinessHours = async () => {
    if (!user?.businessId) return
    const errors = validateBusinessHours()
    if (errors.length > 0) {
      alert('Corrige los siguientes errores:\n' + errors.join('\n'))
      return
    }
    try {
      setIsSaving(true)
      const response = await fetch(`/api/businesses/${user.businessId}/hours`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hours: businessHours })
      })
      const data = await response.json()
      if (data.success) {
        alert('¡Horarios guardados!')
        await loadBusinessHours(user.businessId)
      } else {
        alert('Error: ' + (data.error || 'Error desconocido'))
      }
    } catch (error) {
      console.error('Error saving business hours:', error)
      alert('Error al guardar horarios')
    } finally {
      setIsSaving(false)
    }
  }

  const setAllDays = (isActive: boolean) => {
    setBusinessHours(prev => prev.map(h => ({
      ...h,
      is_active: isActive,
      open_time: isActive && (!h.open_time || h.open_time === '') ? '09:00' : h.open_time,
      close_time: isActive && (!h.close_time || h.close_time === '') ? '17:00' : h.close_time,
    })))
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-poppins" style={{ backgroundColor: '#F2F2F7' }}>
        <div className="w-10 h-10 rounded-full border-[3px] border-transparent animate-spin"
          style={{ borderTopColor: '#6366F1', borderRightColor: '#6366F1' }} />
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen font-poppins screen-enter" style={{ backgroundColor: '#F2F2F7' }}>
      <div className="px-4 pt-6 pb-8 max-w-lg mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <Link href={`/${businessName}/settings`}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E5EA' }}>
            <svg className="w-4 h-4" style={{ color: '#6366F1' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-xl font-bold" style={{ color: '#1C1C1E' }}>Horario</h1>
        </div>

        {/* Quick actions */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setAllDays(true)}
            className="flex-1 py-2 rounded-[10px] text-xs font-semibold"
            style={{ backgroundColor: '#EEF2FF', color: '#6366F1' }}
          >
            Abrir todos
          </button>
          <button
            onClick={() => setAllDays(false)}
            className="flex-1 py-2 rounded-[10px] text-xs font-semibold"
            style={{ backgroundColor: '#F2F2F7', color: '#8E8E93', border: '1px solid #E5E5EA' }}
          >
            Cerrar todos
          </button>
        </div>

        {/* Days list */}
        {loadingHours ? (
          <div className="space-y-3">
            {DAYS_OF_WEEK.map((_, i) => (
              <div key={i} className="bg-white rounded-2xl h-16 animate-pulse" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }} />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {businessHours.map(hour => (
              <div key={hour.day_of_week} className="bg-white rounded-2xl p-4"
                style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                <div className="flex items-center gap-3">
                  {/* Toggle */}
                  <button
                    onClick={() => updateDayHours(hour.day_of_week, 'is_active', !hour.is_active)}
                    className="relative flex-shrink-0 w-11 h-6 rounded-full transition-all"
                    style={{ backgroundColor: hour.is_active ? '#6366F1' : '#E5E5EA' }}
                  >
                    <span className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
                      style={{ transform: hour.is_active ? 'translateX(20px)' : 'translateX(0)' }} />
                  </button>

                  {/* Day name */}
                  <span className="text-sm font-semibold w-24 flex-shrink-0"
                    style={{ color: hour.is_active ? '#1C1C1E' : '#8E8E93' }}>
                    {DAYS_OF_WEEK[hour.day_of_week]}
                  </span>

                  {/* Times */}
                  {hour.is_active ? (
                    <div className="flex items-center gap-2 flex-1">
                      <select
                        value={hour.open_time}
                        onChange={e => updateDayHours(hour.day_of_week, 'open_time', e.target.value)}
                        className="flex-1 py-1.5 px-2 rounded-lg text-xs font-medium outline-none"
                        style={{ backgroundColor: '#EEF2FF', color: '#6366F1', border: 'none' }}
                      >
                        {timeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <span className="text-xs" style={{ color: '#8E8E93' }}>–</span>
                      <select
                        value={hour.close_time}
                        onChange={e => updateDayHours(hour.day_of_week, 'close_time', e.target.value)}
                        className="flex-1 py-1.5 px-2 rounded-lg text-xs font-medium outline-none"
                        style={{ backgroundColor: '#EEF2FF', color: '#6366F1', border: 'none' }}
                      >
                        {timeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  ) : (
                    <span className="text-xs" style={{ color: '#C7C7CC' }}>Cerrado</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Preview */}
        <div className="bg-white rounded-2xl p-4 mt-4" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <p className="text-xs font-semibold mb-3" style={{ color: '#8E8E93' }}>VISTA PREVIA</p>
          {businessHours.map((h, i) => (
            <div key={h.day_of_week}
              className="flex items-center justify-between py-2"
              style={{ borderBottom: i < businessHours.length - 1 ? '1px solid #F2F2F7' : 'none' }}>
              <span className="text-xs font-medium" style={{ color: '#1C1C1E' }}>
                {DAYS_OF_WEEK[h.day_of_week]}
              </span>
              <span className="text-xs" style={{ color: h.is_active ? '#6366F1' : '#C7C7CC' }}>
                {h.is_active ? `${h.open_time} – ${h.close_time}` : 'Cerrado'}
              </span>
            </div>
          ))}
        </div>

        {/* Save button */}
        <button
          onClick={saveBusinessHours}
          disabled={isSaving}
          className="w-full mt-5 py-3.5 rounded-[14px] text-sm font-semibold text-white transition-all"
          style={{ backgroundColor: isSaving ? '#A5B4FC' : '#6366F1' }}
        >
          {isSaving ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 rounded-full border-2 border-transparent animate-spin"
                style={{ borderTopColor: 'white', borderRightColor: 'white' }} />
              Guardando...
            </span>
          ) : 'Guardar horarios'}
        </button>
      </div>
    </div>
  )
}
