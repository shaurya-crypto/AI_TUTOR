import { createClient } from '@supabase/supabase-js'

async function resilientFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const maxRetries = 2
  let attempt = 0

  while (attempt <= maxRetries) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30-second timeout

    try {
      const response = await fetch(input, {
        ...init,
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      return response
    } catch (err: any) {
      clearTimeout(timeoutId)
      attempt++
      const isTimeout =
        err?.name === 'AbortError' ||
        err?.message?.includes('timeout') ||
        err?.message?.includes('ConnectTimeoutError') ||
        err?.cause?.name === 'ConnectTimeoutError' ||
        err?.cause?.message?.includes('ConnectTimeoutError')

      if (attempt > maxRetries || !isTimeout) {
        throw err
      }

      console.warn(`[Supabase Admin Client] Transient connection timeout on attempt ${attempt}. Retrying in 1000ms...`)
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt))
    }
  }

  throw new Error('Supabase admin request failed after multiple retries.')
}

export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || (process.env.NODE_ENV !== 'production' ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY : undefined)

  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is required in server environment.')
  }

  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY is required in server environment.')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: {
      fetch: resilientFetch,
    },
  })
}

