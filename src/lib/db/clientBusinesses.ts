import { supabaseAdmin } from '@/lib/supabase-server'

export interface ClientBusiness {
  id: string
  client_id: string
  business_id: string
  token_used: string
  created_at: string
}

// Get all clients for a business
export async function getClientsByBusinessId(businessId: string) {
  const { data, error } = await supabaseAdmin
    .from('client_businesses')
    .select(`
      *,
      users!client_businesses_client_id_fkey (
        id,
        first_name,
        last_name,
        phone,
        created_at
      )
    `)
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching clients:', error)
    throw new Error('Failed to fetch clients')
  }

  return data || []
}

// Get client count for a business
export async function getClientCount(businessId: string): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from('client_businesses')
    .select('id')
    .eq('business_id', businessId)

  if (error) {
    console.error('Error fetching client count:', error)
    return 0
  }

  return data?.length || 0
}

// Check if client is registered to business
export async function isClientRegisteredToBusiness(clientId: string, businessId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('client_businesses')
    .select('id')
    .eq('client_id', clientId)
    .eq('business_id', businessId)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('Error checking client registration:', error)
    return false
  }

  return !!data
}

// Register client to business
export async function registerClientToBusiness(
  clientId: string,
  businessId: string,
  tokenId: string
): Promise<ClientBusiness> {
  const { data, error } = await supabaseAdmin
    .from('client_businesses')
    .insert({
      client_id: clientId,
      business_id: businessId,
      token_used: tokenId
    })
    .select()
    .single()

  if (error) {
    console.error('Error registering client to business:', error)
    throw new Error('Failed to register client to business')
  }

  return data
}