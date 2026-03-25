import { NextResponse } from 'next/server'
import { createAppointment } from '@/lib/db/appointments'
import { supabaseAdmin } from '@/lib/supabase-server'

interface RouteParams {
  params: Promise<{
    businessId: string
  }>
}

// GET /api/businesses/[businessId]/client-appointments?client_id=xxx
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const resolvedParams = await params
    const businessId = resolvedParams.businessId
    const url = new URL(request.url)
    const clientId = url.searchParams.get('client_id')

    if (!businessId || !clientId) {
      return NextResponse.json(
        { success: false, error: 'Business ID and Client ID are required' },
        { status: 400 }
      )
    }

    // Get appointments for this client at this business
    const { data: appointments, error } = await supabaseAdmin
      .from('appointments')
      .select(`
        id,
        appointment_date,
        appointment_time,
        status,
        notes,
        service:services (
          id,
          name,
          duration_minutes,
          price
        )
      `)
      .eq('business_id', businessId)
      .eq('client_id', clientId)
      .order('appointment_date', { ascending: false })
      .order('appointment_time', { ascending: true })

    if (error) {
      console.error('Error fetching client appointments:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch appointments' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      appointments: appointments || []
    })

  } catch (error) {
    console.error('Error in client appointments GET:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/businesses/[businessId]/client-appointments
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const resolvedParams = await params
    const businessId = resolvedParams.businessId
    const body = await request.json()
    
    const { client_id, service_id, appointment_date, appointment_time, notes } = body

    if (!businessId || !client_id || !service_id || !appointment_date || !appointment_time) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check if the slot is still available
    const { data: existingAppointment, error: checkError } = await supabaseAdmin
      .from('appointments')
      .select('id')
      .eq('business_id', businessId)
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
      business_id: businessId,
      client_id,
      service_id,
      appointment_date,
      appointment_time,
      status: 'pending' as const,
      notes
    }

    const newAppointment = await createAppointment(appointmentData)

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

// DELETE /api/businesses/[businessId]/client-appointments/[appointmentId]
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const resolvedParams = await params
    const businessId = resolvedParams.businessId
    const url = new URL(request.url)
    const appointmentId = url.pathname.split('/').pop()

    if (!businessId || !appointmentId) {
      return NextResponse.json(
        { success: false, error: 'Business ID and Appointment ID are required' },
        { status: 400 }
      )
    }

    // Update appointment status to cancelled
    const { error } = await supabaseAdmin
      .from('appointments')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', appointmentId)
      .eq('business_id', businessId)

    if (error) {
      console.error('Error cancelling appointment:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to cancel appointment' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Appointment cancelled successfully'
    })

  } catch (error) {
    console.error('Error in appointment cancellation:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}