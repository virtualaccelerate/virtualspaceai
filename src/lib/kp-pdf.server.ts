import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { fontBase64 } from "./kp/font.server";
import { PricingSchema, SlideSchema, totals } from "./kp-core";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
const ink=rgb(.06,.10,.13), paper=rgb(.98,.99,.98), muted=rgb(.36,.41,.43);
function wrap(text:string,font:PDFFont,size:number,width:number){
  const lines:string[]=[];
  for(const paragraph of text.split("\n")) {let line="";for(const word of paragraph.split(/\s+/)){if(font.widthOfTextAtSize(`${line} ${word}`.trim(),size)>width && line){lines.push(line);line="";}if(font.widthOfTextAtSize(word,size)>width){for(const char of word){if(font.widthOfTextAtSize(line+char,size)>width){lines.push(line);line="";}line+=char;}}else line+=`${line?" ":""}${word}`;}lines.push(line);}
  return lines;
}
function textBlock(page:PDFPage,text:string,font:PDFFont,x:number,top:number,width:number,height:number,size:number,color=ink){
  let lines=wrap(text,font,size,width);while(lines.length*size*1.4>height&&size>7){size-=.5;lines=wrap(text,font,size,width);}
  for(let i=0;i<lines.length;i++)page.drawText(lines[i],{x,y:top-i*size*1.4,size,font,color});
}
export async function kpPdf(row:{slides:unknown;pricing:unknown;brand_color:string;logo_path:string|null;language:string;title:string}){
  const slides=z.array(SlideSchema).length(6).parse(row.slides),pricing=PricingSchema.parse(row.pricing);
  const pdf=await PDFDocument.create();pdf.registerFontkit(fontkit);
  const font=await pdf.embedFont(Buffer.from(fontBase64,"base64"),{subset:true});
  const hex=/^#[0-9a-f]{6}$/i.test(row.brand_color)?row.brand_color:"#18866b";
  const accent=rgb(parseInt(hex.slice(1,3),16)/255,parseInt(hex.slice(3,5),16)/255,parseInt(hex.slice(5,7),16)/255);
  let logo;
  if(row.logo_path){const {data}=await supabaseAdmin.storage.from("workspace-logos").download(row.logo_path);if(data){try{const bytes=await data.arrayBuffer();logo=data.type.includes("png")?await pdf.embedPng(bytes):await pdf.embedJpg(bytes);}catch{/* unsupported logo format: use text identity */}}}
  pdf.setTitle(row.title);pdf.setLanguage(row.language);
  for(const [i,slide] of slides.entries()){
    const page=pdf.addPage([960,540]);page.drawRectangle({x:0,y:0,width:960,height:540,color:paper});page.drawRectangle({x:0,y:0,width:12,height:540,color:accent});page.drawRectangle({x:48,y:464,width:54,height:5,color:accent});
    if(logo){const s=logo.scaleToFit(140,45);page.drawImage(logo,{x:772,y:472,width:s.width,height:s.height});}
    textBlock(page,slide.title,font,48,431,850,72,30);
    if(i===4 && pricing.items.length){
      const en=row.language==="en", headers=en?["Service","Qty","Price","Amount"]:["Услуга","Кол-во","Цена","Сумма"];
      const columns=[48,525,635,775];const widths=[455,95,130,130];const total=totals(pricing);
      headers.forEach((s,j)=>textBlock(page,s,font,columns[j],340,widths[j],25,13,muted));
      const gap=Math.min(28,240/pricing.items.length);
      pricing.items.forEach((item,j)=>{const values=[item.service,String(item.quantity),item.price===null?(en?"on request":"по запросу"):String(item.price),item.price===null?"—":String(Math.round(item.price*item.quantity*100)/100)];values.forEach((v,k)=>textBlock(page,v,font,columns[k],310-j*gap,widths[k],gap-2,12));});
      textBlock(page,`${en?"Discount":"Скидка"}: ${pricing.discount}% · ${total.complete?(en?"Total":"Итого"):(en?"Known subtotal (incomplete)":"Известная сумма (неполный итог)")}: ${total.total} ${pricing.currency}`,font,48,62,850,32,15);
    }else textBlock(page,slide.body,font,48,324,850,260,i===0?24:19);
    page.drawText(`${i+1} / 6`,{x:872,y:23,size:11,font,color:muted});
  }
  return pdf.save();
}