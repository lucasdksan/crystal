import type { AnalysisResult } from "@/backend/types/analysis";
import type { CustomerProfile } from "@/backend/types/customer";
import type { ProcessedOrder } from "@/backend/types/order";
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

const PAYMENT_REVERSE: Record<number, string> = {
  0: "Promissory",
  1: "Boleto Bancário",
  2: "Dinheiro",
  3: "Pix",
  4: "Cartão de Crédito",
  5: "Cartão de Débito",
  6: "Visa",
  7: "Mastercard",
  8: "American Express",
  9: "Diners Club",
  10: "Hipercard",
  11: "Aura",
  12: "Elo",
  13: "JCB",
  14: "Discover",
};

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

function generateClusterName(
  id: number,
  payment: string,
  deliveryRate: number,
): string {
  if (deliveryRate > 50) return `Cluster ${id} - Grupo Saudável`;
  const p = payment.toLowerCase();
  if (p.includes("promiss")) return `Cluster ${id} - Promissória`;
  if (p.includes("boleto")) return `Cluster ${id} - Boleto`;
  if (p.includes("dinheiro") || p.includes("pix"))
    return `Cluster ${id} - Pagamento Imediato`;
  return `Cluster ${id}`;
}

function generateClusterSubtitle(count: number, deliveryRate: number): string {
  if (deliveryRate > 50) return `${count} pedido(s) com alta taxa de conversão`;
  return `${count} pedido(s) com baixa conversão`;
}

function generateClusterDescription(
  payment: string,
  avgValue: number,
  deliveryRate: number,
  cancelRate: number,
  count: number,
  revenueShare: number,
  errorRate: number,
  peakDay?: string,
  peakHour?: number,
): string {
  const p = payment.toLowerCase();
  const avgFormatted = avgValue.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
  });
  const shareText =
    revenueShare >= 15
      ? ` Este grupo representa ${revenueShare.toFixed(1)}% da receita total da loja.`
      : revenueShare > 0
        ? ` Representa ${revenueShare.toFixed(1)}% da receita do lote.`
        : "";

  if (deliveryRate > 50 || (cancelRate < 15 && deliveryRate >= 0)) {
    if (cancelRate < 15 && deliveryRate > 50) {
      const timingHint =
        peakDay && peakHour !== undefined
          ? ` Pico de compra: ${peakDay} às ${peakHour}h.`
          : "";
      return `Grupo saudável! Pagamento via ${payment} com ${deliveryRate.toFixed(0)}% de entrega. Ticket médio R$ ${avgFormatted}.${timingHint} Replique este padrão!`;
    }
    if (cancelRate < 15) {
      const timingHint =
        peakDay && peakHour !== undefined
          ? ` Pico de compra: ${peakDay} às ${peakHour}h.`
          : "";
      return `Pedidos aguardando despacho. Pagamento via ${payment}, ticket médio R$ ${avgFormatted}.${shareText}${timingHint} Priorize a separação para garantir entrega.`;
    }
  }

  if (cancelRate >= 50) {
    if (p.includes("promiss")) {
      if (count >= 3)
        return `Grupo crítico de Promissória: ${count} pedidos cancelados, ticket médio R$ ${avgFormatted}.${shareText} Desative este método imediatamente e contate os clientes.`;
      if (avgValue >= 3000)
        return `Promissória de alto ticket (R$ ${avgFormatted}) com alto cancelamento.${shareText} Bloqueie novas promissórias e priorize recuperação destes ${count} pedido(s).`;
      return `Promissória de baixo volume (${count} pedido(s), ticket R$ ${avgFormatted}) cancelada.${shareText} Remova o método e monitore reincidência.`;
    }
    if (p.includes("boleto")) {
      if (errorRate > 0)
        return `Boletos com ${errorRate.toFixed(0)}% de erros de workflow e ${cancelRate.toFixed(0)}% de cancelamento. Ticket médio R$ ${avgFormatted}.${shareText} Corrija integração e envie PIX em 2h.`;
      if (count >= 3)
        return `${count} pedidos via boleto abandonados. Ticket médio R$ ${avgFormatted}.${shareText} Ative régua automática de lembrete PIX no WhatsApp.`;
      return `Boleto isolado (${count} pedido(s), R$ ${avgFormatted}) não pago.${shareText} Envie link PIX imediatamente após emissão.`;
    }
    return `Cancelamento elevado (${cancelRate.toFixed(0)}%) em ${count} pedido(s). Ticket médio R$ ${avgFormatted}.${shareText} Investigue o padrão de comportamento deste grupo.`;
  }

  return `Grupo misto: ${deliveryRate.toFixed(0)}% de entrega, ${cancelRate.toFixed(0)}% de cancelamento. Ticket médio R$ ${avgFormatted}.${shareText} Monitore conversão e ajuste método de pagamento se necessário.`;
}

