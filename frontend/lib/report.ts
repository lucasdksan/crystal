import type {
  BCGQuadrantUI,
  CatalogHealthProductUI,
  DashboardData,
} from "@/frontend/types/dashboard";
import { computeABCCurve } from "@/frontend/lib/abc-curve";
import { buildFunnelStages } from "@/frontend/lib/funnel";

const LIMITS = {
  churnClients: 5,
  clvClients: 5,
  opportunities: 3,
  insights: 4,
  strategies: 3,
  strategyActions: 2,
  cohortMonths: 6,
  catalogProducts: 8,
  operationalProducts: 5,
} as const;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getAnomalyRecommendation(score: number, action: string): string {
  if (score >= 75) return action || "Descontinuar";
  if (score >= 50) return action || "Investigar";
  if (score >= 25) return action || "Monitorar";
  return action || "Manter";
}

function fmt(value: number, decimals = 2) {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtCurrency(value: number) {
  return `R$ ${fmt(value)}`;
}

export function gravityColor(g: string) {
  if (g === "Alto") return "#dc2626";
  if (g === "Médio") return "#d97706";
  return "#059669";
}

const BCG_LABELS: Record<BCGQuadrantUI, string> = {
  star: "Estrelas",
  cash_cow: "Vacas Leiteiras",
  question: "Interrogações",
  dog: "Abacaxis",
};

const RISK_LABELS = {
  baixo: "Baixo Risco",
  medio: "Médio Risco",
  alto: "Alto Risco",
  critico: "Crítico",
};

const PRIORITY_LABELS = {
  alta: "Alta Prioridade",
  media: "Média Prioridade",
  baixa: "Baixa Prioridade",
};

function emptyRow(colspan: number, message: string) {
  return `<tr><td colspan="${colspan}" style="padding:12px;text-align:center;color:#94a3b8">${escapeHtml(message)}</td></tr>`;
}

function section(id: string, title: string, content: string) {
  return `<div class="section" id="${id}"><h2>${escapeHtml(title)}</h2>${content}</div>`;
}

function formatCohortMonth(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
}

function truncateList<T>(items: T[], limit: number) {
  return {
    items: items.slice(0, limit),
    omitted: Math.max(0, items.length - limit),
  };
}

function omittedNote(count: number) {
  if (count <= 0) return "";
  return `<p class="footnote">+ ${count} não exibido(s) neste resumo.</p>`;
}

function buildExecutiveSection(data: DashboardData): string {
  const netRevenue =
    data.overview.receitaTotal * (1 - data.overview.taxaCancelamento / 100);
  const stuckInventory =
    data.overview.receitaTotal * (data.overview.taxaCancelamento / 100);
  const summary = data.customerIntelligenceSummary;
  const atRiskClients = data.churnScores.filter(
    (c) => c.riskLevel === "critico" || c.riskLevel === "alto",
  ).length;

  const content = `
    <div class="kpi-grid">
      <div class="kpi">
        <div class="label">Faturamento Bruto</div>
        <div class="value">${fmtCurrency(data.overview.receitaTotal)}</div>
        <div class="sub">${data.overview.totalPedidos} pedidos · ${data.overview.totalClientes} clientes</div>
      </div>
      <div class="kpi green">
        <div class="label">Receita Líquida</div>
        <div class="value">${fmtCurrency(netRevenue)}</div>
        <div class="sub">Após cancelamentos</div>
      </div>
      <div class="kpi red">
        <div class="label">Cancelamentos</div>
        <div class="value">${data.overview.taxaCancelamento.toFixed(1)}%</div>
        <div class="sub">${fmtCurrency(stuckInventory)} travados</div>
      </div>
      <div class="kpi">
        <div class="label">Ticket Médio</div>
        <div class="value">${fmtCurrency(data.overview.ticketMedio)}</div>
        <div class="sub">Por pedido</div>
      </div>
      <div class="kpi red">
        <div class="label">Clientes em Risco</div>
        <div class="value">${atRiskClients}</div>
        <div class="sub">${fmtCurrency(summary.revenueAtRisk)} em risco</div>
      </div>
      <div class="kpi green">
        <div class="label">Oportunidade</div>
        <div class="value">${fmtCurrency(summary.recoverableRevenue + summary.incrementalRevenue)}</div>
        <div class="sub">Recuperável + incremental</div>
      </div>
    </div>
    ${
      data.diagnostics.summary
        ? `<div class="summary-box"><strong>Diagnóstico:</strong> ${escapeHtml(data.diagnostics.summary)}</div>`
        : ""
    }
    ${
      data.diagnostics.championProduct || data.diagnostics.bottleneckProduct
        ? `<div class="meta-row" style="margin-top:10px">
            ${data.diagnostics.championProduct ? `<span><strong>Destaque:</strong> ${escapeHtml(data.diagnostics.championProduct)}</span>` : ""}
            ${data.diagnostics.bottleneckProduct ? `<span><strong>Atenção:</strong> ${escapeHtml(data.diagnostics.bottleneckProduct)}</span>` : ""}
          </div>`
        : ""
    }`;

  return section("resumo", "Resumo Executivo", content);
}

function buildFunnelSection(data: DashboardData): string {
  const stages = buildFunnelStages(data);

  if (stages.length === 0) {
    return section(
      "funil",
      "Funil de Conversão",
      `<p class="empty-msg">Sem pedidos no período.</p>`,
    );
  }

  const rows = stages
    .map(
      (stage) => `
    <tr>
      <td>${escapeHtml(stage.label)}</td>
      <td class="center">${stage.count}</td>
      <td class="right">${stage.rate.toFixed(1)}%</td>
    </tr>`,
    )
    .join("");

  return section(
    "funil",
    "Funil de Conversão",
    `<table>
      <thead>
        <tr>
          <th>Etapa</th>
          <th class="center">Pedidos</th>
          <th class="right">Taxa</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`,
  );
}

function buildSegmentationSection(data: DashboardData): string {
  const { items, omitted } = truncateList(data.customerSegments, 6);
  const rows =
    items.length === 0
      ? emptyRow(5, "Sem segmentos no período.")
      : items
          .map(
            (segment) => `
    <tr>
      <td style="font-weight:600">${escapeHtml(segment.name)}</td>
      <td class="center">${segment.customerCount}</td>
      <td class="center">${segment.customerShare}%</td>
      <td class="center">${segment.revenueShare}%</td>
      <td class="right">${fmtCurrency(segment.averageTicket)}</td>
    </tr>`,
          )
          .join("");

  return section(
    "segmentacao",
    "Segmentação de Clientes",
    `<table>
      <thead>
        <tr>
          <th>Segmento</th>
          <th class="center">Clientes</th>
          <th class="center">% Base</th>
          <th class="center">% Receita</th>
          <th class="right">Ticket Médio</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    ${omittedNote(omitted)}`,
  );
}

function buildClustersSection(data: DashboardData): string {
  const { items: clusters, omitted: omittedClusters } = truncateList(
    data.clusters,
    6,
  );
  const clusterRows =
    clusters.length === 0
      ? emptyRow(4, "Sem grupos identificados.")
      : clusters
          .map(
            (c) => `
    <tr>
      <td style="font-weight:600">${escapeHtml(c.name.replace(`Cluster ${c.id} - `, ""))}</td>
      <td class="center">${c.count}</td>
      <td class="center" style="color:${c.cancelRate > 30 ? "#dc2626" : "#059669"};font-weight:700">${c.cancelRate.toFixed(1)}%</td>
      <td class="center">${c.revenueShare.toFixed(1)}%</td>
    </tr>`,
          )
          .join("");

  const { items: risks, omitted: omittedRisks } = truncateList(
    data.diagnostics.risks.filter((r) => r.gravity === "Alto"),
    5,
  );
  const riskRows =
    risks.length === 0
      ? emptyRow(2, "Nenhum risco crítico identificado.")
      : risks
          .map(
            (r) => `
    <tr>
      <td>${escapeHtml(r.product)}</td>
      <td>${escapeHtml(r.type)}</td>
    </tr>`,
          )
          .join("");

  return section(
    "clusters",
    "Grupos de Pedidos",
    `<table>
      <thead>
        <tr>
          <th>Grupo</th>
          <th class="center">Pedidos</th>
          <th class="center">Cancelamento</th>
          <th class="center">% Receita</th>
        </tr>
      </thead>
      <tbody>${clusterRows}</tbody>
    </table>
    ${omittedNote(omittedClusters)}
    <h3 class="subsection">Principais Riscos</h3>
    <table>
      <thead>
        <tr>
          <th>Produto</th>
          <th>Tipo</th>
        </tr>
      </thead>
      <tbody>${riskRows}</tbody>
    </table>
    ${omittedNote(omittedRisks)}`,
  );
}

function buildChurnSection(data: DashboardData): string {
  const grouped = {
    critico: data.churnScores.filter((c) => c.riskLevel === "critico"),
    alto: data.churnScores.filter((c) => c.riskLevel === "alto"),
    medio: data.churnScores.filter((c) => c.riskLevel === "medio"),
    baixo: data.churnScores.filter((c) => c.riskLevel === "baixo"),
  };
  const totalAtRisk = grouped.critico.length + grouped.alto.length;

  const sortedChurn = [...data.churnScores].sort((a, b) => b.score - a.score);
  const { items: churnItems, omitted: omittedChurn } = truncateList(
    sortedChurn,
    LIMITS.churnClients,
  );

  const churnRows =
    churnItems.length === 0
      ? emptyRow(4, "Sem scores de churn no período.")
      : churnItems
          .map(
            (score) => `
    <tr>
      <td style="font-weight:600">${escapeHtml(score.customerName)}</td>
      <td class="center">${score.score}</td>
      <td>${escapeHtml(RISK_LABELS[score.riskLevel])}</td>
      <td class="center">${score.daysSinceLastPurchase}d</td>
    </tr>`,
          )
          .join("");

  const maxRetentionMonths = Math.min(
    LIMITS.cohortMonths,
    data.cohortMatrix.reduce(
      (max, row) => Math.max(max, row.retention.length),
      0,
    ),
  );

  let cohortBlock = "";
  if (data.cohortMatrix.length > 0 && maxRetentionMonths > 0) {
    const cohortHeader = Array.from(
      { length: maxRetentionMonths },
      (_, i) => `<th class="center">M${i}</th>`,
    ).join("");
    const cohortRows = data.cohortMatrix
      .slice(0, 5)
      .map((row) => {
        const cells = Array.from({ length: maxRetentionMonths }, (_, i) => {
          const pct = row.retention[i];
          if (pct === undefined) {
            return `<td class="center muted">—</td>`;
          }
          return `<td class="center">${pct.toFixed(0)}%</td>`;
        }).join("");
        return `
    <tr${row.highChurnAlert ? ' class="alert-row"' : ""}>
      <td style="font-weight:600">${escapeHtml(formatCohortMonth(row.cohortMonth))}</td>
      <td class="center">${row.cohortSize}</td>
      ${cells}
    </tr>`;
      })
      .join("");

    cohortBlock = `
    <h3 class="subsection">Retenção por Coorte (últimos ${maxRetentionMonths} meses)</h3>
    <table class="compact">
      <thead>
        <tr>
          <th>Coorte</th>
          <th class="center">N</th>
          ${cohortHeader}
        </tr>
      </thead>
      <tbody>${cohortRows}</tbody>
    </table>`;
  }

  return section(
    "churn",
    "Churn Risk",
    `<div class="kpi-grid kpi-grid-3">
      <div class="kpi red"><div class="label">Em Risco</div><div class="value">${totalAtRisk}</div><div class="sub">Crítico + alto</div></div>
      <div class="kpi red"><div class="label">Receita em Risco</div><div class="value">${fmtCurrency(data.customerIntelligenceSummary.revenueAtRisk)}</div></div>
      <div class="kpi"><div class="label">Críticos</div><div class="value">${grouped.critico.length}</div><div class="sub">de ${data.churnScores.length} clientes</div></div>
    </div>
    <h3 class="subsection">Top ${LIMITS.churnClients} Clientes para Retenção</h3>
    <table>
      <thead>
        <tr>
          <th>Cliente</th>
          <th class="center">Score</th>
          <th>Risco</th>
          <th class="center">Dias s/ compra</th>
        </tr>
      </thead>
      <tbody>${churnRows}</tbody>
    </table>
    ${omittedNote(omittedChurn)}
    ${cohortBlock}`,
  );
}

function buildClvSection(data: DashboardData): string {
  const highPotential = data.clvEstimates.filter(
    (c) => c.predictedRevenue6m > c.currentRevenue * 0.5,
  );
  const sortedClv = [...data.clvEstimates].sort(
    (a, b) => b.estimatedLifetimeValue - a.estimatedLifetimeValue,
  );
  const { items: clvItems, omitted } = truncateList(
    sortedClv,
    LIMITS.clvClients,
  );

  const clvRows =
    clvItems.length === 0
      ? emptyRow(4, "Sem estimativas de CLV no período.")
      : clvItems
          .map(
            (client) => `
    <tr>
      <td style="font-weight:600">${escapeHtml(client.customerName)}</td>
      <td>${escapeHtml(client.segmentName)}</td>
      <td class="right">${fmtCurrency(client.currentRevenue)}</td>
      <td class="right" style="font-weight:700;color:#4f46e5">${fmtCurrency(client.estimatedLifetimeValue)}</td>
    </tr>`,
          )
          .join("");

  return section(
    "clv",
    "Customer Lifetime Value (CLV)",
    `<div class="kpi-grid kpi-grid-3">
      <div class="kpi"><div class="label">CLV Total</div><div class="value">${fmtCurrency(data.customerIntelligenceSummary.totalClv)}</div></div>
      <div class="kpi"><div class="label">Analisados</div><div class="value">${data.clvEstimates.length}</div></div>
      <div class="kpi green"><div class="label">Alto Potencial</div><div class="value">${highPotential.length}</div></div>
    </div>
    <table>
      <thead>
        <tr>
          <th>Cliente</th>
          <th>Segmento</th>
          <th class="right">Receita Atual</th>
          <th class="right">LTV</th>
        </tr>
      </thead>
      <tbody>${clvRows}</tbody>
    </table>
    ${omittedNote(omitted)}`,
  );
}

function buildInsightsSection(data: DashboardData): string {
  const { items: opportunities, omitted: omittedOpps } = truncateList(
    data.revenueOpportunities,
    LIMITS.opportunities,
  );
  const opportunityCards =
    opportunities.length === 0
      ? `<p class="empty-msg">Nenhuma oportunidade identificada.</p>`
      : `<div class="card-list">${opportunities
          .map(
            (opp) => `
        <div class="card">
          <div class="card-title">${escapeHtml(opp.title)}</div>
          <p>${escapeHtml(opp.description)}</p>
          <div class="meta-row">
            <span>${opp.customerCount} cliente(s)</span>
            <span class="highlight">${fmtCurrency(opp.estimatedValue)}</span>
          </div>
        </div>`,
          )
          .join("")}</div>${omittedNote(omittedOpps)}`;

  const { items: insights, omitted: omittedInsights } = truncateList(
    data.executiveInsights,
    LIMITS.insights,
  );
  const insightCards =
    insights.length === 0
      ? `<p class="empty-msg">Nenhum insight gerado.</p>`
      : `<div class="card-list">${insights
          .map(
            (insight) => `
        <div class="card">
          <div class="card-sub">${escapeHtml(PRIORITY_LABELS[insight.priority])} · ${escapeHtml(insight.category)}</div>
          <p>${escapeHtml(insight.text)}</p>
          ${insight.financialImpact > 0 ? `<div class="meta-row"><span>Impacto</span><span class="highlight">${fmtCurrency(insight.financialImpact)}</span></div>` : ""}
        </div>`,
          )
          .join("")}</div>${omittedNote(omittedInsights)}`;

  const { items: strategies, omitted: omittedStrategies } = truncateList(
    data.diagnostics.allStrategies,
    LIMITS.strategies,
  );
  const strategyCards =
    strategies.length === 0
      ? `<p class="empty-msg">Nenhuma estratégia gerada.</p>`
      : `<div class="card-list">${strategies
          .map((s) => {
            const actions = s.actions.slice(0, LIMITS.strategyActions);
            return `
        <div class="card">
          <div class="meta-row">
            <span class="badge">${escapeHtml(s.type.replace(/_/g, " "))}</span>
            <span>Prioridade ${s.priorityScore.toFixed(2)}</span>
          </div>
          <div class="card-title">${escapeHtml(s.label)}</div>
          ${s.justifications[0] ? `<p>${escapeHtml(s.justifications[0])}</p>` : ""}
          ${actions.length > 0 ? `<ul>${actions.map((a) => `<li><strong>${escapeHtml(a.label)}:</strong> ${escapeHtml(a.description)}</li>`).join("")}</ul>` : ""}
        </div>`;
          })
          .join("")}</div>${omittedNote(omittedStrategies)}`;

  return section(
    "insights",
    "Insights e Ações",
    `<h3 class="subsection">Oportunidades</h3>
    ${opportunityCards}
    <h3 class="subsection">Insights</h3>
    ${insightCards}
    <h3 class="subsection">Estratégias Prioritárias</h3>
    ${strategyCards}`,
  );
}

function buildProductsSection(data: DashboardData): string {
  const abcProducts = computeABCCurve(data.bcgMatrix.products);
  const curveCounts = {
    A: abcProducts.filter((p) => p.curve === "A").length,
    B: abcProducts.filter((p) => p.curve === "B").length,
    C: abcProducts.filter((p) => p.curve === "C").length,
  };

  const abcRows =
    abcProducts.length === 0
      ? emptyRow(4, "Sem produtos para curva ABC.")
      : abcProducts
          .map(
            (product) => `
    <tr>
      <td style="font-weight:600">${escapeHtml(product.productName)}</td>
      <td class="center"><span class="badge">${product.curve}</span></td>
      <td class="right">${fmtCurrency(product.revenue)}</td>
      <td class="right">${product.revenueShare.toFixed(1)}%</td>
    </tr>`,
          )
          .join("");

  const anomalies = data.productAnomalies ?? [];
  const { items: anomalyItems, omitted: omittedAnomalies } = truncateList(
    [...anomalies].sort((a, b) => b.anomalyScore - a.anomalyScore),
    5,
  );
  const anomalyRows =
    anomalyItems.length === 0
      ? emptyRow(4, "Nenhuma anomalia identificada.")
      : anomalyItems
          .map(
            (product) => `
    <tr>
      <td style="font-weight:600">${escapeHtml(product.name)}</td>
      <td class="center" style="font-weight:700;color:${product.anomalyScore >= 75 ? "#dc2626" : product.anomalyScore >= 50 ? "#d97706" : "#64748b"}">${product.anomalyScore.toFixed(0)}</td>
      <td class="center">${(product.cancellationRate * 100).toFixed(0)}%</td>
      <td>${escapeHtml(getAnomalyRecommendation(product.anomalyScore, product.action))}</td>
    </tr>`,
          )
          .join("");

  const topDiagnostic = data.productIntelligence.diagnostics[0];
  const diagnosticNote = topDiagnostic
    ? `<p class="section-desc">${escapeHtml(topDiagnostic.message)}</p>`
    : "";

  return section(
    "produtos",
    "Inteligência de Produtos",
    `<div class="kpi-grid kpi-grid-3">
      <div class="kpi"><div class="label">Produtos</div><div class="value">${data.productIntelligence.totalProducts}</div></div>
      <div class="kpi"><div class="label">Curva A</div><div class="value">${curveCounts.A}</div><div class="sub">B: ${curveCounts.B} · C: ${curveCounts.C}</div></div>
      <div class="kpi"><div class="label">Clusters</div><div class="value">${data.productIntelligence.clusters.length}</div></div>
    </div>
    ${diagnosticNote}
    <h3 class="subsection">Curva ABC</h3>
    <table>
      <thead>
        <tr>
          <th>Produto</th>
          <th class="center">Curva</th>
          <th class="right">Receita</th>
          <th class="right">Share</th>
        </tr>
      </thead>
      <tbody>${abcRows}</tbody>
    </table>
    <h3 class="subsection">Anomalias Críticas</h3>
    <table>
      <thead>
        <tr>
          <th>Produto</th>
          <th class="center">Score</th>
          <th class="center">Cancel.</th>
          <th>Ação</th>
        </tr>
      </thead>
      <tbody>${anomalyRows}</tbody>
    </table>
    ${omittedNote(omittedAnomalies)}`,
  );
}

function buildBcgSection(data: DashboardData): string {
  const { bcgMatrix } = data;
  const quadrantSummary = (Object.keys(BCG_LABELS) as BCGQuadrantUI[])
    .map(
      (q) =>
        `${BCG_LABELS[q]}: ${bcgMatrix.quadrantCounts[q]}`,
    )
    .join(" · ");

  const productRows =
    bcgMatrix.products.length === 0
      ? emptyRow(3, "Sem produtos para matriz BCG.")
      : bcgMatrix.products
          .map(
            (product) => `
    <tr>
      <td style="font-weight:600">${escapeHtml(product.productName)}</td>
      <td>${escapeHtml(BCG_LABELS[product.quadrant])}</td>
      <td class="right">${product.revenueShare.toFixed(1)}%</td>
    </tr>`,
          )
          .join("");

  return section(
    "bcg",
    "Matriz BCG",
    `<p class="section-desc">${escapeHtml(quadrantSummary)}</p>
    <table>
      <thead>
        <tr>
          <th>Produto</th>
          <th>Quadrante</th>
          <th class="right">Share</th>
        </tr>
      </thead>
      <tbody>${productRows}</tbody>
    </table>`,
  );
}

function renderCatalogProductList(
  title: string,
  products: CatalogHealthProductUI[],
  renderMeta?: (product: CatalogHealthProductUI) => string,
) {
  if (products.length === 0) return "";
  const { items, omitted } = truncateList(products, LIMITS.catalogProducts);
  const rows = items
    .map(
      (product) => `
      <tr>
        <td>${escapeHtml(product.productName)}</td>
        <td class="right">${
          renderMeta
            ? escapeHtml(renderMeta(product))
            : `${product.totalOrders} ped. · ${fmtCurrency(product.revenue)}`
        }</td>
      </tr>`,
    )
    .join("");

  return `
    <h3 class="subsection">${escapeHtml(title)} (${products.length})</h3>
    <table>
      <thead><tr><th>Produto</th><th class="right">Detalhes</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    ${omittedNote(omitted)}`;
}

function buildCatalogSection(data: DashboardData): string {
  const { catalogHealth } = data;
  const { summary } = catalogHealth;

  const lists = [
    renderCatalogProductList(
      "Sem venda 90 dias",
      catalogHealth.noSale90Days,
      (p) => `${p.daysSinceLastSale ?? "—"} dias`,
    ),
    renderCatalogProductList("Pareto 80%", catalogHealth.paretoProducts),
    renderCatalogProductList(
      "Em queda",
      catalogHealth.decliningProducts,
      (p) => `${(p.growthRate ?? 0).toFixed(0)}%`,
    ),
    renderCatalogProductList(
      "Em crescimento",
      catalogHealth.growingProducts,
      (p) => `+${(p.growthRate ?? 0).toFixed(0)}%`,
    ),
  ].join("");

  return section(
    "catalogo",
    "Saúde do Catálogo",
    `<div class="kpi-grid kpi-grid-3">
      <div class="kpi"><div class="label">Total</div><div class="value">${summary.totalProducts}</div></div>
      <div class="kpi"><div class="label">Pareto 80%</div><div class="value">${summary.paretoCount}</div><div class="sub">${summary.paretoRevenueShare.toFixed(0)}% receita</div></div>
      <div class="kpi red"><div class="label">Sem venda 90d</div><div class="value">${summary.noSale90Count}</div></div>
    </div>
    ${lists || `<p class="empty-msg">Catálogo saudável — nenhum alerta relevante.</p>`}`,
  );
}

function buildOperationalSection(data: DashboardData): string {
  const statusRows =
    data.statuses.length === 0
      ? emptyRow(2, "Sem distribuição de status.")
      : data.statuses
          .map(
            (status) => `
    <tr>
      <td>${escapeHtml(status.name)}</td>
      <td class="center">${status.count}</td>
    </tr>`,
          )
          .join("");

  const { items: products, omitted: omittedProducts } = truncateList(
    data.products,
    LIMITS.operationalProducts,
  );
  const productRows =
    products.length === 0
      ? emptyRow(3, "Sem ranking de produtos.")
      : products
          .map(
            (product) => `
    <tr>
      <td style="font-weight:600">${escapeHtml(product.name)}</td>
      <td class="center">${product.quantity}</td>
      <td class="right">${fmtCurrency(product.revenue)}</td>
    </tr>`,
          )
          .join("");

  const peakHours = data.operationalHours
    .filter((h) => h.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const hourRows =
    peakHours.length === 0
      ? emptyRow(2, "Sem horários de pico.")
      : peakHours
          .map(
            (hour) => `
    <tr>
      <td>${escapeHtml(hour.hour)}</td>
      <td class="center">${hour.count}</td>
    </tr>`,
          )
          .join("");

  const peakDays = [...data.operationalDays]
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);
  const dayRows =
    peakDays.length === 0
      ? emptyRow(2, "Sem dados de dias.")
      : peakDays
          .map(
            (day) => `
    <tr>
      <td>${escapeHtml(day.day)}</td>
      <td class="center">${day.count}</td>
    </tr>`,
          )
          .join("");

  return section(
    "operacional",
    "Resumo Operacional",
    `<div class="two-col">
      <div>
        <h3 class="subsection">Status dos Pedidos</h3>
        <table>
          <thead><tr><th>Status</th><th class="center">Qtd</th></tr></thead>
          <tbody>${statusRows}</tbody>
        </table>
      </div>
      <div>
        <h3 class="subsection">Horários de Pico</h3>
        <table>
          <thead><tr><th>Hora</th><th class="center">Pedidos</th></tr></thead>
          <tbody>${hourRows}</tbody>
        </table>
        <h3 class="subsection">Dias Mais Movimentados</h3>
        <table>
          <thead><tr><th>Dia</th><th class="center">Pedidos</th></tr></thead>
          <tbody>${dayRows}</tbody>
        </table>
      </div>
    </div>
    <h3 class="subsection">Top Produtos</h3>
    <table>
      <thead><tr><th>Produto</th><th class="center">Qtd</th><th class="right">Receita</th></tr></thead>
      <tbody>${productRows}</tbody>
    </table>
    ${omittedNote(omittedProducts)}`,
  );
}

export function buildHtmlReport(data: DashboardData): string {
  const generatedAt = new Date().toLocaleString("pt-BR");
  const cancelColor =
    data.overview.taxaCancelamento > 50
      ? "#f87171"
      : data.overview.taxaCancelamento > 15
        ? "#fbbf24"
        : "#34d399";

  const sections = [
    buildExecutiveSection(data),
    buildFunnelSection(data),
    buildSegmentationSection(data),
    buildClustersSection(data),
    buildChurnSection(data),
    buildClvSection(data),
    buildInsightsSection(data),
    buildProductsSection(data),
    buildBcgSection(data),
    buildCatalogSection(data),
    buildOperationalSection(data),
  ].join("");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Relatório Crystal — ${escapeHtml(data.reportId)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; color: #1e293b; font-size: 13px; line-height: 1.45; }
    .page { max-width: 800px; margin: 0 auto; padding: 24px 20px; }
    .header { background: #1e293b; color: white; border-radius: 12px; padding: 20px 24px; margin-bottom: 20px; }
    .header h1 { font-size: 18px; font-weight: 800; margin-bottom: 4px; }
    .header .meta { color: #94a3b8; font-size: 11px; }
    .section { background: white; border-radius: 12px; border: 1px solid #e2e8f0; padding: 16px 18px; margin-bottom: 16px; }
    .section h2 { font-size: 14px; font-weight: 700; margin-bottom: 12px; color: #1e293b; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
    .subsection { font-size: 12px; font-weight: 700; margin: 14px 0 8px; color: #334155; }
    .section-desc, .empty-msg, .footnote { color: #64748b; font-size: 11px; margin: 6px 0; }
    .footnote { font-style: italic; }
    .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 10px; }
    .kpi-grid-3 { grid-template-columns: repeat(3, 1fr); }
    .kpi { background: #f8fafc; border-radius: 8px; padding: 10px 12px; border: 1px solid #e2e8f0; }
    .kpi .label { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 2px; }
    .kpi .value { font-size: 16px; font-weight: 800; color: #1e293b; }
    .kpi .sub { font-size: 10px; color: #94a3b8; margin-top: 2px; }
    .kpi.red .value { color: #dc2626; }
    .kpi.green .value { color: #059669; }
    .summary-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 10px 12px; color: #166534; font-size: 12px; line-height: 1.5; margin-top: 10px; }
    .meta-row { display: flex; justify-content: space-between; gap: 8px; flex-wrap: wrap; font-size: 11px; color: #64748b; }
    .highlight { font-weight: 700; color: #059669; }
    .card-list { display: flex; flex-direction: column; gap: 8px; }
    .card { background: #f8fafc; border-radius: 8px; padding: 10px 12px; border: 1px solid #e2e8f0; }
    .card-title { font-weight: 700; font-size: 12px; margin-bottom: 2px; }
    .card-sub { font-size: 10px; color: #64748b; margin-bottom: 4px; text-transform: uppercase; }
    .badge { font-size: 10px; font-weight: 700; color: #4f46e5; background: #eef2ff; padding: 1px 5px; border-radius: 3px; }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 6px; table-layout: fixed; }
    table.compact th, table.compact td { padding: 4px 6px; font-size: 10px; }
    thead tr { background: #f8fafc; }
    th { padding: 6px 8px; text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b; border-bottom: 1px solid #e2e8f0; }
    td { padding: 6px 8px; border-bottom: 1px solid #f1f5f9; font-size: 11px; word-wrap: break-word; overflow-wrap: break-word; }
    th.right, td.right { text-align: right; }
    th.center, td.center { text-align: center; }
    td.muted { color: #94a3b8; }
    tr.alert-row { background: #fff1f2; }
    ul { margin-top: 4px; padding-left: 16px; color: #475569; font-size: 11px; line-height: 1.5; }
    .footer { text-align: center; color: #94a3b8; font-size: 10px; padding: 16px 0 0; }
    @media print {
      @page { size: A4; margin: 12mm; }
      body { background: white; font-size: 11px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .page { padding: 0; max-width: none; }
      .header { border-radius: 0; margin-bottom: 12px; padding: 14px 16px; }
      .section { border-radius: 0; padding: 12px 0; margin-bottom: 10px; border: none; border-bottom: 1px solid #e2e8f0; page-break-inside: avoid; break-inside: avoid; }
      .section h2 { font-size: 13px; }
      .kpi-grid { gap: 8px; }
      .kpi .value { font-size: 14px; }
      table, .card, .two-col > div { page-break-inside: avoid; break-inside: avoid; }
      .card { border: 1px solid #e2e8f0; }
    }
  </style>
</head>
<body>
<div class="page">

  <div class="header">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px">
      <div>
        <div style="font-size:10px;color:#94a3b8;letter-spacing:0.06em;text-transform:uppercase;margin-bottom:4px">Crystal · Relatório Executivo</div>
        <h1>Resumo da Operação</h1>
        <div class="meta" style="margin-top:6px">${escapeHtml(data.reportDate)} · ${escapeHtml(data.reportId)} · ${generatedAt}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:10px;color:#94a3b8">Cancelamento</div>
        <div style="font-size:28px;font-weight:900;color:${cancelColor}">${data.overview.taxaCancelamento.toFixed(1)}%</div>
      </div>
    </div>
  </div>

  ${sections}

  <div class="footer">
    <p>Crystal · Relatório executivo · Confidencial</p>
  </div>

</div>
<script>window.onload = function(){ window.print(); }</script>
</body>
</html>`;
}
