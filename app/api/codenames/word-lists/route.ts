import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('word_lists')
      .select('name, filename, description, is_default')
      .order('name');

    if (error) {
      console.error('Error fetching word lists:', error);
      return NextResponse.json([], { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Error reading word lists:', error);
    return NextResponse.json([], { status: 500 });
  }
}

