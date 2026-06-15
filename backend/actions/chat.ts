"use server";

import { GoogleGenAI } from "@google/genai";
import type { ChatMessage, DashboardData } from "@/frontend/types/dashboard";

let aiClient: GoogleGenAI | null = null;

const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (key && key.trim() !== "") {
      aiClient = new GoogleGenAI({ apiKey: key });
    }
  }
  return aiClient;
}

function getGeminiModel(): string {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
}

function buildSystemPrompt(dashboardState: DashboardData): string {
  const { overview, clusters, diagnostics, rfm, alerts, inventory, fraud, forecast, healthScore } =
    dashboardState;

  const clusterSummary = clusters
    .map(
      (c) =>
        `- ${c.name}: ${c.count} pedidos, ticket R$ ${c.averageValue.toFixed(2)}, cancelamento ${c.cancelRate}%, pagamento ${c.payment}`,
    )
    .join("\n");

  const rfmSummary = rfm.segments
    .map((s) => `- ${s.name}: ${s.count} clientes, R$ ${s.revenue.toFixed(0)}`)
    .join("\n");

  const alertSummary = alerts
    .slice(0, 5)
    .map(
      (a) =>
        `- [${a.severity.toUpperCase()}] ${a.title}: ${a.description} — Impacto R$ ${a.financialImpact.toFixed(0)} — Ação: ${a.recommendedAction}`,
    )
    .join("\n");

  const inventorySummary = inventory.ruptureRisk
    .filter((r) => r.classification === "Crítico")
    .slice(0, 3)
    .map((r) => `- ${r.name}: ${r.daysRemaining.toFixed(0)} dias de estoque`)
    .join("\n");

  const fraudSummary = fraud.flaggedOrders
    .slice(0, 3)
    .map((f) => `- ${f.clientId}: score ${f.score}/100 (${f.riskLevel})`)
    .join("\n");

  const forecastSummary = forecast.forecasts
    .slice(0, 3)
    .map((f) => `- ${f.name}: tendência ${f.trend}, 30d: ${f.forecast30d.toFixed(0)} un.`)
    .join("\n");

  const strategySummary = diagnostics.allStrategies
    .slice(0, 3)
    .map((s) => {
      const fi = s.financialImpact;
      return `- ${s.label}: ${s.justifications[0] ?? ""}${fi ? ` — Perda R$ ${fi.estimatedLoss.toFixed(0)}, ROI ${fi.roi}%` : ""}`;
    })
    .join("\n");

  return `Você é o "Crystal Copilot", consultor comercial especializado em e-commerce VTEX.
Responda em PORTUGUÊS (PT-BR) de forma direta, acionável e orientada a resultados financeiros.

FORMATO OBRIGATÓRIO para cada recomendação:
Problema: [o que está acontecendo]
Impacto: R$ [valor] / [métrica]
Ação: [ação específica e executável]
Resultado Esperado: [outcome mensurável]

Dados da loja:
- Faturamento: R$ ${overview.receitaTotal.toLocaleString("pt-BR")}
- Cancelamento: ${overview.taxaCancelamento.toFixed(1)}% (Perda: R$ ${overview.perdaEstimada.toFixed(0)})
- Entrega: ${overview.taxaEntrega.toFixed(1)}%
- Health Score: ${healthScore.overall}/100 (${healthScore.label})
- Pedidos: ${overview.totalPedidos} | Segmentos: ${overview.totalClusters}

Clusters (K-Prototypes):
${clusterSummary}

RFM:
${rfmSummary || "Sem dados RFM"}

Alertas ativos:
${alertSummary || "Nenhum alerta"}

Estoque crítico:
${inventorySummary || "Sem rupturas críticas"}

Fraudes detectadas:
${fraudSummary || "Nenhuma fraude"}

Previsão de demanda:
${forecastSummary || "Sem previsões"}

Estratégias:
${strategySummary || "Nenhuma estratégia"}

Produto campeão: ${diagnostics.championProduct}
Produto gargalo: ${diagnostics.bottleneckProduct}

Priorize recomendações por impacto financeiro. Seja conciso e prático.`;
}

