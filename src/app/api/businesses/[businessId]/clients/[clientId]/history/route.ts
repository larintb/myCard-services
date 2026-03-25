import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

interface RouteParams {
  params: Promise<{
    businessId: string
    clientId: string
  }>
}

// GET /api/businesses/[businessId]/clients/[clientId]/history
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const resolvedParams = await params
    const { businessId, clientId } = resolvedParams

    if (!businessId || !clientId) {
      return NextResponse.json(
        { success: false, error: 'Business ID and Client ID are required' },
        { status: 400 }
      )
    }

    // Get all appointments for this client in this business
    const { data: appointments, error: appointmentsError } = await supabaseAdmin
      .from('appointments')
      .select(`
        *,
        services (
          id,
          name,
          price,
          duration_minutes
        )
      `)
      .eq('business_id', businessId)
      .eq('client_id', clientId)
      .order('appointment_date', { ascending: false })
      .order('appointment_time', { ascending: false })

    if (appointmentsError) {
      console.error('Error fetching client appointments:', appointmentsError)
      throw appointmentsError
    }

    // Get client basic info
    const { data: clientInfo, error: clientError } = await supabaseAdmin
      .from('users')
      .select('id, first_name, last_name, phone, created_at')
      .eq('id', clientId)
      .single()

    if (clientError) {
      console.error('Error fetching client info:', clientError)
      throw clientError
    }

    // Calculate summary statistics
    const totalAppointments = appointments?.length || 0
    const completedAppointments = appointments?.filter(apt => apt.status === 'completed').length || 0
    const totalSpent = appointments?.reduce((sum, apt) => {
      return apt.status === 'completed' ? sum + (apt.services?.price || 0) : sum
    }, 0) || 0

    // Get upcoming appointments
    const today = new Date().toISOString().split('T')[0]
    const upcomingAppointments = appointments?.filter(apt =>
      apt.appointment_date >= today && (apt.status === 'pending' || apt.status === 'confirmed')
    ).length || 0

    // Get recent activity (last 3 months)
    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
    const recentActivity = appointments?.filter(apt =>
      new Date(apt.appointment_date) >= threeMonthsAgo
    ).length || 0

    const summary = {
      totalAppointments,
      completedAppointments,
      upcomingAppointments,
      totalSpent,
      recentActivity,
      memberSince: clientInfo.created_at,
      lastVisit: appointments?.find(apt => apt.status === 'completed')?.appointment_date || null
    }

    return NextResponse.json({
      success: true,
      client: clientInfo,
      appointments: appointments || [],
      summary
    })

  } catch (error) {
    console.error('Error fetching client history:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}