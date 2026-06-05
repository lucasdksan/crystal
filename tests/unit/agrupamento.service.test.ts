import { describe, expect, it } from "vitest";
import { runAgrupamento } from "@/backend/services/agrupamento.service";
import { buildFeatureVectors, processOrders } from "@/backend/services/normalization.service";
import { fixtureVtexOrdersNormalized } from "../fixtures/vtex-orders";

describe("agrupamento.service", () => {
  describe("runAgrupamento", () => {
    it("assigns one cluster per order", () => {
      const orders = processOrders(fixtureVtexOrdersNormalized());
      const { normalizedVectors } = buildFeatureVectors(orders);
      const result = runAgrupamento(normalizedVectors);

      expect(result.clusters).toHaveLength(orders.length);
      expect(result.orderDistances).toHaveLength(orders.length);
    });

    it("selects bestK of at least 3 for sufficient data", () => {
      const orders = processOrders(fixtureVtexOrdersNormalized());
      const { normalizedVectors } = buildFeatureVectors(orders);
      const result = runAgrupamento(normalizedVectors);

      expect(result.bestK).toBeGreaterThanOrEqual(3);
      expect(result.centroids).toHaveLength(result.bestK);
    });

    it("returns elbow and silhouette analysis points", () => {
      const orders = processOrders(fixtureVtexOrdersNormalized());
      const { normalizedVectors } = buildFeatureVectors(orders);
      const result = runAgrupamento(normalizedVectors);

      expect(result.elbowAnalysis.length).toBeGreaterThan(0);
      expect(result.silhouetteAnalysis.length).toBe(result.elbowAnalysis.length);
      result.elbowAnalysis.forEach((point) => {
        expect(point.k).toBeGreaterThan(0);
        expect(point.wcss).toBeGreaterThanOrEqual(0);
      });
    });
  });
});
