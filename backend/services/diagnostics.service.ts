import type { VtexOrder } from "@/backend/types/vtex";
import type {
  DiagnosticsResult,
  Kit,
  PortfolioScores,
  ProductScore,
  ProductStat,
  Risk,
  Strategy,
} from "@/backend/types/analysis";
import { STRATEGY_TYPE } from "@/backend/types/analysis";

const DEPENDENCY_THRESHOLD = 0.5;
const CANCEL_RATE_HIGH = 0.4;
const CANCEL_RATE_MEDIUM = 0.2;
const MIN_ORDERS_FOR_RISK = 2;

const RISK_TYPE_LABEL = {
  REVENUE_ILLUSION: "Ilusão de Receita (Cancelamentos)",
  STAGNANT_STOCK: "Estoque Parado",
} as const;

const SEVERITY_LABEL = {
  HIGH: "Alta",
  MEDIUM: "Média",
} as const;

const STRATEGIC_OBJECTIVE_LABEL = {
  INCREASE_AOV: "Aumentar Ticket Médio",
  CLEAR_INVENTORY: "Liquidar Estoque",
  IMPROVE_CONVERSION: "Melhorar Conversão",
} as const;

const STRATEGY_LABEL: Record<string, string> = {
  [STRATEGY_TYPE.RISK_MITIGATION]: "Mitigação de Risco",
  [STRATEGY_TYPE.DIVERSIFICATION]: "Diversificação de Portfólio",
  [STRATEGY_TYPE.KIT_OPPORTUNITY]: "Oportunidade de Kit",
  [STRATEGY_TYPE.CONVERSION_RECOVERY]: "Recuperação de Conversão",
  [STRATEGY_TYPE.EXPANSION]: "Expansão Comercial",
  [STRATEGY_TYPE.STABILITY_MAINTENANCE]: "Manutenção de Estabilidade",
};

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

function computeQuartile(values: number[], q: number): number {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * q;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);

  if (lower === upper) {
    return sorted[lower];
  }

  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

function buildProductStats(rawList: VtexOrder[]): ProductStat[] {
  const productMap: Record<
    string,
    Omit<ProductStat, "cancellationRate">
  > = {};

  rawList.forEach((order) => {
    const isCanceled = order.status === "canceled";

    order.items.forEach((item) => {
      const key = item.productId || item.description || "unknown";
      const label = item.description || `Produto ${item.productId}`;

      if (!productMap[key]) {
        productMap[key] = {
          key,
          label,
          totalOrders: 0,
          canceledOrders: 0,
          effectiveQty: 0,
          canceledQty: 0,
          revenue: 0,
          canceledRevenue: 0,
        };
      }

      const stat = productMap[key];
      stat.totalOrders += 1;

      if (isCanceled) {
        stat.canceledOrders += 1;
        stat.canceledQty += item.quantity;
        stat.canceledRevenue += item.sellingPrice * item.quantity;
      } else {
        stat.effectiveQty += item.quantity;
        stat.revenue += item.sellingPrice * item.quantity;
      }
    });
  });

  return Object.values(productMap).map((stat) => ({
    ...stat,
    cancellationRate:
      stat.totalOrders > 0 ? stat.canceledOrders / stat.totalOrders : 0,
  }));
}

function detectRisks(productStats: ProductStat[]): Risk[] {
  const eligible = productStats.filter(
    (p) => p.totalOrders >= MIN_ORDERS_FOR_RISK,
  );
  const effectiveQtyValues = eligible.map((p) => p.effectiveQty);
  const q25 = computeQuartile(effectiveQtyValues, 0.25);
  const median = computeQuartile(effectiveQtyValues, 0.5);

  const risks: Risk[] = [];

  eligible.forEach((product) => {
    if (product.cancellationRate >= CANCEL_RATE_HIGH) {
      risks.push({
        product: product.label,
        riskType: RISK_TYPE_LABEL.REVENUE_ILLUSION,
        severity: SEVERITY_LABEL.HIGH,
      });
    } else if (product.cancellationRate >= CANCEL_RATE_MEDIUM) {
      risks.push({
        product: product.label,
        riskType: RISK_TYPE_LABEL.REVENUE_ILLUSION,
        severity: SEVERITY_LABEL.MEDIUM,
      });
    }

    if (effectiveQtyValues.length >= 2 && product.effectiveQty <= q25) {
      const severity =
        product.effectiveQty < median
          ? SEVERITY_LABEL.HIGH
          : SEVERITY_LABEL.MEDIUM;
      const alreadyHasStockRisk = risks.some(
        (r) =>
          r.product === product.label &&
          r.riskType === RISK_TYPE_LABEL.STAGNANT_STOCK,
      );

      if (!alreadyHasStockRisk) {
        risks.push({
          product: product.label,
          riskType: RISK_TYPE_LABEL.STAGNANT_STOCK,
          severity,
        });
      }
    }
  });

  return risks;
}

