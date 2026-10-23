const { requireUser } = require("./_lib/supabase");
const { send, methodNotAllowed, fail } = require("./_lib/http");

const TYPES = new Set(["DEPOSIT", "WITHDRAWAL"]);
const CURRENCIES = new Set(["USD", "EUR", "BTC", "ETH", "USDT"]);

module.exports = async function transactions(req, res) {
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);
  try {
    const { user, db } = await requireUser(req);
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const type = String(body.type || "").toUpperCase();
    const currency = String(body.currency || "").toUpperCase();
    const amount = Number(body.amount);
    const reference = typeof body.reference === "string" ? body.reference.trim().slice(0, 160) : "";
    if (!TYPES.has(type)) return send(res, 400, { error: "Choose DEPOSIT or WITHDRAWAL." });
    if (!CURRENCIES.has(currency)) return send(res, 400, { error: "Unsupported currency." });
    if (!Number.isFinite(amount) || amount <= 0 || amount > 1000000000 || !/^\d+(\.\d{1,8})?$/.test(String(body.amount).trim())) {
      return send(res, 400, { error: "Enter a positive amount with no more than 8 decimal places." });
    }
    if (reference.length > 160) return send(res, 400, { error: "Reference is too long." });
    const { data, error } = await db.from("transactions").insert({
      user_id: user.id,
      type,
      amount,
      currency,
      status: "PENDING",
      reference: reference || null
    }).select("id,type,amount,currency,status,reference,created_at").single();
    if (error) throw error;
    return send(res, 201, { transaction: data });
  } catch (error) {
    return fail(res, error);
  }
};
