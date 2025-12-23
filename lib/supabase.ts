import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types for type safety
export interface WordList {
  id: string
  name: string
  filename: string
  description?: string
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface Word {
  id: string
  word_list_id: string
  word: string
  created_at: string
}
