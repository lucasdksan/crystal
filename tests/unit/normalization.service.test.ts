import { describe, expect, it } from "vitest";
import {
  buildFeatureVectors,
  buildMixedDataPoints,
  normalizeMixedData,
  normalize,
  orderToVector,
  processOrders,
} from "@/backend/services/normalization.service";
import { fixtureVtexOrdersNormalized } from "../fixtures/vtex-orders";

describe("normalization.service", () => {
  describe("normalize", () => {
    it("returns empty arrays for empty input", () => {
      const result = normalize([]);

      expect(result).toEqual({ normalized: [], mins: [], maxs: [] });
    });

    it("returns 0 for columns with zero range", () => {
      const result = normalize([
        [10, 5],
        [10, 8],
        [10, 2],
      ]);

      expect(result.normalized.map((row) => row[0])).toEqual([0, 0, 0]);
      expect(result.normalized[0][1]).toBe(0.5);
      expect(result.normalized[2][1]).toBe(0);
    });
  });

  describe("processOrders", () => {
    it("encodes known enum values and maps unknown values to -1", () => {
      const orders = processOrders(fixtureVtexOrdersNormalized());
      const unknownOrder = orders.find((order) => order.orderId === "order-006");

      expect(unknownOrder).toBeDefined();
      expect(unknownOrder?.origin).toBe(-1);
      expect(unknownOrder?.paymentNames).toBe(-1);
      expect(unknownOrder?.status).toBe(-1);
    });

    it("assigns sequential sales channel codes", () => {
      const orders = processOrders(fixtureVtexOrdersNormalized());
      const channelCodes = [...new Set(orders.map((order) => order.salesChannel))].sort();

      expect(channelCodes).toEqual([0, 1]);
    });

    it("derives hour and day from creationDate", () => {
      const orders = processOrders(fixtureVtexOrdersNormalized());
      const firstOrder = orders.find((order) => order.orderId === "order-001");

      expect(firstOrder?.hourOfDay).toBe(new Date("2025-01-15T10:00:00.000Z").getHours());
      expect(firstOrder?.dayOfWeek).toBe(new Date("2025-01-15T10:00:00.000Z").getDay());
    });

    it("handles orders with null items from VTEX list endpoint", () => {
      const raw = fixtureVtexOrdersNormalized();
      const [processed] = processOrders([{ ...raw[0], items: null }]);

      expect(processed.items).toEqual([]);
    });
  });

  describe("orderToVector", () => {
    it("builds a 9-dimensional feature vector", () => {
      const [processed] = processOrders(fixtureVtexOrdersNormalized());
      const vector = orderToVector(processed);

      expect(vector).toHaveLength(9);
      expect(vector[0]).toBe(processed.totalValue);
      expect(vector[4]).toBe(processed.origin);
    });

    it("computes average selling price from items", () => {
      const [processed] = processOrders(fixtureVtexOrdersNormalized());
      const vector = orderToVector(processed);
      const expectedAvg =
        processed.items.reduce((acc, item) => acc + item.sellingPrice, 0) /
        processed.items.length;

      expect(vector[3]).toBe(expectedAvg);
    });
  });

  describe("buildFeatureVectors", () => {
    it("returns normalized vectors aligned with processed orders", () => {
      const processed = processOrders(fixtureVtexOrdersNormalized());
      const { normalizedVectors, mins, maxs } = buildFeatureVectors(processed);

      expect(normalizedVectors).toHaveLength(processed.length);
      expect(mins).toHaveLength(9);
      expect(maxs).toHaveLength(9);
      normalizedVectors.forEach((row) => {
        row.forEach((value) => {
          expect(value).toBeGreaterThanOrEqual(0);
          expect(value).toBeLessThanOrEqual(1);
        });
      });
    });
  });

  describe("buildMixedDataPoints", () => {
    it("extracts numeric and categorical features separately", () => {
      const processed = processOrders(fixtureVtexOrdersNormalized());
      const mixed = buildMixedDataPoints(processed);

      expect(mixed).toHaveLength(processed.length);
      mixed.forEach((point) => {
        expect(point.numeric).toHaveLength(4);
        expect(point.categorical.paymentMethod).toBeTruthy();
        expect(point.categorical.status).toBeTruthy();
      });
    });

    it("normalizes only numeric dimensions", () => {
      const processed = processOrders(fixtureVtexOrdersNormalized());
      const mixed = buildMixedDataPoints(processed);
      const { normalized, mins, maxs } = normalizeMixedData(mixed);

      expect(normalized).toHaveLength(processed.length);
      expect(mins).toHaveLength(4);
      expect(maxs).toHaveLength(4);
      expect(normalized[0].categorical.paymentMethod).toBeTruthy();
    });
  });
});
