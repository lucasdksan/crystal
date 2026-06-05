import type { KmeansResult } from "@/backend/types/analysis";
import type {
  ChurnRiskLevel,
  ChurnScore,
  CLVEstimate,
  CustomerIntelligenceResult,
  CustomerProfile,
  CustomerSegment,
  ExecutiveInsight,
  InsightPriority,
  MigrationFlow,
  ProductAffinityRule,
  RevenueOpportunity,
} from "@/backend/types/customer";

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.floor(p * sorted.length)),
  );
  return sorted[index];
}

function classifySegment(
  profile: CustomerProfile,
  metrics: {
    ticketP75: number;
    freqP75: number;
    freqP50: number;
    freqP25: number;
  },
): string {
  const { ticketP75, freqP75, freqP50, freqP25 } = metrics;

  if (profile.daysSinceLastPurchase > 180) return "Clientes Inativos";
  if (
    profile.averageTicket >= ticketP75 &&
    profile.purchaseFrequency >= freqP75
  ) {
    return "Clientes VIP";
  }
  if (
    profile.daysSinceLastPurchase > 90 &&
    profile.purchaseFrequency >= freqP25
  ) {
    return "Clientes em Risco";
  }
  if (
    profile.averageTicket >= ticketP75 &&
    profile.purchaseFrequency < freqP25
  ) {
    return "Clientes de Alto Potencial";
  }
  if (
    profile.purchaseFrequency >= freqP50 &&
    profile.daysSinceLastPurchase < 60
  ) {
    return "Clientes Recorrentes";
  }
  return "Clientes Oportunistas";
}

