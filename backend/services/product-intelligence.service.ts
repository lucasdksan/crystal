import type {
  ProductCluster,
  ProductDiagnostic,
  ProductIntelligenceResult,
  ProductAgrupamentoResult,
  ProductStat,
} from "@/backend/types/analysis";

const CLUSTER_NAMES = ["Campeões", "Atenção", "Cauda Longa", "Volume"] as const;
const LONG_TAIL_ORDER_THRESHOLD = 3;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function buildClusters(
  productStats: ProductStat[],
  agrupamentoProdutos: ProductAgrupamentoResult,
): ProductCluster[] {
  const totalRevenue = productStats.reduce((sum, stat) => sum + stat.revenue, 0);
  const statByKey = new Map(productStats.map((stat) => [stat.key, stat]));

  if (agrupamentoProdutos.productKeys.length === 0) {
    return [];
  }

  const clusterIds = [...new Set(agrupamentoProdutos.clusters)].sort(
    (a, b) => a - b,
  );
  const clusterStats = new Map<number, ProductStat[]>();

  agrupamentoProdutos.productKeys.forEach((key, index) => {
    const clusterId = agrupamentoProdutos.clusters[index];
    const stat = statByKey.get(key);
    if (!stat) return;
    const members = clusterStats.get(clusterId) ?? [];
    members.push(stat);
    clusterStats.set(clusterId, members);
  });

  const clusterMetrics = clusterIds.map((id) => {
    const members = clusterStats.get(id) ?? [];
    const clusterRevenue = members.reduce((sum, m) => sum + m.revenue, 0);
    const avgRevenue = members.length > 0 ? clusterRevenue / members.length : 0;
    const avgCancel =
      members.length > 0
        ? members.reduce((sum, m) => sum + m.cancellationRate, 0) / members.length
        : 0;
    const avgOrders =
      members.length > 0
        ? members.reduce((sum, m) => sum + m.totalOrders, 0) / members.length
        : 0;

    return { id, members, clusterRevenue, avgRevenue, avgCancel, avgOrders };
  });

  const nameAssignments = new Map<number, string>();
  const usedNames = new Set<string>();

  const championId = [...clusterMetrics].sort(
    (a, b) => b.avgRevenue - a.avgRevenue,
  )[0]?.id;
  if (championId !== undefined) {
    nameAssignments.set(championId, "Campeões");
    usedNames.add("Campeões");
  }

  const attentionId = [...clusterMetrics]
    .filter((c) => c.id !== championId)
    .sort((a, b) => b.avgCancel - a.avgCancel)[0]?.id;
  if (attentionId !== undefined) {
    nameAssignments.set(attentionId, "Atenção");
    usedNames.add("Atenção");
  }

  const tailId = [...clusterMetrics]
    .filter((c) => !nameAssignments.has(c.id))
    .sort((a, b) => a.avgOrders - b.avgOrders)[0]?.id;
  if (tailId !== undefined) {
    nameAssignments.set(tailId, "Cauda Longa");
    usedNames.add("Cauda Longa");
  }

  clusterMetrics.forEach((cluster) => {
    if (!nameAssignments.has(cluster.id)) {
      const fallback =
        CLUSTER_NAMES.find((name) => !usedNames.has(name)) ?? "Volume";
      nameAssignments.set(cluster.id, fallback);
      usedNames.add(fallback);
    }
  });

  return clusterMetrics.map((cluster) => ({
    id: cluster.id,
    name: nameAssignments.get(cluster.id) ?? `Cluster ${cluster.id}`,
    products: cluster.members.map((stat) => ({
      productKey: stat.key,
      name: stat.label,
      revenue: round2(stat.revenue),
      totalOrders: stat.totalOrders,
      cancellationRate: round2(stat.cancellationRate),
    })),
    totalRevenue: round2(cluster.clusterRevenue),
    revenueShare:
      totalRevenue > 0
        ? round2((cluster.clusterRevenue / totalRevenue) * 100)
        : 0,
    productCount: cluster.members.length,
    averageCancellationRate: round2(cluster.avgCancel),
  }));
}