function findBottleneckProduct(productStats: ProductStat[]): string {
  const eligible = productStats.filter(
    (p) => p.totalOrders >= MIN_ORDERS_FOR_RISK,
  );

  if (eligible.length === 0) {
    return productStats[0]?.label ?? "N/A";
  }

  const sorted = [...eligible].sort((a, b) => {
    if (b.cancellationRate !== a.cancellationRate) {
      return b.cancellationRate - a.cancellationRate;
    }

    return a.effectiveQty - b.effectiveQty;
  });

  return sorted[0].label;
}

function buildExecutiveSummary({
  cancelRate,
  excessiveDependency,
  championProduct,
  bottleneckProduct,
}: {
  cancelRate: number;
  excessiveDependency: boolean;
  championProduct: string;
  bottleneckProduct: string;
}): string {
  const cancelDesc =
    cancelRate >= 30
      ? "taxa de cancelamento alarmante"
      : cancelRate >= 15
        ? "taxa de cancelamento elevada"
        : "taxa de cancelamento controlada";

  const dependencyDesc = excessiveDependency
    ? "dependência excessiva de poucos produtos"
    : "portfólio relativamente diversificado";

  return `Operação com ${cancelDesc} e ${dependencyDesc}, necessitando de otimização de estoque e fomento de vendas com maior taxa de conversão. Produto campeão: "${championProduct}". Produto gargalo: "${bottleneckProduct}".`;
}

function computeProductScores(productStats: ProductStat[]): ProductScore[] {
  const totalEffectiveQty = productStats.reduce(
    (acc, p) => acc + p.effectiveQty,
    0,
  );
  const maxQty = Math.max(...productStats.map((p) => p.effectiveQty), 1);

  return productStats.map((product) => {
    const stagnantFactor =
      maxQty > 0 ? 1 - product.effectiveQty / maxQty : 0;
    const riskScore = clamp(
      product.cancellationRate * 0.6 + stagnantFactor * 0.4,
    );
    const volumeShare =
      totalEffectiveQty > 0 ? product.effectiveQty / totalEffectiveQty : 0;
    const bundleScore = clamp(
      (1 - product.cancellationRate) * 0.5 +
        volumeShare * 0.3 +
        (1 - stagnantFactor) * 0.2,
    );

    return {
      ...product,
      riskScore,
      bundleScore,
      volumeShare,
      stagnantFactor,
    };
  });
}

function computePortfolioScores(
  productScores: ProductScore[],
  cancelRate: number,
  dependencyScore: number,
): PortfolioScores {
  const totalEffectiveQty = productScores.reduce(
    (acc, p) => acc + p.effectiveQty,
    0,
  );

  const portfolioRiskScore =
    totalEffectiveQty > 0
      ? productScores.reduce(
          (acc, p) => acc + p.riskScore * (p.effectiveQty / totalEffectiveQty),
          0,
        )
      : 0;

  const cancelRateNorm = cancelRate / 100;
  const portfolioHealth = clamp(1 - portfolioRiskScore);

  const avgBundleScore =
    productScores.length > 0
      ? productScores.reduce((acc, p) => acc + p.bundleScore, 0) /
        productScores.length
      : 0;

  return {
    dependencyScore,
    portfolioRiskScore: clamp(portfolioRiskScore),
    cancelRateNorm,
    portfolioHealth,
    avgBundleScore: clamp(avgBundleScore),
  };
}

function truncateLabel(label: string, maxLength: number): string {
  if (label.length <= maxLength) {
    return label;
  }

  return label.slice(0, maxLength - 3) + "...";
}

