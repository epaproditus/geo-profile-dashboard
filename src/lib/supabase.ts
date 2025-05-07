import { createClient } from '@supabase/supabase-js'

// These environment variables need to be set in your Vite project
// and in your Vercel deployment
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials missing. Authentication will not work properly.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Helper functions for auth
export const signInWithEmail = async (email: string) => {
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  })
  
  return { data, error }
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  return { error }
}

export const getCurrentUser = async () => {
  const { data } = await supabase.auth.getUser()
  return data?.user
}

export const getSession = async () => {
  const { data } = await supabase.auth.getSession()
  return data?.session
}