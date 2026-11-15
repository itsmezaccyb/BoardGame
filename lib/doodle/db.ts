import { createClient } from '@supabase/supabase-js';

/**
 * Supabase client for Doodle Relay that never uses Next.js's fetch cache.
 * Next 14 caches GET fetches made by route handlers even with
 * `dynamic = 'force-dynamic'`, so the shared client can hand back a player
 * list from before someone joined. Game state must always be live.
 */
export const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
  auth: { persistSession: false },
  global: {
    fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }),
  },
});
