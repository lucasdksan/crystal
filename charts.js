const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const { buildDiagnostics } = require("./diagnostics");

const ORIGIN_LABELS = { 0: "Marketplace", "-1": "Desconhecido" };

const PAYMENT_LABELS = {
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
    "-1": "Desconhecido",
};

const STATUS_LABELS = {
    0: "Cancelado",
    1: "Pendente",
    2: "Sucesso",
    3: "Enviado",
    4: "Entregue",
    5: "Faturado",
    6: "Pagamento aprovado",
    7: "Pagamento pendente",
    8: "Pronto para separação",
    9: "Em separação",
    10: "Janela para cancelar",
    "-1": "Desconhecido",
};

const STATUS_LABELS_RAW = {
    canceled: "Cancelado",
    pending: "Pendente",
    success: "Sucesso",
    shipped: "Enviado",
    delivered: "Entregue",
    invoiced: "Faturado",
    "payment-approved": "Pagamento aprovado",
    "payment-pending": "Pagamento pendente",
    "ready-for-handling": "Pronto para separação",
    handling: "Em separação",
    "window-to-cancel": "Janela para cancelar",
};

const FEATURE_LABELS_PT = [
    "Valor Total",
    "Total de Itens",
    "Quantidade Total",
    "Preço Médio",
    "Origem",
    "Pagamento",
    "Hora do Dia",
    "Dia da Semana",
    "Canal de Vendas",
];

const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const CLUSTER_COLORS = [
    { bg: "rgba(99, 102, 241, 0.7)", border: "rgb(99, 102, 241)" },
    { bg: "rgba(236, 72, 153, 0.7)", border: "rgb(236, 72, 153)" },
    { bg: "rgba(34, 197, 94, 0.7)", border: "rgb(34, 197, 94)" },
    { bg: "rgba(251, 146, 60, 0.7)", border: "rgb(251, 146, 60)" },
    { bg: "rgba(14, 165, 233, 0.7)", border: "rgb(14, 165, 233)" },
    { bg: "rgba(168, 85, 247, 0.7)", border: "rgb(168, 85, 247)" },
];

function groupOrdersByCluster(orders, clusterIds) {
    const groups = {};

    clusterIds.forEach((clusterId, index) => {
        if (!groups[clusterId]) {
            groups[clusterId] = [];
        }

        groups[clusterId].push(orders[index]);
    });

    return groups;
}

function getClusterColor(clusterId) {
    return CLUSTER_COLORS[Number(clusterId) % CLUSTER_COLORS.length];
}

function getTotalQuantity(order) {
    return order.items.reduce((acc, item) => acc + item.quantity, 0);
}

function getAvgPrice(order) {
    if (order.items.length === 0) {
        return 0;
    }

    return order.items.reduce((acc, item) => acc + item.sellingPrice, 0) / order.items.length;
}

function getMode(values) {
    const counts = {};

    values.forEach((value) => {
        counts[value] = (counts[value] || 0) + 1;
    });

    return Number(Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]);
}

function formatCurrency(value) {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatCurrencyFromCents(value) {
    return formatCurrency(value / 100);
}

function formatNumber(value, decimals = 1) {
    return value.toLocaleString("pt-BR", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });
}

function getLabel(map, value) {
    return map[value] ?? map[String(value)] ?? "Desconhecido";
}

function getClusterLabel(row, overallAvgValue) {
    const valueLevel = row.avgTotalValue >= overallAvgValue ? "Alto valor" : "Valor moderado";
    return `Cluster ${row.clusterId} - ${valueLevel}`;
}

function buildKpis(rawList, orders) {
    const totalOrders = rawList.length;
    const totalRevenue = rawList.reduce((acc, order) => acc + order.totalValue, 0);
    const canceledCount = rawList.filter((order) => order.status === "canceled").length;
    const deliveredCount = rawList.filter((order) => order.isAllDelivered).length;
    const errorCount = rawList.filter((order) => order.workflowInErrorState).length;

    return {
        totalOrders,
        totalRevenue,
        avgTicket: totalOrders > 0 ? totalRevenue / totalOrders : 0,
        cancelRate: totalOrders > 0 ? (canceledCount / totalOrders) * 100 : 0,
        deliveryRate: totalOrders > 0 ? (deliveredCount / totalOrders) * 100 : 0,
        errorCount,
    };
}

function buildOrdersByHour(orders) {
    const counts = Array(24).fill(0);

    orders.forEach((order) => {
        counts[order.hourOfDay]++;
    });

    return {
        labels: counts.map((_, hour) => `${hour}h`),
        data: counts,
    };
}

function buildOrdersByDayOfWeek(orders) {
    const counts = Array(7).fill(0);

    orders.forEach((order) => {
        counts[order.dayOfWeek]++;
    });

    return {
        labels: DAY_LABELS,
        data: counts,
    };
}

function buildStatusDistribution(rawList) {
    const counts = {};

    rawList.forEach((order) => {
        const label = STATUS_LABELS_RAW[order.status] ?? order.status ?? "Desconhecido";
        counts[label] = (counts[label] || 0) + 1;
    });

    const labels = Object.keys(counts);
    const data = labels.map((label) => counts[label]);
    const backgroundColors = labels.map((_, index) => CLUSTER_COLORS[index % CLUSTER_COLORS.length].bg);
    const borderColors = labels.map((_, index) => CLUSTER_COLORS[index % CLUSTER_COLORS.length].border);

    return { labels, data, backgroundColors, borderColors };
}

function buildTopProducts(rawList, limit = 10) {
    const productMap = {};

    rawList.forEach((order) => {
        order.items.forEach((item) => {
            const key = item.productId || item.description || "Desconhecido";
            const label = item.description || `Produto ${item.productId}`;

            if (!productMap[key]) {
                productMap[key] = { label, quantity: 0 };
            }

            productMap[key].quantity += item.quantity;
        });
    });

    const sorted = Object.values(productMap).sort((a, b) => b.quantity - a.quantity).slice(0, limit);

    return {
        labels: sorted.map((product) => {
            const text = product.label;
            return text.length > 45 ? `${text.slice(0, 42)}...` : text;
        }),
        data: sorted.map((product) => product.quantity),
    };
}

