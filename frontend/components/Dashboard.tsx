"use client";

import React, { useState, useRef } from "react";
import type { DashboardData } from "@/frontend/types/dashboard";
import { KPICard } from "@/frontend/components/KPICard";
import { ClustersTab } from "@/frontend/components/ClustersTab";
import { FlowTab } from "@/frontend/components/FlowTab";
import { DiagnosticsTab } from "@/frontend/components/DiagnosticsTab";
import { AnomalyTab } from "@/frontend/components/AnomalyTab";
import { MentorChat } from "@/frontend/components/MentorChat";
import {
  DollarSign,
  TrendingUp,
  ShoppingCart,
  AlertOctagon,
  Sparkles,
  RefreshCw,
  Upload,
  CheckCircle,
  AlertTriangle,
  Lightbulb,
  FileSpreadsheet,
  Layers,
  Activity,
  Heart,
  TrendingDown,
  Download,
} from "lucide-react";

type HealthState = "critical" | "warning" | "healthy" | "simulation";

function getHealthState(
  taxaCancelamento: number,
  isSimulation: boolean,
): HealthState {
  if (isSimulation) return "simulation";
  if (taxaCancelamento > 50) return "critical";
  if (taxaCancelamento < 15) return "healthy";
  return "warning";
}

const EXECUTIVE_TITLES: Record<HealthState, string> = {
  critical:
    "Sua Loja possui uma Ilusão de Caixa e Carga Logística Estéril.",
  warning: "Sua Loja opera com Alto Risco de Receita. Corrija agora.",
  healthy: "Sua Loja está Saudável. Continue escalando com inteligência.",
  simulation:
    "Meta de 15% alcançada — sua loja está em rota de recuperação comercial!",
};

const ACTION_PLAN_HEADERS: Record<HealthState, string> = {
  critical: "Prioridades para Sair do Abismo",
  warning: "Ações Urgentes para Estabilizar Receita",
  healthy: "Próximos Passos para Escalar",
  simulation: "Manter o Momentum Pós-Correção",
};

const ACTION_PLAN_ITEMS: Record<
  HealthState,
  Array<{ num: string; color: string; title: string; desc: string }>
> = {
  critical: [
    {
      num: "1",
      color: "rose",
      title: "Bloquear Nota Promissória",
      desc: "Grupos com promissórias operam em ciclos fantasma no Marketplace. Retire hoje.",
    },
    {
      num: "2",
      color: "amber",
      title: "Réguas automáticas de Boletos",
      desc: "Grupos com boletos bancários somem. Envie link Pix no Whatsapp 2h depois.",
    },
    {
      num: "3",
      color: "emerald",
      title: "Promoção para Girar Estoque",
      desc: "Liquidar o volume retido associando produtos com desconto em Pix.",
    },
  ],
  warning: [
    {
      num: "1",
      color: "rose",
      title: "Auditar Métodos de Pagamento Frágeis",
      desc: "Identifique clusters com cancelamento acima de 30% e restrinja métodos problemáticos.",
    },
    {
      num: "2",
      color: "amber",
      title: "Ativar Réguas de Recuperação",
      desc: "Configure lembretes automáticos de PIX para pedidos pendentes há mais de 2 horas.",
    },
    {
      num: "3",
      color: "emerald",
      title: "Replicar Padrão dos Grupos Saudáveis",
      desc: "Analise os clusters com alta conversão e incentive o mesmo perfil de compra.",
    },
  ],
  healthy: [
    {
      num: "1",
      color: "emerald",
      title: "Manter Métodos de Pagamento Eficientes",
      desc: "Continue priorizando PIX e pagamento imediato — são seus maiores conversores.",
    },
    {
      num: "2",
      color: "indigo",
      title: "Expandir Kits de Produtos Campeões",
      desc: "Monte combos com os produtos de maior volume para aumentar ticket médio.",
    },
    {
      num: "3",
      color: "blue",
      title: "Monitorar Perdas Semanalmente",
      desc: "Revise as Perdas Identificadas toda semana para recuperar receita em risco.",
    },
  ],
  simulation: [
    {
      num: "1",
      color: "emerald",
      title: "Consolidar Desativação de Promissórias",
      desc: "Mantenha promissórias bloqueadas — a simulação provou o ganho de 45% no lucro líquido.",
    },
    {
      num: "2",
      color: "indigo",
      title: "Automatizar Conversão PIX",
      desc: "Implemente cupom PIX automático para os 85% de faturamentos pendentes convertidos.",
    },
    {
      num: "3",
      color: "blue",
      title: "Escalar Campanhas de Fidelização",
      desc: "Invista em retenção dos grupos saudáveis com promoções segmentadas.",
    },
  ],
};

