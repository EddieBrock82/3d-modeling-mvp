import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://stjvvbquddmfpuerjkxd.supabase.co'; // 여기에 진짜 URL 넣기
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN0anZ2YnF1ZGRtZnB1ZXJqa3hkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYwMDU4MzMsImV4cCI6MjA2MTU4MTgzM30.Du04ket2z3giaDpZgo1nVNsbVGl8GYGb2JRsGicDanA'; // 여기에 진짜 키 넣기

export const supabase = createClient(supabaseUrl, supabaseKey);