function buildSegments(
  profiles: CustomerProfile[],
  clusters: number[],
): CustomerSegment[] {
  const totalRevenue = profiles.reduce((sum, p) => sum + p.totalSpent, 0);
  const ticketP75 = percentile(
    profiles.map((p) => p.averageTicket),
    0.75,
  );
  const freqP75 = percentile(
    profiles.map((p) => p.purchaseFrequency),
    0.75,
  );
  const freqP50 = percentile(
    profiles.map((p) => p.purchaseFrequency),
    0.5,
  );
  const freqP25 = percentile(
    profiles.map((p) => p.purchaseFrequency),
    0.25,
  );

  const metrics = { ticketP75, freqP75, freqP50, freqP25 };
  const clusterIds = [...new Set(clusters)];

  return clusterIds.map((id) => {
    const members = profiles.filter((_, index) => clusters[index] === id);
    const customerCount = members.length;
    const segmentRevenue = members.reduce((sum, p) => sum + p.totalSpent, 0);
    const averageTicket =
      customerCount > 0 ? segmentRevenue / customerCount : 0;
    const averageFrequency =
      customerCount > 0
        ? members.reduce((sum, p) => sum + p.purchaseFrequency, 0) /
          customerCount
        : 0;
    const averageDaysSinceLastPurchase =
      customerCount > 0
        ? members.reduce((sum, p) => sum + p.daysSinceLastPurchase, 0) /
          customerCount
        : 0;

    const nameCounts = new Map<string, number>();
    members.forEach((member) => {
      const name = classifySegment(member, metrics);
      nameCounts.set(name, (nameCounts.get(name) ?? 0) + 1);
    });
    const name =
      [...nameCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ??
      `Segmento ${id}`;

    const customerShare =
      profiles.length > 0 ? (customerCount / profiles.length) * 100 : 0;
    const revenueShare =
      totalRevenue > 0 ? (segmentRevenue / totalRevenue) * 100 : 0;

    return {
      id,
      name,
      description: `${customerCount} clientes com ticket médio de R$ ${averageTicket.toFixed(2)} e frequência de ${averageFrequency.toFixed(1)} pedidos/mês.`,
      customerCount,
      customerShare: Math.round(customerShare * 10) / 10,
      revenueShare: Math.round(revenueShare * 10) / 10,
      averageTicket: Math.round(averageTicket * 100) / 100,
      averageFrequency: Math.round(averageFrequency * 100) / 100,
      averageDaysSinceLastPurchase: Math.round(averageDaysSinceLastPurchase),
      totalRevenue: Math.round(segmentRevenue * 100) / 100,
    };
  });
}

function computeChurnProbability(profile: CustomerProfile): number {
  const expectedGap =
    profile.averageDaysBetweenOrders > 0
      ? profile.averageDaysBetweenOrders * 2
      : 30;
  const recencyRatio = profile.daysSinceLastPurchase / expectedGap;

  let trendPenalty = 0;
  if (profile.ordersTimeline.length >= 4) {
    const mid = Math.floor(profile.ordersTimeline.length / 2);
    const firstHalf = profile.ordersTimeline.slice(0, mid);
    const secondHalf = profile.ordersTimeline.slice(mid);
    const firstFreq = firstHalf.length;
    const secondFreq = secondHalf.length;
    if (secondFreq < firstFreq) {
      trendPenalty = (firstFreq - secondFreq) / Math.max(firstFreq, 1);
    }
  }

  const raw = Math.min(1, recencyRatio * 0.6 + trendPenalty * 0.4);
  return raw;
}

function classifyChurnRisk(score: number): ChurnRiskLevel {
  if (score >= 75) return "critico";
  if (score >= 50) return "alto";
  if (score >= 25) return "medio";
  return "baixo";
}

function buildChurnScores(
  profiles: CustomerProfile[],
  clvEstimates: CLVEstimate[],
): ChurnScore[] {
  const clvById = new Map(clvEstimates.map((c) => [c.customerId, c]));

  return profiles.map((profile) => {
    const churnProbability = computeChurnProbability(profile);
    const score = Math.round(churnProbability * 100);
    const riskLevel = classifyChurnRisk(score);
    const clv = clvById.get(profile.clientId);
    const estimatedLostRevenue =
      riskLevel === "critico" || riskLevel === "alto"
        ? clv?.predictedRevenue6m ?? profile.averageTicket * 3
        : 0;

    return {
      customerId: profile.clientId,
      customerName: profile.clientName,
      score,
      riskLevel,
      estimatedLostRevenue: Math.round(estimatedLostRevenue * 100) / 100,
      daysSinceLastPurchase: Math.round(profile.daysSinceLastPurchase),
      purchaseFrequency: Math.round(profile.purchaseFrequency * 100) / 100,
    };
  });
}

function buildClvEstimates(
  profiles: CustomerProfile[],
  segments: CustomerSegment[],
  clusters: number[],
): CLVEstimate[] {
  const segmentByCluster = new Map(segments.map((s) => [s.id, s.name]));

  const projectedMonths = 12;

  return profiles.map((profile, index) => {
    const churnProbability = computeChurnProbability(profile);
    const retentionFactor = 1 - churnProbability;
    const currentRevenue = profile.totalSpent;
    const projectedMonthlyRevenue =
      profile.purchaseFrequency * profile.averageTicket * retentionFactor;
    const predictedRevenue6m = projectedMonthlyRevenue * 6;
    const estimatedLifetimeValue =
      currentRevenue + projectedMonthlyRevenue * projectedMonths;

    return {
      customerId: profile.clientId,
      customerName: profile.clientName,
      currentRevenue: Math.round(currentRevenue * 100) / 100,
      predictedRevenue6m: Math.round(predictedRevenue6m * 100) / 100,
      estimatedLifetimeValue: Math.round(estimatedLifetimeValue * 100) / 100,
      segmentName:
        segmentByCluster.get(clusters[index]) ?? `Segmento ${clusters[index]}`,
    };
  });
}

function buildRevenueOpportunities(
  profiles: CustomerProfile[],
  churnScores: ChurnScore[],
  clvEstimates: CLVEstimate[],
  segments: CustomerSegment[],
): RevenueOpportunity[] {
  const opportunities: RevenueOpportunity[] = [];

  const frequencyGrowth = profiles.filter((profile) => {
    if (profile.ordersTimeline.length < 4) return false;
    const mid = Math.floor(profile.ordersTimeline.length / 2);
    const firstHalf = profile.ordersTimeline.slice(0, mid);
    const secondHalf = profile.ordersTimeline.slice(mid);
    return secondHalf.length > firstHalf.length;
  });

  if (frequencyGrowth.length > 0) {
    const value = frequencyGrowth.reduce(
      (sum, p) => sum + p.averageTicket * 2,
      0,
    );
    opportunities.push({
      type: "frequency_increase",
      title: "Clientes com aumento de frequência",
      description: `${frequencyGrowth.length} clientes compraram com mais frequência na segunda metade do período.`,
      estimatedValue: Math.round(value * 100) / 100,
      customerCount: frequencyGrowth.length,
    });
  }

  const ticketGrowth = profiles.filter((profile) => {
    if (profile.ordersTimeline.length < 2) return false;
    const mid = Math.floor(profile.ordersTimeline.length / 2);
    const firstAvg =
      profile.ordersTimeline.slice(0, mid).reduce((s, o) => s + o.value, 0) /
      Math.max(mid, 1);
    const secondAvg =
      profile.ordersTimeline.slice(mid).reduce((s, o) => s + o.value, 0) /
      Math.max(profile.ordersTimeline.length - mid, 1);
    return secondAvg > firstAvg * 1.15;
  });

  if (ticketGrowth.length > 0) {
    const value = ticketGrowth.reduce(
      (sum, p) => sum + p.averageTicket,
      0,
    );
    opportunities.push({
      type: "ticket_growth",
      title: "Clientes migrando para tickets maiores",
      description: `${ticketGrowth.length} clientes aumentaram o ticket médio em mais de 15%.`,
      estimatedValue: Math.round(value * 100) / 100,
      customerCount: ticketGrowth.length,
    });
  }

  const expandingSegments = segments.filter((s) => s.revenueShare > s.customerShare * 1.5);
  expandingSegments.forEach((segment) => {
    opportunities.push({
      type: "segment_expansion",
      title: `Segmento "${segment.name}" em expansão`,
      description: `Representa ${segment.customerShare}% da base mas gera ${segment.revenueShare}% da receita.`,
      estimatedValue: Math.round(segment.totalRevenue * 0.1 * 100) / 100,
      customerCount: segment.customerCount,
    });
  });

  const recoverableRevenue = churnScores
    .filter((c) => c.riskLevel === "alto" || c.riskLevel === "medio")
    .reduce((sum, c) => sum + c.estimatedLostRevenue, 0);

  opportunities.push({
    type: "recoverable",
    title: "Receita potencial recuperável",
    description: "Estimativa de receita recuperável ao reativar clientes em risco.",
    estimatedValue: Math.round(recoverableRevenue * 100) / 100,
    customerCount: churnScores.filter((c) => c.riskLevel !== "baixo").length,
  });

  const highPotential = clvEstimates.filter((clv) => {
    const profile = profiles.find((p) => p.clientId === clv.customerId);
    return (
      profile &&
      profile.averageTicket >= percentile(profiles.map((p) => p.averageTicket), 0.75) &&
      profile.purchaseFrequency <
        percentile(profiles.map((p) => p.purchaseFrequency), 0.5)
    );
  });
  const incrementalRevenue = highPotential.reduce(
    (sum, clv) => sum + Math.max(0, clv.predictedRevenue6m - clv.currentRevenue * 0.1),
    0,
  );

  opportunities.push({
    type: "incremental",
    title: "Receita potencial incremental",
    description: "Potencial de crescimento em clientes de alto potencial subexplorados.",
    estimatedValue: Math.round(incrementalRevenue * 100) / 100,
    customerCount: highPotential.length,
  });

  const revenueAtRisk = churnScores
    .filter((c) => c.riskLevel === "critico")
    .reduce((sum, c) => sum + c.estimatedLostRevenue, 0);

  opportunities.push({
    type: "at_risk",
    title: "Receita em risco",
    description: "Receita estimada em risco por clientes com churn crítico.",
    estimatedValue: Math.round(revenueAtRisk * 100) / 100,
    customerCount: churnScores.filter((c) => c.riskLevel === "critico").length,
  });

  return opportunities;
}

function buildAffinityRules(profiles: CustomerProfile[]): ProductAffinityRule[] {
  const pairCounts = new Map<string, number>();
  const productCounts = new Map<string, number>();
  const totalCustomers = profiles.length;

  profiles.forEach((profile) => {
    const products = profile.productNames.slice(0, 20);
    products.forEach((product) => {
      productCounts.set(product, (productCounts.get(product) ?? 0) + 1);
    });

    for (let i = 0; i < products.length; i++) {
      for (let j = i + 1; j < products.length; j++) {
        const key = [products[i], products[j]].sort().join("|||");
        pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
      }
    }
  });

  const rules: ProductAffinityRule[] = [];

  pairCounts.forEach((count, key) => {
    const [antecedent, consequent] = key.split("|||");
    const support = count / totalCustomers;
    const confidenceA = count / (productCounts.get(antecedent) ?? 1);
    const confidenceB = count / (productCounts.get(consequent) ?? 1);
    const supportB = (productCounts.get(consequent) ?? 0) / totalCustomers;
    const liftA = supportB > 0 ? confidenceA / supportB : 0;
    const liftB =
      (productCounts.get(antecedent) ?? 0) / totalCustomers > 0
        ? confidenceB / ((productCounts.get(antecedent) ?? 0) / totalCustomers)
        : 0;
    const lift = Math.max(liftA, liftB);
    const confidence = Math.max(confidenceA, confidenceB);

    if (lift > 1.2 && confidence > 0.3 && count >= 2) {
      rules.push({
        antecedent,
        consequent,
        support: Math.round(support * 1000) / 1000,
        confidence: Math.round(confidence * 1000) / 1000,
        lift: Math.round(lift * 100) / 100,
      });
    }
  });

  return rules.sort((a, b) => b.lift - a.lift).slice(0, 20);
}

function buildMigrationFlows(
  profiles: CustomerProfile[],
  segments: CustomerSegment[],
  clusters: number[],
): MigrationFlow[] {
  const segmentByCluster = new Map(segments.map((s) => [s.id, s.name]));
  const flows = new Map<string, { count: number; revenue: number }>();

  profiles.forEach((profile, index) => {
    if (profile.ordersTimeline.length < 2) return;

    const midDate = new Date(profile.ordersTimeline[0].date).getTime() +
      (new Date(profile.ordersTimeline[profile.ordersTimeline.length - 1].date).getTime() -
        new Date(profile.ordersTimeline[0].date).getTime()) /
        2;

    const firstHalf = profile.ordersTimeline.filter(
      (o) => new Date(o.date).getTime() <= midDate,
    );
    const secondHalf = profile.ordersTimeline.filter(
      (o) => new Date(o.date).getTime() > midDate,
    );

    if (firstHalf.length === 0 || secondHalf.length === 0) return;

    const firstTicket =
      firstHalf.reduce((s, o) => s + o.value, 0) / firstHalf.length;
    const secondTicket =
      secondHalf.reduce((s, o) => s + o.value, 0) / secondHalf.length;
    const firstFreq = firstHalf.length;
    const secondFreq = secondHalf.length;

    const currentSegment =
      segmentByCluster.get(clusters[index]) ?? `Segmento ${clusters[index]}`;

    let fromSegment = currentSegment;
    let toSegment = currentSegment;

    if (secondTicket > firstTicket * 1.2 && secondFreq >= firstFreq) {
      fromSegment = "Clientes Oportunistas";
      toSegment = "Clientes Recorrentes";
    } else if (secondFreq < firstFreq && profile.daysSinceLastPurchase > 90) {
      fromSegment = currentSegment.includes("VIP")
        ? "Clientes VIP"
        : "Clientes Recorrentes";
      toSegment = "Clientes em Risco";
    } else if (secondTicket > firstTicket * 1.3) {
      fromSegment = "Clientes Recorrentes";
      toSegment = "Clientes VIP";
    } else {
      return;
    }

    const key = `${fromSegment}→${toSegment}`;
    const existing = flows.get(key) ?? { count: 0, revenue: 0 };
    existing.count += 1;
    existing.revenue += profile.totalSpent;
    flows.set(key, existing);
  });

  return [...flows.entries()].map(([key, data]) => {
    const [fromSegment, toSegment] = key.split("→");
    return {
      fromSegment,
      toSegment,
      customerCount: data.count,
      revenueImpact: Math.round(data.revenue * 100) / 100,
    };
  });
}

function buildExecutiveInsights(
  profiles: CustomerProfile[],
  segments: CustomerSegment[],
  churnScores: ChurnScore[],
  clvEstimates: CLVEstimate[],
  affinityRules: ProductAffinityRule[],
  migrationFlows: MigrationFlow[],
  summary: CustomerIntelligenceResult["summary"],
): ExecutiveInsight[] {
  const insights: ExecutiveInsight[] = [];

  const vipToRisk = migrationFlows.find(
    (f) =>
      f.fromSegment.includes("VIP") && f.toSegment.includes("Risco"),
  );
  if (vipToRisk && profiles.length > 0) {
    const pct = ((vipToRisk.customerCount / profiles.length) * 100).toFixed(1);
    insights.push({
      text: `${pct}% dos clientes VIP migraram para risco elevado.`,
      financialImpact: vipToRisk.revenueImpact,
      priority: "alta",
      category: "migracao",
    });
  }

  if (summary.recoverableRevenue > 0) {
    insights.push({
      text: `Recuperar clientes em risco pode gerar R$ ${summary.recoverableRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} em receita.`,
      financialImpact: summary.recoverableRevenue,
      priority: "alta",
      category: "churn",
    });
  }

  segments.forEach((segment) => {
    if (segment.revenueShare > segment.customerShare * 1.5) {
      insights.push({
        text: `O cluster "${segment.name}" representa apenas ${segment.customerShare}% da base mas gera ${segment.revenueShare}% da receita.`,
        financialImpact: segment.totalRevenue,
        priority: "media",
        category: "segmentacao",
      });
    }
  });

  affinityRules.slice(0, 3).forEach((rule) => {
    insights.push({
      text: `Clientes que compram "${rule.antecedent}" possuem ${rule.lift}x mais chance de comprar "${rule.consequent}".`,
      financialImpact: Math.round(rule.lift * 1000),
      priority: rule.lift > 2 ? "alta" : "media",
      category: "afinidade",
    });
  });

  const criticalCount = churnScores.filter((c) => c.riskLevel === "critico").length;
  if (criticalCount > 0 && profiles.length > 0) {
    const pct = ((criticalCount / profiles.length) * 100).toFixed(1);
    insights.push({
      text: `${pct}% dos clientes estão em risco crítico de abandono.`,
      financialImpact: summary.revenueAtRisk,
      priority: "alta",
      category: "churn",
    });
  }

  const topClv = [...clvEstimates]
    .sort((a, b) => b.estimatedLifetimeValue - a.estimatedLifetimeValue)
    .slice(0, 5);
  if (topClv.length > 0) {
    const totalTop = topClv.reduce((s, c) => s + c.estimatedLifetimeValue, 0);
    insights.push({
      text: `Os 5 clientes mais valiosos representam R$ ${totalTop.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} em LTV estimado.`,
      financialImpact: totalTop,
      priority: "media",
      category: "clv",
    });
  }

  return insights.sort((a, b) => {
    const priorityOrder: Record<InsightPriority, number> = {
      alta: 0,
      media: 1,
      baixa: 2,
    };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

export function runCustomerIntelligence(
  profiles: CustomerProfile[],
  kmeans: KmeansResult,
): CustomerIntelligenceResult {
  if (profiles.length === 0) {
    return {
      customerProfiles: [],
      segments: [],
      churnScores: [],
      clvEstimates: [],
      revenueOpportunities: [],
      affinityRules: [],
      migrationFlows: [],
      executiveInsights: [],
      summary: {
        recoverableRevenue: 0,
        incrementalRevenue: 0,
        revenueAtRisk: 0,
        totalClv: 0,
      },
    };
  }

  const segments = buildSegments(profiles, kmeans.clusters);
  const clvEstimates = buildClvEstimates(profiles, segments, kmeans.clusters);
  const churnScores = buildChurnScores(profiles, clvEstimates);
  const revenueOpportunities = buildRevenueOpportunities(
    profiles,
    churnScores,
    clvEstimates,
    segments,
  );
  const affinityRules = buildAffinityRules(profiles);
  const migrationFlows = buildMigrationFlows(
    profiles,
    segments,
    kmeans.clusters,
  );

  const recoverableRevenue =
    revenueOpportunities.find((o) => o.type === "recoverable")?.estimatedValue ??
    0;
  const incrementalRevenue =
    revenueOpportunities.find((o) => o.type === "incremental")?.estimatedValue ??
    0;
  const revenueAtRisk =
    revenueOpportunities.find((o) => o.type === "at_risk")?.estimatedValue ?? 0;
  const totalClv = clvEstimates.reduce(
    (sum, c) => sum + c.estimatedLifetimeValue,
    0,
  );

  const summary = {
    recoverableRevenue,
    incrementalRevenue,
    revenueAtRisk,
    totalClv: Math.round(totalClv * 100) / 100,
  };

  const executiveInsights = buildExecutiveInsights(
    profiles,
    segments,
    churnScores,
    clvEstimates,
    affinityRules,
    migrationFlows,
    summary,
  );

  return {
    customerProfiles: profiles,
    segments,
    churnScores,
    clvEstimates,
    revenueOpportunities,
    affinityRules,
    migrationFlows,
    executiveInsights,
    summary,
  };
}
