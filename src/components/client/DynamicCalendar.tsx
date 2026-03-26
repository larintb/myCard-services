'use client'

import { useState, useEffect, useCallback } from 'react'

interface TimeSlot {
  time: string
  available: boolean
}

interface AvailableSlotResponse {
  time: string
  available: boolean
}

interface DynamicCalendarProps {
  businessId: string
  onTimeSlotSelected: (date: string, time: string) => void
  onBack: () => void
  serviceDuration?: number
}

export function DynamicCalendar({ businessId, onTimeSlotSelected, serviceDuration = 30 }: DynamicCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const generateDefaultTimeSlots = (): TimeSlot[] => {
    const slots: TimeSlot[] = []
    for (let hour = 9; hour <= 18; hour++) {
      slots.push({ time: `${hour.toString().padStart(2, '0')}:00`, available: true })
      if (hour < 18) {
        slots.push({ time: `${hour.toString().padStart(2, '0')}:30`, available: true })
      }
    }
    return slots
  }

  const loadAvailableSlots = useCallback(async (date: string) => {
    setLoadingSlots(true)
    try {
      const response = await fetch(`/api/businesses/${businessId}/available-slots?date=${date}&duration=${serviceDuration}`)
      const data = await response.json()
      if (data.success) {
        setAvailableSlots(data.slots.map((slot: AvailableSlotResponse) => ({
          time: slot.time,
          available: slot.available
        })))
      } else {
        setAvailableSlots(generateDefaultTimeSlots())
      }
    } catch {
      setAvailableSlots(generateDefaultTimeSlots())
    } finally {
      setLoadingSlots(false)
    }
  }, [businessId, serviceDuration])

  useEffect(() => {
    if (selectedDate) loadAvailableSlots(selectedDate)
  }, [selectedDate, loadAvailableSlots])

  const formatDate = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const formatDisplayDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-').map(num => parseInt(num))
    return new Date(year, month - 1, day).toLocaleDateString('es-MX', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    })
  }

  const isDateAvailable = (date: Date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return date >= today
  }

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const days = []
    for (let i = 0; i < firstDay.getDay(); i++) days.push(null)
    for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d))
    return days
  }

  const selectTimeSlot = (time: string) => {
    if (selectedDate) onTimeSlotSelected(selectedDate, time)
  }

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))

  const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
  const dayNames = ['D','L','M','X','J','V','S']

  const todayStr = formatDate(new Date())

  return (
    <div className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={prevMonth}
          className="w-9 h-9 rounded-full flex items-center justify-center transition-colors active:scale-95"
          style={{ backgroundColor: '#F2F2F7' }}
        >
          <svg className="w-4 h-4" style={{ color: '#6366F1' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <h3 className="text-base font-semibold" style={{ color: '#1C1C1E' }}>
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </h3>

        <button
          onClick={nextMonth}
          className="w-9 h-9 rounded-full flex items-center justify-center transition-colors active:scale-95"
          style={{ backgroundColor: '#F2F2F7' }}
        >
          <svg className="w-4 h-4" style={{ color: '#6366F1' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-2">
        {dayNames.map(day => (
          <div key={day} className="text-center text-xs font-medium py-1" style={{ color: '#8E8E93' }}>
            {day}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1 mb-5">
        {getDaysInMonth(currentMonth).map((date, index) => {
          const dateStr = date ? formatDate(date) : ''
          const isSelected = dateStr === selectedDate
          const isToday = dateStr === todayStr
          const available = date ? isDateAvailable(date) : false

          return (
            <button
              key={index}
              onClick={() => date && available && setSelectedDate(dateStr)}
              disabled={!date || !available}
              className="h-10 w-full flex items-center justify-center text-sm font-medium rounded-full transition-all active:scale-95"
              style={{
                visibility: date ? 'visible' : 'hidden',
                backgroundColor: isSelected ? '#6366F1' : 'transparent',
                color: isSelected ? '#FFFFFF' : available ? '#1C1C1E' : '#C7C7CC',
                border: isToday && !isSelected ? '1.5px solid #6366F1' : 'none',
                cursor: available ? 'pointer' : 'default',
              }}
            >
              {date?.getDate()}
            </button>
          )
        })}
      </div>

      {/* Selected date display */}
      {selectedDate && (
        <div
          className="flex items-center p-3 rounded-xl mb-5"
          style={{ backgroundColor: '#EEF2FF' }}
        >
          <svg className="w-4 h-4 mr-2 flex-shrink-0" style={{ color: '#6366F1' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm font-medium capitalize" style={{ color: '#6366F1' }}>
            {formatDisplayDate(selectedDate)}
          </p>
        </div>
      )}

      {/* Time slots */}
      {selectedDate && (
        <div>
          <h4 className="text-sm font-semibold mb-3" style={{ color: '#1C1C1E' }}>
            Selecciona un horario
          </h4>

          {loadingSlots ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-5 h-5 rounded-full border-2 border-transparent animate-spin"
                style={{ borderTopColor: '#6366F1', borderRightColor: '#6366F1' }} />
              <span className="ml-2 text-sm" style={{ color: '#8E8E93' }}>Cargando...</span>
            </div>
          ) : availableSlots.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {availableSlots.map(slot => (
                <button
                  key={slot.time}
                  onClick={() => slot.available && selectTimeSlot(slot.time)}
                  disabled={!slot.available}
                  className="flex items-center justify-center h-11 rounded-xl text-sm font-semibold transition-all active:scale-95"
                  style={{
                    backgroundColor: slot.available ? '#EEF2FF' : '#F2F2F7',
                    color: slot.available ? '#6366F1' : '#C7C7CC',
                    cursor: slot.available ? 'pointer' : 'default',
                    border: `1.5px solid ${slot.available ? '#C7D2FE' : 'transparent'}`,
                    textDecoration: !slot.available ? 'line-through' : 'none',
                  }}
                >
                  {slot.time}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <svg className="w-10 h-10 mx-auto mb-2" style={{ color: '#C7C7CC' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm font-medium" style={{ color: '#8E8E93' }}>Sin horarios disponibles</p>
              <p className="text-xs mt-1" style={{ color: '#C7C7CC' }}>Intenta con otra fecha</p>
            </div>
          )}
        </div>
      )}

      {!selectedDate && (
        <div className="text-center py-8">
          <svg className="w-10 h-10 mx-auto mb-2" style={{ color: '#C7C7CC' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-sm font-medium" style={{ color: '#8E8E93' }}>Selecciona una fecha</p>
          <p className="text-xs mt-1" style={{ color: '#C7C7CC' }}>Elige un día para ver horarios</p>
        </div>
      )}
    </div>
  )
}
