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

export interface ImageList {
  id: string
  name: string
  folder: string
  description?: string
  is_default: boolean
  is_user_created?: boolean
  created_by?: string
  created_at: string
  updated_at: string
}

export interface Image {
  id: string
  image_list_id: string
  image_path: string
  uploaded_by?: string
  original_filename?: string
  file_size?: number
  mime_type?: string
  uploaded_at?: string
  created_at: string
}
