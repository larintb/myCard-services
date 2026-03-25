import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

interface RouteParams {
  params: Promise<{
    businessId: string
    appointmentId: string
  }>
}

// DELETE /api/businesses/[businessId]/client-appointments/[appointmentId]
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const resolvedParams = await params
    const { businessId, appointmentId } = resolvedParams

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