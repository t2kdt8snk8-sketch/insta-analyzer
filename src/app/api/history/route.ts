import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function GET() {
   try {
       // Return latest 50 analyses
       const { data, error } = await supabase
          .from('analyses')
          .select('id, username, created_at, report, profile_data')
          .order('created_at', { ascending: false })
          .limit(50);

       if (error) throw error;

       return NextResponse.json({ history: data });
   } catch(e: any) {
       console.error('[API] History Fetch Error:', e);
       return NextResponse.json({ error: '이력을 불러오는 데 실패했습니다.' }, { status: 500 });
   }
}
