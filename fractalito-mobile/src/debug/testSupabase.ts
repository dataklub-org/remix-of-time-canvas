import { supabase } from '../integrations/supabase/client';

export async function testSupabaseConnection() {
  console.log('🔍 Testing Supabase connection...')

  const { data, error } = await supabase
    .from('profiles')  
    .select('id')
    .limit(1)

  if (error) {
    console.log('❌ Supabase ERROR:', error)
  } else {
    console.log('✅ Supabase CONNECTED. Data:', data)
  }
}
