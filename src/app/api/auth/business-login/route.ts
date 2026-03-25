import { NextResponse } from 'next/server'
import { getUserByEmail } from '@/lib/db/users'
import { getBusinessById } from '@/lib/db/businesses'
import { BusinessLoginSchema } from '@/lib/schemas'
import bcrypt from 'bcryptjs'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const result = BusinessLoginSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.flatten().fieldErrors },
        { status: 400 }
      )
    }
    const { email, password, businessId } = result.data

    // Get the user by email
    const user = await getUserByEmail(email)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Check if user is a business admin
    if (user.role !== 'business_admin') {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Verify password
    if (!user.password_hash) {
      return NextResponse.json(
        { success: false, error: 'Invalid account configuration' },
        { status: 401 }
      )
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash)
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Get the business and verify ownership
    const business = await getBusinessById(businessId)
    if (!business) {
      return NextResponse.json(
        { success: false, error: 'Business not found' },
        { status: 404 }
      )
    }

    // Check if user owns this business
    if (business.owner_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'You are not authorized to access this business' },
        { status: 403 }
      )
    }

    // Return user data (exclude password hash)
    const userData = {
      id: user.id,
      role: user.role,
      email: user.email,
      phone: user.phone,
      first_name: user.first_name,
      last_name: user.last_name,
      businessId: business.id,
      businessName: business.business_name
    }

    return NextResponse.json({
      success: true,
      user: userData,
      business: {
        id: business.id,
        business_name: business.business_name,
        owner_name: business.owner_name,
        phone: business.phone,
        address: business.address,
        business_image_url: business.business_image_url,
        theme_settings: business.theme_settings
      }
    })

  } catch (error) {
    console.error('Business login error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}