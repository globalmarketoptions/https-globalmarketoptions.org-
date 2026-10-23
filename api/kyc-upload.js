const crypto = require("crypto");
const { requireUser } = require("../lib/supabase-server");
const { send, methodNotAllowed, fail } = require("../lib/api-http");

const TYPES = new Map([
 ["application/pdf","pdf"],["image/jpeg","jpg"],["image/png","png"]
]);
const MAX_BYTES = 5 * 1024 * 1024;

module.exports = async function kycUpload(req,res) {
 if(req.method!=="POST") return methodNotAllowed(res,["POST"]);
 try {
  const {user,db}=await requireUser(req);
  const body=typeof req.body==="string"?JSON.parse(req.body||"{}"):(req.body||{});
  const mime=String(body.contentType||"").toLowerCase();
  const size=Number(body.size);
  if(!TYPES.has(mime)) return send(res,400,{error:"Upload a PDF, JPEG, or PNG document."});
  if(!Number.isInteger(size)||size<1||size>MAX_BYTES) return send(res,400,{error:"Document must be 1 byte to 5 MB."});
  const {data:existing,error:existingError}=await db.from("kyc_records").select("id,status,document_path").eq("user_id",user.id).maybeSingle();
  if(existingError) throw existingError;
  if(existing && existing.status==="APPROVED") return send(res,409,{error:"Your identity verification is already approved. Contact support if you need to replace it."});
  if(existing && existing.status==="UNDER_REVIEW") return send(res,409,{error:"Your document is already under review."});
  if(existing && existing.status==="PENDING") return send(res,409,{error:"Your document is already submitted for review. Wait for the review decision before replacing it."});
  const extension=TYPES.get(mime);
  const path=user.id+"/"+crypto.randomUUID()+"."+extension;
  const {data:upload,error:uploadError}=await db.storage.from("kyc-private").createSignedUploadUrl(path,{upsert:false});
  if(uploadError) throw uploadError;
  const record={user_id:user.id,status:"UPLOAD_PENDING",document_path:path,prior_document_path:existing&&existing.document_path!==path?existing.document_path:null,updated_at:new Date().toISOString()};
  const {error:recordError}=await db.from("kyc_records").upsert(record,{onConflict:"user_id"});
  if(recordError) {
    await db.storage.from("kyc-private").remove([path]);
    throw recordError;
  }
  return send(res,200,{path,token:upload.token, signedUrl:upload.signedUrl, bucket:"kyc-private", expiresInSeconds:7200});
 } catch(error) { return fail(res,error); }
};
