import { describe, expect, it } from "vitest";
import type { ProductStat } from "@/backend/types/analysis";
import { runProductKmeans } from "@/backend/services/product-kmeans.service";

function makeStat(
  overrides: Partial<ProductStat> & Pick<ProductStat, "key" | "label">,
): ProductStat {
  return {
    totalOrders: 5,
    canceledOrders: 1,
    effectiveQty: 10,
    canceledQty: 2,
    revenue: 1000,
    canceledRevenue: 200,
    cancellationRate: 0.2,
    ...overrides,
  };
}

describe("product-kmeans.service", () => {
  it("returns empty result when no eligible products", () => {
    const result = runProductKmeans([
      makeStat({ key: "a", label: "Prod A", totalOrders: 1 }),
    ]);

    expect(result).toEqual({
      productKeys: [],
      clusters: [],
      distances: [],
      bestK: 0,
    });
  });

  it("filters products with fewer than 2 orders", () => {
    const result = runProductKmeans([
      makeStat({ key: "low", label: "Low", totalOrders: 1 }),
      makeStat({ key: "ok1", label: "OK 1", totalOrders: 3 }),
      makeStat({ key: "ok2", label: "OK 2", totalOrders: 4 }),
      makeStat({ key: "ok3", label: "OK 3", totalOrders: 5 }),
    ]);

    expect(result.productKeys).not.toContain("low");
    expect(result.productKeys.length).toBe(3);
  });

  it("returns aligned array lengths when clustering succeeds", () => {
    const stats = [
      makeStat({ key: "p1", label: "P1", cancellationRate: 0.1, revenue: 500 }),
      makeStat({ key: "p2", label: "P2", cancellationRate: 0.5, revenue: 200 }),
      makeStat({ key: "p3", label: "P3", cancellationRate: 0.8, revenue: 100 }),
      makeStat({ key: "p4", label: "P4", cancellationRate: 0.3, revenue: 800 }),
    ];

    const result = runProductKmeans(stats);

    expect(result.productKeys).toHaveLength(stats.length);
    expect(result.clusters).toHaveLength(stats.length);
    expect(result.distances).toHaveLength(stats.length);
    expect(result.bestK).toBeGreaterThanOrEqual(1);
  });

  it("returns empty arrays for empty stats input", () => {
    const result = runProductKmeans([]);

    expect(result.productKeys).toEqual([]);
    expect(result.clusters).toEqual([]);
    expect(result.distances).toEqual([]);
    expect(result.bestK).toBe(0);
  });
});
