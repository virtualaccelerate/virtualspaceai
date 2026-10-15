import { describe, expect, test } from "bun:test";
import { COMPANY_TEAM_SIZES, spaceName } from "./teamspace-setup";

describe("company setup", () => {
  test("1-10 maps to 1-5", () => expect(COMPANY_TEAM_SIZES["1-10"]).toBe("1-5"));
  test("11-30 maps to 5-20", () => expect(COMPANY_TEAM_SIZES["11-30"]).toBe("5-20"));
  test("31-50 maps to 20+", () => expect(COMPANY_TEAM_SIZES["31-50"]).toBe("20+"));
  test("51-100 maps to 50-100", () => expect(COMPANY_TEAM_SIZES["51-100"]).toBe("50-100"));
  test("names the space after the profile", () => expect(spaceName("Aizada", "other@example.com")).toBe("Aizada's Space"));
  test("falls back to the email prefix", () => expect(spaceName("", "beeemd@example.com")).toBe("beeemd's Space"));
});