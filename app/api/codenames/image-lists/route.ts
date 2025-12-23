import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('image_lists')
      .select('name, folder, description, is_default')
      .order('name');

    if (error) {
      console.error('Error fetching image lists:', error);
      return NextResponse.json([], { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Error reading image lists:', error);
    return NextResponse.json([], { status: 500 });
  }
}

