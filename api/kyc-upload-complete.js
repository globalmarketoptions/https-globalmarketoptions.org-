const { requireUser } = require("../lib/supabase-server");
const { send, methodNotAllowed, fail } = require("../lib/api-http");

function validContent(type, bytes) {
 if(type==="application/pdf") return bytes.length>=5 && bytes.subarray(0,5).toString("ascii")==="%PDF-";
 if(type==="image/jpeg") return bytes.length>=3 && bytes[0]===0xff && bytes[1]===0xd8 && bytes[2]===0xff;
 if(type==="image/png") return bytes.length>=8 && bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
 return false;
}

module.exports=async function kycUploadComplete(req,res) {
 if(req.method!=="POST") return methodNotAllowed(res,["POST"]);
 try {
  const {user,db}=await requireUser(req);
  const body=typeof req.body==="string"?JSON.parse(req.body||"{}"):(req.body||{});
  const path=String(body.path||"");
  if(!path.startsWith(user.id+"/")||path.includes("..")||path.length>200) return send(res,400,{error:"Invalid document path."});
  const {data:record,error:recordError}=await db.from("kyc_records").select("id,status,document_path").eq("user_id",user.id).maybeSingle();
  if(recordError) throw recordError;
  if(!record||record.status!=="UPLOAD_PENDING"||record.document_path!==path) return send(res,409,{error:"No matching upload is awaiting validation."});
  const {data:file,error:downloadError}=await db.storage.from("kyc-private").download(path);
  if(downloadError) return send(res,400,{error:"The document upload could not be found. Please retry the upload."});
  const bytes=Buffer.from(await file.arrayBuffer());
  const expected=path.endsWith(".pdf")?"application/pdf":path.endsWith(".jpg")?"image/jpeg":"image/png";
  if(!validContent(expected,bytes)) {
   await db.storage.from("kyc-private").remove([path]);
   await db.from("kyc_records").delete().eq("user_id",user.id).eq("status","UPLOAD_PENDING");
   return send(res,400,{error:"The file content did not match the allowed document type. Please upload a valid PDF, JPEG, or PNG."});
  }
  const {data,error}=await db.from("kyc_records").update({status:"PENDING",updated_at:new Date().toISOString()}).eq("user_id",user.id).eq("status","UPLOAD_PENDING").select("id,status,updated_at").single();
  if(error) throw error;
  return send(res,200,{kyc:data,message:"Document validated and submitted for review."});
 } catch(error) { return fail(res,error); }
};
