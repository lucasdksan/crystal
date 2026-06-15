import { describe, expect, it } from "vitest";
import { buildForecast } from "@/backend/services/forecast.service";
import { fixtureVtexOrdersNormalized } from "../fixtures/vtex-orders";

describe("forecast.service", () => {
  it("generates SKU forecasts", () => {
    const orders = fixtureVtexOrdersNormalized();
    const result = buildForecast(orders);

    expect(Array.isArray(result.forecasts)).toBe(true);
    expect(Array.isArray(result.purchaseRecommendations)).toBe(true);

    result.forecasts.forEach((f) => {
      expect(["growing", "stable", "declining"]).toContain(f.trend);
      expect(f.forecast7d).toBeGreaterThanOrEqual(0);
      expect(f.forecast30d).toBeGreaterThanOrEqual(0);
    });
  });

  it("returns empty for no orders", () => {
    const result = buildForecast([]);
    expect(result.forecasts).toHaveLength(0);
  });
});
