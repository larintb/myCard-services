import { NextResponse } from 'next/server'
import { updateAppointmentStatus } from '@/lib/db/appointments'
import { supabaseAdmin } from '@/lib/supabase-server'

interface RouteParams {
  params: Promise<{
    businessId: string
    appointmentId: string
  }>
}

// PATCH /api/businesses/[businessId]/appointments/[appointmentId]
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const resolvedParams = await params
    const { businessId, appointmentId } = resolvedParams
    const body = await request.json()

    if (!businessId || !appointmentId) {
      return NextResponse.json(
        { success: false, error: 'Business ID and Appointment ID are required' },
        { status: 400 }
      )
    }

    const { status } = body

    if (!status || !['pending', 'confirmed', 'completed', 'cancelled'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Valid status is required' },
        { status: 400 }
      )
    }

    // Verify appointment belongs to business
    const { data: appointment, error: fetchError } = await supabaseAdmin
      .from('appointments')
      .select('business_id')
      .eq('id', appointmentId)
      .single()

    if (fetchError || !appointment || appointment.business_id !== businessId) {
      return NextResponse.json(
        { success: false, error: 'Appointment not found' },
        { status: 404 }
      )
    }

    const updatedAppointment = await updateAppointmentStatus(appointmentId, status)

    return NextResponse.json({
      success: true,
      appointment: updatedAppointment
    })

  } catch (error) {
    console.error('Error updating appointment:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}