import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { PricingSchema, SlideSchema } from "./kp-core";
const idSchema=z.object({id:z.string().uuid()});
export const listProposals=createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).inputValidator(z.object({workspace:z.string().uuid()})).handler(async({data,context})=>{
  const {kpMember}=await import("./kp.server");await kpMember(context.userId,data.workspace);
  const {data:rows,error}=await context.supabase.from("commercial_proposals").select("id,title,client,created_by,created_at").eq("teamspace_id",data.workspace).order("created_at",{ascending:false});if(error)throw new Error(error.message);return {rows:rows??[],userId:context.userId};
});
export const getProposal=createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).inputValidator(idSchema).handler(async({data,context})=>{
  const {kpRow}=await import("./kp.server");const row=await kpRow(context.userId,data.id);
  const {data:logo}=row.logo_path ? await context.supabase.storage.from("workspace-logos").createSignedUrl(row.logo_path,3600) : {data:null};
  return {...row,slides:z.array(SlideSchema).length(6).parse(row.slides),pricing:PricingSchema.parse(row.pricing),editable:row.created_by===context.userId,logoUrl:logo?.signedUrl??null};
});
export const saveProposal=createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).inputValidator(z.object({id:z.string().uuid(),slides:z.array(SlideSchema).length(6),pricing:PricingSchema})).handler(async({data,context})=>{
  const {kpRow}=await import("./kp.server");await kpRow(context.userId,data.id,true);
  const {error}=await context.supabase.from("commercial_proposals").update({slides:data.slides,pricing:data.pricing,title:data.slides[0].title}).eq("id",data.id);if(error)throw new Error(error.message);return {ok:true};
});
export const deleteProposal=createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).inputValidator(idSchema).handler(async({data,context})=>{const {kpRow}=await import("./kp.server");await kpRow(context.userId,data.id,true);const {error}=await context.supabase.from("commercial_proposals").delete().eq("id",data.id);if(error)throw new Error(error.message);return {ok:true};});
export const duplicateProposal=createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).inputValidator(idSchema).handler(async({data,context})=>{const {kpRow}=await import("./kp.server");const row=await kpRow(context.userId,data.id);const {data:copy,error}=await context.supabase.from("commercial_proposals").insert({teamspace_id:row.teamspace_id,created_by:context.userId,client:row.client,title:row.title,language:row.language,slides:row.slides,pricing:row.pricing,brand_color:row.brand_color,logo_path:row.logo_path}).select("id").single();if(error||!copy)throw new Error(error?.message??"KP copy failed");return copy;});
export const exportProposal=createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).inputValidator(idSchema).handler(async({data,context})=>{const {kpRow}=await import("./kp.server");const row=await kpRow(context.userId,data.id);const {kpPdf}=await import("./kp-pdf.server");const bytes=await kpPdf(row);return {base64:Buffer.from(bytes).toString("base64"),filename:"proposal.pdf"};});
export const saveProposalBrand=createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).inputValidator(z.object({workspace:z.string().uuid(),color:z.string().regex(/^#[0-9a-fA-F]{6}$/)})).handler(async({data,context})=>{const {kpMember}=await import("./kp.server");const role=await kpMember(context.userId,data.workspace);if(role!=="owner"&&role!=="admin")throw new Error("KP_ACCESS_DENIED");const {error}=await context.supabase.from("teamspaces").update({brand_color:data.color}).eq("id",data.workspace);if(error)throw new Error(error.message);return {ok:true};});