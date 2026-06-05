import { describe, expect, it } from "vitest";
import { mapAnalysisResultToDashboard } from "@/frontend/lib/mapper";
import { buildDiagnostics } from "@/backend/services/diagnostics.service";
import {
  buildCustomerFeatureVectors,
  processOrders,
} from "@/backend/services/normalization.service";
import { runCustomerKmeans } from "@/backend/services/kmeans.service";
import { runSom } from "@/backend/services/som.service";
import { runProductKmeans } from "@/backend/services/product-kmeans.service";
import { aggregateByCustomer } from "@/backend/services/customer-aggregation.service";
import { runCustomerIntelligence } from "@/backend/services/customer-intelligence.service";
import type { AnalysisResult } from "@/backend/types/analysis";
import { fixtureVtexOrdersNormalized } from "../fixtures/vtex-orders";

function buildAnalysisResult(): AnalysisResult {
  const rawList = fixtureVtexOrdersNormalized();
  const orders = processOrders(rawList);
  const customerProfiles = aggregateByCustomer(orders);
  const { normalizedVectors, mins, maxs, uniquePaymentMethods } =
    buildCustomerFeatureVectors(customerProfiles);
  const kmeans = runCustomerKmeans(normalizedVectors, uniquePaymentMethods);
  const som = runSom(normalizedVectors);
  const diagnostics = buildDiagnostics(rawList);
  const productKmeans = runProductKmeans(diagnostics.productStats);
  const customerIntelligence = runCustomerIntelligence(
    customerProfiles,
    kmeans,
  );

  return {
    orders,
    customerProfiles,
    kmeans,
    som,
    productKmeans,
    diagnostics,
    customerIntelligence,
    normalizationMeta: { mins, maxs },
  };
}

describe("mapper", () => {
  it("mapAnalysisResultToDashboard computes overview KPIs correctly", () => {
    const result = buildAnalysisResult();
    const dashboard = mapAnalysisResultToDashboard(result);

    const expectedRevenue = result.orders.reduce(
      (sum, order) => sum + order.totalValue,
      0,
    );
    const canceledCount = result.orders.filter(
      (o) => o.statusRaw === "canceled",
    ).length;
    const expectedCancelRate =
      result.orders.length > 0
        ? (canceledCount / result.orders.length) * 100
        : 0;

    expect(dashboard.overview.receitaTotal).toBeCloseTo(expectedRevenue, 2);
    expect(dashboard.overview.totalPedidos).toBe(result.orders.length);
    expect(dashboard.overview.taxaCancelamento).toBeCloseTo(
      expectedCancelRate,
      1,
    );
    expect(dashboard.overview.totalClusters).toBe(result.kmeans.bestK);
    expect(dashboard.overview.totalClientes).toBe(result.customerProfiles.length);
    expect(dashboard.customerSegments.length).toBeGreaterThan(0);
  });

  it("buildClusters output matches bestK with required fields", () => {
    const result = buildAnalysisResult();
    const dashboard = mapAnalysisResultToDashboard(result);

    expect(dashboard.clusters.length).toBe(result.kmeans.bestK);
    dashboard.clusters.forEach((cluster) => {
      expect(cluster.name).toBeTruthy();
      expect(cluster.subtitle).toBeTruthy();
      expect(cluster.count).toBeGreaterThanOrEqual(0);
      expect(cluster.description).toBeTruthy();
    });
  });

  it("somGrid has gridX times gridY cells", () => {
    const result = buildAnalysisResult();
    const dashboard = mapAnalysisResultToDashboard(result);

    expect(dashboard.somGrid).toHaveLength(
      result.som.gridX * result.som.gridY,
    );
  });

  it("productAnomalies have scores in 0-100 and action set", () => {
    const result = buildAnalysisResult();
    const dashboard = mapAnalysisResultToDashboard(result);

    if (dashboard.productAnomalies.length === 0) {
      expect(result.productKmeans.productKeys).toHaveLength(0);
      return;
    }

    dashboard.productAnomalies.forEach((product) => {
      expect(product.anomalyScore).toBeGreaterThanOrEqual(0);
      expect(product.anomalyScore).toBeLessThanOrEqual(100);
      expect(product.action).toBeTruthy();
    });
  });
});
