import { describe, expect, it } from "vitest";
import { mapAnalysisResultToDashboard } from "@/frontend/lib/mapper";
import { buildDiagnostics } from "@/backend/services/diagnostics.service";
import {
  buildCustomerFeatureVectors,
  buildRFMVectors,
  processOrders,
} from "@/backend/services/normalization.service";
import { runCohortAnalysis } from "@/backend/services/cohort-analysis.service";
import { runAgrupamentoClientes } from "@/backend/services/agrupamento.service";
import { runAgrupamentoProdutos } from "@/backend/services/product-agrupamento.service";
import { aggregateByCustomer } from "@/backend/services/customer-aggregation.service";
import { runCustomerIntelligence } from "@/backend/services/customer-intelligence.service";
import { runProductIntelligence } from "@/backend/services/product-intelligence.service";
import { runBcgMatrix } from "@/backend/services/bcg-matrix.service";
import { runCatalogHealth } from "@/backend/services/catalog-health.service";
import type { AnalysisResult } from "@/backend/types/analysis";
import { fixtureVtexOrdersNormalized } from "../fixtures/vtex-orders";

function buildAnalysisResult(): AnalysisResult {
  const rawList = fixtureVtexOrdersNormalized();
  const orders = processOrders(rawList);
  const customerProfiles = aggregateByCustomer(orders);
  const { mins, maxs, uniquePaymentMethods } =
    buildCustomerFeatureVectors(customerProfiles);
  const { vectors: rfmVectors } = buildRFMVectors(customerProfiles);
  const agrupamento = runAgrupamentoClientes(
    rfmVectors,
    uniquePaymentMethods,
    customerProfiles,
  );
  const diagnostics = buildDiagnostics(rawList);
  const agrupamentoProdutos = runAgrupamentoProdutos(diagnostics.productStats);
  const customerIntelligence = runCustomerIntelligence(
    customerProfiles,
    agrupamento,
  );
  const productIntelligence = runProductIntelligence(
    diagnostics.productStats,
    agrupamentoProdutos,
  );
  const bcgMatrix = runBcgMatrix(orders, diagnostics.productStats);
  const catalogHealth = runCatalogHealth(
    orders,
    diagnostics.productStats,
    bcgMatrix,
  );
  const cohortAnalysis = runCohortAnalysis(
    orders,
    customerProfiles,
    agrupamento,
    customerIntelligence.churnScores,
  );

  return {
    orders,
    customerProfiles,
    agrupamento,
    agrupamentoProdutos,
    diagnostics,
    customerIntelligence,
    productIntelligence,
    bcgMatrix,
    catalogHealth,
    cohortAnalysis,
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
    expect(dashboard.overview.totalClusters).toBe(result.agrupamento.bestK);
    expect(dashboard.overview.totalClientes).toBe(result.customerProfiles.length);
    expect(dashboard.customerSegments.length).toBeGreaterThan(0);
  });

  it("buildClusters output matches bestK with required fields", () => {
    const result = buildAnalysisResult();
    const dashboard = mapAnalysisResultToDashboard(result);

    expect(dashboard.clusters.length).toBe(result.agrupamento.bestK);
    dashboard.clusters.forEach((cluster) => {
      expect(cluster.name).toBeTruthy();
      expect(cluster.subtitle).toBeTruthy();
      expect(cluster.count).toBeGreaterThanOrEqual(0);
      expect(cluster.description).toBeTruthy();
    });
  });

  it("maps product intelligence, BCG matrix and catalog health", () => {
    const result = buildAnalysisResult();
    const dashboard = mapAnalysisResultToDashboard(result);

    expect(dashboard.productIntelligence.totalProducts).toBe(
      result.diagnostics.productStats.length,
    );
    expect(dashboard.bcgMatrix.products.length).toBeGreaterThanOrEqual(0);
    expect(dashboard.catalogHealth.summary.totalProducts).toBe(
      result.diagnostics.productStats.length,
    );
  });

  it("productAnomalies have scores in 0-100 and action set", () => {
    const result = buildAnalysisResult();
    const dashboard = mapAnalysisResultToDashboard(result);

    if (dashboard.productAnomalies.length === 0) {
      expect(result.agrupamentoProdutos.productKeys).toHaveLength(0);
      return;
    }

    dashboard.productAnomalies.forEach((product) => {
      expect(product.anomalyScore).toBeGreaterThanOrEqual(0);
      expect(product.anomalyScore).toBeLessThanOrEqual(100);
      expect(product.action).toBeTruthy();
    });
  });
});
