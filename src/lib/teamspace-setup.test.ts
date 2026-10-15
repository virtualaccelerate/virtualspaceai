import { describe, it as test } from "node:test";
import { strictEqual } from "node:assert";
import { COMPANY_TEAM_SIZES, spaceName } from "./teamspace-setup";

describe("company setup", () => {
  test("1-10 maps to 1-5", () => strictEqual(COMPANY_TEAM_SIZES["1-10"], "1-5"));
  test("11-30 maps to 5-20", () => strictEqual(COMPANY_TEAM_SIZES["11-30"], "5-20"));
  test("31-50 maps to 20+", () => strictEqual(COMPANY_TEAM_SIZES["31-50"], "20+"));
  test("51-100 maps to 50-100", () => strictEqual(COMPANY_TEAM_SIZES["51-100"], "50-100"));
  test("names the space after the profile", () => strictEqual(spaceName("Aizada", "other@example.com"), "Aizada's Space"));
  test("falls back to the email prefix", () => strictEqual(spaceName("", "beeemd@example.com"), "beeemd's Space"));
});