const DEPENDENCY_THRESHOLD = 0.5;
const CANCEL_RATE_HIGH = 0.4;
const CANCEL_RATE_MEDIUM = 0.2;
const MIN_ORDERS_FOR_RISK = 2;

const RISK_TYPE_LABEL = {
    REVENUE_ILLUSION: "Ilusão de Receita (Cancelamentos)",
    STAGNANT_STOCK: "Estoque Parado",
};

const SEVERITY_LABEL = {
    HIGH: "Alta",
    MEDIUM: "Média",
};

const STRATEGIC_OBJECTIVE_LABEL = {
    INCREASE_AOV: "Aumentar Ticket Médio",
    CLEAR_INVENTORY: "Liquidar Estoque",
    IMPROVE_CONVERSION: "Melhorar Conversão",
};

function computeQuartile(values, q) {
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

function buildProductStats(rawList) {
    const productMap = {};

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
        cancellationRate: stat.totalOrders > 0 ? stat.canceledOrders / stat.totalOrders : 0,
    }));
}

function detectRisks(productStats) {
    const eligible = productStats.filter((p) => p.totalOrders >= MIN_ORDERS_FOR_RISK);
    const effectiveQtyValues = eligible.map((p) => p.effectiveQty);
    const q25 = computeQuartile(effectiveQtyValues, 0.25);
    const median = computeQuartile(effectiveQtyValues, 0.5);

    const risks = [];

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
                product.effectiveQty < median ? SEVERITY_LABEL.HIGH : SEVERITY_LABEL.MEDIUM;
            const alreadyHasStockRisk = risks.some(
                (r) =>
                    r.product === product.label && r.riskType === RISK_TYPE_LABEL.STAGNANT_STOCK
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

function findBottleneckProduct(productStats) {
    const eligible = productStats.filter((p) => p.totalOrders >= MIN_ORDERS_FOR_RISK);

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
}) {
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

function suggestKits(diagnosis, risks, productStats) {
    const kits = [];
    const sortedByVolume = [...productStats].sort((a, b) => b.effectiveQty - a.effectiveQty);
    const champion = sortedByVolume[0];
    const runnerUp = sortedByVolume[1];

    if (champion && runnerUp) {
        kits.push({
            commercialName: `Complete ${truncateLabel(champion.label, 30)} Kit`,
            compositeItems: [champion.label, runnerUp.label],
            strategicObjective: STRATEGIC_OBJECTIVE_LABEL.INCREASE_AOV,
            salesRationale: `Combines the top seller (${champion.label}) with the second-highest volume item (${runnerUp.label}) to offer a practical bundle that increases average order value.`,
        });
    }

    const stagnantStockRisks = risks.filter((r) => r.riskType === RISK_TYPE_LABEL.STAGNANT_STOCK);
    const cancellationRisks = risks.filter((r) => r.riskType === RISK_TYPE_LABEL.REVENUE_ILLUSION);

    if (stagnantStockRisks.length > 0 && champion) {
        const stagnant = stagnantStockRisks[0];

        if (stagnant.product !== champion.label) {
            kits.push({
                commercialName: "Kit Elegância Acessível",
                compositeItems: [stagnant.product, champion.label],
                strategicObjective: STRATEGIC_OBJECTIVE_LABEL.CLEAR_INVENTORY,
                salesRationale: `Agrega valor a um produto de baixo giro (${stagnant.product}) combinado com o campeão de vendas (${champion.label}), elevando a percepção de valor e incentivando a compra.`,
            });
        }
    }

    if (cancellationRisks.length > 0 && champion) {
        const cancelRisk = cancellationRisks[0];
        const highConversion = sortedByVolume.find(
            (p) => p.cancellationRate < CANCEL_RATE_MEDIUM && p.label !== cancelRisk.product
        );

        if (highConversion && cancelRisk.product !== highConversion.label) {
            kits.push({
                commercialName: "Kit Conversão Premium",
                compositeItems: [cancelRisk.product, highConversion.label],
                strategicObjective: STRATEGIC_OBJECTIVE_LABEL.IMPROVE_CONVERSION,
                salesRationale: `Associa um produto com alto índice de cancelamento (${cancelRisk.product}) a um item de alta conversão (${highConversion.label}), reduzindo a percepção de risco na compra.`,
            });
        }
    }

    return kits;
}

function truncateLabel(label, maxLength) {
    if (label.length <= maxLength) {
        return label;
    }

    return label.slice(0, maxLength - 3) + "...";
}

function buildDiagnostics(rawList) {
    const productStats = buildProductStats(rawList);
    const totalOrders = rawList.length;
    const canceledCount = rawList.filter((order) => order.status === "canceled").length;
    const cancelRate = totalOrders > 0 ? (canceledCount / totalOrders) * 100 : 0;

    const sortedByVolume = [...productStats].sort((a, b) => b.effectiveQty - a.effectiveQty);
    const totalEffectiveQty = productStats.reduce((acc, p) => acc + p.effectiveQty, 0);

    const championProduct = sortedByVolume[0]?.label ?? "N/A";
    const topShare = totalEffectiveQty > 0 ? (sortedByVolume[0]?.effectiveQty ?? 0) / totalEffectiveQty : 0;
    const excessiveDependency = topShare > DEPENDENCY_THRESHOLD;
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
    const kits = suggestKits(diagnosis, risks, productStats);

    return { diagnosis, risks, kits, productStats };
}

module.exports = {
    buildDiagnostics,
    RISK_TYPE_LABEL,
    SEVERITY_LABEL,
    STRATEGIC_OBJECTIVE_LABEL,
};
