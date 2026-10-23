const { requireAdmin } = require("../../lib/supabase-server");
const { send, methodNotAllowed, fail } = require("../../lib/api-http");
const { executeTradeIntent } = require("../../lib/trade-execution");

module.exports = async function executeTrade(req,res) {
 if(req.method!=="POST") return methodNotAllowed(res,["POST"]);
 try {
  const {db}=await requireAdmin(req);
  const body=typeof req.body==="string"?JSON.parse(req.body||"{}"):(req.body||{});
  const id=String(body.id||"");
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return send(res,400,{error:"A valid trade intent ID is required."});
  const {data:intent,error}=await db.from("trade_intents").select("id,user_id,market,side,amount,currency,status").eq("id",id).maybeSingle();
  if(error) throw error;
  if(!intent) return send(res,404,{error:"Trade intent not found."});
  if(intent.status!=="APPROVED") return send(res,409,{error:"Only internally approved trade intents may be sent to a configured execution adapter."});
  const result=await executeTradeIntent(intent);
  return send(res,200,{result});
 } catch(error) { return fail(res,error); }
};
