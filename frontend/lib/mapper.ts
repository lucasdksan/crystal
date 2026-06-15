import type { AnalysisResult } from "@/backend/types/analysis";
import type { ProcessedOrder } from "@/backend/types/order";
import { getHealthLabel } from "@/backend/services/health.service";
import type {
  DashboardData,
  ClusterInfo,
  CentroidNormalized,
  CentroidDenormalized,
  StatusDistribution,
  StrategicRisk,
  KitSuggestion,
  ProductRank,
  StrategyInfo,
  ClusterRisk,
  AnomalyProduct,
} from "@/frontend/types/dashboard";

const STATUS_PT: Record<string, string> = {
  canceled: "Cancelado",
  "ready-for-handling": "Pronto para Separação",
  invoiced: "Faturado",
  shipped: "Enviado",
  delivered: "Entregue",
  "payment-approved": "Pagamento Aprovado",
  "payment-pending": "Pagamento Pendente",
  pending: "Pendente",
  handling: "Em Separação",
  "window-to-cancel": "Janela de Cancelamento",
  "waiting-for-sellers-confirmation": "Aguardando Confirmação",
  success: "Concluído",
};

const STATUS_COLORS: Record<string, string> = {
  canceled: "#ef4444",
  "ready-for-handling": "#10b981",
  invoiced: "#3b82f6",
  shipped: "#8b5cf6",
  delivered: "#059669",
  "payment-approved": "#f59e0b",
  "payment-pending": "#f97316",
  pending: "#6b7280",
  handling: "#6366f1",
  "window-to-cancel": "#dc2626",
  "waiting-for-sellers-confirmation": "#a855f7",
  success: "#10b981",
};

const DAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

function mostCommon<T>(arr: T[]): T {
  const freq = new Map<T, number>();
  arr.forEach((v) => freq.set(v, (freq.get(v) ?? 0) + 1));
  return [...freq.entries()].reduce((a, b) => (b[1] > a[1] ? b : a))[0];
}

function buildPaymentMix(orders: ProcessedOrder[]): Record<string, number> {
  const mix: Record<string, number> = {};
  orders.forEach((o) => {
    const key = o.paymentRaw || "Desconhecido";
    mix[key] = (mix[key] ?? 0) + 1;
  });
  const total = orders.length;
  if (total === 0) return mix;
  Object.keys(mix).forEach((key) => {
    mix[key] = Math.round((mix[key] / total) * 1000) / 10;
  });
  return mix;
}

function buildHourDistribution(orders: ProcessedOrder[]): number[] {
  const dist = Array(24).fill(0);
  orders.forEach((o) => {
    dist[o.hourOfDay]++;
  });
  return dist;
}

function buildDayDistribution(orders: ProcessedOrder[]): number[] {
  const dist = Array(7).fill(0);
  orders.forEach((o) => {
    dist[o.dayOfWeek]++;
  });
  return dist;
}

