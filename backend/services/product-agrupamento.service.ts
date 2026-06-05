import type { ProductAgrupamentoResult, ProductStat } from "@/backend/types/analysis";
import { normalize } from "@/backend/services/normalization.service";
import { runAgrupamento } from "@/backend/services/agrupamento.service";

const MIN_ORDERS_FOR_RISK = 2;

export function productToVector(stat: ProductStat): number[] {
  return [
    stat.cancellationRate,
    stat.revenue,
    stat.canceledRevenue,
    stat.effectiveQty,
    stat.totalOrders,
  ];
}

export function runAgrupamentoProdutos(stats: ProductStat[]): ProductAgrupamentoResult {
  const eligible = stats.filter((stat) => stat.totalOrders >= MIN_ORDERS_FOR_RISK);

  if (eligible.length === 0) {
    return {
      productKeys: [],
      clusters: [],
      distances: [],
      bestK: 0,
    };
  }

  const rawVectors = eligible.map(productToVector);
  const { normalized } = normalize(rawVectors);
  const agrupamento = runAgrupamento(normalized);

  return {
    productKeys: eligible.map((stat) => stat.key),
    clusters: agrupamento.clusters,
    distances: agrupamento.orderDistances,
    bestK: agrupamento.bestK,
  };
}
