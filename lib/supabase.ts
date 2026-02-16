import { createClient } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

// Client-side Supabase client
export const createClientComponentClient = () => {
  return createBrowserClient(supabaseUrl, supabasePublishableKey)
}

// Server-side Supabase client (for API routes)
export const createServerComponentClient = () => {
  return createClient(supabaseUrl, supabasePublishableKey, {
    auth: {
      persistSession: false,
    },
  })
}

// Admin client for server-side operations (use with caution)
export const createAdminClient = () => {
  const secretKey = process.env.SUPABASE_SECRET_KEY!
  return createClient(supabaseUrl, secretKey, {
    auth: {
      persistSession: false,
    },
  })
}