function buildKitSuggestions(
  productScores: ProductScore[],
  risks: Risk[],
): Kit[] {
  const kits: Kit[] = [];
  const sortedByVolume = [...productScores].sort(
    (a, b) => b.effectiveQty - a.effectiveQty,
  );
  const champion = sortedByVolume[0];
  const runnerUp = sortedByVolume[1];

  if (
    champion &&
    runnerUp &&
    champion.bundleScore >= 0.4 &&
    runnerUp.bundleScore >= 0.3
  ) {
    kits.push({
      commercialName: `Complete ${truncateLabel(champion.label, 30)} Kit`,
      compositeItems: [champion.label, runnerUp.label],
      strategicObjective: STRATEGIC_OBJECTIVE_LABEL.INCREASE_AOV,
      salesRationale: `Combina o produto campeão (${champion.label}) com o segundo em volume (${runnerUp.label}). Bundle score: ${(champion.bundleScore * 100).toFixed(0)}% / ${(runnerUp.bundleScore * 100).toFixed(0)}%.`,
    });
  }

  const stagnantStockRisks = risks.filter(
    (r) => r.riskType === RISK_TYPE_LABEL.STAGNANT_STOCK,
  );
  const cancellationRisks = risks.filter(
    (r) => r.riskType === RISK_TYPE_LABEL.REVENUE_ILLUSION,
  );

  if (stagnantStockRisks.length > 0 && champion) {
    const stagnant = stagnantStockRisks[0];

    if (stagnant.product !== champion.label) {
      kits.push({
        commercialName: "Kit Elegância Acessível",
        compositeItems: [stagnant.product, champion.label],
        strategicObjective: STRATEGIC_OBJECTIVE_LABEL.CLEAR_INVENTORY,
        salesRationale: `Produto de baixo giro (${stagnant.product}) combinado com campeão (${champion.label}) para liquidar estoque parado.`,
      });
    }
  }

  if (cancellationRisks.length > 0 && champion) {
    const cancelRisk = cancellationRisks[0];
    const highConversion = sortedByVolume.find(
      (p) =>
        p.cancellationRate < CANCEL_RATE_MEDIUM &&
        p.label !== cancelRisk.product,
    );

    if (highConversion && cancelRisk.product !== highConversion.label) {
      kits.push({
        commercialName: "Kit Conversão Premium",
        compositeItems: [cancelRisk.product, highConversion.label],
        strategicObjective: STRATEGIC_OBJECTIVE_LABEL.IMPROVE_CONVERSION,
        salesRationale: `Associa produto com alto cancelamento (${cancelRisk.product}) a item de alta conversão (${highConversion.label}).`,
      });
    }
  }

  return kits;
}

function buildRiskMitigationStrategy(
  portfolioScores: PortfolioScores,
  risks: Risk[],
  cancelRate: number,
): Omit<Strategy, "priorityScore"> {
  const highRisks = risks.filter((r) => r.severity === SEVERITY_LABEL.HIGH);

  return {
    type: STRATEGY_TYPE.RISK_MITIGATION,
    label: STRATEGY_LABEL[STRATEGY_TYPE.RISK_MITIGATION],
    confidenceScore: clamp(
      portfolioScores.portfolioRiskScore * 0.7 +
        portfolioScores.cancelRateNorm * 0.3,
    ),
    impactScore: clamp(portfolioScores.portfolioRiskScore),
    riskScore: clamp(portfolioScores.portfolioRiskScore),
    justifications: [
      `Score de risco do portfólio: ${(portfolioScores.portfolioRiskScore * 100).toFixed(0)}%`,
      `Taxa de cancelamento: ${cancelRate.toFixed(1)}%`,
      `${risks.length} risco(s) identificado(s), ${highRisks.length} de alta gravidade`,
    ],
    evidence: {
      portfolioRiskScore: portfolioScores.portfolioRiskScore,
      cancelRate,
      riskCount: risks.length,
      highSeverityCount: highRisks.length,
    },
    actions: risks.slice(0, 3).map((risk) => ({
      label: `Tratar: ${risk.product}`,
      description: `${risk.riskType} — gravidade ${risk.severity}`,
    })),
  };
}

