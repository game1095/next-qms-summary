import { createBrowserClient } from "@supabase/ssr";

// 1. อ่านค่าจาก Environment Variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// 2. สร้างและ export client
// We use createBrowserClient so that it syncs session with Cookies for the Middleware
export const supabase = createBrowserClient(supabaseUrl, supabaseKey);
