const { requireAdmin } = require("../../lib/supabase-server");
const { send, methodNotAllowed, fail } = require("../../lib/api-http");
const ALLOWED=new Set(["APPROVED_FOR_EXECUTION","REJECTED","CANCELLED"]);

module.exports=async function adminTradeIntents(req,res) {
 try {
  const {user,db}=await requireAdmin(req);
  if(req.method==="GET") {
   const {data,error}=await db.from("trade_intents").select("id,user_id,market,side,amount,currency,notes,status,created_at,updated_at").eq("status","PENDING_REVIEW").order("created_at",{ascending:true}).limit(100);
   if(error) throw error;
   return send(res,200,{intents:data||[],executionEnabled:false,notice:"Approval records an internal decision only; no broker execution provider is configured."});
  }
  if(req.method==="PATCH") {
   const body=typeof req.body==="string"?JSON.parse(req.body||"{}"):(req.body||{});
   const id=String(body.id||""),status=String(body.status||"").toUpperCase(),notes=typeof body.notes==="string"?body.notes.trim().slice(0,1000):"";
   if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return send(res,400,{error:"A valid trade intent ID is required."});
   if(!ALLOWED.has(status)) return send(res,400,{error:"Invalid review status."});
   const {data,error}=await db.rpc("admin_update_trade_intent",{p_intent_id:id,p_status:status,p_admin_notes:notes,p_admin_user_id:user.id});
   if(error) {
    if(/not found/i.test(error.message)) return send(res,404,{error:"Trade intent not found."});
    if(/Only pending|Invalid trade intent/i.test(error.message)) return send(res,409,{error:error.message});
    throw error;
   }
   return send(res,200,{intent:data,executionEnabled:false,notice:"This review status does not place or execute a live trade."});
  }
  return methodNotAllowed(res,["GET","PATCH"]);
 } catch(error) { return fail(res,error); }
};
