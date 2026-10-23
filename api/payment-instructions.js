const { requireUser, requireAdmin } = require("../lib/supabase-server");
const { send, methodNotAllowed, fail } = require("../lib/api-http");

const KINDS = new Set(["CRYPTO", "BANK"]);
const CURRENCIES = new Set(["BTC", "ETH", "USDT", "USD", "EUR"]);

function cleanInstruction(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw Object.assign(new Error("instructions must be an object."), {status:400});
  const allowed = ["address", "accountName", "bankName", "iban", "accountNumber", "swiftBic", "sortCode", "reference", "additionalInfo"];
  const result = {};
  for (const key of allowed) {
    if (input[key] !== undefined) {
      if (typeof input[key] !== "string" || input[key].length > 500) throw Object.assign(new Error("Invalid payment instruction field: " + key), {status:400});
      result[key] = input[key].trim();
    }
  }
  return result;
}

module.exports = async function paymentInstructions(req, res) {
  try {
    if (req.method === "GET") {
      const { db } = await requireUser(req);
      const { data, error } = await db.from("payment_instructions")
        .select("id,code,kind,currency,network,label,instructions,is_active")
        .eq("is_active", true).order("kind").order("currency");
      if (error) throw error;
      return send(res, 200, { methods: data || [] });
    }
    if (req.method === "POST" || req.method === "PATCH") {
      const { db } = await requireAdmin(req);
      const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
      const code = String(body.code || "").trim().toUpperCase();
      const kind = String(body.kind || "").trim().toUpperCase();
      const currency = String(body.currency || "").trim().toUpperCase();
      const network = typeof body.network === "string" ? body.network.trim().slice(0,80) : null;
      const label = typeof body.label === "string" ? body.label.trim().slice(0,120) : "";
      const is_active = body.is_active === true;
      if (!/^[A-Z0-9_-]{2,40}$/.test(code)) return send(res, 400, {error:"Use a 2–40 character code with letters, numbers, underscores, or hyphens."});
      if (!KINDS.has(kind) || !CURRENCIES.has(currency)) return send(res, 400, {error:"Unsupported payment kind or currency."});
      if (!label) return send(res, 400, {error:"A label is required."});
      const instructions = cleanInstruction(body.instructions);
      if (kind === "CRYPTO" && !instructions.address) return send(res, 400, {error:"A wallet address is required for crypto instructions."});
      if (kind === "BANK" && !(instructions.iban || instructions.accountNumber)) return send(res, 400, {error:"An IBAN or account number is required for bank instructions."});
      if (kind === "CRYPTO" && currency === "USDT" && !network) return send(res, 400, {error:"Specify the exact USDT network."});
      const row = {code,kind,currency,network,label,instructions,is_active,updated_at:new Date().toISOString()};
      const {data,error}=await db.from("payment_instructions").upsert(row,{onConflict:"code"}).select("id,code,kind,currency,network,label,instructions,is_active").single();
      if(error) throw error;
      return send(res, req.method==="POST" ? 201 : 200, {method:data});
    }
    return methodNotAllowed(res, ["GET","POST","PATCH"]);
  } catch(error) { return fail(res,error); }
};
