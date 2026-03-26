import { supabaseAdmin } from '@/lib/supabase-server'
import { InvitationToken, TokenType, TokenStatus, Business } from '@/types'

export interface CreateTokenData {
  token: string
  type: TokenType
  created_by: string
  business_id?: string
  expires_at?: string
}

// Create a new invitation token
export async function createInvitationToken(tokenData: CreateTokenData): Promise<InvitationToken> {
  const { data, error } = await supabaseAdmin
    .from('invitation_tokens')
    .insert(tokenData)
    .select()
    .single()

  if (error) {
    console.error('Error creating invitation token:', error)
    throw new Error('Failed to create invitation token')
  }

  return data
}

// Get token by token string
export async function getTokenByString(token: string): Promise<InvitationToken | null> {
  const { data, error } = await supabaseAdmin
    .from('invitation_tokens')
    .select('*')
    .eq('token', token)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Token not found
    }
    console.error('Error fetching token:', error)
    throw new Error('Failed to fetch token')
  }

  return data
}

// Validate token (check if active and not expired)
export async function validateToken(token: string): Promise<InvitationToken | null> {
  const { data, error } = await supabaseAdmin
    .from('invitation_tokens')
    .select('*')
    .eq('token', token)
    .eq('status', 'active')
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Token not found or not active
    }
    console.error('Error validating token:', error)
    return null
  }

  // Check if token is expired
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    await markTokenExpired(token)
    return null
  }

  return data
}

// Mark token as used
export async function markTokenAsUsed(tokenId: string, userId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('invitation_tokens')
    .update({
      status: 'used' as TokenStatus,
      used_by: userId,
      used_at: new Date().toISOString()
    })
    .eq('id', tokenId)

  if (error) {
    console.error('Error marking token as used:', error)
    throw new Error('Failed to mark token as used')
  }
}

// Mark token as expired
export async function markTokenExpired(token: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('invitation_tokens')
    .update({ status: 'expired' as TokenStatus })
    .eq('token', token)

  if (error) {
    console.error('Error marking token as expired:', error)
  }
}

// Generate unique token string
export function generateTokenString(type: TokenType): string {
  const prefix = type === 'business_admin' ? 'ba_' : 'fc_'
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2)
  return `${prefix}${timestamp}${random}`
}

// Get token with business information (for client tokens)
export async function getTokenWithBusiness(token: string): Promise<{
  token: InvitationToken
  business: Business
} | null> {
  // First get the token
  const tokenData = await getTokenByString(token)
  if (!tokenData || !tokenData.business_id) {
    return null
  }

  // Then get the business separately
  const { data: businessData, error: businessError } = await supabaseAdmin
    .from('businesses')
    .select(`
      id,
      business_name,
      owner_name,
      phone,
      address,
      address_latitude,
      address_longitude,
      business_image_url,
      theme_settings
    `)
    .eq('id', tokenData.business_id)
    .single()

  if (businessError) {
    console.error('Error fetching business:', businessError)
    return null
  }

  return {
    token: tokenData,
    business: businessData as unknown as Business
  }
}

// Get user by token (for final clients using NFC)
export async function getUserByToken(token: string): Promise<{ id: string; first_name: string; last_name: string; phone: string; [key: string]: unknown } | null> {
  // Get token data regardless of status (could be used)
  const tokenData = await getTokenByString(token)
  if (!tokenData || !tokenData.used_by) {
    return null
  }

  const { data, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', tokenData.used_by)
    .single()

  if (error) {
    console.error('Error fetching user by token:', error)
    return null
  }

  return data
}

// Get all tokens for admin dashboard
export async function getAllTokens(): Promise<InvitationToken[]> {
  const { data, error } = await supabaseAdmin
    .from('invitation_tokens')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching all tokens:', error)
    throw new Error('Failed to fetch tokens')
  }

  return data || []
}

// Get token stats for dashboard
export async function getTokenStats() {
  const { data, error } = await supabaseAdmin
    .from('invitation_tokens')
    .select('status, type, created_at')

  if (error) {
    console.error('Error fetching token stats:', error)
    return {
      total: 0,
      active: 0,
      used: 0,
      expired: 0,
      business_admin: 0,
      final_client: 0
    }
  }

  type TokenStats = {
    total: number
    active: number
    used: number
    expired: number
    business_admin: number
    final_client: number
  }

  const stats = data.reduce(
    (acc: TokenStats, token) => {
      acc.total++
      acc[token.status as keyof TokenStats]++
      acc[token.type as keyof TokenStats]++
      return acc
    },
    {
      total: 0,
      active: 0,
      used: 0,
      expired: 0,
      business_admin: 0,
      final_client: 0
    }
  )

  return stats
}