function buildElbowData(elbowAnalysis, bestK) {
    return {
        labels: elbowAnalysis.map((item) => `K=${item.k}`),
        scores: elbowAnalysis.map((item) => item.wcss),
        bestK,
        bestKIndex: elbowAnalysis.findIndex((item) => item.k === bestK),
    };
}

function buildSomHeatmapData(predictions, orders, gridX, gridY) {
    const cellMap = {};

    for (let y = 0; y < gridY; y++) {
        for (let x = 0; x < gridX; x++) {
            cellMap[`${x},${y}`] = { x, y, count: 0, totalValue: 0, orderIds: [] };
        }
    }

    predictions.forEach((coords, index) => {
        const x = coords[0];
        const y = coords[1];
        const key = `${x},${y}`;

        if (!cellMap[key]) {
            cellMap[key] = { x, y, count: 0, totalValue: 0, orderIds: [] };
        }

        cellMap[key].count += 1;
        cellMap[key].totalValue += orders[index].totalValue;
        cellMap[key].orderIds.push(orders[index].orderId);
    });

    const cells = Object.values(cellMap).map((cell) => ({
        ...cell,
        avgValue: cell.count > 0 ? cell.totalValue / cell.count : 0,
    }));

    const valuesWithOrders = cells.filter((cell) => cell.count > 0).map((cell) => cell.avgValue);
    const minAvg = valuesWithOrders.length > 0 ? Math.min(...valuesWithOrders) : 0;
    const maxAvg = valuesWithOrders.length > 0 ? Math.max(...valuesWithOrders) : 0;

    return { gridX, gridY, cells, minAvg, maxAvg };
}

function getSomCellColor(avgValue, minAvg, maxAvg, hasOrders) {
    if (!hasOrders) {
        return "rgba(30, 41, 59, 0.8)";
    }

    if (maxAvg === minAvg) {
        return "rgb(99, 102, 241)";
    }

    const t = (avgValue - minAvg) / (maxAvg - minAvg);
    const r = Math.round(59 + t * (239 - 59));
    const g = Math.round(130 - t * 58);
    const b = Math.round(246 - t * 178);

    return `rgb(${r}, ${g}, ${b})`;
}

function buildSomHtml(somHeatmapData) {
    const { gridX, gridY, cells, minAvg, maxAvg } = somHeatmapData;
    const sortedCells = [...cells].sort((a, b) => a.y - b.y || a.x - b.x);

    const cellsHtml = sortedCells
        .map((cell) => {
            const hasOrders = cell.count > 0;
            const backgroundColor = getSomCellColor(cell.avgValue, minAvg, maxAvg, hasOrders);
            const tooltip = hasOrders
                ? `${cell.count} pedido(s) · Ticket médio: ${formatCurrencyFromCents(cell.avgValue)}`
                : "Nenhum pedido neste neurônio";

            return [
                '<div class="som-cell" style="background:',
                backgroundColor,
                '" title="',
                tooltip,
                '"><span class="som-cell-count">',
                hasOrders ? cell.count : "·",
                "</span></div>",
            ].join("");
        })
        .join("");

    const occupiedCount = cells.filter((c) => c.count > 0).length;
    const totalNeurons = gridX * gridY;

    return [
        '<div class="card som-card">',
        `<h2>Mapa de Similaridade SOM (grade ${gridX}\u00d7${gridY})</h2>`,
        '<p class="som-description">',
        "Cada c\u00e9lula \u00e9 um neur\u00f4nio. Pedidos com perfis comportamentais semelhantes ficam em neur\u00f4nios vizinhos. ",
        `${occupiedCount} de ${totalNeurons} neur\u00f4nios ativos. `,
        "Cor: azul (ticket baixo) \u2192 vermelho (ticket alto). Passe o mouse para ver detalhes.",
        "</p>",
        `<div class="som-grid" style="grid-template-columns: repeat(${gridX}, minmax(52px, 1fr));">`,
        cellsHtml,
        "</div>",
        '<div class="som-legend">',
        "<span>Baixo ticket</span>",
        '<div class="som-legend-gradient"></div>',
        "<span>Alto ticket</span>",
        "</div>",
        "</div>",
    ].join("");
}

function buildScatterData(groups, overallAvgValue) {
    return Object.entries(groups)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([clusterId, clusterOrders]) => {
            const color = getClusterColor(clusterId);
            const avgValue =
                clusterOrders.reduce((acc, order) => acc + order.totalValue, 0) / clusterOrders.length;
            const valueLevel = avgValue >= overallAvgValue ? "Alto valor" : "Valor moderado";

            return {
                label: `Cluster ${clusterId} - ${valueLevel}`,
                data: clusterOrders.map((order) => ({
                    x: order.totalValue / 100,
                    y: order.totalItems,
                    orderId: order.orderId,
                    clientName: order.clientName,
                    totalValue: order.totalValue,
                    products: order.items.map((item) => item.description).filter(Boolean),
                })),
                backgroundColor: color.bg,
                borderColor: color.border,
            };
        });
}

function buildClusterStats(groups, overallAvgValue) {
    const clusterIds = Object.keys(groups).map(Number).sort((a, b) => a - b);

    return {
        clusterIds,
        labels: clusterIds.map((id) => {
            const clusterOrders = groups[id];
            const avgValue =
                clusterOrders.reduce((acc, order) => acc + order.totalValue, 0) / clusterOrders.length;
            const valueLevel = avgValue >= overallAvgValue ? "Alto valor" : "Valor moderado";
            return `Cluster ${id} - ${valueLevel}`;
        }),
        counts: clusterIds.map((id) => groups[id].length),
        avgValues: clusterIds.map((id) => {
            const clusterOrders = groups[id];
            const sum = clusterOrders.reduce((acc, order) => acc + order.totalValue, 0);
            return sum / clusterOrders.length / 100;
        }),
        overallAvgValue: overallAvgValue / 100,
        backgroundColors: clusterIds.map((id) => getClusterColor(id).bg),
        borderColors: clusterIds.map((id) => getClusterColor(id).border),
    };
}

