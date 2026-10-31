import { describe, expect, test } from "bun:test";
import { groundPrices, totals, buildSlides } from "./kp-core";
describe("KP rules", () => {
  test("unknown invented prices become on request", () => {
    expect(groundPrices([{ service: "Сайт", quantity: 1, price: 5000, evidence: "Сайт — 5000 сом" }], "Сайт — 3000 сом", "")[0].price).toBeNull();
  });
  test("verbatim knowledge price accepted", () => {
    expect(groundPrices([{ service: "Сайт", quantity: 1, price: 3000, evidence: "Сайт — 3000 сом" }], "Сайт — 3000 сом", "")[0].price).toBe(3000);
  });
  test("quantity and discount calculated in code", () => {
    expect(totals({ items: [{ service: "Сайт", quantity: 2, price: 3000, evidence: "" }], discount: 10, currency: "сом" })).toEqual({ subtotal: 6000, total: 5400, complete: true });
  });
  test("unknown price never represented as complete total", () => {
    expect(totals({ items: [{ service: "Сайт", quantity: 1, price: null, evidence: "" }], discount: 0, currency: "сом" }).complete).toBe(false);
  });
  test("standard six slides in correct order", () => {
    const slides = buildSlides({client:"Клиент", title:"КП", date:"2026-10-31", company:"Компания", about:"О нас", need:"Задача", solution:"Решение", contacts:"Телефон", next:"Встреча", pricing:{items:[],discount:0,currency:"сом"},language:"ru"});
    expect(slides).toHaveLength(6); expect(slides[0].body).toBe("Клиент\nКомпания\n2026-10-31"); expect(slides[4].title).toBe("Стоимость"); expect(slides[5].body).toContain("Телефон");
  });
});