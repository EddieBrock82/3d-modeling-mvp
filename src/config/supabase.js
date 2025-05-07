// supabase.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 테이블 구조
export const TABLES = {
  USER_SESSIONS: 'user_sessions',
  MODELS: 'models',
  ESTIMATES: 'estimates',
  CUSTOMER_REQUESTS: 'customer_requests'
};

// RLS (Row Level Security) 정책
export const RLS_POLICIES = {
  USER_SESSIONS: {
    SELECT: 'auth.uid() = user_id',
    INSERT: 'true',
    UPDATE: 'auth.uid() = user_id',
    DELETE: 'auth.uid() = user_id'
  },
  MODELS: {
    SELECT: 'true',
    INSERT: 'auth.role() = \'authenticated\'',
    UPDATE: 'auth.role() = \'authenticated\'',
    DELETE: 'auth.role() = \'authenticated\''
  }
};