function buildCentroidDatasets(centroids, groups, overallAvgValue) {
    return centroids.map((centroid, index) => {
        const color = CLUSTER_COLORS[index % CLUSTER_COLORS.length];
        const clusterOrders = groups[index] ?? [];
        const avgValue =
            clusterOrders.length > 0
                ? clusterOrders.reduce((acc, order) => acc + order.totalValue, 0) / clusterOrders.length
                : 0;
        const valueLevel = avgValue >= overallAvgValue ? "Alto valor" : "Valor moderado";

        return {
            label: `Cluster ${index} - ${valueLevel}`,
            data: centroid,
            backgroundColor: color.bg.replace("0.7", "0.2"),
            borderColor: color.border,
            borderWidth: 2,
        };
    });
}

function buildClusterTable(groups, totalOrders, centroids, overallAvgValue) {
    const clusterIds = Object.keys(groups).map(Number).sort((a, b) => a - b);

    return clusterIds.map((id) => {
        const clusterOrders = groups[id];
        const count = clusterOrders.length;
        const deliveredRate =
            clusterOrders.filter((order) => order.isAllDelivered === 1).length / count * 100;

        return {
            clusterId: id,
            color: getClusterColor(id).border,
            label: getClusterLabel(
                {
                    clusterId: id,
                    avgTotalValue:
                        clusterOrders.reduce((acc, order) => acc + order.totalValue, 0) / count,
                },
                overallAvgValue
            ),
            count,
            percentage: (count / totalOrders) * 100,
            avgTotalValue: clusterOrders.reduce((acc, order) => acc + order.totalValue, 0) / count,
            avgTotalItems: clusterOrders.reduce((acc, order) => acc + order.totalItems, 0) / count,
            avgQuantity: clusterOrders.reduce((acc, order) => acc + getTotalQuantity(order), 0) / count,
            avgPrice: clusterOrders.reduce((acc, order) => acc + getAvgPrice(order), 0) / count,
            payment: getLabel(PAYMENT_LABELS, getMode(clusterOrders.map((order) => order.paymentNames))),
            status: getLabel(STATUS_LABELS, getMode(clusterOrders.map((order) => order.status))),
            origin: getLabel(ORIGIN_LABELS, getMode(clusterOrders.map((order) => order.origin))),
            deliveredRate,
            centroid: centroids[id] ?? [],
        };
    });
}

function buildClusterInsights(tableRows, overallAvgValue) {
    return tableRows.map((row) => {
        const valueLevel = row.avgTotalValue >= overallAvgValue ? "alto valor" : "valor moderado";

        return {
            clusterId: row.clusterId,
            color: row.color,
            text: `<strong>${row.label}</strong>: pedidos de ${valueLevel} (${formatCurrencyFromCents(row.avgTotalValue)} em média), predominantemente pagos com ${row.payment}, status "${row.status}", origem ${row.origin}. Representa ${formatNumber(row.percentage, 1)}% dos pedidos (${row.count} pedidos), com ${formatNumber(row.deliveredRate, 1)}% de entrega completa e ticket médio de ${formatCurrencyFromCents(row.avgPrice)} por item.`,
        };
    });
}

function buildSummary(totalOrders, clusterCount, bestK) {
    return {
        totalOrders,
        clusterCount,
        bestK,
        generatedAt: new Date().toLocaleString("pt-BR"),
    };
}

function buildKpiHtml(kpis) {
    return `
        <div class="summary kpi-summary">
            <div class="summary-item">
                <strong>${formatCurrencyFromCents(kpis.totalRevenue)}</strong>
                <span>Receita total</span>
            </div>
            <div class="summary-item">
                <strong>${formatCurrencyFromCents(kpis.avgTicket)}</strong>
                <span>Ticket médio</span>
            </div>
            <div class="summary-item">
                <strong>${formatNumber(kpis.cancelRate, 1)}%</strong>
                <span>Taxa de cancelamento</span>
            </div>
            <div class="summary-item">
                <strong>${formatNumber(kpis.deliveryRate, 1)}%</strong>
                <span>Taxa de entrega completa</span>
            </div>
            <div class="summary-item">
                <strong>${kpis.errorCount}</strong>
                <span>Pedidos com erro no workflow</span>
            </div>
        </div>
    `;
}

function getSeverityClass(severity) {
    if (severity === "Alta") {
        return "severity-high";
    }

    if (severity === "Média") {
        return "severity-medium";
    }

    return "severity-low";
}

function formatScorePercent(score) {
    return `${Math.round(score * 100)}%`;
}

function buildScoreBar(label, score, barClass) {
    const percent = Math.round(score * 100);

    return `
        <div class="score-bar-row">
            <span class="score-bar-label">${label}</span>
            <div class="score-bar-track">
                <div class="score-bar-fill ${barClass}" style="width: ${percent}%"></div>
            </div>
            <span class="score-bar-value">${percent}%</span>
        </div>
    `;
}

function buildKitCardsHtml(kits) {
    if (!kits || kits.length === 0) {
        return "";
    }

    return `
        <div class="strategy-kits">
            <span class="strategy-kits-title">Kits sugeridos</span>
            <div class="kits-grid">
                ${kits
                    .map(
                        (kit) => `
                    <div class="kit-card">
                        <h4>${kit.commercialName}</h4>
                        <p class="kit-objective"><strong>Objetivo:</strong> ${kit.strategicObjective}</p>
                        <ul class="kit-items">
                            ${kit.compositeItems.map((item) => `<li>${item}</li>`).join("")}
                        </ul>
                        <p class="kit-rationale">${kit.salesRationale}</p>
                    </div>
                `
                    )
                    .join("")}
            </div>
        </div>
    `;
}

