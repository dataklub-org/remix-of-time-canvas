import { supabase } from '../integrations/supabase/client';
import { devLog } from '../utils/logger';

export async function testSupabaseConnection() {
  devLog('Testing Supabase connection...');

  const { data, error } = await supabase.from('profiles').select('id').limit(1);

  if (error) {
    devLog('Supabase error:', error);
  } else {
    devLog('Supabase connected. Data:', data);
  }
}
