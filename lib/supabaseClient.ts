import { createClient } from "@supabase/supabase-js";

// 1. อ่านค่าจาก Environment Variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// 2. สร้างและ export client
// เราจะใช้ตัวแปรนี้ในทุกไฟล์แทนการสร้างใหม่
export const supabase = createClient(supabaseUrl, supabaseKey);
