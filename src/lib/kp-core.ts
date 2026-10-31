import { z } from "zod";

export const PriceItem = z.object({ service: z.string().max(180), quantity: z.number().min(1).max(10000), price: z.number().min(0).max(1e12).nullable(), evidence: z.string().max(1200) });
export const SlideSchema = z.object({ title: z.string().min(1).max(180), body: z.string().max(3500) });
export const PricingSchema = z.object({ items: z.array(PriceItem).max(12), discount: z.number().min(0).max(100), currency: z.string().max(20) });
export type Pricing = z.infer<typeof PricingSchema>;
export type Slide = z.infer<typeof SlideSchema>;
const clean = (s: string) => s.toLowerCase().replace(/[\s\u00a0]+/g, " ").trim();
/** A price is accepted only with a verbatim source quote naming its service and amount. */
export function groundPrices(items: Pricing["items"], knowledge: string, employee: string) {
  return items.map(item => {
    const quote = clean(item.evidence);
    const hasAmount = item.price !== null && new RegExp(`(^|[^\\d])${String(item.price).replace(".", "[.,]")}([^\\d]|$)`).test(quote.replace(/(\d)[ \u00a0](?=\d{3}(?:\D|$))/g, "$1"));
    const trusted = quote.length > 0 && (clean(knowledge).includes(quote) || clean(employee).includes(quote));
    return { ...item, price: trusted && quote.includes(clean(item.service)) && hasAmount ? item.price : null };
  });
}
export function totals(p: Pricing) {
  const subtotal = Math.round(p.items.reduce((sum, x) => sum + (x.price ?? 0) * x.quantity, 0) * 100) / 100;
  return { subtotal, total: Math.round(subtotal * (1 - p.discount / 100) * 100) / 100, complete: p.items.every(x => x.price !== null) };
}
export function priceText(p: Pricing, language = "ru") {
  const en = language === "en";
  const money = (n: number) => `${n.toLocaleString(language === "en" ? "en-US" : "ru-RU")} ${p.currency}`;
  const t = totals(p);
  return [...p.items.map(x => `${x.service} × ${x.quantity} — ${x.price === null ? (en ? "on request" : "по запросу") : money(x.price * x.quantity)}`),
    `${en ? "Discount" : "Скидка"}: ${p.discount}%`, `${t.complete ? (en ? "Total" : "Итого") : (en ? "Known subtotal (incomplete)" : "Известная сумма (неполный итог)")}: ${money(t.total)}`].join("\n");
}
export function buildSlides(input: { client: string; title: string; date: string; company: string; about: string; need: string; solution: string; contacts: string; next: string; pricing: Pricing; language: string; headings?: string[] }): Slide[] {
  const titles: Record<string, string[]> = {
    ru: ["О нас", "Задача клиента", "Решение / услуги", "Стоимость", "Контакты + следующий шаг"],
    en: ["About us", "Your task", "Solution / services", "Pricing", "Contacts + next step"],
    ky: ["Биз жөнүндө", "Кардардын милдети", "Чечим / кызматтар", "Баасы", "Байланыш + кийинки кадам"],
    kk: ["Біз туралы", "Клиенттің міндеті", "Шешім / қызметтер", "Құны", "Байланыс + келесі қадам"],
    uz: ["Biz haqimizda", "Mijoz vazifasi", "Yechim / xizmatlar", "Narx", "Aloqa + keyingi qadam"],
    tg: ["Дар бораи мо", "Вазифаи муштарӣ", "Ҳал / хизматҳо", "Арзиш", "Тамос + қадами навбатӣ"],
  };
  const h = [input.title, ...(titles[input.language] ?? titles.ru)];
  return [ `${input.client}\n${input.company}\n${input.date}`, input.about, input.need, input.solution, priceText(input.pricing, input.language), `${input.contacts}\n\n${input.next}` ].map((body, i) => SlideSchema.parse({ title: h[i] || input.title, body }));
}