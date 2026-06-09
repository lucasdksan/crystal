"use server";

import { unstable_noStore as noStore } from "next/cache";
import type { AnalysisOptions, AnalysisResponse } from "@/backend/types/analysis";
import { fetchVtexOrders } from "@/backend/services/vtex.service";
import {
  buildCustomerFeatureVectors,
  buildRFMVectors,
  processOrders,
} from "@/backend/services/normalization.service";
import { runCohortAnalysis } from "@/backend/services/cohort-analysis.service";
import { runAgrupamentoClientes } from "@/backend/services/agrupamento.service";
import { runAgrupamentoProdutos } from "@/backend/services/product-agrupamento.service";
import { buildDiagnostics } from "@/backend/services/diagnostics.service";
import { aggregateByCustomer } from "@/backend/services/customer-aggregation.service";
import { runCustomerIntelligence } from "@/backend/services/customer-intelligence.service";
import { runProductIntelligence } from "@/backend/services/product-intelligence.service";
import { runBcgMatrix } from "@/backend/services/bcg-matrix.service";
import { runCatalogHealth } from "@/backend/services/catalog-health.service";

export async function runAnalysis(
  options?: AnalysisOptions,
): Promise<AnalysisResponse> {
  noStore();

  try {
    const rawList = await fetchVtexOrders(options);
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
      success: true,
      data: {
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
