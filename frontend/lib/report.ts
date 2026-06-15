import type { DashboardData } from "@/frontend/types/dashboard";
import {
  getHealthState,
  EXECUTIVE_TITLES,
  ACTION_PLAN_HEADERS,
  ACTION_PLAN_ITEMS,
  ACTION_PLAN_FOOTNOTES,
} from "@/frontend/lib/action-plan";

function fmt(value: number) {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtInt(value: number) {
  return value.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

export function gravityColor(g: string) {
  if (g === "Alto") return "#dc2626";
  if (g === "Médio") return "#d97706";
  return "#059669";
}

function healthScoreColor(value: number) {
  if (value >= 70) return "#059669";
  if (value >= 40) return "#d97706";
  return "#dc2626";
}

function severityColor(severity: string) {
  if (severity === "critical") return "#dc2626";
  if (severity === "warning") return "#d97706";
  return "#2563eb";
}

function severityLabel(severity: string) {
  if (severity === "critical") return "Crítico";
  if (severity === "warning") return "Atenção";
  return "Info";
}

function actionPlanColors(color: string) {
  const map: Record<string, { bg: string; border: string; text: string }> = {
    rose: { bg: "#fff1f2", border: "#fecdd3", text: "#be123c" },
    amber: { bg: "#fffbeb", border: "#fde68a", text: "#b45309" },
    emerald: { bg: "#ecfdf5", border: "#a7f3d0", text: "#047857" },
    indigo: { bg: "#eef2ff", border: "#c7d2fe", text: "#4338ca" },
    blue: { bg: "#eff6ff", border: "#bfdbfe", text: "#1d4ed8" },
  };
  return map[color] ?? map.blue;
}

function getAnomalyRecommendation(score: number, action: string): string {
  if (score >= 75) return action || "Descontinuar";
  if (score >= 50) return action || "Investigar";
  if (score >= 25) return action || "Monitorar";
  return action || "Manter";
}

function emptyRow(colspan: number, message: string) {
  return `<tr><td colspan="${colspan}" style="padding:16px;text-align:center;color:#94a3b8">${message}</td></tr>`;
}

export function buildHtmlReport(data: DashboardData): string {
  const generatedAt = new Date().toLocaleString("pt-BR");
  const healthState = getHealthState(data.overview.taxaCancelamento);
  const actionItems = ACTION_PLAN_ITEMS[healthState];
  const totalAlertImpact = data.alerts.reduce((s, a) => s + a.financialImpact, 0);
  const criticalAlerts = data.alerts.filter((a) => a.severity === "critical").length;

  const healthDimensions = [
    { label: "Cancelamento", value: data.healthScore.cancellation },
    { label: "Entrega", value: data.healthScore.delivery },
    { label: "Estoque", value: data.healthScore.inventory },
    { label: "Concentração", value: data.healthScore.revenueConcentration },
    { label: "Fraude", value: data.healthScore.fraud },
  ];

  const healthBars = healthDimensions
    .map(
      (dim) => `
    <div style="margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;font-size:11px;color:#64748b;margin-bottom:3px">
        <span>${dim.label}</span>
        <span style="font-weight:700;color:#334155">${dim.value}</span>
      </div>
      <div style="height:6px;background:#f1f5f9;border-radius:99px;overflow:hidden">
        <div style="height:100%;width:${dim.value}%;background:${healthScoreColor(dim.value)};border-radius:99px"></div>
      </div>
    </div>`,
    )
    .join("");

  const actionPlanHtml = actionItems
    .map((item) => {
      const colors = actionPlanColors(item.color);
      return `
    <div style="background:${colors.bg};border:1px solid ${colors.border};border-radius:10px;padding:14px 16px;margin-bottom:10px">
      <div style="display:flex;gap:12px;align-items:flex-start">
        <span style="font-weight:800;color:${colors.text};font-size:16px;min-width:20px">${item.num}</span>
        <div>
          <div style="font-weight:700;color:#1e293b;margin-bottom:4px">${item.title}</div>
          <div style="font-size:13px;color:#475569;line-height:1.5">${item.desc}</div>
        </div>
      </div>
    </div>`;
    })
    .join("");

  const alertRows =
    data.alerts.length === 0
      ? emptyRow(5, "Nenhum alerta ativo no momento.")
      : data.alerts
          .slice(0, 8)
          .map(
            (alert) => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-weight:600">${alert.title}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:12px;color:#475569">${alert.description}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:center;font-weight:700;color:${severityColor(alert.severity)}">${severityLabel(alert.severity)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:right">R$ ${fmt(alert.financialImpact)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:12px;color:#374151">${alert.recommendedAction}</td>
    </tr>`,
          )
          .join("");

  const clusterRows =
    data.clusters.length === 0
      ? emptyRow(6, "Nenhum grupo de clientes identificado.")
      : data.clusters
          .map(
            (c) => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-weight:600">${c.name.replace(`Cluster ${c.id} - `, "")}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:center">${c.count}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:right">R$ ${fmt(c.averageValue)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:center;color:${c.cancelRate > 30 ? "#dc2626" : "#059669"};font-weight:700">${c.cancelRate.toFixed(1)}%</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:center">${c.revenueShare.toFixed(1)}%</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;color:#374151;font-size:12px">${c.description}</td>
    </tr>`,
          )
          .join("");

  const rfmRows =
    data.rfm.segments.length === 0
      ? emptyRow(4, "Nenhum perfil de cliente mapeado.")
      : data.rfm.segments
          .map((segment) => {
            const pct =
              data.rfm.totalClients > 0
                ? ((segment.count / data.rfm.totalClients) * 100).toFixed(1)
                : "0.0";
            return `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-weight:600">${segment.name}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:center">${segment.count}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:center">${pct}%</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:right">R$ ${fmtInt(segment.revenue)}</td>
    </tr>`;
          })
          .join("");

  const rfmRecommendationRows =
    data.rfm.recommendations.length === 0
      ? emptyRow(3, "Nenhuma recomendação de relacionamento.")
      : data.rfm.recommendations
          .map(
            (rec) => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-weight:600">${rec.segment}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:center">${rec.clientCount}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:12px;color:#374151">${rec.action}</td>
    </tr>`,
          )
          .join("");

  const ruptureRows =
    data.inventory.ruptureRisk.length === 0
      ? emptyRow(4, "Nenhum SKU em risco de ruptura.")
      : data.inventory.ruptureRisk
          .slice(0, 8)
          .map(
            (item) => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-weight:600">${item.name}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:center">${item.currentStock}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:center">${item.daysRemaining === Infinity ? "∞" : item.daysRemaining.toFixed(0)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:center;font-weight:700;color:${gravityColor(item.classification === "Crítico" ? "Alto" : item.classification === "Atenção" ? "Médio" : "Baixo")}">${item.classification}</td>
    </tr>`,
          )
          .join("");

  const deadStockRows =
    data.inventory.deadStock.length === 0
      ? emptyRow(3, "Nenhum produto parado identificado.")
      : data.inventory.deadStock
          .slice(0, 8)
          .map(
            (item) => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-weight:600">${item.name}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:center">${item.daysSinceLastSale}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:center">${item.currentStock}</td>
    </tr>`,
          )
          .join("");

  const suspiciousProducts = (data.productAnomalies ?? []).filter(
    (product) => product.anomalyScore >= 50,
  );

  const anomalyRows =
    suspiciousProducts.length === 0
      ? emptyRow(5, "Nenhum produto fora do padrão identificado.")
      : suspiciousProducts
          .slice(0, 10)
          .map(
            (product) => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-weight:600">${product.name}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:right">R$ ${fmt(product.canceledRevenue)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:center;font-weight:700;color:${product.anomalyScore >= 75 ? "#dc2626" : "#d97706"}">${product.anomalyScore.toFixed(1)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:center">${(product.cancellationRate * 100).toFixed(1)}%</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-weight:600;color:#4f46e5">${getAnomalyRecommendation(product.anomalyScore, product.action)}</td>
    </tr>`,
          )
          .join("");

  const riskRows =
    data.diagnostics.risks.length === 0
      ? emptyRow(3, "Nenhum risco de portfólio identificado.")
      : data.diagnostics.risks
          .map(
            (r) => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9">${r.product}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9">${r.type}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-weight:700;color:${gravityColor(r.gravity)}">${r.gravity}</td>
    </tr>`,
          )
          .join("");

  const fraudRows =
    data.fraud.flaggedOrders.length === 0
      ? emptyRow(4, "Nenhum pedido sinalizado.")
      : data.fraud.flaggedOrders
          .slice(0, 8)
          .map((order) => {
            const riskLabel =
              order.riskLevel === "high"
                ? "Alto"
                : order.riskLevel === "medium"
                  ? "Médio"
                  : "Baixo";
            const riskColor =
              order.riskLevel === "high"
                ? "#dc2626"
                : order.riskLevel === "medium"
                  ? "#d97706"
                  : "#64748b";
            return `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-family:monospace;font-size:12px">${order.orderId}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:center;font-weight:700;color:${riskColor}">${riskLabel}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:center">${order.score.toFixed(0)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:12px;color:#475569">${order.reasons.slice(0, 2).join(" · ")}</td>
    </tr>`;
          })
          .join("");

  const strategyHtml =
    data.diagnostics.allStrategies.length === 0
      ? `<p style="color:#94a3b8;text-align:center;padding:16px">Nenhuma estratégia identificada.</p>`
      : data.diagnostics.allStrategies
          .slice(0, 5)
          .map((s) => {
            const priorityColor =
              s.financialImpact?.priority === "alta"
                ? "#dc2626"
                : s.financialImpact?.priority === "media"
                  ? "#d97706"
                  : "#059669";
            return `
      <div style="background:#f8fafc;border-radius:10px;padding:14px 16px;border:1px solid #f1f5f9;margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;gap:12px">
          <div>
            <span style="font-size:10px;font-weight:700;text-transform:uppercase;color:#4f46e5;background:#eef2ff;padding:2px 6px;border-radius:4px">${s.type.replace(/_/g, " ")}</span>
            <div style="font-weight:700;margin-top:4px">${s.label}</div>
          </div>
          <div style="text-align:right;flex-shrink:0">
            <span style="font-size:11px;color:#64748b;background:white;padding:3px 8px;border-radius:6px;border:1px solid #e2e8f0">Prioridade ${(s.priorityScore * 100).toFixed(0)}%</span>
            ${s.financialImpact ? `<div style="font-size:11px;font-weight:700;color:${priorityColor};margin-top:4px">Recuperação: R$ ${fmtInt(s.financialImpact.estimatedRecovery)}</div>` : ""}
          </div>
        </div>
        ${s.actions.length > 0 ? `<ul style="margin-top:8px;padding-left:18px;color:#475569;font-size:13px;line-height:1.7">${s.actions.map((a) => `<li><strong>${a.label}:</strong> ${a.description}</li>`).join("")}</ul>` : ""}
      </div>`;
          })
          .join("");

  const kitHtml =
    data.diagnostics.suggestions.length === 0
      ? ""
      : `<div class="section">
    <h2>Kits de Produtos Sugeridos</h2>
    <div style="display:flex;flex-direction:column;gap:12px">
      ${data.diagnostics.suggestions
        .slice(0, 4)
        .map(
          (kit) => `
      <div style="background:#f8fafc;border-radius:10px;padding:14px 16px;border:1px solid #f1f5f9">
        <div style="font-weight:700;margin-bottom:4px">${kit.name}</div>
        <div style="font-size:12px;color:#64748b;margin-bottom:6px">${kit.objective}</div>
        <div style="font-size:13px;color:#475569">${kit.products.join(" + ")}</div>
      </div>`,
        )
        .join("")}
    </div>
  </div>`;

  const purchaseRows =
    data.forecast.purchaseRecommendations.length === 0
      ? emptyRow(4, "Nenhuma recomendação de compra.")
      : data.forecast.purchaseRecommendations
          .slice(0, 8)
          .map((rec) => {
            const urgencyColor =
              rec.urgency === "alta"
                ? "#dc2626"
                : rec.urgency === "media"
                  ? "#d97706"
                  : "#059669";
            return `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-weight:600">${rec.name}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:center">${rec.recommendedQty}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:center;font-weight:700;color:${urgencyColor}">${rec.urgency.toUpperCase()}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:12px;color:#475569">${rec.reason}</td>
    </tr>`;
          })
          .join("");

  const cancelColor =
    data.overview.taxaCancelamento > 50
      ? "#f87171"
      : data.overview.taxaCancelamento > 15
        ? "#fbbf24"
        : "#34d399";

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Relatório Crystal — ${data.reportId}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; color: #1e293b; font-size: 14px; }
    .page { max-width: 960px; margin: 0 auto; padding: 40px 32px; }
    .header { background: #1e293b; color: white; border-radius: 16px; padding: 32px; margin-bottom: 32px; }
    .header h1 { font-size: 22px; font-weight: 800; margin-bottom: 4px; }
    .header .meta { color: #94a3b8; font-size: 12px; }
    .section { background: white; border-radius: 16px; border: 1px solid #f1f5f9; padding: 24px; margin-bottom: 24px; page-break-inside: avoid; }
    .section h2 { font-size: 15px; font-weight: 700; margin-bottom: 16px; color: #1e293b; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px; }
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 16px; }
    .kpi { background: #f8fafc; border-radius: 12px; padding: 16px; border: 1px solid #f1f5f9; }
    .kpi .label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
    .kpi .value { font-size: 20px; font-weight: 800; color: #1e293b; }
    .kpi .sub { font-size: 11px; color: #94a3b8; margin-top: 2px; }
    .kpi.red .value { color: #dc2626; }
    .kpi.green .value { color: #059669; }
    .summary-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 14px 16px; color: #166534; font-size: 13px; line-height: 1.6; }
    .diag-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 16px; }
    .diag-card { background: #f8fafc; border: 1px solid #f1f5f9; border-radius: 10px; padding: 12px 14px; }
    .diag-card .label { font-size: 10px; color: #94a3b8; text-transform: uppercase; font-weight: 700; }
    .diag-card .value { font-size: 13px; font-weight: 700; color: #1e293b; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; }
    thead tr { background: #f8fafc; }
    th { padding: 10px 12px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; border-bottom: 2px solid #f1f5f9; }
    th.right { text-align: right; }
    th.center { text-align: center; }
    .footer { text-align: center; color: #94a3b8; font-size: 11px; padding: 24px 0 0; }
    @media print {
      body { background: white; }
      .page { padding: 20px; }
      .no-print { display: none; }
    }
    @media (max-width: 700px) {
      .kpi-grid { grid-template-columns: repeat(2, 1fr); }
      .diag-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
<div class="page">

  <div class="header">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:16px">
      <div>
        <div style="font-size:10px;color:#94a3b8;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:6px">Crystal v3 · Inteligência Operacional VTEX</div>
        <h1>Relatório de Análise Operacional</h1>
        <div class="meta" style="margin-top:8px">ID: ${data.reportId} &nbsp;·&nbsp; ${data.reportDate} &nbsp;·&nbsp; Gerado em ${generatedAt}</div>
      </div>
      <div style="display:flex;gap:24px;align-items:flex-end">
        <div style="text-align:right">
          <div style="font-size:11px;color:#94a3b8">Health Score</div>
          <div style="font-size:36px;font-weight:900;color:${healthScoreColor(data.healthScore.overall)}">${data.healthScore.overall}<span style="font-size:16px;color:#94a3b8">/100</span></div>
          <div style="font-size:11px;font-weight:700;color:${healthScoreColor(data.healthScore.overall)}">${data.healthScore.label}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:11px;color:#94a3b8">Taxa de Cancelamento</div>
          <div style="font-size:36px;font-weight:900;color:${cancelColor}">${data.overview.taxaCancelamento.toFixed(1)}%</div>
        </div>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Health Score — Dimensões</h2>
    ${healthBars}
  </div>

  <div class="section">
    <h2>Resumo Executivo</h2>
    <div class="kpi-grid">
      <div class="kpi">
        <div class="label">Faturamento Bruto</div>
        <div class="value">R$ ${fmt(data.overview.receitaTotal)}</div>
        <div class="sub">${data.overview.totalPedidos} pedidos no período</div>
      </div>
      <div class="kpi red">
        <div class="label">Taxa de Cancelamento</div>
        <div class="value">${data.overview.taxaCancelamento.toFixed(1)}%</div>
        <div class="sub">Perda: R$ ${fmt(data.overview.perdaEstimada)}</div>
      </div>
      <div class="kpi green">
        <div class="label">Taxa de Entrega</div>
        <div class="value">${data.overview.taxaEntrega.toFixed(1)}%</div>
        <div class="sub">Pedidos concluídos com entrega</div>
      </div>
      <div class="kpi">
        <div class="label">Segmentos</div>
        <div class="value">${data.overview.totalClusters}</div>
        <div class="sub">${data.rfm.totalClients} clientes mapeados</div>
      </div>
    </div>
    ${data.diagnostics.summary ? `<div class="summary-box">${data.diagnostics.summary}</div>` : ""}
    <div class="diag-grid">
      <div class="diag-card">
        <div class="label">Produto Campeão</div>
        <div class="value">${data.diagnostics.championProduct}</div>
      </div>
      <div class="diag-card">
        <div class="label">Gargalo</div>
        <div class="value">${data.diagnostics.bottleneckProduct}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>${ACTION_PLAN_HEADERS[healthState]}</h2>
    <p style="font-size:13px;color:#475569;margin-bottom:16px;line-height:1.6">${EXECUTIVE_TITLES[healthState]}</p>
    ${actionPlanHtml}
    <p style="font-size:11px;color:#94a3b8;margin-top:12px;font-style:italic">${ACTION_PLAN_FOOTNOTES[healthState]}</p>
  </div>

  <div class="section">
    <h2>Alertas Prioritários</h2>
    <div style="display:flex;gap:16px;margin-bottom:16px;flex-wrap:wrap">
      <div style="background:#f8fafc;border:1px solid #f1f5f9;border-radius:10px;padding:12px 16px">
        <div style="font-size:11px;color:#64748b">Total de alertas</div>
        <div style="font-size:20px;font-weight:800">${data.alerts.length}</div>
      </div>
      <div style="background:#fff1f2;border:1px solid #fecdd3;border-radius:10px;padding:12px 16px">
        <div style="font-size:11px;color:#be123c">Críticos</div>
        <div style="font-size:20px;font-weight:800;color:#dc2626">${criticalAlerts}</div>
      </div>
      <div style="background:#f8fafc;border:1px solid #f1f5f9;border-radius:10px;padding:12px 16px">
        <div style="font-size:11px;color:#64748b">Impacto total</div>
        <div style="font-size:20px;font-weight:800">R$ ${fmtInt(totalAlertImpact)}</div>
      </div>
    </div>
    <table>
      <thead>
        <tr>
          <th>Alerta</th>
          <th>Descrição</th>
          <th class="center">Severidade</th>
          <th class="right">Impacto</th>
          <th>Ação Recomendada</th>
        </tr>
      </thead>
      <tbody>${alertRows}</tbody>
    </table>
  </div>

  <div class="section">
    <h2>Grupos de Clientes — Ações por Perfil</h2>
    <table>
      <thead>
        <tr>
          <th>Grupo</th>
          <th class="center">Pedidos</th>
          <th class="right">Ticket Médio</th>
          <th class="center">Cancelamento</th>
          <th class="center">% Receita</th>
          <th>Perfil</th>
        </tr>
      </thead>
      <tbody>${clusterRows}</tbody>
    </table>
  </div>

  <div class="section">
    <h2>Relacionamento — Perfis de Clientes</h2>
    <table>
      <thead>
        <tr>
          <th>Perfil</th>
          <th class="center">Clientes</th>
          <th class="center">% Base</th>
          <th class="right">Receita</th>
        </tr>
      </thead>
      <tbody>${rfmRows}</tbody>
    </table>
    ${
      data.rfm.recommendations.length > 0
        ? `<h2 style="margin-top:24px;font-size:14px;border:none;padding:0">Recomendações de Relacionamento</h2>
    <table style="margin-top:12px">
      <thead>
        <tr>
          <th>Perfil</th>
          <th class="center">Clientes</th>
          <th>Ação</th>
        </tr>
      </thead>
      <tbody>${rfmRecommendationRows}</tbody>
    </table>`
        : ""
    }
  </div>

  <div class="section">
    <h2>Estoque e Ruptura</h2>
    <h2 style="margin-top:0;font-size:13px;border:none;padding:0;color:#64748b">Risco de Ruptura</h2>
    <table style="margin-bottom:20px">
      <thead>
        <tr>
          <th>SKU</th>
          <th class="center">Estoque</th>
          <th class="center">Dias Restantes</th>
          <th class="center">Status</th>
        </tr>
      </thead>
      <tbody>${ruptureRows}</tbody>
    </table>
    <h2 style="font-size:13px;border:none;padding:0;color:#64748b">Estoque Parado</h2>
    <table>
      <thead>
        <tr>
          <th>SKU</th>
          <th class="center">Dias sem Venda</th>
          <th class="center">Estoque</th>
        </tr>
      </thead>
      <tbody>${deadStockRows}</tbody>
    </table>
  </div>

  <div class="section">
    <h2>Produtos Fora do Padrão</h2>
    <table>
      <thead>
        <tr>
          <th>Produto</th>
          <th class="right">Receita Cancelada</th>
          <th class="center">Nível de Risco</th>
          <th class="center">Cancelamento</th>
          <th>Recomendação</th>
        </tr>
      </thead>
      <tbody>${anomalyRows}</tbody>
    </table>
  </div>

  <div class="section">
    <h2>Riscos de Portfólio</h2>
    <table>
      <thead>
        <tr>
          <th>Produto / Situação</th>
          <th>Tipo de Risco</th>
          <th>Gravidade</th>
        </tr>
      </thead>
      <tbody>${riskRows}</tbody>
    </table>
  </div>

  <div class="section">
    <h2>Fraude — Pedidos Sinalizados</h2>
    <div style="display:flex;gap:16px;margin-bottom:16px;flex-wrap:wrap">
      <div style="background:#f8fafc;border:1px solid #f1f5f9;border-radius:10px;padding:12px 16px">
        <div style="font-size:11px;color:#64748b">Sinalizados</div>
        <div style="font-size:20px;font-weight:800">${data.fraud.summary.totalFlagged}</div>
      </div>
      <div style="background:#fff1f2;border:1px solid #fecdd3;border-radius:10px;padding:12px 16px">
        <div style="font-size:11px;color:#be123c">Risco alto</div>
        <div style="font-size:20px;font-weight:800;color:#dc2626">${data.fraud.summary.highRisk}</div>
      </div>
      <div style="background:#f8fafc;border:1px solid #f1f5f9;border-radius:10px;padding:12px 16px">
        <div style="font-size:11px;color:#64748b">Exposição estimada</div>
        <div style="font-size:20px;font-weight:800">R$ ${fmtInt(data.fraud.summary.estimatedExposure)}</div>
      </div>
    </div>
    <table>
      <thead>
        <tr>
          <th>Pedido</th>
          <th class="center">Risco</th>
          <th class="center">Pontuação</th>
          <th>Motivos</th>
        </tr>
      </thead>
      <tbody>${fraudRows}</tbody>
    </table>
  </div>

  <div class="section">
    <h2>Estratégias Prioritárias</h2>
    ${strategyHtml}
  </div>

  ${kitHtml}

  <div class="section">
    <h2>Recomendações de Compra</h2>
    <table>
      <thead>
        <tr>
          <th>SKU</th>
          <th class="center">Qtd. Sugerida</th>
          <th class="center">Urgência</th>
          <th>Motivo</th>
        </tr>
      </thead>
      <tbody>${purchaseRows}</tbody>
    </table>
  </div>

  <div class="footer">
    <p>Crystal v3 · Inteligência Operacional VTEX · Gerado automaticamente em ${generatedAt}</p>
    <p style="margin-top:4px">Este relatório é confidencial e destinado exclusivamente ao lojista.</p>
  </div>

</div>
<script>window.onload = function(){ window.print(); }</script>
</body>
</html>`;
}
