import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { createAppointment } from '@/lib/db/appointments'
import { CreateAppointmentSchema } from '@/lib/schemas'

// POST /api/appointments
export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Map field names from client (user_id → clientId) before validation
    const normalized = {
      businessId: body.business_id,
      clientId: body.user_id,
      serviceId: body.service_id,
      appointmentDate: body.appointment_date,
      appointmentTime: body.appointment_time,
      notes: body.notes
    }

    const result = CreateAppointmentSchema.safeParse(normalized)
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { businessId: business_id, clientId: user_id, serviceId: service_id, appointmentDate: appointment_date, appointmentTime: appointment_time, notes } = result.data

    // Check if the slot is still available
    const { data: existingAppointment, error: checkError } = await supabaseAdmin
      .from('appointments')
      .select('id')
      .eq('business_id', business_id)
      .eq('appointment_date', appointment_date)
      .eq('appointment_time', appointment_time)
      .in('status', ['pending', 'confirmed'])
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking availability:', checkError)
      return NextResponse.json(
        { success: false, error: 'Failed to check availability' },
        { status: 500 }
      )
    }

    if (existingAppointment) {
      return NextResponse.json(
        { success: false, error: 'Time slot is no longer available' },
        { status: 409 }
      )
    }

    // Create the appointment
    const appointmentData = {
      business_id,
      client_id: user_id, // Map user_id to client_id
      service_id,
      appointment_date,
      appointment_time,
      status: 'pending' as const,
      notes: notes || ''
    }

    const newAppointment = await createAppointment(appointmentData)

    if (!newAppointment) {
      return NextResponse.json(
        { success: false, error: 'Failed to create appointment' },
        { status: 500 }
      )
    }

    // Fetch the complete appointment data with service info
    const { data: appointmentWithService, error: fetchError } = await supabaseAdmin
      .from('appointments')
      .select(`
        id,
        appointment_date,
        appointment_time,
        status,
        notes,
        services (
          id,
          name,
          duration_minutes,
          price
        )
      `)
      .eq('id', newAppointment.id)
      .single()

    if (fetchError) {
      console.error('Error fetching created appointment:', fetchError)
      return NextResponse.json(
        { success: false, error: 'Appointment created but failed to fetch details' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      appointment: appointmentWithService
    })

  } catch (error) {
    console.error('Error creating appointment:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}