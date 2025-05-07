import { supabase } from './supabaseClient';

export async function saveProject(name, objects, totalPrice) {
  const { data, error } = await supabase
    .from('projects')
    .insert([{ name, objects, total_price: totalPrice }]);

  if (error) {
    console.error('❌ 저장 실패:', error.message);
  } else {
    console.log('✅ 저장 완료:', data);
  }
}