function buildStrategyCard(strategy) {
    const justificationsHtml = strategy.justifications
        .map((text) => `<li>${text}</li>`)
        .join("");
    const actionsHtml = strategy.actions
        .map(
            (action) => `
            <div class="strategy-action">
                <strong>${action.label}</strong>
                <p>${action.description}</p>
            </div>
        `
        )
        .join("");
    const kitsHtml = buildKitCardsHtml(strategy.kits);

    return `
        <div class="strategy-card">
            <div class="strategy-header">
                <h3>${strategy.label}</h3>
                <span class="strategy-type-badge">${strategy.type}</span>
            </div>
            <div class="strategy-scores">
                ${buildScoreBar("Confiança", strategy.confidenceScore, "score-confidence")}
                ${buildScoreBar("Impacto", strategy.impactScore, "score-impact")}
                ${buildScoreBar("Risco", strategy.riskScore, "score-risk")}
            </div>
            <div class="strategy-score-badges">
                <span class="score-badge score-badge-confidence">Confiança ${formatScorePercent(strategy.confidenceScore)}</span>
                <span class="score-badge score-badge-impact">Impacto ${formatScorePercent(strategy.impactScore)}</span>
                <span class="score-badge score-badge-risk">Risco ${formatScorePercent(strategy.riskScore)}</span>
            </div>
            <ul class="strategy-justifications">${justificationsHtml}</ul>
            <div class="strategy-actions">${actionsHtml}</div>
            ${kitsHtml}
        </div>
    `;
}

function buildDiagnosticsHtml({ diagnosis, risks, strategies }) {
    const dependencyBadge = diagnosis.excessiveDependency
        ? '<span class="badge badge-warning">Dependência excessiva</span>'
        : '<span class="badge badge-success">Portfólio diversificado</span>';

    const riskRows =
        risks.length > 0
            ? risks
                  .map(
                      (risk) => `
            <tr>
                <td>${risk.product}</td>
                <td>${risk.riskType}</td>
                <td><span class="severity-badge ${getSeverityClass(risk.severity)}">${risk.severity}</span></td>
            </tr>
        `
                  )
                  .join("")
            : `<tr><td colspan="3" class="empty-row">Nenhum risco identificado com os critérios atuais.</td></tr>`;

    const strategiesHtml =
        strategies.length > 0
            ? strategies.map((strategy) => buildStrategyCard(strategy)).join("")
            : `<p class="empty-row">Nenhuma estratégia gerada para o portfólio atual.</p>`;

    return `
        <div class="card diagnostics-card">
            <h2>Diagnóstico Estratégico</h2>
            <p class="table-description">
                Recomendações contextualizadas por scores de risco, dependência, saúde do portfólio e afinidade de bundle — sem sugestões fixas de kit.
            </p>

            <div class="diagnostic-summary">
                <p class="executive-summary">${diagnosis.executiveSummary}</p>
                <div class="diagnostic-highlights">
                    ${dependencyBadge}
                    <div class="highlight-item">
                        <span class="highlight-label">Produto campeão</span>
                        <strong>${diagnosis.championProduct}</strong>
                    </div>
                    <div class="highlight-item">
                        <span class="highlight-label">Produto gargalo</span>
                        <strong>${diagnosis.bottleneckProduct}</strong>
                    </div>
                </div>
            </div>

            <h3 class="subsection-title">Riscos Identificados</h3>
            <div class="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>Produto</th>
                            <th>Tipo de Risco</th>
                            <th>Gravidade</th>
                        </tr>
                    </thead>
                    <tbody>${riskRows}</tbody>
                </table>
            </div>

            <h3 class="subsection-title">Estratégias Recomendadas</h3>
            <div class="strategies-grid">${strategiesHtml}</div>
        </div>
    `;
}

function buildInsightsHtml(insights) {
    const items = insights
        .map(
            (insight) => `
            <div class="insight-item">
                <span class="cluster-badge" style="background:${insight.color}"></span>
                <p>${insight.text}</p>
            </div>
        `
        )
        .join("");

    return `
        <div class="card table-card">
            <h2>Insights por Cluster</h2>
            <p class="table-description">
                Perfis automáticos de cada grupo para facilitar a leitura dos padrões de compra.
            </p>
            <div class="insights-list">${items}</div>
        </div>
    `;
}

function buildClusterTableHtml(tableRows) {
    const rows = tableRows
        .map(
            (row) => `
        <tr>
            <td><span class="cluster-badge" style="background:${row.color}"></span>${row.label}</td>
            <td>${row.count}</td>
            <td>${formatNumber(row.percentage, 1)}%</td>
            <td>${formatCurrencyFromCents(row.avgTotalValue)}</td>
            <td>${formatNumber(row.avgTotalItems)}</td>
            <td>${formatNumber(row.avgQuantity)}</td>
            <td>${formatCurrencyFromCents(row.avgPrice)}</td>
            <td>${row.payment}</td>
            <td>${row.status}</td>
            <td>${row.origin}</td>
            <td>${formatNumber(row.deliveredRate, 1)}%</td>
        </tr>
    `
        )
        .join("");

    return `
        <div class="card table-card">
            <h2>Resumo dos Clusters</h2>
            <p class="table-description">
                Estatísticas médias e características predominantes de cada grupo formado pelo K-Means.
            </p>
            <div class="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>Cluster</th>
                            <th>Pedidos</th>
                            <th>%</th>
                            <th>Valor Médio</th>
                            <th>Itens Médio</th>
                            <th>Qtd. Média</th>
                            <th>Preço Médio</th>
                            <th>Pagamento</th>
                            <th>Status</th>
                            <th>Origem</th>
                            <th>Entrega</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </div>
    `;
}

function buildCentroidTableHtml(tableRows) {
    const headerCells = FEATURE_LABELS_PT.map((label) => `<th>${label}</th>`).join("");
    const rows = tableRows
        .map((row) => {
            const cells = row.centroid.map((value) => `<td>${formatNumber(value * 100, 1)}%</td>`).join("");

            return `
            <tr>
                <td><span class="cluster-badge" style="background:${row.color}"></span>${row.label}</td>
                ${cells}
            </tr>
        `;
        })
        .join("");

    return `
        <div class="card table-card">
            <h2>Perfil dos Centroides (normalizado)</h2>
            <p class="table-description">
                Posição relativa de cada cluster nas dimensões usadas no agrupamento (0% = mínimo, 100% = máximo do dataset).
            </p>
            <div class="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>Cluster</th>
                            ${headerCells}
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </div>
    `;
}

