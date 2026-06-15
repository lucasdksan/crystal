import { describe, expect, it } from "vitest";
import { mapAnalysisResultToDashboard } from "@/frontend/lib/mapper";
import { buildDiagnostics } from "@/backend/services/diagnostics.service";
import {
  buildMixedDataPoints,
  normalizeMixedData,
  processOrders,
} from "@/backend/services/normalization.service";
import { runKPrototypes } from "@/backend/services/kprototype.service";
import { runProductKmeans } from "@/backend/services/product-kmeans.service";
import { buildRFM } from "@/backend/services/rfm.service";
import { buildInventory } from "@/backend/services/inventory.service";
import { detectFraud } from "@/backend/services/fraud.service";
import { buildForecast } from "@/backend/services/forecast.service";
import { buildAlerts } from "@/backend/services/alerts.service";
import { calculateHealthScore } from "@/backend/services/health.service";
import type { AnalysisResult } from "@/backend/types/analysis";
import { fixtureVtexOrdersNormalized } from "../fixtures/vtex-orders";

async function buildAnalysisResult(): Promise<AnalysisResult> {
  const rawList = fixtureVtexOrdersNormalized();
  const orders = processOrders(rawList);
  const mixedData = buildMixedDataPoints(orders);
  const { normalized, mins, maxs } = normalizeMixedData(mixedData);
  const kprototypes = runKPrototypes(normalized);
  const diagnostics = buildDiagnostics(rawList);
  const productKmeans = runProductKmeans(diagnostics.productStats);
  const rfm = buildRFM(rawList);
  const inventory = await buildInventory(rawList);
  const fraud = detectFraud(rawList);
  const forecast = buildForecast(rawList);

  const totalRevenue = orders.reduce((s, o) => s + o.totalValue, 0);
  const canceledCount = orders.filter((o) => o.statusRaw === "canceled").length;
  const cancelRate = orders.length > 0 ? (canceledCount / orders.length) * 100 : 0;
  const deliveredCount = orders.filter((o) => o.isAllDelivered === 1).length;
  const deliveryRate = orders.length > 0 ? (deliveredCount / orders.length) * 100 : 0;
  const ticketMedio = orders.length > 0 ? totalRevenue / orders.length : 0;

  const alerts = buildAlerts({
    cancelRate,
    totalRevenue,
    totalOrders: orders.length,
    ticketMedio,
    inventory,
    fraud,
    kprototypes,
    rfm,
  });

  const healthScore = calculateHealthScore({
    cancelRate,
    deliveryRate,
    inventory,
    fraud,
    revenueConcentration: 0.5,
  });

  return {
    orders,
    kprototypes,
    productKmeans,
    diagnostics,
    normalizationMeta: { mins, maxs },
    rfm,
    inventory,
    alerts,
    fraud,
    forecast,
    healthScore,
  };
}

describe("mapper", () => {
  it("mapAnalysisResultToDashboard computes overview KPIs correctly", async () => {
    const result = await buildAnalysisResult();
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
    expect(dashboard.overview.totalClusters).toBe(result.kprototypes.bestK);
    expect(dashboard.overview.healthScore).toBe(result.healthScore.overall);
    expect(dashboard.overview.perdaEstimada).toBeCloseTo(
      expectedRevenue * (expectedCancelRate / 100),
      1,
    );
  });

  it("buildClusters output matches bestK with required fields", async () => {
    const result = await buildAnalysisResult();
    const dashboard = mapAnalysisResultToDashboard(result);

    expect(dashboard.clusters.length).toBe(result.kprototypes.bestK);
    dashboard.clusters.forEach((cluster) => {
      expect(cluster.name).toBeTruthy();
      expect(cluster.subtitle).toBeTruthy();
      expect(cluster.count).toBeGreaterThanOrEqual(0);
      expect(cluster.description).toBeTruthy();
    });
  });

  it("includes RFM, alerts, inventory and health score", async () => {
    const result = await buildAnalysisResult();
    const dashboard = mapAnalysisResultToDashboard(result);

    expect(dashboard.rfm.totalClients).toBeGreaterThan(0);
    expect(dashboard.healthScore.overall).toBeGreaterThanOrEqual(0);
    expect(dashboard.healthScore.overall).toBeLessThanOrEqual(100);
    expect(Array.isArray(dashboard.alerts)).toBe(true);
    expect(Array.isArray(dashboard.inventory.abcCurve)).toBe(true);
  });

  it("productAnomalies have scores in 0-100 and action set", async () => {
    const result = await buildAnalysisResult();
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
