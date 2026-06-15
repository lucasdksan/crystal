import { describe, expect, it } from "vitest";
import { buildInventory } from "@/backend/services/inventory.service";
import { fixtureVtexOrdersNormalized } from "../fixtures/vtex-orders";

describe("inventory.service", () => {
  it("builds rupture risk, dead stock and ABC curve", async () => {
    const orders = fixtureVtexOrdersNormalized();
    const result = await buildInventory(orders);

    expect(Array.isArray(result.ruptureRisk)).toBe(true);
    expect(Array.isArray(result.deadStock)).toBe(true);
    expect(Array.isArray(result.abcCurve)).toBe(true);
  });

  it("classifies ABC items", async () => {
    const orders = fixtureVtexOrdersNormalized();
    const result = await buildInventory(orders);

    if (result.abcCurve.length > 0) {
      result.abcCurve.forEach((item) => {
        expect(["A", "B", "C"]).toContain(item.class);
        expect(item.share).toBeGreaterThan(0);
      });
    }
  });
});