function buildDiagnostics(
  productStats: ProductStat[],
  clusters: ProductCluster[],
): ProductDiagnostic[] {
  const diagnostics: ProductDiagnostic[] = [];
  const totalRevenue = productStats.reduce((sum, stat) => sum + stat.revenue, 0);

  const sortedByRevenue = [...productStats].sort((a, b) => b.revenue - a.revenue);
  const championCluster = clusters.find((c) => c.name === "Campeões");

  if (championCluster && championCluster.revenueShare > 0) {
    diagnostics.push({
      type: "champion",
      title: "Campeões",
      message: `${championCluster.productCount} produtos representam ${championCluster.revenueShare.toFixed(0)}% da receita da operação.`,
      severity: "info",
    });
  } else if (sortedByRevenue.length > 0 && totalRevenue > 0) {
    const topCount = Math.max(1, Math.ceil(sortedByRevenue.length * 0.2));
    const topRevenue = sortedByRevenue
      .slice(0, topCount)
      .reduce((sum, stat) => sum + stat.revenue, 0);
    const share = (topRevenue / totalRevenue) * 100;
    diagnostics.push({
      type: "champion",
      title: "Campeões",
      message: `${topCount} produtos representam ${share.toFixed(0)}% da receita da operação.`,
      severity: "info",
    });
  }

  if (sortedByRevenue.length > 0 && totalRevenue > 0) {
    const topProduct = sortedByRevenue[0];
    const topShare = (topProduct.revenue / totalRevenue) * 100;
    if (topShare >= 15) {
      diagnostics.push({
        type: "dependency",
        title: "Dependência",
        message: `O produto "${topProduct.label}" sozinho representa ${topShare.toFixed(0)}% do faturamento.`,
        severity: topShare >= 25 ? "critical" : "warning",
      });
    }
  }

  const highCancelProducts = productStats.filter(
    (stat) => stat.cancellationRate >= 0.3 && stat.totalOrders >= 2,
  );
  if (highCancelProducts.length > 0) {
    const names = highCancelProducts
      .slice(0, 3)
      .map((stat) => stat.label)
      .join(", ");
    diagnostics.push({
      type: "risk",
      title: "Risco",
      message: `${highCancelProducts.length} produto(s) com alta taxa de cancelamento (${names}${highCancelProducts.length > 3 ? "..." : ""}). Risco de ruptura de estoque e dependência excessiva.`,
      severity: "critical",
    });
  }

  const longTail = productStats.filter(
    (stat) => stat.totalOrders < LONG_TAIL_ORDER_THRESHOLD,
  );
  if (longTail.length > 0) {
    diagnostics.push({
      type: "long_tail",
      title: "Cauda Longa",
      message: `${longTail.length} produtos venderam menos de ${LONG_TAIL_ORDER_THRESHOLD} vezes no período analisado.`,
      severity: "warning",
    });
  }

  const opportunityCluster = [...clusters]
    .filter((c) => c.name !== "Campeões" && c.name !== "Cauda Longa")
    .sort((a, b) => b.averageCancellationRate - a.averageCancellationRate)[0];

  if (
    opportunityCluster &&
    opportunityCluster.revenueShare < 15 &&
    opportunityCluster.averageCancellationRate < 0.2
  ) {
    diagnostics.push({
      type: "opportunity",
      title: "Oportunidades",
      message: `O cluster "${opportunityCluster.name}" possui margem operacional favorável mas representa apenas ${opportunityCluster.revenueShare.toFixed(0)}% dos pedidos.`,
      severity: "info",
    });
  } else {
    const lowShareHighValue = clusters.find(
      (c) => c.revenueShare < 10 && c.totalRevenue > 0 && c.averageCancellationRate < 0.15,
    );
    if (lowShareHighValue) {
      diagnostics.push({
        type: "opportunity",
        title: "Oportunidades",
        message: `O cluster "${lowShareHighValue.name}" possui baixo cancelamento mas representa apenas ${lowShareHighValue.revenueShare.toFixed(0)}% da receita.`,
        severity: "info",
      });
    }
  }

  return diagnostics;
}

export function runProductIntelligence(
  productStats: ProductStat[],
  agrupamentoProdutos: ProductAgrupamentoResult,
): ProductIntelligenceResult {
  const clusters = buildClusters(productStats, agrupamentoProdutos);
  const diagnostics = buildDiagnostics(productStats, clusters);

  return {
    clusters,
    diagnostics,
    totalProducts: productStats.length,
  };
}
