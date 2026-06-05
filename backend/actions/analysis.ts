"use server";

import { unstable_noStore as noStore } from "next/cache";
import type { AnalysisOptions, AnalysisResponse } from "@/backend/types/analysis";
import { fetchVtexOrders } from "@/backend/services/vtex.service";
import {
  buildCustomerFeatureVectors,
  processOrders,
} from "@/backend/services/normalization.service";
import { runCustomerKmeans } from "@/backend/services/kmeans.service";
import { runSom } from "@/backend/services/som.service";
import { runProductKmeans } from "@/backend/services/product-kmeans.service";
import { buildDiagnostics } from "@/backend/services/diagnostics.service";
import { aggregateByCustomer } from "@/backend/services/customer-aggregation.service";
import { runCustomerIntelligence } from "@/backend/services/customer-intelligence.service";

export async function runAnalysis(
  options?: AnalysisOptions,
): Promise<AnalysisResponse> {
  noStore();

  try {
    const rawList = await fetchVtexOrders(options);
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
      success: true,
      data: {
        orders,
        customerProfiles,
        kmeans,
        som,
        productKmeans,
        diagnostics,
        customerIntelligence,
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