function buildHtml({
    scatterData,
    stats,
    centroidDatasets,
    summary,
    tableRows,
    kpis,
    ordersByHour,
    ordersByDay,
    statusDistribution,
    topProducts,
    elbowData,
    insights,
    diagnosticsHtml,
    somHtml,
}) {
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Crystal - Relatório de Análise</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: system-ui, -apple-system, sans-serif;
            background: #0f172a;
            color: #e2e8f0;
            padding: 2rem;
        }
        h1 {
            text-align: center;
            margin-bottom: 0.5rem;
            font-size: 1.75rem;
        }
        .subtitle {
            text-align: center;
            color: #94a3b8;
            margin-bottom: 2rem;
        }
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(420px, 1fr));
            gap: 1.5rem;
            max-width: 1400px;
            margin: 0 auto 1.5rem;
        }
        .card {
            background: #1e293b;
            border-radius: 12px;
            padding: 1.5rem;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
        }
        .card h2 {
            font-size: 1rem;
            margin-bottom: 1rem;
            color: #cbd5e1;
        }
        .chart-container {
            position: relative;
            height: 320px;
        }
        .chart-container.tall {
            height: 380px;
        }
        .summary {
            max-width: 1400px;
            margin: 0 auto 1.5rem;
            display: flex;
            flex-wrap: wrap;
            gap: 1rem;
            justify-content: center;
        }
        .kpi-summary .summary-item {
            min-width: 180px;
        }
        .summary-item {
            background: #1e293b;
            border-radius: 8px;
            padding: 0.75rem 1.25rem;
            text-align: center;
        }
        .summary-item strong {
            display: block;
            font-size: 1.25rem;
            color: #f8fafc;
        }
        .summary-item span {
            font-size: 0.8rem;
            color: #94a3b8;
        }
        .table-card {
            max-width: 1400px;
            margin: 0 auto 1.5rem;
        }
        .table-description {
            color: #94a3b8;
            font-size: 0.875rem;
            margin-bottom: 1rem;
        }
        .table-wrapper {
            overflow-x: auto;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.875rem;
        }
        th, td {
            padding: 0.65rem 0.75rem;
            text-align: left;
            border-bottom: 1px solid rgba(148, 163, 184, 0.15);
            white-space: nowrap;
        }
        th {
            color: #94a3b8;
            font-weight: 600;
            font-size: 0.75rem;
            text-transform: uppercase;
            letter-spacing: 0.03em;
        }
        tbody tr:hover {
            background: rgba(148, 163, 184, 0.05);
        }
        .cluster-badge {
            display: inline-block;
            width: 10px;
            height: 10px;
            border-radius: 50%;
            margin-right: 0.5rem;
        }
        .insights-list {
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }
        .insight-item {
            display: flex;
            align-items: flex-start;
            gap: 0.5rem;
            padding: 0.85rem 1rem;
            background: rgba(15, 23, 42, 0.45);
            border-radius: 8px;
            line-height: 1.5;
        }
        .insight-item p {
            color: #cbd5e1;
            font-size: 0.9rem;
        }
        .diagnostics-card {
            max-width: 1400px;
            margin: 0 auto 1.5rem;
        }
        .diagnostic-summary {
            margin-bottom: 1.5rem;
        }
        .executive-summary {
            color: #e2e8f0;
            line-height: 1.6;
            margin-bottom: 1rem;
            padding: 1rem;
            background: rgba(15, 23, 42, 0.45);
            border-radius: 8px;
            border-left: 3px solid rgb(99, 102, 241);
        }
        .diagnostic-highlights {
            display: flex;
            flex-wrap: wrap;
            gap: 1rem;
            align-items: flex-start;
        }
        .highlight-item {
            flex: 1;
            min-width: 200px;
            padding: 0.75rem 1rem;
            background: rgba(15, 23, 42, 0.45);
            border-radius: 8px;
        }
        .highlight-label {
            display: block;
            font-size: 0.75rem;
            color: #94a3b8;
            text-transform: uppercase;
            letter-spacing: 0.03em;
            margin-bottom: 0.25rem;
        }
        .highlight-item strong {
            font-size: 0.85rem;
            color: #f8fafc;
            line-height: 1.4;
            display: block;
        }
        .badge {
            display: inline-block;
            padding: 0.35rem 0.75rem;
            border-radius: 999px;
            font-size: 0.8rem;
            font-weight: 600;
        }
        .badge-warning {
            background: rgba(251, 146, 60, 0.2);
            color: rgb(251, 146, 60);
        }
        .badge-success {
            background: rgba(34, 197, 94, 0.2);
            color: rgb(34, 197, 94);
        }
        .subsection-title {
            font-size: 0.95rem;
            color: #cbd5e1;
            margin: 1.25rem 0 0.75rem;
        }
        .severity-badge {
            display: inline-block;
            padding: 0.2rem 0.6rem;
            border-radius: 4px;
            font-size: 0.75rem;
            font-weight: 600;
        }
        .severity-high {
            background: rgba(239, 68, 68, 0.2);
            color: rgb(239, 68, 68);
        }
        .severity-medium {
            background: rgba(251, 146, 60, 0.2);
            color: rgb(251, 146, 60);
        }
        .severity-low {
            background: rgba(34, 197, 94, 0.2);
            color: rgb(34, 197, 94);
        }
        .strategies-grid {
            display: flex;
            flex-direction: column;
            gap: 1.25rem;
        }
        .strategy-card {
            padding: 1.25rem;
            background: rgba(15, 23, 42, 0.45);
            border-radius: 8px;
            border: 1px solid rgba(148, 163, 184, 0.15);
        }
        .strategy-header {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            justify-content: space-between;
            gap: 0.5rem;
            margin-bottom: 1rem;
        }
        .strategy-header h3 {
            font-size: 1rem;
            color: #f8fafc;
            margin: 0;
        }
        .strategy-type-badge {
            font-size: 0.7rem;
            padding: 0.2rem 0.5rem;
            border-radius: 4px;
            background: rgba(99, 102, 241, 0.2);
            color: rgb(165, 180, 252);
            font-family: monospace;
        }
        .strategy-scores {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
            margin-bottom: 0.75rem;
        }
        .score-bar-row {
            display: grid;
            grid-template-columns: 90px 1fr 40px;
            align-items: center;
            gap: 0.5rem;
            font-size: 0.8rem;
        }
        .score-bar-label {
            color: #94a3b8;
        }
        .score-bar-track {
            height: 8px;
            background: rgba(148, 163, 184, 0.15);
            border-radius: 4px;
            overflow: hidden;
        }
        .score-bar-fill {
            height: 100%;
            border-radius: 4px;
            transition: width 0.3s ease;
        }
        .score-bar-fill.score-confidence {
            background: rgb(99, 102, 241);
        }
        .score-bar-fill.score-impact {
            background: rgb(34, 197, 94);
        }
        .score-bar-fill.score-risk {
            background: rgb(239, 68, 68);
        }
        .score-bar-value {
            color: #cbd5e1;
            text-align: right;
        }
        .strategy-score-badges {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
            margin-bottom: 1rem;
        }
        .score-badge {
            font-size: 0.75rem;
            padding: 0.25rem 0.6rem;
            border-radius: 999px;
            font-weight: 600;
        }
        .score-badge-confidence {
            background: rgba(99, 102, 241, 0.2);
            color: rgb(165, 180, 252);
        }
        .score-badge-impact {
            background: rgba(34, 197, 94, 0.2);
            color: rgb(74, 222, 128);
        }
        .score-badge-risk {
            background: rgba(239, 68, 68, 0.2);
            color: rgb(248, 113, 113);
        }
        .strategy-justifications {
            margin: 0 0 1rem 1.25rem;
            font-size: 0.85rem;
            color: #94a3b8;
            line-height: 1.5;
        }
        .strategy-actions {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
        }
        .strategy-action {
            padding: 0.75rem;
            background: rgba(30, 41, 59, 0.5);
            border-radius: 6px;
        }
        .strategy-action strong {
            display: block;
            font-size: 0.85rem;
            color: #e2e8f0;
            margin-bottom: 0.25rem;
        }
        .strategy-action p {
            font-size: 0.8rem;
            color: #94a3b8;
            margin: 0;
            line-height: 1.4;
        }
        .strategy-kits {
            margin-top: 1rem;
            padding-top: 1rem;
            border-top: 1px solid rgba(148, 163, 184, 0.15);
        }
        .strategy-kits-title {
            display: block;
            font-size: 0.75rem;
            color: #94a3b8;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 0.75rem;
        }
        .kits-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 1rem;
        }
        .kit-card {
            padding: 1rem;
            background: rgba(15, 23, 42, 0.45);
            border-radius: 8px;
            border: 1px solid rgba(148, 163, 184, 0.15);
        }
        .kit-card h4 {
            font-size: 0.9rem;
            color: #f8fafc;
            margin-bottom: 0.5rem;
        }
        .kit-objective {
            font-size: 0.85rem;
            color: #94a3b8;
            margin-bottom: 0.5rem;
        }
        .kit-items {
            margin: 0.5rem 0 0.75rem 1.25rem;
            font-size: 0.85rem;
            color: #cbd5e1;
        }
        .kit-rationale {
            font-size: 0.8rem;
            color: #94a3b8;
            line-height: 1.5;
        }
        .empty-row {
            color: #94a3b8;
            font-style: italic;
            text-align: center;
        }
        .section-divider {
            max-width: 1400px;
            margin: 2.5rem auto 1.25rem;
            display: flex;
            align-items: center;
            gap: 1rem;
            font-size: 0.7rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: #475569;
        }
        .section-divider::before,
        .section-divider::after {
            content: "";
            flex: 1;
            height: 1px;
            background: rgba(148, 163, 184, 0.12);
        }
        .section-divider:first-of-type {
            margin-top: 1.5rem;
        }
        .som-section {
            max-width: 1400px;
            margin: 0 auto 1.5rem;
        }
        .som-card {
            max-width: 800px;
            margin: 0 auto;
        }
        .som-description {
            font-size: 0.85rem;
            color: #94a3b8;
            margin-bottom: 1.25rem;
            line-height: 1.6;
        }
        .som-grid {
            display: grid;
            gap: 6px;
            max-width: 700px;
            margin: 0 auto 1.25rem;
        }
        .som-cell {
            aspect-ratio: 1;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 1px solid rgba(148, 163, 184, 0.2);
            cursor: default;
            transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .som-cell:hover {
            transform: scale(1.08);
            box-shadow: 0 0 0 2px rgba(255,255,255,0.15);
            z-index: 1;
        }
        .som-cell-count {
            font-size: 0.85rem;
            font-weight: 600;
            color: #f8fafc;
            text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
        }
        .som-legend {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.75rem;
            font-size: 0.8rem;
            color: #94a3b8;
        }
        .som-legend-gradient {
            width: 140px;
            height: 10px;
            border-radius: 999px;
            background: linear-gradient(to right, rgb(59, 130, 246), rgb(239, 68, 68));
        }
    </style>
</head>
<body>
    <h1>Crystal</h1>
    <p class="subtitle">Relatório gerado em ${summary.generatedAt} · K ótimo: ${summary.bestK}</p>

    <div class="section-divider"><span>Visão Geral</span></div>
    ${buildKpiHtml(kpis)}

    <div class="section-divider"><span>Segmentação K-Means</span></div>
    <div class="summary">
        <div class="summary-item">
            <strong>${summary.totalOrders}</strong>
            <span>Pedidos analisados</span>
        </div>
        <div class="summary-item">
            <strong>${summary.clusterCount}</strong>
            <span>Clusters formados</span>
        </div>
    </div>

    ${buildInsightsHtml(insights)}
    ${buildClusterTableHtml(tableRows)}
    ${buildCentroidTableHtml(tableRows)}

    <div class="grid">
        <div class="card">
            <h2>Método do Cotovelo (WCSS) por K</h2>
            <div class="chart-container">
                <canvas id="elbowChart"></canvas>
            </div>
        </div>
        <div class="card">
            <h2>Valor Total vs Itens por Cluster</h2>
            <div class="chart-container">
                <canvas id="scatterChart"></canvas>
            </div>
        </div>
        <div class="card">
            <h2>Distribuição de Pedidos por Cluster</h2>
            <div class="chart-container">
                <canvas id="doughnutChart"></canvas>
            </div>
        </div>
        <div class="card">
            <h2>Valor Médio por Cluster</h2>
            <div class="chart-container">
                <canvas id="barChart"></canvas>
            </div>
        </div>
        <div class="card" style="grid-column: 1 / -1;">
            <h2>Perfil dos Centroides</h2>
            <div class="chart-container">
                <canvas id="radarChart"></canvas>
            </div>
        </div>
    </div>

    <div class="section-divider"><span>Mapa de Similaridade SOM</span></div>
    <div class="som-section">
        ${somHtml}
    </div>

    <div class="section-divider"><span>Comportamento Operacional</span></div>
    <div class="grid">
        <div class="card">
            <h2>Pedidos por Hora do Dia</h2>
            <div class="chart-container">
                <canvas id="hourChart"></canvas>
            </div>
        </div>
        <div class="card">
            <h2>Pedidos por Dia da Semana</h2>
            <div class="chart-container">
                <canvas id="dayChart"></canvas>
            </div>
        </div>
        <div class="card">
            <h2>Distribuição de Status</h2>
            <div class="chart-container">
                <canvas id="statusChart"></canvas>
            </div>
        </div>
        <div class="card" style="grid-column: 1 / -1;">
            <h2>Top 10 Produtos Mais Vendidos</h2>
            <div class="chart-container tall">
                <canvas id="productsChart"></canvas>
            </div>
        </div>
    </div>

    <div class="section-divider"><span>Diagnóstico de Produtos</span></div>
    ${diagnosticsHtml}

    <script>
        const scatterData = ${JSON.stringify(scatterData)};
        const stats = ${JSON.stringify(stats)};
        const centroidDatasets = ${JSON.stringify(centroidDatasets)};
        const featureLabels = ${JSON.stringify(FEATURE_LABELS_PT)};
        const ordersByHour = ${JSON.stringify(ordersByHour)};
        const ordersByDay = ${JSON.stringify(ordersByDay)};
        const statusDistribution = ${JSON.stringify(statusDistribution)};
        const topProducts = ${JSON.stringify(topProducts)};
        const elbowData = ${JSON.stringify(elbowData)};

        const currencyFormatter = new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
        });

        new Chart(document.getElementById("elbowChart"), {
            type: "line",
            data: {
                labels: elbowData.labels,
                datasets: [{
                    label: "WCSS",
                    data: elbowData.scores,
                    borderColor: "rgb(99, 102, 241)",
                    backgroundColor: "rgba(99, 102, 241, 0.15)",
                    fill: true,
                    tension: 0.3,
                    pointRadius: elbowData.labels.map((_, index) =>
                        index === elbowData.bestKIndex ? 7 : 4
                    ),
                    pointBackgroundColor: elbowData.labels.map((_, index) =>
                        index === elbowData.bestKIndex ? "rgb(251, 146, 60)" : "rgb(99, 102, 241)"
                    ),
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: "#cbd5e1" } },
                    tooltip: {
                        callbacks: {
                            afterLabel(context) {
                                if (context.dataIndex === elbowData.bestKIndex) {
                                    return "K selecionado automaticamente";
                                }
                                return "";
                            },
                        },
                    },
                },
                scales: {
                    x: {
                        ticks: { color: "#94a3b8" },
                        grid: { color: "rgba(148, 163, 184, 0.1)" },
                    },
                    y: {
                        title: { display: true, text: "WCSS", color: "#94a3b8" },
                        ticks: { color: "#94a3b8" },
                        grid: { color: "rgba(148, 163, 184, 0.1)" },
                    },
                },
            },
        });

        new Chart(document.getElementById("statusChart"), {
            type: "doughnut",
            data: {
                labels: statusDistribution.labels,
                datasets: [{
                    data: statusDistribution.data,
                    backgroundColor: statusDistribution.backgroundColors,
                    borderColor: statusDistribution.borderColors,
                    borderWidth: 2,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: "#cbd5e1" } },
                },
            },
        });

        new Chart(document.getElementById("hourChart"), {
            type: "bar",
            data: {
                labels: ordersByHour.labels,
                datasets: [{
                    label: "Pedidos",
                    data: ordersByHour.data,
                    backgroundColor: "rgba(14, 165, 233, 0.7)",
                    borderColor: "rgb(14, 165, 233)",
                    borderWidth: 1,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: "#cbd5e1" } },
                },
                scales: {
                    x: {
                        title: { display: true, text: "Hora", color: "#94a3b8" },
                        ticks: { color: "#94a3b8", maxRotation: 0 },
                        grid: { color: "rgba(148, 163, 184, 0.1)" },
                    },
                    y: {
                        title: { display: true, text: "Quantidade", color: "#94a3b8" },
                        ticks: { color: "#94a3b8", stepSize: 1 },
                        grid: { color: "rgba(148, 163, 184, 0.1)" },
                    },
                },
            },
        });

        new Chart(document.getElementById("dayChart"), {
            type: "bar",
            data: {
                labels: ordersByDay.labels,
                datasets: [{
                    label: "Pedidos",
                    data: ordersByDay.data,
                    backgroundColor: "rgba(34, 197, 94, 0.7)",
                    borderColor: "rgb(34, 197, 94)",
                    borderWidth: 1,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: "#cbd5e1" } },
                },
                scales: {
                    x: {
                        ticks: { color: "#94a3b8" },
                        grid: { color: "rgba(148, 163, 184, 0.1)" },
                    },
                    y: {
                        title: { display: true, text: "Quantidade", color: "#94a3b8" },
                        ticks: { color: "#94a3b8", stepSize: 1 },
                        grid: { color: "rgba(148, 163, 184, 0.1)" },
                    },
                },
            },
        });

        new Chart(document.getElementById("scatterChart"), {
            type: "scatter",
            data: { datasets: scatterData },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: "#cbd5e1" } },
                    tooltip: {
                        callbacks: {
                            label(context) {
                                const point = context.raw;
                                const lines = [
                                    context.dataset.label,
                                    "Valor: " + currencyFormatter.format(point.x),
                                    "Itens: " + point.y,
                                    "Pedido: " + (point.orderId || "-"),
                                    "Cliente: " + (point.clientName || "-"),
                                ];

                                if (point.products && point.products.length > 0) {
                                    point.products.forEach((name) => lines.push("· " + name));
                                }

                                return lines;
                            },
                        },
                    },
                },
                scales: {
                    x: {
                        title: { display: true, text: "Valor Total (R$)", color: "#94a3b8" },
                        ticks: {
                            color: "#94a3b8",
                            callback(value) {
                                return currencyFormatter.format(value);
                            },
                        },
                        grid: { color: "rgba(148, 163, 184, 0.1)" },
                    },
                    y: {
                        title: { display: true, text: "Total de Itens", color: "#94a3b8" },
                        ticks: { color: "#94a3b8" },
                        grid: { color: "rgba(148, 163, 184, 0.1)" },
                    },
                },
            },
        });

        new Chart(document.getElementById("doughnutChart"), {
            type: "doughnut",
            data: {
                labels: stats.labels,
                datasets: [{
                    data: stats.counts,
                    backgroundColor: stats.backgroundColors,
                    borderColor: stats.borderColors,
                    borderWidth: 2,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: "#cbd5e1" } },
                },
            },
        });

        new Chart(document.getElementById("barChart"), {
            type: "bar",
            data: {
                labels: stats.labels,
                datasets: [
                    {
                        label: "Valor Médio (R$)",
                        data: stats.avgValues,
                        backgroundColor: stats.backgroundColors,
                        borderColor: stats.borderColors,
                        borderWidth: 2,
                        order: 2,
                    },
                    {
                        label: "Média geral (R$)",
                        data: stats.labels.map(() => stats.overallAvgValue),
                        type: "line",
                        borderColor: "rgb(251, 146, 60)",
                        backgroundColor: "rgba(251, 146, 60, 0.1)",
                        borderWidth: 2,
                        borderDash: [6, 4],
                        pointRadius: 0,
                        fill: false,
                        order: 1,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: "#cbd5e1" } },
                },
                scales: {
                    x: {
                        ticks: { color: "#94a3b8" },
                        grid: { color: "rgba(148, 163, 184, 0.1)" },
                    },
                    y: {
                        title: { display: true, text: "Valor Médio (R$)", color: "#94a3b8" },
                        ticks: {
                            color: "#94a3b8",
                            callback(value) {
                                return currencyFormatter.format(value);
                            },
                        },
                        grid: { color: "rgba(148, 163, 184, 0.1)" },
                    },
                },
            },
        });

        new Chart(document.getElementById("radarChart"), {
            type: "radar",
            data: {
                labels: featureLabels,
                datasets: centroidDatasets,
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: "#cbd5e1" } },
                },
                scales: {
                    r: {
                        min: 0,
                        max: 1,
                        ticks: { color: "#94a3b8", backdropColor: "transparent" },
                        grid: { color: "rgba(148, 163, 184, 0.2)" },
                        pointLabels: { color: "#cbd5e1", font: { size: 10 } },
                    },
                },
            },
        });

        new Chart(document.getElementById("productsChart"), {
            type: "bar",
            data: {
                labels: topProducts.labels,
                datasets: [{
                    label: "Quantidade vendida",
                    data: topProducts.data,
                    backgroundColor: "rgba(168, 85, 247, 0.7)",
                    borderColor: "rgb(168, 85, 247)",
                    borderWidth: 1,
                }],
            },
            options: {
                indexAxis: "y",
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: "#cbd5e1" } },
                },
                scales: {
                    x: {
                        title: { display: true, text: "Quantidade", color: "#94a3b8" },
                        ticks: { color: "#94a3b8", stepSize: 1 },
                        grid: { color: "rgba(148, 163, 184, 0.1)" },
                    },
                    y: {
                        ticks: { color: "#94a3b8", autoSkip: false },
                        grid: { color: "rgba(148, 163, 184, 0.1)" },
                    },
                },
            },
        });
    </script>
