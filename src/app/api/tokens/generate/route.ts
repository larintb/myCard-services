import { NextResponse } from 'next/server'
import { createInvitationToken, generateTokenString } from '@/lib/db/tokens'
import { getUserById } from '@/lib/db/users'
import { TokenGenerateSchema } from '@/lib/schemas'
import { TokenType } from '@/types'

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Validate createdBy separately (not in schema, it's auth data)
    const { createdBy } = body
    if (!createdBy) {
      return NextResponse.json({ error: 'createdBy is required' }, { status: 400 })
    }

    const result = TokenGenerateSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.flatten().fieldErrors },
        { status: 400 }
      )
    }
    const { type, businessId, expiresInDays } = result.data

    // Verify the user creating the token exists and has permission
    const creatorUser = await getUserById(createdBy)
    if (!creatorUser || creatorUser.role !== 'superuser') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // For final_client tokens, business_id is required
    if (type === 'final_client' && !businessId) {
      return NextResponse.json(
        { error: 'Business ID is required for client tokens' },
        { status: 400 }
      )
    }

    // Generate unique token string
    const tokenString = generateTokenString(type as TokenType)

    // Calculate expiration date if provided
    let expiresAt: string | undefined
    if (expiresInDays) {
      const expireDate = new Date()
      expireDate.setDate(expireDate.getDate() + expiresInDays)
      expiresAt = expireDate.toISOString()
    }

    // Create token in database
    const token = await createInvitationToken({
      token: tokenString,
      type: type as TokenType,
      created_by: createdBy,
      business_id: businessId,
      expires_at: expiresAt
    })

    return NextResponse.json({
      success: true,
      token: tokenString,
      tokenId: token.id,
      type: token.type,
      expiresAt: token.expires_at
    })

  } catch (error) {
    console.error('Token generation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}