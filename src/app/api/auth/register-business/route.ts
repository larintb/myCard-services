import { NextResponse } from 'next/server'
import { validateToken, markTokenAsUsed } from '@/lib/db/tokens'
import { createUser } from '@/lib/db/users'
import { createBusiness, generateBusinessSlug } from '@/lib/db/businesses'
import { RegisterBusinessSchema } from '@/lib/schemas'
import bcrypt from 'bcryptjs'

interface SupabaseError {
  code?: string
  details?: string
  message: string
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const result = RegisterBusinessSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.flatten().fieldErrors },
        { status: 400 }
      )
    }
    const {
      token,
      first_name,
      last_name,
      email,
      phone,
      password,
      business_name,
      owner_name,
      business_phone,
      address
    } = result.data
    const business_image = body.business_image

    // Validate token
    const tokenData = await validateToken(token)
    if (!tokenData || tokenData.type !== 'business_admin') {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 400 }
      )
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10)

    // Create user
    const user = await createUser({
      role: 'business_admin',
      email,
      phone,
      password_hash: passwordHash,
      first_name,
      last_name
    })

    // Create business
    const business = await createBusiness({
      owner_id: user.id,
      business_name,
      owner_name,
      phone: business_phone,
      address,
      business_image_url: business_image || undefined,
      theme_settings: {
        primary_color: '#3B82F6',
        secondary_color: '#1F2937',
        font_family: 'Inter'
      }
    })

    // Mark token as used
    await markTokenAsUsed(tokenData.id, user.id)

    // Generate business slug for URLs
    const businessSlug = generateBusinessSlug(business_name)

    // Remove password from response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash: _, ...userResponse } = user

    return NextResponse.json({
      success: true,
      user: userResponse,
      business: {
        id: business.id,
        business_name: business.business_name,
        slug: businessSlug
      },
      message: 'Business account created successfully'
    })

  } catch (error: unknown) {
    console.error('Business registration error:', error)

    // Handle duplicate email error
    const supabaseError = error as SupabaseError
    if (supabaseError.code === '23505' && supabaseError.details?.includes('email')) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    )
  }
}