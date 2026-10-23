const { requireUser } = require("./_lib/supabase");
const { send, methodNotAllowed, fail } = require("./_lib/http");

module.exports = async function dashboard(req, res) {
  if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);
  try {
    const { user, db } = await requireUser(req);
    const [profileResult, transactionsResult, tradesResult, kycResult] = await Promise.all([
      db.from("profiles").select("id,email,display_name,created_at").eq("id", user.id).maybeSingle(),
      db.from("transactions").select("id,type,amount,currency,status,reference,created_at,updated_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
      db.from("trades").select("id,title,amount,status,progress,created_at,updated_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
      db.from("kyc_records").select("id,status,created_at,updated_at").eq("user_id", user.id).maybeSingle()
    ]);
    const result = [profileResult, transactionsResult, tradesResult, kycResult].find(item => item.error);
    if (result) throw result.error;
    return send(res, 200, {
      user: { id: user.id, email: user.email },
      profile: profileResult.data,
      transactions: transactionsResult.data || [],
      trades: tradesResult.data || [],
      kyc: kycResult.data
    });
  } catch (error) {
    return fail(res, error);
  }
};
