const { requireAdmin } = require("../_lib/supabase");
const { send, methodNotAllowed, fail } = require("../_lib/http");

const ALLOWED = new Set(["UNDER_REVIEW", "COMPLETED", "REJECTED"]);

module.exports = async function adminTransactions(req, res) {
  try {
    const { user, db } = await requireAdmin(req);
    if (req.method === "GET") {
      const { data, error } = await db.from("transactions")
        .select("id,user_id,type,amount,currency,status,reference,admin_notes,created_at,updated_at")
        .in("status", ["PENDING", "UNDER_REVIEW"])
        .order("created_at", { ascending: true })
        .limit(100);
      if (error) throw error;
      return send(res, 200, { transactions: data || [] });
    }
    if (req.method === "PATCH") {
      const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
      const id = String(body.id || "");
      const status = String(body.status || "").toUpperCase();
      const notes = typeof body.notes === "string" ? body.notes.trim().slice(0, 1000) : "";
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
        return send(res, 400, { error: "A valid transaction ID is required." });
      }
      if (!ALLOWED.has(status)) return send(res, 400, { error: "Invalid review status." });
      const { data, error } = await db.rpc("admin_update_transaction_status", {
        p_transaction_id: id,
        p_status: status,
        p_admin_notes: notes,
        p_admin_user_id: user.id
      });
      if (error) {
        if (/not found/i.test(error.message)) return send(res, 404, { error: "Transaction not found." });
        if (/Only pending|Invalid transaction status/i.test(error.message)) return send(res, 409, { error: error.message });
        throw error;
      }
      return send(res, 200, { transaction: data });
    }
    return methodNotAllowed(res, ["GET", "PATCH"]);
  } catch (error) {
    return fail(res, error);
  }
};
