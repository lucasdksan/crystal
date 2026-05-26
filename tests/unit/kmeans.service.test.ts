import { describe, expect, it } from "vitest";
import { runKmeans } from "@/backend/services/kmeans.service";
import { buildFeatureVectors, processOrders } from "@/backend/services/normalization.service";
import { fixtureVtexOrdersNormalized } from "../fixtures/vtex-orders";

describe("kmeans.service", () => {
  describe("runKmeans", () => {
    it("assigns one cluster per order", () => {
      const orders = processOrders(fixtureVtexOrdersNormalized());
      const { normalizedVectors } = buildFeatureVectors(orders);
      const result = runKmeans(normalizedVectors);

      expect(result.clusters).toHaveLength(orders.length);
      expect(result.orderDistances).toHaveLength(orders.length);
    });

    it("selects bestK of at least 3 for sufficient data", () => {
      const orders = processOrders(fixtureVtexOrdersNormalized());
      const { normalizedVectors } = buildFeatureVectors(orders);
      const result = runKmeans(normalizedVectors);

      expect(result.bestK).toBeGreaterThanOrEqual(3);
      expect(result.centroids).toHaveLength(result.bestK);
    });

    it("returns elbow and silhouette analysis points", () => {
      const orders = processOrders(fixtureVtexOrdersNormalized());
      const { normalizedVectors } = buildFeatureVectors(orders);
      const result = runKmeans(normalizedVectors);

      expect(result.elbowAnalysis.length).toBeGreaterThan(0);
      expect(result.silhouetteAnalysis.length).toBe(result.elbowAnalysis.length);
      result.elbowAnalysis.forEach((point) => {
        expect(point.k).toBeGreaterThan(0);
        expect(point.wcss).toBeGreaterThanOrEqual(0);
      });
    });
  });
});
