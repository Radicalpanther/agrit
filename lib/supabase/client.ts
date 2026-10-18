import { createBrowserClient } from '@supabase/ssr'

function createClientInternal() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'
  )
}

let client: ReturnType<typeof createClientInternal> | null = null

export function createClient() {
  if (typeof window === 'undefined') {
    return createClientInternal()
  }

  if (!client) {
    client = createClientInternal()
  }

  return client
}


