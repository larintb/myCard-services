import { NextResponse } from 'next/server'
import { signSession, type SessionPayload } from '@/lib/jwt'

// Called after a successful login to get a signed JWT for the cookie
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { id, businessId, first_name, last_name, email, businessName } = body

    if (!id || !businessId || !email) {
      return NextResponse.json(
        { success: false, error: 'Missing required session fields' },
        { status: 400 }
      )
    }

    const payload: SessionPayload = { id, businessId, first_name, last_name, email, businessName }
    const token = await signSession(payload)

    return NextResponse.json({ success: true, token })
  } catch (error) {
    console.error('Session signing error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create session' },
      { status: 500 }
    )
  }
}
