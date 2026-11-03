/* =========================================================
   REDLINE GARAGE
   SUPABASE CONNECTION
========================================================= */

const SUPABASE_URL =
    "https://wkcrwslyyrzizvljbnoe.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_kOOW-8sd-R9TZlisVNc7Xw_drI2uggc";


const { createClient } =
    window.supabase;


const supabaseClient =
    createClient(
        SUPABASE_URL,
        SUPABASE_KEY,
        {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true
            }
        }
    );


/* Make available to the rest of the website */

window.redlineSupabase =
    supabaseClient;