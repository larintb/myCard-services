import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

// GET /api/admin/businesses - Get all businesses for admin
export async function GET() {
  try {
    // Get all businesses with detailed info
    const { data: businesses, error } = await supabaseAdmin
      .from('businesses')
      .select(`
        id,
        business_name,
        owner_name,
        phone,
        address,
        address_city,
        address_state,
        address_country,
        business_image_url,
        created_at,
        updated_at,
        users!businesses_owner_id_fkey (
          id,
          email,
          first_name,
          last_name
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching businesses:', error)
      throw error
    }

    return NextResponse.json({
      success: true,
      businesses: businesses || []
    })

  } catch (error) {
    console.error('Error in admin businesses API:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}