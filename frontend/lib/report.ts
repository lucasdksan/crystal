import type { DashboardData } from "@/frontend/types/dashboard";

function getAnomalyRecommendation(score: number, action: string): string {
  if (score >= 75) return action || "Descontinuar";
  if (score >= 50) return action || "Investigar";
  if (score >= 25) return action || "Monitorar";
  return action || "Manter";
}

function fmt(value: number) {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function gravityColor(g: string) {
  if (g === "Alto") return "#dc2626";
  if (g === "Médio") return "#d97706";
  return "#059669";
}

export function buildHtmlReport(data: DashboardData): string {
  const netRevenue =
    data.overview.receitaTotal * (1 - data.overview.taxaCancelamento / 100);
  const stuckInventory =
    data.overview.receitaTotal * (data.overview.taxaCancelamento / 100);
  const generatedAt = new Date().toLocaleString("pt-BR");

  const suspiciousProducts = (data.productAnomalies ?? []).filter(
    (product) => product.anomalyScore >= 50,
  );

  const clusterRows = data.clusters
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

  const anomalyRows =
    suspiciousProducts.length === 0
      ? `<tr><td colspan="5" style="padding:16px;text-align:center;color:#94a3b8">Nenhum produto em risco identificado.</td></tr>`
      : suspiciousProducts
          .slice(0, 10)
          .map(
            (product) => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-weight:600">${product.name}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:right">R$ ${fmt(product.canceledRevenue)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:center;font-weight:700;color:${product.anomalyScore >= 75 ? "#dc2626" : "#d97706"}">${product.anomalyScore.toFixed(1)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9">${(product.cancellationRate * 100).toFixed(1)}%</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-weight:600;color:#4f46e5">${getAnomalyRecommendation(product.anomalyScore, product.action)}</td>
    </tr>`,
          )
          .join("");

  const riskRows =
    data.diagnostics.risks.length === 0
      ? `<tr><td colspan="3" style="padding:16px;text-align:center;color:#94a3b8">Nenhum risco identificado.</td></tr>`
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
    .section { background: white; border-radius: 16px; border: 1px solid #f1f5f9; padding: 24px; margin-bottom: 24px; }
    .section h2 { font-size: 15px; font-weight: 700; margin-bottom: 16px; color: #1e293b; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px; }
    .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 16px; }
    .kpi { background: #f8fafc; border-radius: 12px; padding: 16px; border: 1px solid #f1f5f9; }
    .kpi .label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
    .kpi .value { font-size: 20px; font-weight: 800; color: #1e293b; }
    .kpi .sub { font-size: 11px; color: #94a3b8; margin-top: 2px; }
    .kpi.red .value { color: #dc2626; }
    .kpi.green .value { color: #059669; }
    .summary-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 14px 16px; color: #166534; font-size: 13px; line-height: 1.6; }
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
  </style>
</head>
<body>
<div class="page">

  <div class="header">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px">
      <div>
        <div style="font-size:11px;color:#94a3b8;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:6px">Auditoria de Negócios Crystal</div>
        <h1>Relatório de Análise de Vendas</h1>
        <div class="meta" style="margin-top:8px">ID: ${data.reportId} &nbsp;·&nbsp; ${data.reportDate} &nbsp;·&nbsp; Gerado em ${generatedAt}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:11px;color:#94a3b8">Taxa de Cancelamento</div>
        <div style="font-size:36px;font-weight:900;color:${data.overview.taxaCancelamento > 50 ? "#f87171" : data.overview.taxaCancelamento > 15 ? "#fbbf24" : "#34d399"}">${data.overview.taxaCancelamento.toFixed(1)}%</div>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Resumo Executivo</h2>
    <div class="kpi-grid">
      <div class="kpi">
        <div class="label">Faturamento Bruto</div>
        <div class="value">R$ ${fmt(data.overview.receitaTotal)}</div>
        <div class="sub">${data.overview.totalPedidos} pedidos no lote</div>
      </div>
      <div class="kpi green">
        <div class="label">Receita Líquida Real</div>
        <div class="value">R$ ${fmt(netRevenue)}</div>
        <div class="sub">Dinheiro que entrou no caixa</div>
      </div>
      <div class="kpi red">
        <div class="label">Estoque Travado</div>
        <div class="value">R$ ${fmt(stuckInventory)}</div>
        <div class="sub">Valor preso em cancelamentos</div>
      </div>
      <div class="kpi">
        <div class="label">Ticket Médio</div>
        <div class="value">R$ ${fmt(data.overview.ticketMedio)}</div>
        <div class="sub">Média por carrinho</div>
      </div>
      <div class="kpi">
        <div class="label">Pedidos Entregues</div>
        <div class="value">${data.overview.taxaEntrega.toFixed(1)}%</div>
        <div class="sub">Conversão física efetiva</div>
      </div>
      <div class="kpi">
        <div class="label">Grupos de Clientes</div>
        <div class="value">${data.overview.totalClusters}</div>
        <div class="sub">Perfis comportamentais</div>
      </div>
    </div>
    ${data.diagnostics.summary ? `<div class="summary-box">${data.diagnostics.summary}</div>` : ""}
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
          <th>Ação Recomendada</th>
        </tr>
      </thead>
      <tbody>${clusterRows}</tbody>
    </table>
  </div>

  ${
    suspiciousProducts.length > 0
      ? `<div class="section">
    <h2>Produtos que Requerem Atenção</h2>
    <table>
      <thead>
        <tr>
          <th>Produto</th>
          <th class="right">Receita Cancelada</th>
          <th class="center">Nível de Risco</th>
          <th>Cancelamento</th>
          <th>Recomendação</th>
        </tr>
      </thead>
      <tbody>${anomalyRows}</tbody>
    </table>
  </div>`
      : ""
  }

  ${
    data.diagnostics.risks.length > 0
      ? `<div class="section">
    <h2>Riscos e Gargalos de Estoque</h2>
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
  </div>`
      : ""
  }

  ${
    data.diagnostics.allStrategies.length > 0
      ? `<div class="section">
    <h2>Estratégias Prioritárias</h2>
    <div style="display:flex;flex-direction:column;gap:12px">
      ${data.diagnostics.allStrategies
        .slice(0, 5)
        .map(
          (s) => `
      <div style="background:#f8fafc;border-radius:10px;padding:14px 16px;border:1px solid #f1f5f9">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
          <div>
            <span style="font-size:10px;font-weight:700;text-transform:uppercase;color:#4f46e5;background:#eef2ff;padding:2px 6px;border-radius:4px">${s.type.replace(/_/g, " ")}</span>
            <div style="font-weight:700;margin-top:4px">${s.label}</div>
          </div>
          <span style="font-size:11px;color:#64748b;background:white;padding:3px 8px;border-radius:6px;border:1px solid #e2e8f0">Prioridade ${s.priorityScore.toFixed(2)}</span>
        </div>
        ${s.actions.length > 0 ? `<ul style="margin-top:8px;padding-left:18px;color:#475569;font-size:13px;line-height:1.7">${s.actions.map((a) => `<li><strong>${a.label}:</strong> ${a.description}</li>`).join("")}</ul>` : ""}
      </div>`,
        )
        .join("")}
    </div>
  </div>`
      : ""
  }

  <div class="footer">
    <p>Auditoria de Negócios Crystal · Gerado automaticamente em ${generatedAt}</p>
    <p style="margin-top:4px">Este relatório é confidencial e destinado exclusivamente ao lojista.</p>
  </div>

</div>
<script>window.onload = function(){ window.print(); }</script>
</body>
</html>`;
}
