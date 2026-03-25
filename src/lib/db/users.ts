import { supabaseAdmin } from '@/lib/supabase-server'
import { User, UserRole } from '@/types'

export interface CreateUserData {
  role: UserRole
  email?: string
  phone?: string
  password_hash?: string
  first_name?: string
  last_name?: string
}

// Create a new user
export async function createUser(userData: CreateUserData): Promise<User> {
  const { data, error } = await supabaseAdmin
    .from('users')
    .insert(userData)
    .select()
    .single()

  if (error) {
    console.error('Error creating user:', error)
    throw new Error('Failed to create user')
  }

  return data
}

// Get user by ID - uses admin client to bypass RLS
export async function getUserById(userId: string): Promise<User | null> {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // User not found
    }
    console.error('Error fetching user:', error)
    throw new Error('Failed to fetch user')
  }

  return data
}

// Get user by email (for login) - uses admin client to bypass RLS
export async function getUserByEmail(email: string): Promise<User | null> {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('email', email)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // User not found
    }
    console.error('Error fetching user by email:', error)
    throw new Error('Failed to fetch user')
  }

  return data
}

// Get all users with specific role
export async function getUsersByRole(role: UserRole): Promise<User[]> {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('role', role)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching users by role:', error)
    throw new Error('Failed to fetch users')
  }

  return data || []
}

// Update user data
export async function updateUser(userId: string, updates: Partial<User>): Promise<User> {
  const { data, error } = await supabaseAdmin
    .from('users')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single()

  if (error) {
    console.error('Error updating user:', error)
    throw new Error('Failed to update user')
  }

  return data
}

// Delete user (soft delete by setting inactive)
export async function deleteUser(userId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('users')
    .delete()
    .eq('id', userId)

  if (error) {
    console.error('Error deleting user:', error)
    throw new Error('Failed to delete user')
  }
}

// Get user counts for dashboard
export async function getUserCounts() {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('role')

  if (error) {
    console.error('Error fetching user counts:', error)
    return { superuser: 0, business_admin: 0, final_client: 0 }
  }

  type UserRoleCounts = {
    superuser: number
    business_admin: number
    final_client: number
  }

  const counts = data.reduce(
    (acc: UserRoleCounts, user) => {
      acc[user.role as keyof UserRoleCounts] = (acc[user.role as keyof UserRoleCounts] || 0) + 1
      return acc
    },
    { superuser: 0, business_admin: 0, final_client: 0 }
  )

  return counts
}