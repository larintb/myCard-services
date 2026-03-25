import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

// GET /api/admin/businesses/[id] - Get detailed business info with stats
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: businessId } = await params

    // Get business details
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select(`
        *,
        users!businesses_owner_id_fkey (
          id,
          email,
          first_name,
          last_name,
          phone
        )
      `)
      .eq('id', businessId)
      .single()

    if (businessError) {
      console.error('Error fetching business:', businessError)
      throw businessError
    }

    // Get business stats in parallel
    const [
      { count: servicesCount },
      { count: clientsCount },
      { count: appointmentsCount },
      { count: tokensCount }
    ] = await Promise.all([
      // Services count
      supabaseAdmin
        .from('services')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', businessId)
        .eq('is_active', true),

      // Clients count (through client_businesses)
      supabaseAdmin
        .from('client_businesses')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', businessId),

      // Appointments count
      supabaseAdmin
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', businessId),

      // Active tokens count for this business
      supabaseAdmin
        .from('invitation_tokens')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', businessId)
        .eq('status', 'active')
        .eq('type', 'final_client')
    ])

    // Get recent appointments
    const { data: recentAppointments } = await supabaseAdmin
      .from('appointments')
      .select(`
        id,
        appointment_date,
        appointment_time,
        status,
        users!appointments_client_id_fkey (
          first_name,
          last_name
        ),
        services (
          name
        )
      `)
      .eq('business_id', businessId)
      .order('appointment_date', { ascending: false })
      .limit(5)

    const businessWithStats = {
      ...business,
      stats: {
        activeServices: servicesCount || 0,
        totalClients: clientsCount || 0,
        totalAppointments: appointmentsCount || 0,
        activeTokens: tokensCount || 0
      },
      recentAppointments: recentAppointments || []
    }

    return NextResponse.json({
      success: true,
      business: businessWithStats
    })

  } catch (error) {
    console.error('Error in business details API:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}