const ACTION_PLAN_FOOTNOTES: Record<HealthState, string> = {
  critical:
    "*Garantia: Resolver boletos eleva o lucro líquido em até 45% sem necessidade de aumentar novos anúncios.",
  warning:
    "*Dados reais: cada ponto percentual de cancelamento reduzido representa receita líquida recuperada imediatamente.",
  healthy:
    "*Parabéns! Sua taxa de cancelamento está abaixo de 15% — foco agora em crescimento e retenção.",
  simulation:
    "*Simulação ativa: estes dados refletem o cenário pós-correção com meta de 15% de cancelamento.",
};

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

function gravityColor(g: string) {
  if (g === "Alto") return "#dc2626";
  if (g === "Médio") return "#d97706";
  return "#059669";
}

function buildHtmlReport(data: DashboardData): string {
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
    <h2>Produtos que Requerem Atenção (Score &gt;= 50)</h2>
    <table>
      <thead>
        <tr>
          <th>Produto</th>
          <th class="right">Receita Cancelada</th>
          <th class="center">Score</th>
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

interface DashboardProps {
  initialData: DashboardData;
}

const HEALTHY_OVERRIDE: Partial<DashboardData> = {
  reportId: "K-Opt-Healthy-Sim",
  reportDate: "Simulação de Meta Concluída",
  overview: {
    receitaTotal: 22677.0,
    ticketMedio: 1511.8,
    taxaCancelamento: 15.0,
    taxaEntrega: 86.6,
    errosWorkflow: 0,
    totalPedidos: 15,
    totalClusters: 4,
  },
  statuses: [
    { name: "Cancelado", count: 2, color: "#ef4444" },
    { name: "Pronto para Separação", count: 13, color: "#10b981" },
  ],
  diagnostics: {
    summary:
      "Parabéns! Sua loja alcançou o estado saudável pós-auditoria. Promissórias foram desativadas e 85% dos faturamentos pendentes foram convertidos via cupom PIX.",
    championProduct: "Produto Campeão de Vendas",
    bottleneckProduct: "Nenhum gargalo de estoque ativo no momento",
    risks: [{ product: "Item de baixo risco", type: "Equilíbrio de Estoque", gravity: "Baixo" }],
    suggestions: [],
    allStrategies: [],
    clusterRisks: [],
  },
};

export function Dashboard({ initialData }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<
    "geral" | "clientes" | "fluxo" | "anomalias" | "diagnósticos" | "mentor"
  >("geral");
  const [dashboardData, setDashboardData] =
    useState<DashboardData>(initialData);
  const [isHealthySimulation, setIsHealthySimulation] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showTemporarySuccess = (msg: string) => {
    setSuccessMessage(msg);
    setErrorMessage(null);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const showTemporaryError = (msg: string) => {
    setErrorMessage(msg);
    setSuccessMessage(null);
    setTimeout(() => setErrorMessage(null), 4500);
  };

  const handleToggleSimulation = () => {
    if (!isHealthySimulation) {
      setDashboardData((prev) => ({
        ...prev,
        ...HEALTHY_OVERRIDE,
        overview: { ...prev.overview, ...HEALTHY_OVERRIDE.overview },
        statuses: HEALTHY_OVERRIDE.statuses ?? prev.statuses,
        diagnostics: HEALTHY_OVERRIDE.diagnostics ?? prev.diagnostics,
      }));
      setIsHealthySimulation(true);
      showTemporarySuccess(
        "Simulador de Meta Inteligente Ativado! Dados atualizados ficticiamente.",
      );
    } else {
      setDashboardData(initialData);
      setIsHealthySimulation(false);
      showTemporarySuccess("Voltando para os dados reais registrados.");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (file.name.endsWith(".json")) {
          const parsed = JSON.parse(text);
          if (parsed.overview && parsed.clusters && parsed.centroids) {
            setDashboardData(parsed);
            setIsHealthySimulation(false);
            showTemporarySuccess(
              `Sucesso! Relatório '${file.name}' importado com êxito!`,
            );
          } else {
            showTemporaryError(
              "O JSON importado não possui o formato de relatório Crystal.",
            );
          }
        } else {
          showTemporaryError(
            "No momento, aceitamos apenas arquivos .json estruturados.",
          );
        }
      } catch {
        showTemporaryError(
          "Falha ao analisar o arquivo. Verifique se a formatação JSON está íntegra.",
        );
      }
    };
    reader.readAsText(file);
  };

  const handleResetData = () => {
    setDashboardData(initialData);
    setIsHealthySimulation(false);
    showTemporarySuccess("Dados restaurados para o relatório original.");
  };

  const isDataModified =
    dashboardData !== initialData || isHealthySimulation;

  const isCritical = dashboardData.overview.taxaCancelamento > 50;
  const healthState = getHealthState(
    dashboardData.overview.taxaCancelamento,
    isHealthySimulation,
  );

  const handleExportReport = () => {
    const html = buildHtmlReport(dashboardData);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank");
    if (!win) {
      showTemporaryError(
        "Pop-up bloqueado. Permita pop-ups neste site para exportar o relatório.",
      );
    } else {
      showTemporarySuccess(
        "Relatório aberto! Use Ctrl+P (ou Cmd+P) para salvar como PDF.",
      );
    }
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };

  const actionPlanColorClasses: Record<
    string,
    { bg: string; border: string; text: string }
  > = {
    rose: {
      bg: "bg-rose-50",
      border: "border-rose-200",
      text: "text-rose-700",
    },
    amber: {
      bg: "bg-amber-50",
      border: "border-amber-200",
      text: "text-amber-700",
    },
    emerald: {
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      text: "text-emerald-700",
    },
    indigo: {
      bg: "bg-indigo-50",
      border: "border-indigo-200",
      text: "text-indigo-700",
    },
    blue: {
      bg: "bg-blue-50",
      border: "border-blue-200",
      text: "text-blue-700",
    },
  };

  return (
    <div className="min-h-screen bg-[#fafbfe] text-slate-800 flex flex-col justify-between font-sans selection:bg-indigo-100 antialiased">
      {isCritical && !isHealthySimulation && (
        <div className="bg-gradient-to-r from-red-600 to-rose-600 text-white text-xs py-2 px-4 shadow-xs text-center font-semibold tracking-wide flex items-center justify-center gap-2">
          <AlertOctagon className="w-4 h-4 text-amber-300 animate-bounce flex-shrink-0" />
          <span>
            ALERTA DE SEGURANÇA COMERCIAL: Sua Taxa de Cancelamento atual é
            extremamente crítica ({dashboardData.overview.taxaCancelamento.toFixed(1)}%). Apenas{" "}
            {Math.round(
              dashboardData.overview.totalPedidos *
                (dashboardData.overview.taxaEntrega / 100),
            )}{" "}
            de {dashboardData.overview.totalPedidos} pedidos geraram faturamento
            físico saudável.
          </span>
          <button
            onClick={handleToggleSimulation}
            className="ml-4 bg-white/20 hover:bg-white/30 text-white font-bold p-1 px-2.5 rounded-md transition-colors border border-white/20 uppercase text-[9px]"
          >
            Simular Correção
          </button>
        </div>
      )}

      <div className="flex-1 w-full max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 bg-slate-100 border border-slate-200 text-slate-600 rounded-md">
                Auditoria de Negócios Crystal v2.1
              </span>
              <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-amber-600 bg-amber-50 px-2 rounded border border-amber-100">
                <Activity className="w-3 h-3 animate-pulse" /> Auditor Líder
                Ativo
              </span>
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight font-sans">
              Análise de Vendas Simplificada
            </h1>
            <p className="text-slate-500 text-sm max-w-xl font-sans">
              Segmente clientes, descubra gargalos, identifique fraudes
              operacionais e converse diretamente com seu Mentor IA em
              português.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 p-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl shadow-xs cursor-pointer transition-colors"
              title="Importar um lote de transações em JSON personalizado"
            >
              <Upload className="w-4 h-4 text-slate-500" />
              <span>Importar Lote JSON</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
            />

            {isDataModified && (
              <button
                onClick={handleResetData}
                className="flex items-center gap-2 p-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                title="Restaurar relatório padrão"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Limpar</span>
              </button>
            )}

            <button
              onClick={handleToggleSimulation}
              className={`flex items-center gap-2 p-2.5 px-4 text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer ${
                isHealthySimulation
                  ? "bg-slate-900 text-white border border-slate-950 hover:bg-slate-800"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-700"
              }`}
            >
              <Sparkles className="w-4 h-4 text-emerald-300 animate-pulse" />
              <span>
                {isHealthySimulation
                  ? "Sair da Simulação"
                  : "Simular Meta 15%"}
              </span>
            </button>

            <button
              onClick={handleExportReport}
              className="flex items-center gap-2 p-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl shadow-xs cursor-pointer transition-colors"
              title="Exportar relatório resumido para o cliente"
            >
              <Download className="w-4 h-4 text-indigo-500" />
              <span>Exportar Relatório</span>
            </button>
          </div>
        </header>

        {successMessage && (
          <div className="bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800 p-4 rounded-xl text-xs flex gap-2 items-center animate-pulse">
            <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
            <span className="font-semibold">{successMessage}</span>
          </div>
        )}
        {errorMessage && (
          <div className="bg-rose-50 border-l-4 border-rose-500 text-rose-800 p-4 rounded-xl text-xs flex gap-2 items-center">
            <AlertTriangle className="w-5 h-5 text-rose-500 flex-shrink-0" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
        )}

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            id="kpi-gross"
            title="Valor Faturamento Bruto"
            value={`R$ ${dashboardData.overview.receitaTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
            icon={<DollarSign className="w-5 h-5" />}
            badge="Calculado"
            badgeType="info"
            description="Faturamento virtual de todos os pedidos gerados no lote."
          />
          <KPICard
            id="kpi-ticket"
            title="Ticket Médio"
            value={`R$ ${dashboardData.overview.ticketMedio.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
            icon={<TrendingUp className="w-5 h-5" />}
            badge="Mediano"
            badgeType="info"
            description="Média de gasto por carrinho cadastrado."
          />
          <KPICard
            id="kpi-cancellation"
            title="Taxa de Cancelamento"
            value={`${dashboardData.overview.taxaCancelamento.toFixed(1)}%`}
            icon={<AlertOctagon className="w-5 h-5" />}
            badge={isCritical ? "Crítico!" : "Saudável!"}
            badgeType={isCritical ? "error" : "success"}
            description={
              isCritical
                ? "Perda massiva de faturamento líquido."
                : "Excelente nível de conversão comercial!"
            }
          />
          <KPICard
            id="kpi-efficiency"
            title="Pedidos Concluídos (Entrega)"
            value={`${dashboardData.overview.taxaEntrega.toFixed(1)}%`}
            icon={<ShoppingCart className="w-5 h-5" />}
            badge={
              dashboardData.overview.taxaEntrega > 30 ? "Eficiente" : "Inativo"
            }
            badgeType={
              dashboardData.overview.taxaEntrega > 30 ? "success" : "warning"
            }
            description="Pedidos despachados físicos e faturados e-commerce."
          />
        </section>

        <div className="flex border-b border-slate-200 bg-white p-2 rounded-2xl border border-slate-100 shadow-xs">
          <nav className="flex flex-wrap gap-1.5 w-full">
            {(
              [
                { id: "geral", label: "Painel Executivo", icon: <Layers className="w-4 h-4" /> },
                { id: "clientes", label: "Segmentação de Clientes", icon: <FileSpreadsheet className="w-4 h-4" /> },
                { id: "fluxo", label: "Rotas Comportamentais & Operação", icon: <Activity className="w-4 h-4" /> },
                { id: "anomalias", label: "Perdas Identificadas", icon: <TrendingDown className="w-4 h-4" /> },
                { id: "diagnósticos", label: "Estratégias Comerciais", icon: <Lightbulb className="w-4 h-4" /> },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`p-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all font-sans cursor-pointer flex items-center gap-2 ${
                  activeTab === tab.id
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <main className="min-h-[450px]">
          {activeTab === "geral" && (
            <div className="space-y-8 animate-fade-in">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                <div className="lg:col-span-8 bg-white border border-slate-100 rounded-3xl p-6 md:p-8 flex flex-col justify-between space-y-6">
                  <div className="space-y-4">
                    <span className="text-[11px] font-bold font-mono text-slate-400 tracking-wider block uppercase">
                      Auditor Comercial - Diagnóstico Inicial
                    </span>
                    <h3 className="text-2xl font-black text-slate-950 font-sans tracking-tight">
                      {EXECUTIVE_TITLES[healthState]}
                    </h3>
                    <p className="text-sm text-slate-650 font-sans leading-relaxed">
                      {dashboardData.diagnostics.summary ||
                        `Com ${dashboardData.overview.totalPedidos} pedidos analisados e uma taxa de cancelamento de ${dashboardData.overview.taxaCancelamento.toFixed(1)}%, identificamos ${dashboardData.overview.totalClusters} perfis distintos de comportamento de compra.`}
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100/70 grid grid-cols-1 md:grid-cols-3 gap-6 font-sans">
                    <div className="space-y-1 min-w-0">
                      <span className="text-xs text-slate-500">
                        Grupos de Clientes:
                      </span>
                      <span className="block font-extrabold text-slate-900 font-mono text-sm wrap-break-word min-w-0">
                        {dashboardData.overview.totalClusters} clusters
                        identificados
                      </span>
                      <span className="text-[11px] text-slate-450 block">
                        Comportamentos distintos de compra mapeados.
                      </span>
                    </div>
                    <div className="space-y-1 min-w-0 md:border-x md:border-slate-200 md:px-6">
                      <span className="text-xs text-slate-500">
                        Faturamento Real Líquido:
                      </span>
                      <span className="block font-extrabold text-emerald-600 font-mono text-sm wrap-break-word min-w-0">
                        R${" "}
                        {(
                          dashboardData.overview.receitaTotal *
                          (1 - dashboardData.overview.taxaCancelamento / 100)
                        ).toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                      <span className="text-[11px] text-slate-450 block">
                        Dinheiro de caixa verdadeiro que entrou na conta.
                      </span>
                    </div>
                    <div className="space-y-1 min-w-0">
                      <span className="text-xs text-slate-500">
                        Perda de Estoque Travado:
                      </span>
                      <span className="block font-extrabold text-rose-500 font-mono text-sm wrap-break-word min-w-0">
                        R${" "}
                        {(
                          dashboardData.overview.receitaTotal *
                          (dashboardData.overview.taxaCancelamento / 100)
                        ).toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                      <span className="text-[11px] text-slate-450 block">
                        Valor preso em carrinhos cancelados.
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                    <button
                      onClick={() => setActiveTab("mentor")}
                      className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs font-sans tracking-wide shadow-xs transition-colors cursor-pointer text-center"
                    >
                      Bate-papo com Copilot IA de Vendas
                    </button>
                    <button
                      onClick={() => setActiveTab("diagnósticos")}
                      className="px-5 py-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold rounded-xl text-xs font-sans transition-colors cursor-pointer text-center"
                    >
                      Ver Estratégias Comerciais
                    </button>
                  </div>
                </div>

                <div className="lg:col-span-4 bg-white border border-slate-100 rounded-3xl p-6 flex flex-col justify-between">
                  <div className="space-y-5">
                    <span className="text-[11px] font-bold font-mono text-indigo-600 block uppercase tracking-wide">
                      📋 Plano de Ação Recomendado
                    </span>
                    <h4 className="text-base font-bold text-slate-900 leading-snug">
                      {ACTION_PLAN_HEADERS[healthState]}
                    </h4>

                    <div className="space-y-4 text-xs font-sans">
                      {ACTION_PLAN_ITEMS[healthState].map((item) => {
                        const colorClass =
                          actionPlanColorClasses[item.color] ??
                          actionPlanColorClasses.rose;

                        return (
                          <div
                            key={item.num}
                            className="flex gap-2.5 items-start"
                          >
                            <div
                              className={`h-5 w-5 ${colorClass.bg} border ${colorClass.border} rounded-md flex items-center justify-center ${colorClass.text} font-bold font-mono`}
                            >
                              {item.num}
                            </div>
                            <div>
                              <span className="font-bold text-slate-800 block">
                                {item.title}
                              </span>
                              <span className="text-slate-500">{item.desc}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100/80 text-[10px] text-slate-500 mt-4 font-mono leading-relaxed">
                    {ACTION_PLAN_FOOTNOTES[healthState]}
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-100 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex gap-3 items-center">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-650">
                    <FileSpreadsheet className="w-5 h-5 text-indigo-500" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-500 uppercase font-mono block">
                      Dados de Lote Ativos:
                    </span>
                    <span className="text-sm font-extrabold text-slate-800 font-sans block">
                      Relatório: {dashboardData.reportId} (
                      {dashboardData.reportDate})
                    </span>
                  </div>
                </div>
                <div className="text-xs text-slate-500 font-sans bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  🧬 <strong>Lojista Independente:</strong> Use o botão
                  "Importar Lote JSON" acima para subir planilhas exportadas das
                  suas vendas e obter gráficos de segmentação instantâneos!
                </div>
              </div>
            </div>
          )}

          {activeTab === "clientes" && (
            <ClustersTab data={dashboardData} />
          )}
          {activeTab === "fluxo" && <FlowTab data={dashboardData} />}
          {activeTab === "anomalias" && (
            <AnomalyTab data={dashboardData} />
          )}
          {activeTab === "diagnósticos" && (
            <DiagnosticsTab data={dashboardData} />
          )}
          {activeTab === "mentor" && <MentorChat data={dashboardData} />}
        </main>
      </div>

      <footer className="bg-white border-t border-slate-100 py-6 mt-12 text-center text-xs text-slate-400 font-sans">
        <p className="flex items-center justify-center gap-1.5">
          <span>Análise de Vendas Inteligente © 2026</span>
          <span className="text-slate-200">|</span>
          <span>Desenvolvido por Lucas da Silva Leoncio</span>
          <span className="text-slate-200">|</span>
          <span className="flex items-center gap-0.5">
            <Heart className="w-3 h-3 text-red-500 fill-red-500" /> para
            Líderes Logísticos
          </span>
        </p>
      </footer>

      {activeTab !== "mentor" && (
        <button
          onClick={() => setActiveTab("mentor")}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-sm rounded-2xl shadow-xl px-5 py-3.5 transition-all cursor-pointer border border-indigo-500"
          title="Abrir Mentor IA Copilot"
        >
          <Sparkles className="w-5 h-5 text-indigo-200 animate-pulse flex-shrink-0" />
          <span>Mentor IA</span>
        </button>
      )}
    </div>
  );
}
