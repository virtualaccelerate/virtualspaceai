import { supabaseAdmin as db } from "@/integrations/supabase/client.server";
import { kpChat, kpRow, kpMember } from "./kp.server";
import { kpPdf } from "./kp-pdf.server";
import { botToken, sendMessage, TELEGRAM_API } from "./telegram.server";
export async function handleKpTelegram(link:{user_id:string;teamspace_id:string|null;kp_conversation_id?:string|null},chatId:number,text:string){
  const command=/^\/kp(?:@[\w_]+)?(?:\s|$)/i.test(text)||/^@kp(?:\s|$)/i.test(text);
  if(!command && (!link.kp_conversation_id || text.startsWith("/"))) return false;
  if(!link.teamspace_id){await sendMessage(chatId,"Выберите пространство в приложении и привяжите Telegram к нему.");return true;}
  try{
    await kpMember(link.user_id,link.teamspace_id);
    let id=link.kp_conversation_id;
    if(command){const {data,error}=await db.from("chat_conversations").insert({user_id:link.user_id,teamspace_id:link.teamspace_id,agent_id:"kp",title:"Агент КП"}).select("id").single();if(error||!data)throw new Error("KP chat unavailable");id=data.id;await db.from("telegram_links").update({kp_conversation_id:id}).eq("user_id",link.user_id);}
    if(!id)return false;
    const {data:conv}=await db.from("chat_conversations").select("id,teamspace_id").eq("id",id).eq("user_id",link.user_id).eq("agent_id","kp").maybeSingle();
    if(!conv||conv.teamspace_id!==link.teamspace_id)throw new Error("KP_ACCESS_DENIED");
    const prompt=command?text.replace(/^(?:\/kp(?:@[\w_]+)?|@kp)\s*/i,""):text;
    if(!prompt){await sendMessage(chatId,"Агент КП. Для какого клиента готовим предложение и какая у него задача? /cancel — выйти.");return true;}
    const {data:history}=await db.from("chat_messages").select("role,content").eq("conversation_id",id).eq("user_id",link.user_id).order("created_at",{ascending:false}).limit(20);
    const messages=[...(history??[]).reverse().map(m=>({role:m.role as "user"|"assistant",content:m.content})),{role:"user" as const,content:prompt}];
    await db.from("chat_messages").insert({user_id:link.user_id,teamspace_id:link.teamspace_id,conversation_id:id,role:"user",content:prompt});
    const result=await kpChat(link.user_id,link.teamspace_id,messages);
    await db.from("chat_messages").insert({user_id:link.user_id,teamspace_id:link.teamspace_id,conversation_id:id,role:"assistant",content:result.reply});
    if(!result.proposalId){await sendMessage(chatId,result.reply);return true;}
    const row=await kpRow(link.user_id,result.proposalId),bytes=await kpPdf(row);
    const url=`${process.env.PUBLIC_APP_URL?.replace(/\/$/,"")??"https://ai-virtualspace.com"}/app/kp/${row.id}`;
    await sendMessage(chatId,`${result.reply.replace(/\[\[kp:[^\]]+\]\]/g,"").trim()}\n${url}`);
    const form=new FormData();form.set("chat_id",String(chatId));form.set("document",new Blob([new Uint8Array(bytes)],{type:"application/pdf"}),"proposal.pdf");
    const response=await fetch(`${TELEGRAM_API}/bot${botToken()}/sendDocument`,{method:"POST",body:form});
    const body=await response.json() as {ok?:boolean;description?:string};if(!response.ok||!body.ok)throw new Error(body.description??"Telegram PDF failed");
    return true;
  }catch(error){await sendMessage(chatId,error instanceof Error?error.message:"Не удалось подготовить КП");return true;}
}