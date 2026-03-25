import { NextResponse } from 'next/server'
import { getBusinessHours } from '@/lib/db/businessHours'
import { supabaseAdmin } from '@/lib/supabase-server'

interface RouteParams {
  params: Promise<{
    businessId: string
  }>
}

interface AvailableSlot {
  date: string
  time: string
  available: boolean
}

interface AppointmentWithService {
  appointment_time: string
  status: string
  services: { duration_minutes: number } | null
}

const timeToMinutes = (timeStr: string) => {
  const [hours, minutes] = timeStr.split(':').map(Number)
  return hours * 60 + minutes
}

const minutesToTime = (minutes: number) => {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}

// GET /api/businesses/[businessId]/available-slots?date=YYYY-MM-DD&duration=60
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const resolvedParams = await params
    const businessId = resolvedParams.businessId
    const url = new URL(request.url)
    const dateParam = url.searchParams.get('date')
    const durationParam = url.searchParams.get('duration')

    if (!businessId) {
      return NextResponse.json(
        { success: false, error: 'Business ID is required' },
        { status: 400 }
      )
    }

    if (!dateParam) {
      return NextResponse.json(
        { success: false, error: 'Date parameter is required' },
        { status: 400 }
      )
    }

    // Duration of the requested service in minutes (default 30)
    const serviceDuration = Math.max(15, Math.min(480, parseInt(durationParam ?? '30') || 30))

    // Parse date safely to avoid timezone issues
    const [year, month, day] = dateParam.split('-').map(num => parseInt(num))
    const selectedDate = new Date(year, month - 1, day)
    const dayOfWeek = selectedDate.getDay()

    // Get business hours for this day
    const businessHours = await getBusinessHours(businessId)
    const todayHours = businessHours.find(h => h.day_of_week === dayOfWeek && h.is_active)

    if (!todayHours) {
      return NextResponse.json({
        success: true,
        slots: [],
        message: 'Business is closed on this day'
      })
    }

    // Fetch existing appointments for this date including their service duration
    const { data: appointmentsData, error } = await supabaseAdmin
      .from('appointments')
      .select(`
        appointment_time,
        status,
        services ( duration_minutes )
      `)
      .eq('business_id', businessId)
      .eq('appointment_date', dateParam)
      .in('status', ['pending', 'confirmed'])

    if (error) {
      console.error('Error fetching appointments for slots:', error)
      return NextResponse.json({ success: false, error: 'Failed to load appointments' }, { status: 500 })
    }

    const existingAppointments = (appointmentsData ?? []) as unknown as AppointmentWithService[]

    const openMinutes = timeToMinutes(todayHours.open_time)
    const closeMinutes = timeToMinutes(todayHours.close_time)

    // Generate slots every `serviceDuration` minutes.
    // A slot is only generated if it fits entirely within business hours.
    const slots: AvailableSlot[] = []

    for (let slotStart = openMinutes; slotStart + serviceDuration <= closeMinutes; slotStart += serviceDuration) {
      const slotEnd = slotStart + serviceDuration
      const timeStr = minutesToTime(slotStart)

      // A slot [slotStart, slotEnd) conflicts with an existing appointment
      // at [apptStart, apptStart + apptDuration) if the intervals overlap.
      const isConflict = existingAppointments.some(appt => {
        const apptStart = timeToMinutes(appt.appointment_time)
        const apptDuration = appt.services?.duration_minutes ?? serviceDuration
        const apptEnd = apptStart + apptDuration
        // Overlap: slotStart < apptEnd AND apptStart < slotEnd
        return slotStart < apptEnd && apptStart < slotEnd
      })

      slots.push({
        date: dateParam,
        time: timeStr,
        available: !isConflict
      })
    }

    return NextResponse.json({
      success: true,
      slots,
      businessHours: {
        open: todayHours.open_time,
        close: todayHours.close_time
      }
    })

  } catch (error) {
    console.error('Error fetching available slots:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
