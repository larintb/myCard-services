import { NextResponse } from 'next/server'
import { validateToken, markTokenAsUsed } from '@/lib/db/tokens'
import { createUser } from '@/lib/db/users'
import { registerClientToBusiness } from '@/lib/db/clientBusinesses'
import { RegisterClientSchema } from '@/lib/schemas'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const result = RegisterClientSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.flatten().fieldErrors },
        { status: 400 }
      )
    }
    const { token, first_name, last_name, phone } = result.data

    // Validate token
    const tokenData = await validateToken(token)
    if (!tokenData || tokenData.type !== 'final_client') {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 400 }
      )
    }

    // Create user (no password needed for final clients)
    const user = await createUser({
      role: 'final_client',
      phone,
      first_name,
      last_name
    })

    // Mark token as used
    await markTokenAsUsed(tokenData.id, user.id)

    // Register client to business if token has business_id
    if (tokenData.business_id) {
      await registerClientToBusiness(user.id, tokenData.business_id, tokenData.id)
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone,
        role: user.role
      },
      message: 'Client account created successfully'
    })

  } catch (error: unknown) {
    console.error('Client registration error:', error)

    // Handle duplicate phone error if we add unique constraint later
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((error as any).code === '23505' && (error as any).details?.includes('phone')) {
      return NextResponse.json(
        { error: 'Phone number already registered' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    )
  }
}