function buildCustomerClusters(
  profiles: CustomerProfile[],
  orders: ProcessedOrder[],
  clusterAssignments: number[],
  receitaTotal: number,
  segmentNames: Map<number, string>,
): ClusterInfo[] {
  const groups = new Map<number, CustomerProfile[]>();

  profiles.forEach((profile, idx) => {
    const cId = clusterAssignments[idx];
    if (!groups.has(cId)) groups.set(cId, []);
    groups.get(cId)!.push(profile);
  });

  const profileToOrders = new Map<string, ProcessedOrder[]>();
  orders.forEach((order) => {
    const key =
      order.clientEmail?.trim().toLowerCase() ||
      order.clientName.trim().toLowerCase() ||
      order.orderId;
    if (!profileToOrders.has(key)) profileToOrders.set(key, []);
    profileToOrders.get(key)!.push(order);
  });

  return [...groups.entries()]
    .map(([id, groupProfiles]) => {
      const count = groupProfiles.length;
      const percentage =
        profiles.length > 0
          ? Math.round((count / profiles.length) * 1000) / 10
          : 0;

      const totalRevenue = groupProfiles.reduce((s, p) => s + p.totalSpent, 0);
      const averageValue = count > 0 ? totalRevenue / count : 0;
      const revenueShare =
        receitaTotal > 0
          ? Math.round((totalRevenue / receitaTotal) * 1000) / 10
          : 0;

      const groupOrders = groupProfiles.flatMap(
        (p) => profileToOrders.get(p.clientId) ?? [],
      );

      const canceledCount = groupOrders.filter(
        (o) => o.statusRaw === "canceled",
      ).length;
      const cancelRate =
        groupOrders.length > 0
          ? Math.round((canceledCount / groupOrders.length) * 1000) / 10
          : 0;

      const errorCount = groupOrders.filter(
        (o) => o.workflowInErrorState === 1,
      ).length;
      const errorRate =
        groupOrders.length > 0
          ? Math.round((errorCount / groupOrders.length) * 1000) / 10
          : 0;

      const avgItems =
        groupOrders.length > 0
          ? Math.round(
              (groupOrders.reduce((s, o) => s + o.totalItems, 0) /
                groupOrders.length) *
                10,
            ) / 10
          : 0;

      const quantities = groupOrders.map((o) =>
        o.items.reduce((s, item) => s + item.quantity, 0),
      );
      const avgQuantity =
        quantities.length > 0
          ? Math.round(
              (quantities.reduce((s, v) => s + v, 0) / quantities.length) * 10,
            ) / 10
          : 0;

      const allPrices = groupOrders.flatMap((o) =>
        o.items.map((item) => item.sellingPrice),
      );
      const avgPrice =
        allPrices.length > 0
          ? allPrices.reduce((s, v) => s + v, 0) / allPrices.length
          : 0;

      const payment = mostCommon(
        groupProfiles.map((p) => p.preferredPaymentMethod),
      );
      const statusRaw =
        groupOrders.length > 0
          ? mostCommon(groupOrders.map((o) => o.statusRaw))
          : "—";
      const origin =
        groupOrders.length > 0
          ? mostCommon(groupOrders.map((o) => o.originRaw))
          : "—";
      const statusDisplay = STATUS_PT[statusRaw] ?? statusRaw;

      const deliveryRate =
        groupOrders.length > 0
          ? (groupOrders.filter((o) => o.isAllDelivered === 1).length /
              groupOrders.length) *
            100
          : 0;

      const paymentMix = buildPaymentMix(groupOrders);
      const hourDistribution = buildHourDistribution(groupOrders);
      const dayDistribution = buildDayDistribution(groupOrders);
      const topProducts = buildTopProducts(groupOrders, 5);
      const peakHour = findPeakHour(hourDistribution);
      const peakDay = findPeakDay(dayDistribution);

      const averageFrequency =
        count > 0
          ? groupProfiles.reduce((s, p) => s + p.purchaseFrequency, 0) / count
          : 0;
      const averageDaysSinceLastPurchase =
        count > 0
          ? groupProfiles.reduce((s, p) => s + p.daysSinceLastPurchase, 0) /
            count
          : 0;

      const segmentName = segmentNames.get(id) ?? `Segmento ${id}`;

      return {
        id,
        name: segmentName,
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
        description: `${count} clientes no segmento "${segmentName}". Ticket médio R$ ${averageValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}. Frequência média ${averageFrequency.toFixed(1)} pedidos/mês. ${revenueShare >= 15 ? `Representa ${revenueShare.toFixed(1)}% da receita.` : ""}`,
        subtitle: `${count} cliente(s) · ${averageFrequency.toFixed(1)} ped/mês`,
        cancelRate,
        totalRevenue,
        revenueShare,
        errorRate,
        paymentMix,
        hourDistribution,
        dayDistribution,
        topProducts,
        averageFrequency: Math.round(averageFrequency * 100) / 100,
        averageDaysSinceLastPurchase: Math.round(averageDaysSinceLastPurchase),
      };
    })
    .sort((a, b) => a.id - b.id);
}

