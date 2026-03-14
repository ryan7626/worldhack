import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase credentials missing. Please add them to .env.local");
}

// Server-side client (bypasses RLS) — use in API routes only
export const supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey);

// Client-side client (respects RLS) — use in components
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
