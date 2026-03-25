import { supabaseAdmin } from '@/lib/supabase-server'

export interface Appointment {
  id: string
  business_id: string
  client_id: string
  service_id: string
  appointment_date: string
  appointment_time: string
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  notes?: string
  reminder_sent: boolean
  created_at: string
  updated_at: string
}

export interface CreateAppointmentData {
  business_id: string
  client_id: string
  service_id: string
  appointment_date: string
  appointment_time: string
  notes?: string
}

// Get appointments for a business (with optional pagination)
export async function getAppointmentsByBusinessId(
  businessId: string,
  options?: { page?: number; limit?: number }
): Promise<{ data: Appointment[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
  const page = Math.max(1, options?.page ?? 1)
  const limit = Math.min(100, Math.max(1, options?.limit ?? 20))
  const offset = (page - 1) * limit

  const { data, error, count } = await supabaseAdmin
    .from('appointments')
    .select(`
      *,
      users!appointments_client_id_fkey (
        id,
        first_name,
        last_name,
        phone
      ),
      services (
        id,
        name,
        price,
        duration_minutes
      )
    `, { count: 'exact' })
    .eq('business_id', businessId)
    .order('appointment_date', { ascending: false })
    .order('appointment_time', { ascending: true })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error('Error fetching appointments:', error)
    throw new Error('Failed to fetch appointments')
  }

  const total = count ?? 0
  return {
    data: data || [],
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
  }
}

// Get today's appointments for a business
export async function getTodaysAppointments(businessId: string): Promise<Appointment[]> {
  // Use local date instead of UTC to match how appointments are created
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  const todayLocal = `${year}-${month}-${day}`

  const { data, error } = await supabaseAdmin
    .from('appointments')
    .select(`
      *,
      users!appointments_client_id_fkey (
        id,
        first_name,
        last_name,
        phone
      ),
      services (
        id,
        name,
        price,
        duration_minutes
      )
    `)
    .eq('business_id', businessId)
    .eq('appointment_date', todayLocal)
    .order('appointment_time', { ascending: true })

  if (error) {
    console.error('Error fetching today\'s appointments:', error)
    throw new Error('Failed to fetch today\'s appointments')
  }

  return data || []
}

// Create a new appointment
export async function createAppointment(appointmentData: CreateAppointmentData): Promise<Appointment> {
  const { data, error } = await supabaseAdmin
    .from('appointments')
    .insert(appointmentData)
    .select()
    .single()

  if (error) {
    console.error('Error creating appointment:', error)
    throw new Error('Failed to create appointment')
  }

  return data
}

// Update appointment status
export async function updateAppointmentStatus(
  appointmentId: string,
  status: Appointment['status']
): Promise<Appointment> {
  const { data, error } = await supabaseAdmin
    .from('appointments')
    .update({
      status,
      updated_at: new Date().toISOString()
    })
    .eq('id', appointmentId)
    .select()
    .single()

  if (error) {
    console.error('Error updating appointment status:', error)
    throw new Error('Failed to update appointment status')
  }

  return data
}

// Get appointment statistics for dashboard
export async function getAppointmentStats(businessId: string) {
  try {
    // Use local date instead of UTC to match how appointments are created
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    const todayLocal = `${year}-${month}-${day}`
    
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const monthYear = startOfMonth.getFullYear()
    const monthMonth = String(startOfMonth.getMonth() + 1).padStart(2, '0')
    const monthDay = String(startOfMonth.getDate()).padStart(2, '0')
    const startOfMonthLocal = `${monthYear}-${monthMonth}-${monthDay}`

    // Get today's appointments count
    const { data: todayData, error: todayError } = await supabaseAdmin
      .from('appointments')
      .select('id')
      .eq('business_id', businessId)
      .eq('appointment_date', todayLocal)

    if (todayError) throw todayError

    // Get this month's appointments
    const { data: monthData, error: monthError } = await supabaseAdmin
      .from('appointments')
      .select('id')
      .eq('business_id', businessId)
      .gte('appointment_date', startOfMonthLocal)

    if (monthError) throw monthError

    // Get pending appointments
    const { data: pendingData, error: pendingError } = await supabaseAdmin
      .from('appointments')
      .select('id')
      .eq('business_id', businessId)
      .eq('status', 'pending')
      .gte('appointment_date', todayLocal)

    if (pendingError) throw pendingError

    // Get this month's revenue (completed appointments)
    const { data: revenueData, error: revenueError } = await supabaseAdmin
      .from('appointments')
      .select(`
        services (
          price
        )
      `)
      .eq('business_id', businessId)
      .gte('appointment_date', startOfMonthLocal)
      .eq('status', 'completed')

    if (revenueError) throw revenueError

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const monthlyRevenue = (revenueData as any[])?.reduce((total: number, appointment: { services?: { price?: number } }) => {
      return total + (appointment.services?.price || 0)
    }, 0) || 0

    return {
      todayAppointments: todayData?.length || 0,
      monthlyAppointments: monthData?.length || 0,
      pendingAppointments: pendingData?.length || 0,
      monthlyRevenue: monthlyRevenue
    }
  } catch (error) {
    console.error('Error fetching appointment stats:', error)
    return {
      todayAppointments: 0,
      monthlyAppointments: 0,
      pendingAppointments: 0,
      monthlyRevenue: 0
    }
  }
}