</body>
</html>`;
}

function openReport(filePath) {
    const command =
        process.platform === "win32"
            ? `start "" "${filePath}"`
            : process.platform === "darwin"
              ? `open "${filePath}"`
              : `xdg-open "${filePath}"`;

    exec(command, (error) => {
        if (error) {
            console.warn("Não foi possível abrir o relatório automaticamente:", error.message);
        }
    });
}

function generateReport({ orders, rawList, result, elbowAnalysis, bestK, somResult }) {
    const groups = groupOrdersByCluster(orders, result.clusters);
    const overallAvgValue =
        orders.reduce((acc, order) => acc + order.totalValue, 0) / (orders.length || 1);

    const kpis = buildKpis(rawList, orders);
    const ordersByHour = buildOrdersByHour(orders);
    const ordersByDay = buildOrdersByDayOfWeek(orders);
    const statusDistribution = buildStatusDistribution(rawList);
    const topProducts = buildTopProducts(rawList);
    const elbowData = buildElbowData(elbowAnalysis, bestK);
    const scatterData = buildScatterData(groups, overallAvgValue);
    const stats = buildClusterStats(groups, overallAvgValue);
    const centroidDatasets = buildCentroidDatasets(result.centroids, groups, overallAvgValue);
    const tableRows = buildClusterTable(groups, orders.length, result.centroids, overallAvgValue);
    const insights = buildClusterInsights(tableRows, overallAvgValue);
    const summary = buildSummary(orders.length, Object.keys(groups).length, bestK);
    const { diagnosis, risks, strategies } = buildDiagnostics(rawList);
    const diagnosticsHtml = buildDiagnosticsHtml({ diagnosis, risks, strategies });

    const somHeatmapData = buildSomHeatmapData(
        somResult.predictions,
        orders,
        somResult.gridX,
        somResult.gridY
    );
    const somHtml = buildSomHtml(somHeatmapData);

    const outputDir = path.join(__dirname, "output");
    fs.mkdirSync(outputDir, { recursive: true });

    const reportPath = path.join(outputDir, "report.html");
    const html = buildHtml({
        scatterData,
        stats,
        centroidDatasets,
        summary,
        tableRows,
        kpis,
        ordersByHour,
        ordersByDay,
        statusDistribution,
        topProducts,
        elbowData,
        insights,
        diagnosticsHtml,
        somHtml,
    });

    fs.writeFileSync(reportPath, html, "utf-8");

    console.log("\nDiagnóstico estratégico:");
    console.log(
        JSON.stringify({ diagnosis, identifiedRisks: risks, strategies }, null, 2)
    );

    console.log(`\nRelatório gerado em: ${reportPath}`);
    openReport(reportPath);
}

module.exports = { generateReport };
