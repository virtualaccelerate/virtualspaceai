import { describe, test } from "node:test";
import { strictEqual, deepStrictEqual } from "node:assert";
import { groundPrices, totals, buildSlides } from "./kp-core";
describe("KP rules", () => {
  test("unknown invented prices become on request", () => {
    strictEqual(groundPrices([{ service: "Сайт", quantity: 1, price: 5000, evidence: "Сайт — 5000 сом" }], "Сайт — 3000 сом", "")[0].price, null);
  });
  test("verbatim knowledge price accepted", () => {
    strictEqual(groundPrices([{ service: "Сайт", quantity: 1, price: 3000, evidence: "Сайт — 3000 сом" }], "Сайт — 3000 сом", "")[0].price, 3000);
  });
  test("quantity and discount calculated in code", () => {
    deepStrictEqual(totals({ items: [{ service: "Сайт", quantity: 2, price: 3000, evidence: "" }], discount: 10, currency: "сом" }), { subtotal: 6000, total: 5400, complete: true });
  });
  test("unknown price never represented as complete total", () => {
    strictEqual(totals({ items: [{ service: "Сайт", quantity: 1, price: null, evidence: "" }], discount: 0, currency: "сом" }).complete, false);
  });
  test("standard six slides in correct order", () => {
    const slides = buildSlides({client:"Клиент", title:"КП", date:"2026-10-31", company:"Компания", about:"О нас", need:"Задача", solution:"Решение", contacts:"Телефон", next:"Встреча", pricing:{items:[],discount:0,currency:"сом"},language:"ru"});
    strictEqual(slides.length,6); strictEqual(slides[0].body,"Клиент\nКомпания\n2026-10-31"); strictEqual(slides[4].title,"Стоимость"); strictEqual(slides[5].body.includes("Телефон"),true);
  });
  test("model headings cannot change the standard slide roles", () => {
    const slides=buildSlides({client:"Клиент",title:"КП",date:"2026-10-31",company:"Компания",about:"",need:"",solution:"",contacts:"",next:"",pricing:{items:[],discount:0,currency:"сом"},language:"ru",headings:["Wrong","Wrong","Wrong","Wrong","Контакты","Wrong"]});
    strictEqual(slides[4].title,"Стоимость");strictEqual(slides[5].title,"Контакты + следующий шаг");
  });
});