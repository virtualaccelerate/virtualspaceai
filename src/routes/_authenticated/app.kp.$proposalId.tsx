import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Download, Save } from "lucide-react";
import { getProposal, saveProposal, exportProposal } from "@/lib/kp.functions";
import { priceText, totals, type Pricing, type Slide } from "@/lib/kp-core";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
const options=(id:string)=>queryOptions({queryKey:["proposal",id],queryFn:()=>getProposal({data:{id}})});
export const Route=createFileRoute("/_authenticated/app/kp/$proposalId")({loader:({context,params})=>context.queryClient.ensureQueryData(options(params.proposalId)),component:ProposalPage,head:()=>({meta:[{title:"Commercial proposal — Virtual Space"},{name:"description",content:"View and edit your workspace commercial proposal."},{property:"og:title",content:"Commercial proposal — Virtual Space"},{property:"og:description",content:"Six-slide proposal editor."},{property:"og:type",content:"website"},{name:"twitter:card",content:"summary"},{name:"robots",content:"noindex"}]})});
function ProposalPage(){
  const {proposalId}=Route.useParams();const {data}=useSuspenseQuery(options(proposalId));const {t}=useTranslation();
  const save=useServerFn(saveProposal),pdf=useServerFn(exportProposal);
  const [slides,setSlides]=useState<Slide[]>(data.slides),[pricing,setPricing]=useState<Pricing>(data.pricing),[index,setIndex]=useState(0),[busy,setBusy]=useState<string|null>(null),[dirty,setDirty]=useState(false);
  const slide=slides[index],sum=totals(pricing);
  const update=(key:"title"|"body",value:string)=>{setDirty(true);setSlides(prev=>prev.map((s,i)=>i===index?{...s,[key]:value}:s));};
  const persist=async()=>{await save({data:{id:proposalId,slides,pricing}});setDirty(false);};
  const act=async(kind:string)=>{setBusy(kind);try{if(data.editable&&dirty)await persist();if(kind==="pdf"){const result=await pdf({data:{id:proposalId}});const bytes=Uint8Array.from(atob(result.base64),c=>c.charCodeAt(0));const url=URL.createObjectURL(new Blob([bytes],{type:"application/pdf"}));const a=document.createElement("a");a.href=url;a.download=result.filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}else toast.success(t("kp.saved"));}catch(e){toast.error(e instanceof Error?e.message:t("kp.error"));}finally{setBusy(null);}};
  const changePricing=(next:Pricing)=>{setPricing(next);setDirty(true);setSlides(prev=>prev.map((s,i)=>i===4?{...s,body:priceText(next,data.language)}:s));};
  if(!slide)return null;
  return <div className="max-w-6xl mx-auto space-y-5">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><Link to="/app/agents" className="text-sm text-muted-foreground">← {t("kp.back")}</Link><h1 className="text-2xl font-display mt-2">{data.title}</h1><p className="text-sm text-muted-foreground">{data.client}{!data.editable?` · ${t("kp.readOnly")}`:""}</p></div><div className="flex gap-2">{data.editable&&<Button variant="outline" loading={busy==="save"} disabled={!dirty||!!busy} onClick={()=>void act("save")}><Save />{t("kp.save")}</Button>}<Button loading={busy==="pdf"} disabled={!!busy} onClick={()=>void act("pdf")}><Download />{t("kp.pdf")}</Button></div></header>
    <div className="flex flex-wrap gap-2" aria-label={t("kp.slide")}>{slides.map((s,i)=><Button key={i} size="sm" variant={index===i?"secondary":"ghost"} aria-current={index===i?"step":undefined} onClick={()=>setIndex(i)}>{i+1}. {s.title}</Button>)}</div>
    <section className="kp-slide relative aspect-video w-full overflow-hidden border border-border" style={{"--kp-brand":data.brand_color} as React.CSSProperties} aria-label={`${t("kp.slide")} ${index+1}`}>
      <div className="kp-accent absolute inset-y-0 left-0 w-2" />
      <div className="absolute inset-0 p-5 sm:p-10 flex flex-col">{data.logoUrl&&<img src={data.logoUrl} alt={data.title} className="absolute top-5 right-6 max-w-24 max-h-10 object-contain"/>}<p className="kp-brand-text text-xs font-semibold uppercase">{data.client}</p><h2 className="text-lg sm:text-3xl font-display mt-3 pr-16">{slide.title}</h2>
        {index===4 ? <div className="mt-4 overflow-auto flex-1"><table className="w-full text-xs sm:text-sm text-left"><thead><tr className="border-b border-border"><th>{t("kp.service")}</th><th>{t("kp.quantity")}</th><th>{t("kp.price")}</th></tr></thead><tbody>{pricing.items.map((item,i)=><tr key={i} className="border-b border-border"><td className="py-2">{item.service}</td><td>{item.quantity}</td><td>{item.price??t("kp.request")}</td></tr>)}</tbody></table><p className="font-semibold mt-3">{sum.complete?t("kp.total"):t("kp.partial")}: {sum.total} {pricing.currency}</p></div> : <p className="mt-4 sm:mt-6 text-xs sm:text-lg whitespace-pre-wrap overflow-auto flex-1 leading-relaxed">{slide.body}</p>}
        <p className="text-xs text-muted-foreground text-right mt-2">{index+1} / 6</p>
      </div>
    </section>
    <div className="flex justify-center gap-4 items-center"><IconButton label={t("kp.slide")+" −"} disabled={index===0} onClick={()=>setIndex(i=>i-1)}><ChevronLeft /></IconButton><span className="text-sm">{index+1} / 6</span><IconButton label={t("kp.slide")+" +"} disabled={index===5} onClick={()=>setIndex(i=>i+1)}><ChevronRight /></IconButton></div>
    {data.editable&&<section className="grid gap-4 sm:grid-cols-2"><label className="text-sm space-y-2"><span>{t("kp.heading")}</span><Input aria-label={t("kp.heading")} maxLength={180} value={slide.title} onChange={e=>update("title",e.target.value)} /></label>{index!==4?<label className="text-sm space-y-2 sm:col-span-2"><span>{t("kp.body")}</span><Textarea aria-label={t("kp.body")} maxLength={3500} rows={6} value={slide.body} onChange={e=>update("body",e.target.value)}/></label>:<div className="sm:col-span-2 space-y-3">{pricing.items.map((item,i)=><div key={i} className="grid grid-cols-[minmax(0,1fr)_80px_110px] gap-2"><Input aria-label={`${t("kp.service")} ${i+1}`} value={item.service} onChange={e=>changePricing({...pricing,items:pricing.items.map((x,j)=>j===i?{...x,service:e.target.value}:x)})}/><Input type="number" min={1} max={10000} aria-label={`${t("kp.quantity")} ${i+1}`} value={item.quantity} onChange={e=>changePricing({...pricing,items:pricing.items.map((x,j)=>j===i?{...x,quantity:Number(e.target.value)}:x)})}/><Input type="number" min={0} aria-label={`${t("kp.price")} ${i+1}`} placeholder={t("kp.request")} value={item.price??""} onChange={e=>changePricing({...pricing,items:pricing.items.map((x,j)=>j===i?{...x,price:e.target.value===""?null:Number(e.target.value)}:x)})}/></div>)}<div className="flex gap-3"><label className="text-sm">{t("kp.discount")}<Input type="number" min={0} max={100} value={pricing.discount} onChange={e=>changePricing({...pricing,discount:Number(e.target.value)})}/></label><label className="text-sm">{t("kp.currency")}<Input maxLength={20} value={pricing.currency} onChange={e=>changePricing({...pricing,currency:e.target.value})}/></label></div></div>}</section>}
  </div>;
}