import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

// GET /api/admin/stats - Get admin dashboard statistics
export async function GET() {
  try {
    // Get businesses count
    const { count: businessCount, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select('*', { count: 'exact', head: true })

    if (businessError) {
      console.error('Error counting businesses:', businessError)
      throw businessError
    }

    // Get clients count (users with role 'final_client')
    const { count: clientCount, error: clientError } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'final_client')

    if (clientError) {
      console.error('Error counting clients:', clientError)
      throw clientError
    }

    // Get active tokens count
    const { count: tokenCount, error: tokenError } = await supabaseAdmin
      .from('invitation_tokens')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')

    if (tokenError) {
      console.error('Error counting tokens:', tokenError)
      throw tokenError
    }

    // Get total appointments count
    const { count: appointmentCount, error: appointmentError } = await supabaseAdmin
      .from('appointments')
      .select('*', { count: 'exact', head: true })

    if (appointmentError) {
      console.error('Error counting appointments:', appointmentError)
      throw appointmentError
    }

    const stats = {
      activeBusinesses: businessCount || 0,
      totalClients: clientCount || 0,
      activeTokens: tokenCount || 0,
      totalAppointments: appointmentCount || 0
    }

    return NextResponse.json({
      success: true,
      stats
    })

  } catch (error) {
    console.error('Error in admin stats API:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}