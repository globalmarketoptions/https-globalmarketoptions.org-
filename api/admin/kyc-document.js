const { requireAdmin } = require("../../lib/supabase-server");
const { send, methodNotAllowed, fail } = require("../../lib/api-http");

module.exports = async function adminKycDocument(req,res) {
 if(req.method!=="GET") return methodNotAllowed(res,["GET"]);
 try {
  const {user,db}=await requireAdmin(req);
  const id=String((req.query&&req.query.id)||"");
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return send(res,400,{error:"A valid KYC record ID is required."});
  const {data:record,error}=await db.from("kyc_records").select("id,user_id,document_path").eq("id",id).maybeSingle();
  if(error) throw error;
  if(!record||!record.document_path) return send(res,404,{error:"No document is available for this KYC record."});
  const {data,error:signError}=await db.storage.from("kyc-private").createSignedUrl(record.document_path,60);
  if(signError) throw signError;
  const {error:auditError}=await db.from("admin_audit_logs").insert({
   admin_user_id:user.id,action:"KYC_DOCUMENT_ACCESSED",record_type:"kyc_record",record_id:record.id,
   details:{access:"signed_url_issued"}
  });
  if(auditError) throw auditError;
  return send(res,200,{url:data.signedUrl,expiresInSeconds:60});
 } catch(error) { return fail(res,error); }
};
