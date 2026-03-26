import { NextResponse } from 'next/server'
import { validateToken, getTokenWithBusiness, getUserByToken, getTokenByString } from '@/lib/db/tokens'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { generateBusinessSlug } from '@/utils/slug'

export async function POST(request: Request) {
  try {
    // Rate limit: 20 requests per IP per minute
    const ip = getClientIp(request)
    const limit = rateLimit(`token-validate:${ip}`, { limit: 20, windowMs: 60 * 1000 })
    if (!limit.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please try again later.' },
        { status: 429 }
      )
    }

    const { token, type } = await request.json()

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      )
    }

    // Try to validate as an active token first
    let tokenData = await validateToken(token)
    let canRegister = true

    // If not active, check if it's a used token (for returning clients only)
    if (!tokenData) {
      const usedTokenData = await getTokenByString(token)

      if (usedTokenData && usedTokenData.status === 'used') {
        // Verify a user actually exists for this token before allowing access
        const existingUser = await getUserByToken(token)
        if (!existingUser) {
          // Token is used but no user found — invalid state, reject
          return NextResponse.json({
            success: false,
            error: 'Token is invalid or expired'
          }, { status: 400 })
        }
        tokenData = usedTokenData
        canRegister = false  // Used token: returning user only, no new registration
      }
    }

    if (!tokenData) {
      return NextResponse.json({
        success: false,
        error: 'Token is invalid or expired'
      }, { status: 400 })
    }

    // If type is specified, verify it matches
    if (type && tokenData.type !== type) {
      return NextResponse.json({
        success: false,
        error: 'Token type mismatch'
      }, { status: 400 })
    }

    const responseData: {
      success: boolean
      canRegister: boolean
      token: { id: string; type: string; status: string; expires_at: string | null }
      business?: { id: string; business_name: string; owner_name: string; phone: string; address: string; address_latitude: number | null; address_longitude: number | null; business_image_url: string | null; theme_settings: object; slug: string }
      user?: { id: string; first_name?: string; last_name?: string; phone?: string; role?: string }
      isRegistered?: boolean
    } = {
      success: true,
      canRegister,
      token: {
        id: tokenData.id,
        type: tokenData.type,
        status: tokenData.status,
        expires_at: tokenData.expires_at || null
      }
    }

    // For final_client tokens, include business information
    if (tokenData.type === 'final_client') {
      const tokenWithBusiness = await getTokenWithBusiness(token)
      if (tokenWithBusiness?.business) {
        responseData.business = {
          id: tokenWithBusiness.business.id,
          business_name: tokenWithBusiness.business.business_name,
          owner_name: tokenWithBusiness.business.owner_name,
          phone: tokenWithBusiness.business.phone,
          address: tokenWithBusiness.business.address,
          address_latitude: tokenWithBusiness.business.address_latitude ?? null,
          address_longitude: tokenWithBusiness.business.address_longitude ?? null,
          business_image_url: tokenWithBusiness.business.business_image_url || null,
          theme_settings: tokenWithBusiness.business.theme_settings || {},
          slug: generateBusinessSlug(tokenWithBusiness.business.business_name)
        }
      }

      // Check if user already registered with this token
      const existingUser = await getUserByToken(token)
      if (existingUser) {
        responseData.user = {
          id: existingUser.id,
          first_name: existingUser.first_name,
          last_name: existingUser.last_name,
          phone: existingUser.phone,
          role: existingUser.role as string
        }
        responseData.isRegistered = true
      } else {
        responseData.isRegistered = false
      }
    }

    return NextResponse.json(responseData)

  } catch (error) {
    console.error('Token validation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}