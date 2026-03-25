import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

interface RouteParams {
  params: Promise<{
    businessId: string
  }>
}

// GET /api/businesses/[businessId]/reports
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const resolvedParams = await params
    const businessId = resolvedParams.businessId
    const { searchParams } = new URL(request.url)
    const range = searchParams.get('range') || '3months'

    if (!businessId) {
      return NextResponse.json(
        { success: false, error: 'Business ID is required' },
        { status: 400 }
      )
    }

    // Calculate date range
    const now = new Date()
    const startDate = new Date()

    switch (range) {
      case '1month':
        startDate.setMonth(now.getMonth() - 1)
        break
      case '3months':
        startDate.setMonth(now.getMonth() - 3)
        break
      case '6months':
        startDate.setMonth(now.getMonth() - 6)
        break
      case '1year':
        startDate.setFullYear(now.getFullYear() - 1)
        break
      default:
        startDate.setMonth(now.getMonth() - 3)
    }

    const startDateStr = startDate.toISOString().split('T')[0]
    const endDateStr = now.toISOString().split('T')[0]

    // Get appointments with services data for the date range
    const { data: appointments, error: appointmentsError } = await supabaseAdmin
      .from('appointments')
      .select(`
        *,
        services (
          name,
          price
        ),
        users!appointments_client_id_fkey (
          id,
          first_name,
          last_name
        )
      `)
      .eq('business_id', businessId)
      .gte('appointment_date', startDateStr)
      .lte('appointment_date', endDateStr)

    if (appointmentsError) {
      console.error('Error fetching appointments:', appointmentsError)
      throw appointmentsError
    }

    // Get all clients for the business
    const { data: clientBusinesses, error: clientsError } = await supabaseAdmin
      .from('client_businesses')
      .select(`
        *,
        users!client_businesses_client_id_fkey (
          id,
          first_name,
          last_name,
          created_at
        )
      `)
      .eq('business_id', businessId)

    if (clientsError) {
      console.error('Error fetching clients:', clientsError)
      throw clientsError
    }

    // Calculate metrics
    const totalRevenue = appointments?.reduce((sum, apt) => {
      return sum + (apt.services?.price || 0)
    }, 0) || 0

    const totalAppointments = appointments?.length || 0
    const totalClients = clientBusinesses?.length || 0
    const avgAppointmentValue = totalAppointments > 0 ? totalRevenue / totalAppointments : 0

    // Calculate monthly data
    const monthlyMap = new Map()

    appointments?.forEach(apt => {
      const date = new Date(apt.appointment_date)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, {
          month: monthKey + '-01',
          revenue: 0,
          appointments: 0,
          newClients: 0,
          clientIds: new Set()
        })
      }

      const monthData = monthlyMap.get(monthKey)
      monthData.revenue += apt.services?.price || 0
      monthData.appointments += 1

      if (apt.users?.id) {
        monthData.clientIds.add(apt.users.id)
      }
    })

    // Count new clients per month
    clientBusinesses?.forEach(cb => {
      if (cb.users?.created_at) {
        const date = new Date(cb.users.created_at)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

        if (monthlyMap.has(monthKey)) {
          monthlyMap.get(monthKey).newClients += 1
        }
      }
    })

    const monthlyData = Array.from(monthlyMap.values())
      .sort((a, b) => a.month.localeCompare(b.month))
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .map(({ clientIds: _, ...data }) => data)

    // Calculate top services
    const serviceMap = new Map()

    appointments?.forEach(apt => {
      if (apt.services) {
        const serviceName = apt.services.name
        if (!serviceMap.has(serviceName)) {
          serviceMap.set(serviceName, {
            name: serviceName,
            count: 0,
            revenue: 0
          })
        }

        const serviceData = serviceMap.get(serviceName)
        serviceData.count += 1
        serviceData.revenue += apt.services.price || 0
      }
    })

    const topServices = Array.from(serviceMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    // Calculate client retention
    const clientsInRange = new Set()
    const returningClients = new Set()

    appointments?.forEach(apt => {
      if (apt.users?.id) {
        const clientId = apt.users.id
        if (clientsInRange.has(clientId)) {
          returningClients.add(clientId)
        } else {
          clientsInRange.add(clientId)
        }
      }
    })

    const newClientsInRange = clientsInRange.size - returningClients.size

    const reports = {
      totalRevenue,
      totalAppointments,
      totalClients,
      avgAppointmentValue,
      monthlyData,
      topServices,
      clientRetention: {
        returning: returningClients.size,
        new: newClientsInRange
      }
    }

    return NextResponse.json({
      success: true,
      reports
    })

  } catch (error) {
    console.error('Error fetching reports:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}