import { describe, expect, it } from "vitest";
import { cleanTaskLabel } from "./projects.server";

describe("cleanTaskLabel", () => {
  it("strips a leading pipe", () => expect(cleanTaskLabel("|Startup lab")).toBe("Startup lab"));
  it("drops leaked workspace ids", () => expect(cleanTaskLabel("|ec8e74c9-3fc0-4ea8-9f9f-abbf10f14e11")).toBeNull());
  it("keeps normal names", () => expect(cleanTaskLabel(" Marketing ")).toBe("Marketing"));
});