function buildClusters(
  orders: ProcessedOrder[],
  clusterAssignments: number[],
  receitaTotal: number,
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
      const totalRevenue = totalValue;
      const revenueShare =
        receitaTotal > 0
          ? Math.round((totalRevenue / receitaTotal) * 1000) / 10
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
        (groupOrders.filter((o) => o.isAllDelivered === 1).length / count) *
        100;

      const paymentMix = buildPaymentMix(groupOrders);
      const hourDistribution = buildHourDistribution(groupOrders);
      const dayDistribution = buildDayDistribution(groupOrders);
      const topProducts = buildTopProducts(groupOrders, 5);
      const peakHour = findPeakHour(hourDistribution);
      const peakDay = findPeakDay(dayDistribution);

      return {
        id,
        name: generateClusterName(id, payment, deliveryRate),
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
          errorRate,
          peakDay,
          peakHour,
        ),
        subtitle: generateClusterSubtitle(count, deliveryRate),
        cancelRate,
        totalRevenue,
        revenueShare,
        errorRate,
        paymentMix,
        hourDistribution,
        dayDistribution,
        topProducts,
      };
    })
    .sort((a, b) => a.id - b.id);
}

function buildCentroids(centroids: number[][]): CentroidNormalized[] {
  return centroids.map((c, i) => ({
    clusterId: i,
    name: `Cluster ${i}`,
    valorTotal: Math.round(c[0] * 100),
    totalItens: Math.round(c[1] * 100),
    quantidadeTotal: Math.round(c[2] * 100),
    precoMedio: Math.round(c[3] * 100),
    origem: c[4] ?? 0,
    pagamento: c[5] ?? 0,
    horaDoDia: c[6] ?? 0,
    diaDaSemana: c[7] ?? 0,
    canalVendas: c[8] ?? 0,
  }));
}

function denormalizeValue(normalized: number, min: number, max: number): number {
  const range = max - min;
  if (range === 0) return min;
  return normalized * range + min;
}

