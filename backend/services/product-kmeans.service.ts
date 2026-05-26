import type { ProductKmeansResult, ProductStat } from "@/backend/types/analysis";
import { normalize } from "@/backend/services/normalization.service";
import { runKmeans } from "@/backend/services/kmeans.service";

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

export function runProductKmeans(stats: ProductStat[]): ProductKmeansResult {
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
  const kmeans = runKmeans(normalized);

  return {
    productKeys: eligible.map((stat) => stat.key),
    clusters: kmeans.clusters,
    distances: kmeans.orderDistances,
    bestK: kmeans.bestK,
  };
}
