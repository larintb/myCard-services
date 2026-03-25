import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

interface RouteParams {
  params: Promise<{
    businessId: string
  }>
}

// GET /api/businesses/[businessId]/clients?page=1&limit=20
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const resolvedParams = await params
    const businessId = resolvedParams.businessId

    if (!businessId) {
      return NextResponse.json(
        { success: false, error: 'Business ID is required' },
        { status: 400 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)))
    const offset = (page - 1) * limit

    // Get total count for pagination metadata
    const { count } = await supabaseAdmin
      .from('client_businesses')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', businessId)

    // Get clients with their stats
    const { data: clientsData, error: clientsError } = await supabaseAdmin
      .from('client_businesses')
      .select(`
        client_id,
        created_at,
        users!client_businesses_client_id_fkey (
          id,
          first_name,
          last_name,
          phone,
          created_at
        )
      `)
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (clientsError) {
      console.error('Error fetching clients:', clientsError)
      throw clientsError
    }

    // Get appointment stats for each client
    const clientsWithStats = await Promise.all(
      (clientsData || []).map(async (clientRel) => {
        const client = clientRel.users

        // Skip if no user data
        if (!client) {
          return null
        }

        // Get appointment count and stats
        const { data: appointments, error: appointmentsError } = await supabaseAdmin
          .from('appointments')
          .select(`
            id,
            appointment_date,
            status,
            services (
              price
            )
          `)
          .eq('business_id', businessId)
          .eq('client_id', clientRel.client_id)

        if (appointmentsError) {
          console.error('Error fetching client appointments:', appointmentsError)
        }

        const appointmentCount = appointments?.length || 0
        const completedAppointments = appointments?.filter(a => a.status === 'completed') || []
        interface AppointmentWithService {
          services?: { price?: number }
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const totalSpent = (completedAppointments as any[]).reduce((sum: number, appointment: AppointmentWithService) => {
          return sum + (appointment.services?.price || 0)
        }, 0)

        // Get last appointment date
        const lastAppointment = appointments && appointments.length > 0
          ? appointments.sort((a, b) => new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime())[0]
          : null

        return {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          id: (client as any).id,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          first_name: (client as any).first_name,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          last_name: (client as any).last_name,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          phone: (client as any).phone,
          created_at: clientRel.created_at,
          appointment_count: appointmentCount,
          total_spent: totalSpent,
          last_appointment: lastAppointment?.appointment_date || null
        }
      })
    )

    return NextResponse.json({
      success: true,
      clients: clientsWithStats.filter(client => client !== null),
      pagination: {
        page,
        limit,
        total: count ?? 0,
        totalPages: Math.ceil((count ?? 0) / limit)
      }
    })

  } catch (error) {
    console.error('Error fetching clients:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}