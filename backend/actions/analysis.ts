"use server";

import type { AnalysisOptions, AnalysisResponse } from "@/backend/types/analysis";
import { fetchVtexOrders } from "@/backend/services/vtex.service";
import {
  buildMixedDataPoints,
  normalizeMixedData,
  processOrders,
} from "@/backend/services/normalization.service";
import { runKPrototypes } from "@/backend/services/kprototype.service";
import { runProductKmeans } from "@/backend/services/product-kmeans.service";
import { buildDiagnostics } from "@/backend/services/diagnostics.service";
import { buildRFM } from "@/backend/services/rfm.service";
import { buildInventory } from "@/backend/services/inventory.service";
import { buildAlerts } from "@/backend/services/alerts.service";
import { detectFraud } from "@/backend/services/fraud.service";
import { buildForecast } from "@/backend/services/forecast.service";
import { calculateHealthScore } from "@/backend/services/health.service";
import { attachFinancialToStrategies } from "@/backend/services/financial.service";

export async function runAnalysis(
  options?: AnalysisOptions,
): Promise<AnalysisResponse> {
  try {
    const rawList = await fetchVtexOrders(options);
    const orders = processOrders(rawList);
    const mixedData = buildMixedDataPoints(orders);
    const { normalized: normalizedMixed, mins, maxs } = normalizeMixedData(mixedData);
    const kprototypes = runKPrototypes(normalizedMixed);
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

    const abcA = inventory.abcCurve.filter((i) => i.class === "A");
    const revenueConcentration =
      abcA.length > 0
        ? abcA.reduce((s, i) => s + i.share, 0) / 100
        : 0;

    attachFinancialToStrategies(diagnostics.strategies, {
      totalRevenue,
      cancelRate,
      totalOrders: orders.length,
      ticketMedio,
    });

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
      revenueConcentration,
    });

    return {
      success: true,
      data: {
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
      },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro desconhecido ao executar análise.";

    return {
      success: false,
      error: message,
    };
  }
}