function buildKeywordFallback(
  lastMessage: string,
  dashboardState: DashboardData,
  options?: { showSetupNote?: boolean },
): string {
  const showSetupNote = options?.showSetupNote ?? true;
  const setupNote = showSetupNote
    ? "\n\n*(Modo offline — configure GEMINI_API_KEY para respostas dinâmicas.)*"
    : "";
  const msg = lastMessage.toLowerCase();
  const { overview, alerts, rfm } = dashboardState;

  if (msg.includes("cancel") || msg.includes("taxa")) {
    const topAlert = alerts.find((a) => a.category === "cancellation");
    return `**Problema:** ${overview.taxaCancelamento.toFixed(0)}% dos pedidos foram cancelados
**Impacto:** R$ ${overview.perdaEstimada.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}/mês
**Ação:** ${topAlert?.recommendedAction ?? "Enviar lembrete WhatsApp após 2 horas para pagamentos pendentes"}
**Resultado Esperado:** Recuperação de 60-70% do faturamento perdido${setupNote}`;
  }

  if (msg.includes("rfm") || msg.includes("cliente") || msg.includes("relacionamento")) {
    const champions = rfm.segments.find((s) => s.name === "Campeões");
    return `**Problema:** ${rfm.totalClients} clientes mapeados em ${rfm.segments.length} segmentos
**Impacto:** ${champions ? `${champions.count} Campeões geram R$ ${champions.revenue.toFixed(0)}` : "Segmentação disponível"}
**Ação:** ${rfm.recommendations[0]?.action ?? "Criar programa VIP para Campeões"}
**Resultado Esperado:** Aumento de 15-20% na retenção${setupNote}`;
  }

  if (msg.includes("estoque") || msg.includes("ruptura")) {
    const critical = dashboardState.inventory.ruptureRisk.filter(
      (r) => r.classification === "Crítico",
    );
    return `**Problema:** ${critical.length} SKUs em risco de ruptura
**Impacto:** Perda de vendas estimada
**Ação:** Repor estoque dos SKUs críticos imediatamente
**Resultado Esperado:** Evitar perda de receita por indisponibilidade${setupNote}`;
  }

  if (msg.includes("cluster") || msg.includes("segmento") || msg.includes("grupo")) {
    const clusterTexts = dashboardState.clusters
      .map((c) => `- ${c.name}: ${c.count} pedidos, ${c.cancelRate}% cancelamento`)
      .join("\n");
    return `**Segmentos identificados (K-Prototypes):**
${clusterTexts}

**Ação:** Focar nos segmentos saudáveis e replicar padrão de pagamento/horário.${setupNote}`;
  }

  const topAlerts = alerts.slice(0, 3);
  const insights = topAlerts
    .map(
      (a) =>
        `**Problema:** ${a.description}\n**Impacto:** R$ ${a.financialImpact.toFixed(0)}\n**Ação:** ${a.recommendedAction}`,
    )
    .join("\n\n");

  return `👋 **Crystal Copilot**

Health Score: **${dashboardState.healthScore.overall}/100** · Cancelamento: **${overview.taxaCancelamento.toFixed(1)}%**

${insights || "Operação saudável. Pergunte sobre cancelamentos, estoque, RFM ou segmentos."}

Posso ajudar com: cancelamentos, estoque, RFM, fraudes, previsão de demanda.${setupNote}`;
}

export async function sendChatMessage(
  messages: ChatMessage[],
  dashboardState: DashboardData,
): Promise<{ text: string }> {
  if (!messages || messages.length === 0) {
    return { text: "Nenhuma mensagem recebida." };
  }

  const lastUserMessage = messages[messages.length - 1].text;
  const client = getGeminiClient();

  if (!client) {
    return { text: buildKeywordFallback(lastUserMessage, dashboardState) };
  }

  try {
    const model = getGeminiModel();
    const systemPrompt = buildSystemPrompt(dashboardState);

    const conversationParts = messages.map((msg) => ({
      text: `${msg.sender === "user" ? "Lojista" : "Crystal Copilot"}: ${msg.text}`,
    }));

    const response = await client.models.generateContent({
      model,
      contents: [
        ...conversationParts,
        {
          text: `O lojista perguntou: "${lastUserMessage}". Responda usando o formato Problema/Impacto/Ação/Resultado Esperado.`,
        },
      ],
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7,
      },
    });

    return {
      text:
        response.text ||
        "Desculpe, tive um problema ao formular meu conselho. Tente novamente!",
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    const fallback = buildKeywordFallback(lastUserMessage, dashboardState, {
      showSetupNote: false,
    });

    if (message.includes("404") || message.includes("NOT_FOUND")) {
      return {
        text: `⚠️ Modelo Gemini indisponível (${getGeminiModel()}).\n\n${fallback}`,
      };
    }

    if (message.includes("429") || message.includes("RESOURCE_EXHAUSTED")) {
      return { text: `⚠️ Limite da API atingido.\n\n${fallback}` };
    }

    return { text: `⚠️ Conexão indisponível.\n\n${fallback}` };
  }
}

export async function getProactiveInsights(
  dashboardState: DashboardData,
): Promise<string[]> {
  const insights: string[] = [];

  if (dashboardState.overview.taxaCancelamento > 20) {
    insights.push(
      `**Problema:** ${dashboardState.overview.taxaCancelamento.toFixed(0)}% cancelados\n**Impacto:** R$ ${dashboardState.overview.perdaEstimada.toFixed(0)}\n**Ação:** Ativar régua de cobrança PIX\n**Resultado Esperado:** +60% recuperação`,
    );
  }

  const criticalStock = dashboardState.inventory.ruptureRisk.filter(
    (r) => r.classification === "Crítico",
  );
  if (criticalStock.length > 0) {
    insights.push(
      `**Problema:** ${criticalStock.length} SKUs em ruptura\n**Impacto:** Perda de vendas iminente\n**Ação:** Repor ${criticalStock[0].name}\n**Resultado Esperado:** Evitar ruptura em ${criticalStock[0].daysRemaining.toFixed(0)} dias`,
    );
  }

  const atRisk = dashboardState.rfm.segments.find((s) => s.name === "Em Risco");
  if (atRisk && atRisk.count > 0) {
    insights.push(
      `**Problema:** ${atRisk.count} clientes fiéis em risco\n**Impacto:** R$ ${atRisk.revenue.toFixed(0)} em receita\n**Ação:** Campanha win-back com cupom exclusivo\n**Resultado Esperado:** Recuperar 30% dos clientes`,
    );
  }

  if (insights.length === 0) {
    insights.push(
      `**Problema:** Operação estável\n**Impacto:** Health Score ${dashboardState.healthScore.overall}/100\n**Ação:** Explorar oportunidades de crescimento\n**Resultado Esperado:** Otimização contínua`,
    );
  }

  return insights.slice(0, 3);
}