function buildDiversificationStrategy(
  portfolioScores: PortfolioScores,
  productScores: ProductScore[],
  championProduct: string,
): Omit<Strategy, "priorityScore"> {
  const topProducts = [...productScores]
    .sort((a, b) => b.volumeShare - a.volumeShare)
    .slice(0, 3);

  return {
    type: STRATEGY_TYPE.DIVERSIFICATION,
    label: STRATEGY_LABEL[STRATEGY_TYPE.DIVERSIFICATION],
    confidenceScore: clamp(portfolioScores.dependencyScore),
    impactScore: clamp(portfolioScores.dependencyScore * 0.8),
    riskScore: clamp(portfolioScores.dependencyScore * 0.9),
    justifications: [
      `Dependência do campeão: ${(portfolioScores.dependencyScore * 100).toFixed(0)}% do volume`,
      `Produto campeão "${championProduct}" concentra vendas`,
      "Diversificar reduz risco operacional de ruptura ou queda de um SKU",
    ],
    evidence: {
      dependencyScore: portfolioScores.dependencyScore,
      championProduct,
      topProducts: topProducts.map((p) => ({
        label: p.label,
        volumeShare: p.volumeShare,
      })),
    },
    actions: [
      {
        label: "Promover produtos secundários",
        description: `Impulsionar itens fora do top 1: ${topProducts
          .slice(1)
          .map((p) => p.label)
          .join(", ") || "N/A"}`,
      },
      {
        label: "Reduzir concentração",
        description: `Meta: reduzir share do campeão abaixo de ${(DEPENDENCY_THRESHOLD * 100).toFixed(0)}%`,
      },
    ],
  };
}

function buildKitOpportunityStrategy(
  portfolioScores: PortfolioScores,
  productScores: ProductScore[],
  risks: Risk[],
): Omit<Strategy, "priorityScore"> {
  const kits = buildKitSuggestions(productScores, risks);
  const stagnantCount = risks.filter(
    (r) => r.riskType === RISK_TYPE_LABEL.STAGNANT_STOCK,
  ).length;
  const topBundleProducts = [...productScores]
    .sort((a, b) => b.bundleScore - a.bundleScore)
    .slice(0, 2);

  return {
    type: STRATEGY_TYPE.KIT_OPPORTUNITY,
    label: STRATEGY_LABEL[STRATEGY_TYPE.KIT_OPPORTUNITY],
    confidenceScore: clamp(portfolioScores.avgBundleScore),
    impactScore: clamp(portfolioScores.avgBundleScore * 0.7 + stagnantCount * 0.1),
    riskScore: clamp(1 - portfolioScores.avgBundleScore),
    justifications: [
      `Bundle score médio do portfólio: ${(portfolioScores.avgBundleScore * 100).toFixed(0)}%`,
      stagnantCount > 0
        ? `${stagnantCount} produto(s) com estoque parado — kit pode acelerar giro`
        : "Alta afinidade entre produtos de volume para composição de kit",
      topBundleProducts.length >= 2
        ? `Melhores candidatos: ${topBundleProducts.map((p) => p.label).join(" + ")}`
        : "Volume insuficiente para múltiplos candidatos",
    ],
    evidence: {
      avgBundleScore: portfolioScores.avgBundleScore,
      stagnantCount,
      kits,
    },
    actions: kits.map((kit) => ({
      label: kit.commercialName,
      description: `${kit.strategicObjective}: ${kit.compositeItems.join(" + ")}`,
    })),
    kits,
  };
}