function buildDenormalizedCentroids(
  centroids: number[][],
  mins: number[],
  maxs: number[],
  orders: ProcessedOrder[],
): CentroidDenormalized[] {
  const channelMap = new Map<number, string>();
  orders.forEach((o) => {
    if (o.salesChannel >= 0 && o.salesChannelRaw) {
      channelMap.set(o.salesChannel, o.salesChannelRaw);
    }
  });

  return centroids.map((c, i) => {
    const paymentCode = Math.round(
      denormalizeValue(c[5] ?? 0, mins[5] ?? 0, maxs[5] ?? 0),
    );
    const dayCode = Math.round(
      denormalizeValue(c[7] ?? 0, mins[7] ?? 0, maxs[7] ?? 0),
    );
    const channelCode = Math.round(
      denormalizeValue(c[8] ?? 0, mins[8] ?? 0, maxs[8] ?? 0),
    );
    const originCode = Math.round(
      denormalizeValue(c[4] ?? 0, mins[4] ?? 0, maxs[4] ?? 0),
    );

    return {
      clusterId: i,
      name: `Cluster ${i}`,
      valorTotal: Math.round(
        denormalizeValue(c[0], mins[0], maxs[0]) * 100,
      ) / 100,
      totalItens:
        Math.round(denormalizeValue(c[1], mins[1], maxs[1]) * 10) / 10,
      quantidadeTotal:
        Math.round(denormalizeValue(c[2], mins[2], maxs[2]) * 10) / 10,
      precoMedio:
        Math.round(denormalizeValue(c[3], mins[3], maxs[3]) * 100) / 100,
      origem: originCode === 0 ? "Marketplace" : "Outro",
      pagamento: PAYMENT_REVERSE[paymentCode] ?? "Desconhecido",
      horaDoDia: Math.round(
        denormalizeValue(c[6] ?? 0, mins[6] ?? 0, maxs[6] ?? 0),
      ),
      diaDaSemana: DAY_NAMES[Math.min(Math.max(dayCode, 0), 6)] ?? "—",
      canalVendas: channelMap.get(channelCode) ?? `Canal ${channelCode}`,
    };
  });
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
  agrupamentoProdutos: AnalysisResult["agrupamentoProdutos"],
  productStats: AnalysisResult["diagnostics"]["productStats"],
): AnomalyProduct[] {
  if (agrupamentoProdutos.productKeys.length === 0) return [];

  const statByKey = new Map(productStats.map((stat) => [stat.key, stat]));
  const entries = agrupamentoProdutos.productKeys.map((key, index) => ({
    key,
    stat: statByKey.get(key)!,
    clusterId: agrupamentoProdutos.clusters[index] ?? 0,
    distance: agrupamentoProdutos.distances[index] ?? 0,
  }));

  const medianEffectiveQty = computeMedian(
    entries.map((entry) => entry.stat.effectiveQty),
  );

  const clusterNames = new Map<number, string>();
  [...new Set(agrupamentoProdutos.clusters)].forEach((clusterId) => {
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
          percentileRank(agrupamentoProdutos.distances, distance) * 1000,
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

export function mapAnalysisResultToDashboard(
  result: AnalysisResult,
): DashboardData {
  const {
    orders,
    customerProfiles,
    agrupamento,
    agrupamentoProdutos,
    diagnostics,
    customerIntelligence,
    normalizationMeta,
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

  const segmentNames = new Map(
    customerIntelligence.segments.map((s) => [s.id, s.name]),
  );
  const clusters = buildCustomerClusters(
    customerProfiles,
    orders,
    agrupamento.clusters,
    receitaTotal,
    segmentNames,
  ).map((cluster) => {
    const rfmCentroid = agrupamento.rfmCentroids.find(
      (c) => c.clusterId === cluster.id,
    );
    if (!rfmCentroid) return cluster;

    return {
      ...cluster,
      rfm: {
        recencia: rfmCentroid.recencia,
        frequencia: rfmCentroid.frequencia,
        valorMonetario: rfmCentroid.valorMonetario,
      },
      rfmLabel: rfmCentroid.label,
    };
  });

  const bestSilhouettePoint = agrupamento.silhouetteAnalysis.find(
    (p) => p.k === agrupamento.bestK,
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

  const statuses = buildStatuses(orders);

  const products = [...diagnostics.productStats]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10)
    .map((p) => ({
      name: p.label,
      quantity: p.effectiveQty,
      revenue: p.revenue,
    }));

  const risks: StrategicRisk[] = diagnostics.risks.map((r) => ({
    product: r.product,
    type: r.riskType,
    gravity:
      r.severity === "Alta"
        ? "Alto"
        : r.severity === "Média"
          ? "Médio"
          : "Baixo",
  }));

  const suggestions: KitSuggestion[] = diagnostics.strategies
    .filter((s) => s.type === "KIT_OPPORTUNITY" && s.kits && s.kits.length > 0)
    .flatMap((s) =>
      (s.kits ?? []).map((k) => ({
        name: k.commercialName,
        objective: k.strategicObjective,
        products: k.compositeItems,
        details: k.salesRationale,
      })),
    );

  const allStrategies = buildAllStrategies(diagnostics.strategies);
  const clusterRisks = buildClusterRisks(clusters);
  const productAnomalies = buildAnomalyProducts(
    agrupamentoProdutos,
    diagnostics.productStats,
  );

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
      totalClusters: agrupamento.bestK,
      totalClientes: customerProfiles.length,
      receitaEmRisco: customerIntelligence.summary.revenueAtRisk,
      clvTotal: customerIntelligence.summary.totalClv,
    },
    clusters,
    centroids: buildCentroids(agrupamento.centroids),
    denormalizedCentroids: buildDenormalizedCentroids(
      agrupamento.centroids,
      mins,
      maxs,
      orders,
    ),
    elbowCurve: agrupamento.elbowAnalysis,
    silhouetteCurve: agrupamento.silhouetteAnalysis,
    bestSilhouetteScore,
    elbowK: agrupamento.elbowK,
    paymentMethodsK: agrupamento.paymentMethodsK,
    operationalHours,
    operationalDays,
    statuses,
    products,
    productAnomalies,
    diagnostics: {
      summary: customerIntelligence.executiveInsights[0]?.text ??
        diagnostics.diagnosis.executiveSummary,
      championProduct: diagnostics.diagnosis.championProduct,
      bottleneckProduct: diagnostics.diagnosis.bottleneckProduct,
      risks,
      suggestions,
      allStrategies,
      clusterRisks,
    },
    customerSegments: customerIntelligence.segments,
    churnScores: customerIntelligence.churnScores,
    clvEstimates: customerIntelligence.clvEstimates,
    revenueOpportunities: customerIntelligence.revenueOpportunities,
    productIntelligence: result.productIntelligence,
    bcgMatrix: result.bcgMatrix,
    catalogHealth: result.catalogHealth,
    executiveInsights: customerIntelligence.executiveInsights,
    customerIntelligenceSummary: customerIntelligence.summary,
    cohortMatrix: result.cohortAnalysis.cohorts,
  };
}
