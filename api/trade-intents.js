const { requireUser } = require("../lib/supabase-server");
const { send, methodNotAllowed, fail } = require("../lib/api-http");

const MARKETS=new Set(["CRUDE_OIL","REAL_ESTATE","BTC","ETH","USDT","OTHER"]);
const SIDES=new Set(["BUY","SELL","SUBSCRIBE","REDEEM"]);
const CURRENCIES=new Set(["USD","EUR","BTC","ETH","USDT"]);

module.exports=async function tradeIntents(req,res) {
 if(req.method==="GET") {
  try {
   const {user,db}=await requireUser(req);
   const {data,error}=await db.from("trade_intents").select("id,market,side,amount,currency,notes,status,created_at,updated_at").eq("user_id",user.id).order("created_at",{ascending:false}).limit(50);
   if(error) throw error;
   return send(res,200,{intents:data||[],executionEnabled:false,notice:"Trade requests are recorded for review only. A broker/exchange integration has not been configured."});
  } catch(error) { return fail(res,error); }
 }
 if(req.method!=="POST") return methodNotAllowed(res,["GET","POST"]);
 try {
  const {user,db}=await requireUser(req);
  const body=typeof req.body==="string"?JSON.parse(req.body||"{}"):(req.body||{});
  const market=String(body.market||"").toUpperCase(),side=String(body.side||"").toUpperCase(),currency=String(body.currency||"").toUpperCase(),amount=Number(body.amount);
  const notes=typeof body.notes==="string"?body.notes.trim().slice(0,500):"";
  if(!MARKETS.has(market)||!SIDES.has(side)||!CURRENCIES.has(currency)) return send(res,400,{error:"Choose a supported market, action, and currency."});
  if(!Number.isFinite(amount)||amount<=0||amount>1000000000||!/^\d+(\.\d{1,8})?$/.test(String(body.amount).trim())) return send(res,400,{error:"Enter a positive amount with up to 8 decimal places."});
  const {data,error}=await db.from("trade_intents").insert({user_id:user.id,market,side,currency,amount,notes:notes||null,status:"PENDING_REVIEW"}).select("id,market,side,amount,currency,notes,status,created_at").single();
  if(error) throw error;
  return send(res,201,{intent:data,executionEnabled:false,notice:"Request recorded for review. No order was sent to a broker or exchange."});
 } catch(error) { return fail(res,error); }
};