function buildConversionRecoveryStrategy(
  portfolioScores: PortfolioScores,
  productScores: ProductScore[],
  cancelRate: number,
): Omit<Strategy, "priorityScore"> {
  const highCancelProducts = productScores
    .filter((p) => p.cancellationRate >= CANCEL_RATE_MEDIUM)
    .sort((a, b) => b.cancellationRate - a.cancellationRate);
  const highConversionProducts = productScores
    .filter((p) => p.cancellationRate < CANCEL_RATE_MEDIUM)
    .sort((a, b) => b.effectiveQty - a.effectiveQty);

  return {
    type: STRATEGY_TYPE.CONVERSION_RECOVERY,
    label: STRATEGY_LABEL[STRATEGY_TYPE.CONVERSION_RECOVERY],
    confidenceScore: clamp(portfolioScores.cancelRateNorm),
    impactScore: clamp(portfolioScores.cancelRateNorm * 0.85),
    riskScore: clamp(portfolioScores.cancelRateNorm),
    justifications: [
      `Taxa de cancelamento: ${cancelRate.toFixed(1)}%`,
      highCancelProducts.length > 0
        ? `Produto crítico: "${highCancelProducts[0].label}" (${(highCancelProducts[0].cancellationRate * 100).toFixed(0)}% cancelamento)`
        : "Cancelamentos acima do patamar saudável",
      highConversionProducts.length > 0
        ? `Referência de conversão: "${highConversionProducts[0].label}"`
        : "Buscar produtos com menor taxa de cancelamento como âncora",
    ],
    evidence: {
      cancelRate,
      highCancelProducts: highCancelProducts.slice(0, 3).map((p) => ({
        label: p.label,
        cancellationRate: p.cancellationRate,
      })),
      highConversionProducts: highConversionProducts.slice(0, 3).map((p) => ({
        label: p.label,
        cancellationRate: p.cancellationRate,
      })),
    },
    actions: [
      {
        label: "Revisar produtos com alto cancelamento",
        description: highCancelProducts[0]
          ? `Investigar "${highCancelProducts[0].label}" — possível problema de estoque, preço ou expectativa`
          : "Analisar causas de cancelamento nos pedidos recentes",
      },
      {
        label: "Associar a produto de alta conversão",
        description: highConversionProducts[0]
          ? `Usar "${highConversionProducts[0].label}" como referência em campanhas e bundles`
          : "Identificar SKUs com melhor taxa de entrega/conversão",
      },
    ],
  };
}

function buildExpansionStrategy(
  portfolioScores: PortfolioScores,
  productScores: ProductScore[],
  championProduct: string,
): Omit<Strategy, "priorityScore"> {
  const growthCandidates = [...productScores]
    .filter((p) => p.bundleScore >= 0.5 && p.riskScore < 0.3)
    .sort((a, b) => b.effectiveQty - a.effectiveQty)
    .slice(0, 3);

  return {
    type: STRATEGY_TYPE.EXPANSION,
    label: STRATEGY_LABEL[STRATEGY_TYPE.EXPANSION],
    confidenceScore: clamp(portfolioScores.portfolioHealth),
    impactScore: clamp(portfolioScores.portfolioHealth * 0.75),
    riskScore: clamp(1 - portfolioScores.portfolioHealth),
    justifications: [
      `Saúde do portfólio: ${(portfolioScores.portfolioHealth * 100).toFixed(0)}%`,
      "Risco operacional baixo — ambiente favorável para crescimento",
      growthCandidates.length > 0
        ? `Candidatos a expansão: ${growthCandidates.map((p) => p.label).join(", ")}`
        : `Campeão "${championProduct}" pode ser base para novos canais`,
    ],
    evidence: {
      portfolioHealth: portfolioScores.portfolioHealth,
      championProduct,
      growthCandidates: growthCandidates.map((p) => ({
        label: p.label,
        bundleScore: p.bundleScore,
        riskScore: p.riskScore,
      })),
    },
    actions: [
      {
        label: "Ampliar mix dos produtos saudáveis",
        description: growthCandidates[0]
          ? `Investir em visibilidade de "${growthCandidates[0].label}"`
          : "Explorar novos canais com o portfólio atual",
      },
      {
        label: "Aumentar ticket médio",
        description:
          "Operação estável — testar upsell e cross-sell sem pressão de risco",
      },
    ],
  };
}

function buildStabilityMaintenanceStrategy(
  portfolioScores: PortfolioScores,
  championProduct: string,
  bottleneckProduct: string,
): Omit<Strategy, "priorityScore"> {
  return {
    type: STRATEGY_TYPE.STABILITY_MAINTENANCE,
    label: STRATEGY_LABEL[STRATEGY_TYPE.STABILITY_MAINTENANCE],
    confidenceScore: clamp(portfolioScores.portfolioHealth * 0.6 + 0.4),
    impactScore: clamp(0.5),
    riskScore: clamp(portfolioScores.portfolioRiskScore * 0.5),
    justifications: [
      `Portfólio em equilíbrio — saúde ${(portfolioScores.portfolioHealth * 100).toFixed(0)}%`,
      `Manter performance de "${championProduct}"`,
      `Monitorar gargalo "${bottleneckProduct}"`,
    ],
    evidence: {
      portfolioHealth: portfolioScores.portfolioHealth,
      portfolioRiskScore: portfolioScores.portfolioRiskScore,
      championProduct,
      bottleneckProduct,
    },
    actions: [
      {
        label: "Monitorar KPIs operacionais",
        description:
          "Acompanhar cancelamento, entrega e concentração semanalmente",
      },
      {
        label: "Proteger produto campeão",
        description: `Garantir estoque e visibilidade de "${championProduct}"`,
      },
    ],
  };
}

