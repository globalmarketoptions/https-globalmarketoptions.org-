const { requireAdmin } = require("../_lib/supabase");
const { send, methodNotAllowed, fail } = require("../_lib/http");

module.exports = async function adminUsers(req, res) {
  if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);
  try {
    const { db } = await requireAdmin(req);
    const { data, error } = await db.from("profiles")
      .select("id,email,display_name,created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return send(res, 200, { users: data || [] });
  } catch (error) {
    return fail(res, error);
  }
};