function buildTopProducts(orders: ProcessedOrder[], limit = 5): ProductRank[] {
  const productMap = new Map<string, { quantity: number; revenue: number }>();

  orders.forEach((order) => {
    order.items.forEach((item) => {
      const key = item.description || "Produto sem nome";
      const existing = productMap.get(key) ?? { quantity: 0, revenue: 0 };
      existing.quantity += item.quantity;
      existing.revenue += item.sellingPrice * item.quantity;
      productMap.set(key, existing);
    });
  });

  return [...productMap.entries()]
    .map(([name, stats]) => ({
      name,
      quantity: stats.quantity,
      revenue: stats.revenue,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

function findPeakHour(hourDistribution: number[]): number {
  let peak = 0;
  hourDistribution.forEach((count, hour) => {
    if (count > hourDistribution[peak]) peak = hour;
  });
  return peak;
}

function findPeakDay(dayDistribution: number[]): string {
  let peak = 0;
  dayDistribution.forEach((count, day) => {
    if (count > dayDistribution[peak]) peak = day;
  });
  return DAY_NAMES[peak];
}

function generateClusterDescription(
  payment: string,
  avgValue: number,
  deliveryRate: number,
  cancelRate: number,
  count: number,
  revenueShare: number,
): string {
  const avgFormatted = avgValue.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
  });

  if (cancelRate >= 50) {
    return `${cancelRate.toFixed(0)}% cancelados · ${count} pedidos · Perda estimada: R$ ${(avgValue * count * cancelRate / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  }

  if (deliveryRate > 50) {
    return `Ticket R$ ${avgFormatted} · ${deliveryRate.toFixed(0)}% entregues · ${revenueShare.toFixed(0)}% da receita`;
  }

  return `${count} pedidos via ${payment} · Ticket R$ ${avgFormatted} · Cancelamento ${cancelRate.toFixed(0)}%`;
}

function buildClusters(
  orders: ProcessedOrder[],
  clusterAssignments: number[],
  receitaTotal: number,
  profiles: AnalysisResult["kprototypes"]["clusterProfiles"],
): ClusterInfo[] {
  const groups = new Map<number, ProcessedOrder[]>();

  orders.forEach((order, idx) => {
    const cId = clusterAssignments[idx];
    if (!groups.has(cId)) groups.set(cId, []);
    groups.get(cId)!.push(order);
  });

  return [...groups.entries()]
    .map(([id, groupOrders]) => {
      const count = groupOrders.length;
      const percentage = Math.round((count / orders.length) * 1000) / 10;
      const totalValue = groupOrders.reduce((s, o) => s + o.totalValue, 0);
      const averageValue = totalValue / count;
      const revenueShare =
        receitaTotal > 0
          ? Math.round((totalValue / receitaTotal) * 1000) / 10
          : 0;

      const canceledCount = groupOrders.filter(
        (o) => o.statusRaw === "canceled",
      ).length;
      const cancelRate =
        count > 0 ? Math.round((canceledCount / count) * 1000) / 10 : 0;

      const errorCount = groupOrders.filter(
        (o) => o.workflowInErrorState === 1,
      ).length;
      const errorRate =
        count > 0 ? Math.round((errorCount / count) * 1000) / 10 : 0;

      const avgItems =
        Math.round(
          (groupOrders.reduce((s, o) => s + o.totalItems, 0) / count) * 10,
        ) / 10;

      const quantities = groupOrders.map((o) =>
        o.items.reduce((s, item) => s + item.quantity, 0),
      );
      const avgQuantity =
        Math.round(
          (quantities.reduce((s, v) => s + v, 0) / count) * 10,
        ) / 10;

      const allPrices = groupOrders.flatMap((o) =>
        o.items.map((item) => item.sellingPrice),
      );
      const avgPrice =
        allPrices.length > 0
          ? allPrices.reduce((s, v) => s + v, 0) / allPrices.length
          : 0;

      const payment = mostCommon(groupOrders.map((o) => o.paymentRaw));
      const statusRaw = mostCommon(groupOrders.map((o) => o.statusRaw));
      const origin = mostCommon(groupOrders.map((o) => o.originRaw));
      const statusDisplay = STATUS_PT[statusRaw] ?? statusRaw;
      const deliveryRate =
        (groupOrders.filter((o) => o.isAllDelivered === 1).length / count) * 100;

      const profile = profiles.find((p) => p.clusterId === id);
      const hourDistribution = buildHourDistribution(groupOrders);
      const dayDistribution = buildDayDistribution(groupOrders);

      return {
        id,
        name: profile?.name ?? `Cluster ${id}`,
        count,
        percentage,
        averageValue,
        avgItems,
        avgQuantity,
        avgPrice,
        payment,
        status: statusDisplay,
        origin,
        deliveryRate,
        description: generateClusterDescription(
          payment,
          averageValue,
          deliveryRate,
          cancelRate,
          count,
          revenueShare,
        ),
        subtitle: profile?.description ?? `${count} pedidos identificados`,
        cancelRate,
        totalRevenue: totalValue,
        revenueShare,
        errorRate,
        paymentMix: buildPaymentMix(groupOrders),
        hourDistribution,
        dayDistribution,
        topProducts: buildTopProducts(groupOrders, 5),
        profileName: profile?.name,
      };
    })
    .sort((a, b) => a.id - b.id);
}

function denormalizeValue(normalized: number, min: number, max: number): number {
  const range = max - min;
  if (range === 0) return min;
  return normalized * range + min;
}

function buildCentroids(
  centroids: AnalysisResult["kprototypes"]["centroids"],
  profiles: AnalysisResult["kprototypes"]["clusterProfiles"],
): CentroidNormalized[] {
  return centroids.map((c, i) => ({
    clusterId: i,
    name: profiles[i]?.name ?? `Cluster ${i}`,
    valorTotal: Math.round(c.numeric[0] * 100),
    totalItens: Math.round(c.numeric[1] * 100),
    quantidadeTotal: Math.round(c.numeric[2] * 100),
    precoMedio: Math.round(c.numeric[3] * 100),
    pagamento: c.categorical.paymentMethod,
    origem: c.categorical.origin,
    status: c.categorical.status,
    diaDaSemana: c.categorical.dayOfWeek,
    canalVendas: c.categorical.salesChannel,
  }));
}

function buildDenormalizedCentroids(
  centroids: AnalysisResult["kprototypes"]["centroids"],
  mins: number[],
  maxs: number[],
  profiles: AnalysisResult["kprototypes"]["clusterProfiles"],
): CentroidDenormalized[] {
  return centroids.map((c, i) => ({
    clusterId: i,
    name: profiles[i]?.name ?? `Cluster ${i}`,
    valorTotal:
      Math.round(denormalizeValue(c.numeric[0], mins[0], maxs[0]) * 100) / 100,
    totalItens:
      Math.round(denormalizeValue(c.numeric[1], mins[1], maxs[1]) * 10) / 10,
    quantidadeTotal:
      Math.round(denormalizeValue(c.numeric[2], mins[2], maxs[2]) * 10) / 10,
    precoMedio:
      Math.round(denormalizeValue(c.numeric[3], mins[3], maxs[3]) * 100) / 100,
    origem: c.categorical.origin,
    pagamento: c.categorical.paymentMethod,
    status: c.categorical.status,
    diaDaSemana: c.categorical.dayOfWeek,
    canalVendas: c.categorical.salesChannel,
  }));
}

function buildStatuses(orders: ProcessedOrder[]): StatusDistribution[] {
  const map = new Map<string, number>();
  orders.forEach((o) => map.set(o.statusRaw, (map.get(o.statusRaw) ?? 0) + 1));

  return [...map.entries()].map(([rawStatus, count]) => ({
    name: STATUS_PT[rawStatus] ?? rawStatus,
    count,
    color: STATUS_COLORS[rawStatus] ?? "#6b7280",
  }));
}

function buildAllStrategies(
  strategies: AnalysisResult["diagnostics"]["strategies"],
): StrategyInfo[] {
  return [...strategies]
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .map((s) => ({
      type: s.type,
      label: s.label,
      priorityScore: s.priorityScore,
      justifications: s.justifications,
      actions: s.actions.map((a) => ({
        label: a.label,
        description: a.description,
      })),
      financialImpact: s.financialImpact,
    }));
}

function buildClusterRisks(clusters: ClusterInfo[]): ClusterRisk[] {
  return [...clusters]
    .sort((a, b) => b.cancelRate - a.cancelRate)
    .map((c) => ({
      clusterId: c.id,
      clusterName: c.name,
      cancelRate: c.cancelRate,
      revenueShare: c.revenueShare,
    }));
}

function percentileRank(values: number[], value: number): number {
  if (values.length === 0) return 0;
  const below = values.filter((v) => v < value).length;
  const equal = values.filter((v) => v === value).length;
  return (below + equal * 0.5) / values.length;
}

function getProductAction(score: number): string {
  if (score >= 75) return "Descontinuar";
  if (score >= 50) return "Investigar";
  if (score >= 25) return "Monitorar";
  return "Manter";
}

function computeMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

function generateProductClusterName(
  clusterProducts: AnalysisResult["diagnostics"]["productStats"],
  medianEffectiveQty: number,
): string {
  if (clusterProducts.length === 0) return "Indefinido";
  const avgCancel =
    clusterProducts.reduce((sum, product) => sum + product.cancellationRate, 0) /
    clusterProducts.length;
  const avgQty =
    clusterProducts.reduce((sum, product) => sum + product.effectiveQty, 0) /
    clusterProducts.length;

  if (avgCancel >= 0.4 && avgQty < medianEffectiveQty) return "Risco Alto";
  if (avgCancel >= 0.4) return "Risco de Cancelamento";
  if (avgQty < medianEffectiveQty) return "Baixo Giro";
  if (avgCancel < 0.15) return "Saudável";
  return "Desempenho Mediano";
}

function buildAnomalyProducts(
  productKmeans: AnalysisResult["productKmeans"],
  productStats: AnalysisResult["diagnostics"]["productStats"],
): AnomalyProduct[] {
  if (productKmeans.productKeys.length === 0) return [];

  const statByKey = new Map(productStats.map((stat) => [stat.key, stat]));
  const entries = productKmeans.productKeys.map((key, index) => ({
    key,
    stat: statByKey.get(key)!,
    clusterId: productKmeans.clusters[index] ?? 0,
    distance: productKmeans.distances[index] ?? 0,
  }));

  const medianEffectiveQty = computeMedian(
    entries.map((entry) => entry.stat.effectiveQty),
  );

  const clusterNames = new Map<number, string>();
  [...new Set(productKmeans.clusters)].forEach((clusterId) => {
    const clusterProducts = entries
      .filter((entry) => entry.clusterId === clusterId)
      .map((entry) => entry.stat);
    clusterNames.set(
      clusterId,
      generateProductClusterName(clusterProducts, medianEffectiveQty),
    );
  });

  return entries
    .map(({ key, stat, clusterId, distance }) => {
      const anomalyScore =
        Math.round(
          percentileRank(productKmeans.distances, distance) * 1000,
        ) / 10;

      return {
        productKey: key,
        name: stat.label,
        clusterId,
        clusterName: clusterNames.get(clusterId) ?? `Cluster ${clusterId}`,
        revenue: stat.revenue,
        canceledRevenue: stat.canceledRevenue,
        cancellationRate: stat.cancellationRate,
        totalOrders: stat.totalOrders,
        anomalyScore,
        action: getProductAction(anomalyScore),
      };
    })
    .sort((a, b) => b.anomalyScore - a.anomalyScore);
}

function buildExecutiveSummary(
  totalPedidos: number,
  taxaCancelamento: number,
  perdaEstimada: number,
  totalClusters: number,
): string {
  return `${totalPedidos} pedidos · ${taxaCancelamento.toFixed(0)}% cancelados · Perda: R$ ${perdaEstimada.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} · ${totalClusters} segmentos identificados`;
}

export function mapAnalysisResultToDashboard(
  result: AnalysisResult,
): DashboardData {
  const {
    orders,
    kprototypes,
    productKmeans,
    diagnostics,
    normalizationMeta,
    rfm,
    inventory,
    alerts,
    fraud,
    forecast,
    healthScore,
  } = result;
  const { mins, maxs } = normalizationMeta;

  const canceledCount = orders.filter((o) => o.statusRaw === "canceled").length;
  const deliveredCount = orders.filter((o) => o.isAllDelivered === 1).length;
  const receitaTotal = orders.reduce((s, o) => s + o.totalValue, 0);
  const totalPedidos = orders.length;
  const taxaCancelamento =
    totalPedidos > 0 ? (canceledCount / totalPedidos) * 100 : 0;
  const taxaEntrega =
    totalPedidos > 0 ? (deliveredCount / totalPedidos) * 100 : 0;
  const errosWorkflow = orders.filter((o) => o.workflowInErrorState === 1).length;
  const ticketMedio = totalPedidos > 0 ? receitaTotal / totalPedidos : 0;
  const perdaEstimada = receitaTotal * (taxaCancelamento / 100);

  const clusters = buildClusters(
    orders,
    kprototypes.clusters,
    receitaTotal,
    kprototypes.clusterProfiles,
  );

  const bestSilhouettePoint = kprototypes.silhouetteAnalysis.find(
    (p) => p.k === kprototypes.bestK,
  );
  const bestSilhouetteScore = bestSilhouettePoint?.score ?? 0;

  const operationalHours = Array.from({ length: 24 }, (_, h) => ({
    hour: `${h}h`,
    count: orders.filter((o) => o.hourOfDay === h).length,
  }));

  const operationalDays = Array.from({ length: 7 }, (_, d) => ({
    day: DAY_NAMES[d],
    count: orders.filter((o) => o.dayOfWeek === d).length,
  }));

  const products = [...diagnostics.productStats]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10)
    .map((p) => ({
      name: p.label,
      quantity: p.effectiveQty,
      revenue: p.revenue,
    }));

  const reportDate =
    orders.length > 0
      ? new Date(orders[0].creationDate).toLocaleDateString("pt-BR")
      : new Date().toLocaleDateString("pt-BR");

  return {
    reportDate,
    reportId: `Crystal-${new Date().toISOString().slice(0, 10)}`,
    overview: {
      receitaTotal,
      ticketMedio,
      taxaCancelamento,
      taxaEntrega,
      errosWorkflow,
      totalPedidos,
      totalClusters: kprototypes.bestK,
      healthScore: healthScore.overall,
      perdaEstimada,
    },
    clusters,
    centroids: buildCentroids(kprototypes.centroids, kprototypes.clusterProfiles),
    denormalizedCentroids: buildDenormalizedCentroids(
      kprototypes.centroids,
      mins,
      maxs,
      kprototypes.clusterProfiles,
    ),
    elbowCurve: kprototypes.elbowAnalysis,
    silhouetteCurve: kprototypes.silhouetteAnalysis,
    bestSilhouetteScore,
    operationalHours,
    operationalDays,
    statuses: buildStatuses(orders),
    products,
    productAnomalies: buildAnomalyProducts(productKmeans, diagnostics.productStats),
    diagnostics: {
      summary: buildExecutiveSummary(
        totalPedidos,
        taxaCancelamento,
        perdaEstimada,
        kprototypes.bestK,
      ),
      championProduct: diagnostics.diagnosis.championProduct,
      bottleneckProduct: diagnostics.diagnosis.bottleneckProduct,
      risks: diagnostics.risks.map((r) => ({
        product: r.product,
        type: r.riskType,
        gravity:
          r.severity === "Alta"
            ? "Alto"
            : r.severity === "Média"
              ? "Médio"
              : "Baixo",
      })),
      suggestions: diagnostics.strategies
        .filter((s) => s.type === "KIT_OPPORTUNITY" && s.kits && s.kits.length > 0)
        .flatMap((s) =>
          (s.kits ?? []).map((k) => ({
            name: k.commercialName,
            objective: k.strategicObjective,
            products: k.compositeItems,
            details: k.salesRationale,
          })),
        ),
      allStrategies: buildAllStrategies(diagnostics.strategies),
      clusterRisks: buildClusterRisks(clusters),
    },
    rfm: {
      segments: rfm.segments,
      recommendations: rfm.recommendations,
      totalClients: rfm.clients.length,
    },
    inventory: {
      ruptureRisk: inventory.ruptureRisk,
      deadStock: inventory.deadStock,
      abcCurve: inventory.abcCurve,
    },
    alerts,
    fraud,
    forecast,
    healthScore: {
      ...healthScore,
      label: getHealthLabel(healthScore.overall),
    },
  };
}