function buildStrategicRecommendations({
  portfolioScores,
  productScores,
  risks,
  cancelRate,
  championProduct,
  bottleneckProduct,
}: {
  portfolioScores: PortfolioScores;
  productScores: ProductScore[];
  risks: Risk[];
  cancelRate: number;
  championProduct: string;
  bottleneckProduct: string;
}): Strategy[] {
  const strategies: Omit<Strategy, "priorityScore">[] = [];
  const stagnantCount = risks.filter(
    (r) => r.riskType === RISK_TYPE_LABEL.STAGNANT_STOCK,
  ).length;
  const hasHighBundlePotential = portfolioScores.avgBundleScore >= 0.45;

  if (portfolioScores.portfolioRiskScore > 0.6 || cancelRate > 30) {
    strategies.push(
      buildRiskMitigationStrategy(portfolioScores, risks, cancelRate),
    );
  }

  if (portfolioScores.dependencyScore > DEPENDENCY_THRESHOLD) {
    strategies.push(
      buildDiversificationStrategy(
        portfolioScores,
        productScores,
        championProduct,
      ),
    );
  }

  if (
    hasHighBundlePotential &&
    (stagnantCount > 0 || portfolioScores.avgBundleScore >= 0.5)
  ) {
    const kitStrategy = buildKitOpportunityStrategy(
      portfolioScores,
      productScores,
      risks,
    );
    if (kitStrategy.actions.length > 0) {
      strategies.push(kitStrategy);
    }
  }

  if (cancelRate > 15 && portfolioScores.cancelRateNorm > 0.15) {
    strategies.push(
      buildConversionRecoveryStrategy(
        portfolioScores,
        productScores,
        cancelRate,
      ),
    );
  }

  if (portfolioScores.portfolioHealth > 0.8 && cancelRate <= 15) {
    strategies.push(
      buildExpansionStrategy(portfolioScores, productScores, championProduct),
    );
  }

  if (strategies.length === 0) {
    strategies.push(
      buildStabilityMaintenanceStrategy(
        portfolioScores,
        championProduct,
        bottleneckProduct,
      ),
    );
  }

  return strategies
    .map((strategy) => ({
      ...strategy,
      priorityScore: strategy.impactScore * strategy.confidenceScore,
    }))
    .sort((a, b) => b.priorityScore - a.priorityScore);
}

export function buildDiagnostics(rawList: VtexOrder[]): DiagnosticsResult {
  const productStats = buildProductStats(rawList);
  const totalOrders = rawList.length;
  const canceledCount = rawList.filter(
    (order) => order.status === "canceled",
  ).length;
  const cancelRate =
    totalOrders > 0 ? (canceledCount / totalOrders) * 100 : 0;

  const sortedByVolume = [...productStats].sort(
    (a, b) => b.effectiveQty - a.effectiveQty,
  );
  const totalEffectiveQty = productStats.reduce(
    (acc, p) => acc + p.effectiveQty,
    0,
  );

  const championProduct = sortedByVolume[0]?.label ?? "N/A";
  const dependencyScore =
    totalEffectiveQty > 0
      ? (sortedByVolume[0]?.effectiveQty ?? 0) / totalEffectiveQty
      : 0;
  const excessiveDependency = dependencyScore > DEPENDENCY_THRESHOLD;
  const bottleneckProduct = findBottleneckProduct(productStats);

  const diagnosis = {
    executiveSummary: buildExecutiveSummary({
      cancelRate,
      excessiveDependency,
      championProduct,
      bottleneckProduct,
    }),
    excessiveDependency,
    championProduct,
    bottleneckProduct,
  };

  const risks = detectRisks(productStats);
  const productScores = computeProductScores(productStats);
  const portfolioScores = computePortfolioScores(
    productScores,
    cancelRate,
    dependencyScore,
  );
  const strategies = buildStrategicRecommendations({
    portfolioScores,
    productScores,
    risks,
    cancelRate,
    championProduct,
    bottleneckProduct,
  });

  return {
    diagnosis,
    risks,
    strategies,
    productStats,
    productScores,
    portfolioScores,
  };
}
