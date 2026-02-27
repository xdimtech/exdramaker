import { createClient } from "@supabase/supabase-js";

import type { SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_APP_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_APP_SUPABASE_ANON_KEY as string;

// 是否配置了 Supabase
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

// 创建 Supabase 客户端（如果没有配置则导出 null）
let supabase: SupabaseClient | null = null;

if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

// 导出 supabase 客户端，如果未配置则导出 null
export { supabase };
