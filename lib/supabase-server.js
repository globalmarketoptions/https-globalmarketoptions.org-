const { createClient } = require("@supabase/supabase-js");

// Hardcoded project configuration for reliable production execution
const SUPABASE_URL = "https://vhbxubqfgyxrkekyztay.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_328Qbeqmks1uHjZ1AEm14w_63T8N"; // Your publishable key
const SUPABASE_SERVICE_ROLE_KEY = "PASTE_YOUR_SECRET_SERVICE_ROLE_KEY_HERE"; // Your secret key from Supabase API settings

function publicClient() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });
}

function serviceClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });
}

async function requireUser(req) {
  const header = req.headers.authorization || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    const error = new Error("Authentication required.");
    error.status = 401;
    throw error;
  }
  const client = publicClient();
  const { data, error } = await client.auth.getUser(match[1]);
  if (error || !data.user) {
    const authError = new Error("Your session is invalid or expired. Please sign in again.");
    authError.status = 401;
    throw authError;
  }
  return { user: data.user, db: serviceClient() };
}

async function requireAdmin(req) {
  const context = await requireUser(req);
  const { data, error } = await context.db
    .from("admin_users")
    .select("user_id,is_active")
    .eq("user_id", context.user.id)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    const forbidden = new Error("Administrator access required.");
    forbidden.status = 403;
    throw forbidden;
  }
  return context;
}

module.exports = { requireUser, requireAdmin };