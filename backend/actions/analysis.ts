"use server";

import type { AnalysisResponse } from "@/backend/types/analysis";
import { fetchVtexOrders } from "@/backend/services/vtex.service";
import {
  buildFeatureVectors,
  processOrders,
} from "@/backend/services/normalization.service";
import { runKmeans } from "@/backend/services/kmeans.service";
import { runSom } from "@/backend/services/som.service";
import { runProductKmeans } from "@/backend/services/product-kmeans.service";
import { buildDiagnostics } from "@/backend/services/diagnostics.service";

export async function runAnalysis(): Promise<AnalysisResponse> {
  try {
    const rawList = await fetchVtexOrders();
    const orders = processOrders(rawList);
    const { normalizedVectors, mins, maxs } = buildFeatureVectors(orders);
    const kmeans = runKmeans(normalizedVectors);
    const som = runSom(normalizedVectors);
    const diagnostics = buildDiagnostics(rawList);
    const productKmeans = runProductKmeans(diagnostics.productStats);

    return {
      success: true,
      data: {
        orders,
        kmeans,
        som,
        productKmeans,
        diagnostics,
        normalizationMeta: { mins, maxs },
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
