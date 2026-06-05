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

function formatCurrency(value: number): string {
  return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
}

function buildAgrupamentoContext(dashboardState: DashboardData): string {
  const {
    overview,
    clusters,
    denormalizedCentroids,
    elbowCurve,
    silhouetteCurve,
    bestSilhouetteScore,
    elbowK,
    paymentMethodsK,
  } = dashboardState;

  const elbowSummary = elbowCurve
    .slice(0, 6)
    .map((p) => `K=${p.k}: WCSS ${p.wcss.toFixed(2)}`)
    .join(", ");
  const silhouetteSummary = silhouetteCurve
    .slice(0, 6)
    .map((p) => `K=${p.k}: ${p.score.toFixed(3)}`)
    .join(", ");

  const centroidsSummary = denormalizedCentroids
    .map(
      (c) =>
        `- Cluster ${c.clusterId}: ticket ${formatCurrency(c.valorTotal)}, ${c.totalItens} itens, pagamento ${c.pagamento}, hora ${c.horaDoDia}h, dia ${c.diaDaSemana}`,
    )
    .join("\n");

  const clusterSummary = clusters
    .map(
      (c) =>
        `- ${c.name}: ${c.count} clientes (${c.percentage}%), ticket médio ${formatCurrency(c.averageValue)}, cancelamento ${c.cancelRate}%, receita ${c.revenueShare}% da loja, pagamento via ${c.payment}, entrega ${c.deliveryRate.toFixed(0)}%, frequência ${c.averageFrequency?.toFixed(1) ?? "—"}/mês.${c.topProducts.length > 0 ? ` Top produto: ${c.topProducts[0].name}.` : ""}`,
    )
    .join("\n");

  return `=== AGRUPAMENTO (Segmentação de Clientes) ===
- K ótimo (curva do cotovelo): ${elbowK} | K por métodos de pagamento: ${paymentMethodsK}
- K selecionado: ${overview.totalClusters} | Score de Silhueta: ${bestSilhouetteScore.toFixed(3)}
- Curva do Cotovelo: ${elbowSummary || "não disponível"}
- Curva de Silhueta: ${silhouetteSummary || "não disponível"}

Centróides desnormalizados (perfil médio de cada cluster):
${centroidsSummary || "Não disponível"}

Resumo dos clusters:
${clusterSummary || "Nenhum cluster identificado."}`;
}

function buildCustomerIntelligenceContext(dashboardState: DashboardData): string {
  const {
    customerSegments,
    churnScores,
    clvEstimates,
    revenueOpportunities,
    executiveInsights,
    customerIntelligenceSummary,
    overview,
  } = dashboardState;

  const segmentsSummary = customerSegments
    .map(
      (s) =>
        `- ${s.name}: ${s.customerCount} clientes (${s.customerShare.toFixed(1)}%), receita ${s.revenueShare.toFixed(1)}%, ticket médio ${formatCurrency(s.averageTicket)}, freq ${s.averageFrequency.toFixed(1)}/mês, ${s.averageDaysSinceLastPurchase}d desde última compra`,
    )
    .join("\n");

  const churnSummary = churnScores
    .slice(0, 5)
    .map(
      (c) =>
        `- ${c.customerName}: score ${c.score.toFixed(0)}, risco ${c.riskLevel}, receita em risco ${formatCurrency(c.estimatedLostRevenue)}, ${c.daysSinceLastPurchase}d sem comprar`,
    )
    .join("\n");

  const clvSummary = [...clvEstimates]
    .sort((a, b) => b.estimatedLifetimeValue - a.estimatedLifetimeValue)
    .slice(0, 5)
    .map(
      (c) =>
        `- ${c.customerName} (${c.segmentName}): CLV ${formatCurrency(c.estimatedLifetimeValue)}, receita atual ${formatCurrency(c.currentRevenue)}, projeção 6m ${formatCurrency(c.predictedRevenue6m)}`,
    )
    .join("\n");

  const opportunitiesSummary = revenueOpportunities
    .map(
      (o) =>
        `- ${o.title}: ${formatCurrency(o.estimatedValue)} (${o.customerCount} clientes) — ${o.description}`,
    )
    .join("\n");

  const insightsSummary = executiveInsights
    .slice(0, 5)
    .map(
      (i) =>
        `- [${i.priority}] ${i.text} (impacto ${formatCurrency(i.financialImpact)}, categoria: ${i.category})`,
    )
    .join("\n");

  return `=== CUSTOMER INTELLIGENCE (Modelos de Negócio) ===
Resumo financeiro:
- CLV Total: ${formatCurrency(customerIntelligenceSummary.totalClv)}
- Receita em Risco (churn): ${formatCurrency(customerIntelligenceSummary.revenueAtRisk)}
- Receita Recuperável: ${formatCurrency(customerIntelligenceSummary.recoverableRevenue)}
- Receita Incremental: ${formatCurrency(customerIntelligenceSummary.incrementalRevenue)}
- Total Clientes: ${overview.totalClientes}

Segmentos de clientes:
${segmentsSummary || "Nenhum segmento identificado."}

Top clientes em risco de churn:
${churnSummary || "Nenhum cliente crítico identificado."}

Top CLV (Lifetime Value):
${clvSummary || "Sem estimativas de CLV."}

Oportunidades de receita:
${opportunitiesSummary || "Nenhuma oportunidade calculada."}

Executive Insights:
${insightsSummary || "Sem insights executivos."}`;
}

function buildProductMlContext(dashboardState: DashboardData): string {
  const {
    productAnomalies,
    products,
    productIntelligence,
    bcgMatrix,
    catalogHealth,
  } = dashboardState;

  const anomaliesSummary = productAnomalies
    .slice(0, 5)
    .map(
      (p) =>
        `- ${p.name} (${p.clusterName}): score anomalia ${p.anomalyScore}, cancel ${(p.cancellationRate * 100).toFixed(0)}%, receita ${formatCurrency(p.revenue)}, ação: ${p.action}`,
    )
    .join("\n");

  const topProducts = products
    .slice(0, 5)
    .map(
      (p) => `- ${p.name}: ${p.quantity} un, ${formatCurrency(p.revenue)}`,
    )
    .join("\n");

  const clusterSummary = productIntelligence.clusters
    .map(
      (cluster) =>
        `- ${cluster.name}: ${cluster.productCount} produtos, ${cluster.revenueShare.toFixed(1)}% receita, cancel médio ${(cluster.averageCancellationRate * 100).toFixed(0)}%`,
    )
    .join("\n");

  const diagnosticSummary = productIntelligence.diagnostics
    .map((diagnostic) => `- [${diagnostic.title}] ${diagnostic.message}`)
    .join("\n");

  const bcgSummary = bcgMatrix.products
    .slice(0, 5)
    .map(
      (product) =>
        `- ${product.productName}: ${product.quadrant}, share ${product.revenueShare.toFixed(1)}%, crescimento ${product.growthRate.toFixed(1)}%`,
    )
    .join("\n");

  const catalogSummary = `Total: ${catalogHealth.summary.totalProducts} | Pareto 80%: ${catalogHealth.summary.paretoCount} produtos (${catalogHealth.summary.paretoRevenueShare.toFixed(0)}%) | Sem venda 90d: ${catalogHealth.summary.noSale90Count} | Queda: ${catalogHealth.summary.decliningCount} | Crescimento: ${catalogHealth.summary.growingCount}`;

  return `=== INTELIGÊNCIA DE PRODUTOS ===
Clusters:
${clusterSummary || "Sem clusters de produtos."}

Diagnósticos:
${diagnosticSummary || "Sem diagnósticos automáticos."}

=== MATRIZ BCG ===
${bcgSummary || "Sem produtos classificados na matriz BCG."}

=== SAÚDE DO CATÁLOGO ===
${catalogSummary}

=== AGRUPAMENTO DE PRODUTOS (Detecção de Anomalias) ===
${anomaliesSummary || "Nenhuma anomalia de produto detectada."}

Top produtos por receita:
${topProducts || "Sem dados de produtos."}`;
}

function buildOperationalContext(dashboardState: DashboardData): string {
  const peakHour = dashboardState.operationalHours.reduce(
    (best, current) => (current.count > best.count ? current : best),
    { hour: "0h", count: 0 },
  );
  const peakDay = dashboardState.operationalDays.reduce(
    (best, current) => (current.count > best.count ? current : best),
    { day: "—", count: 0 },
  );

  return `Horário de pico: ${peakHour.hour} (${peakHour.count} pedidos) | Dia de pico: ${peakDay.day} (${peakDay.count} pedidos)`;
}

function buildSystemPrompt(dashboardState: DashboardData): string {
  const { overview, diagnostics } = dashboardState;

  const clusterRiskSummary = diagnostics.clusterRisks
    .slice(0, 3)
    .map(
      (r) =>
        `- ${r.clusterName}: cancelamento ${r.cancelRate}%, receita ${r.revenueShare}%`,
    )
    .join("\n");

  const strategySummary = diagnostics.allStrategies
    .slice(0, 3)
    .map(
      (s) =>
        `- ${s.label} (prioridade ${s.priorityScore.toFixed(2)}): ${s.justifications[0] ?? ""}`,
    )
    .join("\n");

  const riskSummary = diagnostics.risks
    .slice(0, 3)
    .map((r) => `- ${r.product}: ${r.type} (${r.gravity})`)
    .join("\n");

  return `Você é o "Crystal Copilot", um consultor de negócios especializado em e-commerce, análise de dados de vendas e mentoria comercial.
Seu objetivo principal é explicar termos complexos (clusters, centróides, agrupamento, curva do cotovelo, score de silhueta, churn, CLV, matriz BCG, saúde do catálogo) de forma extremamente simples, didática, amigável e descontraída em PORTUGUÊS (PT-BR) para um lojista totalmente leigo em programação e estatística.

Você tem acesso aos resultados completos dos modelos de Machine Learning executados sobre os dados reais da loja. Use SEMPRE esses dados numéricos nas respostas — nunca invente métricas.

=== VISÃO GERAL DA LOJA ===
- Faturamento Total: ${formatCurrency(overview.receitaTotal)}
- Ticket Médio: ${formatCurrency(overview.ticketMedio)}
- Taxa de Cancelamento: ${overview.taxaCancelamento.toFixed(1)}%${overview.taxaCancelamento > 50 ? " (CRÍTICO!)" : ""}
- Taxa de Entrega: ${overview.taxaEntrega.toFixed(1)}%
- Total de Pedidos: ${overview.totalPedidos}
- Total de Clientes: ${overview.totalClientes}
- CLV Total Estimado: ${formatCurrency(overview.clvTotal)}
- Receita em Risco: ${formatCurrency(overview.receitaEmRisco)}
- ${buildOperationalContext(dashboardState)}

${buildAgrupamentoContext(dashboardState)}

${buildCustomerIntelligenceContext(dashboardState)}

${buildProductMlContext(dashboardState)}

=== DIAGNOSTICS ESTRATÉGICO ===
Resumo executivo: ${diagnostics.summary}
Produto campeão: ${diagnostics.championProduct}
Produto gargalo: ${diagnostics.bottleneckProduct}

Clusters de maior risco:
${clusterRiskSummary || "Nenhum cluster de risco crítico identificado."}

Riscos de produto:
${riskSummary || "Nenhum risco de produto identificado."}

Estratégias prioritárias:
${strategySummary || "Nenhuma estratégia adicional disponível."}

Diretrizes:
1. Responda educadamente, focando no crescimento do lojista.
2. Explique os termos como se estivesse conversando com um amigo que tem uma lojinha física.
3. Cite números reais dos modelos ML (clusters, churn scores, CLV, BCG) ao dar recomendações.
4. Cruze informações entre Agrupamento, Customer Intelligence e Diagnostics quando relevante.
5. Destaque ações práticas segmentadas (ex: campanha de retenção para clientes em churn crítico, investir em estrelas BCG, descontinuar produtos da cauda longa).
6. Mantenha os textos curtos e divididos em parágrafos legíveis.
7. Use formatação markdown (títulos, negrito, listas) — ela será renderizada corretamente.
   Prefira ### para títulos de seção, ** para termos-chave e listas numeradas para ações passo a passo.`;
}

function buildKeywordFallback(
  lastMessage: string,
  dashboardState: DashboardData,
  options?: { showSetupNote?: boolean },
): string {
  const showSetupNote = options?.showSetupNote ?? true;
  const setupNote = showSetupNote
    ? "\n\n*(Nota: Estou rodando em modo offline. Configure GEMINI_API_KEY para respostas dinâmicas com IA.)*"
    : "";
  const msg = lastMessage.toLowerCase();
  const { overview } = dashboardState;

  if (msg.includes("cancel") || msg.includes("taxa")) {
    return `⚠️ **Diagnóstico da sua Taxa de Cancelamento (${overview.taxaCancelamento.toFixed(1)}%)**

Sua loja está sofrendo de "carrinhos abandonados qualificados". O cliente gera o pedido no Marketplace usando Boleto Bancário ou Nota Promissória, mas desiste antes de pagar.

**Como solucionar em 3 passos simples:**
1. **Desative Promissórias**: Clientes do marketplace raramente pagam promissórias; isso só gera reserva inútil de estoque.
2. **Estimule o PIX**: Dê um incentivo (ex: 5% a 7% de desconto) para pagamento via PIX.
3. **Réguas de Cobrança**: Envie um lembrete de PIX no WhatsApp 2 horas e 24 horas após o pedido.

${setupNote}`;
  }

  if (msg.includes("boleto") || msg.includes("pagamento")) {
    return `💳 **Sobre Meios de Pagamento**

O maior grupo da sua loja gera pedidos em **Boleto Bancário**, mas a taxa de conversão física é muito baixa.

**Minha recomendação:**
* Ofereça um desconto no checkout para PIX ou Cartão de Crédito.
* O boleto tem vencimento de 2 a 3 dias úteis — tempo demais onde o cliente esfria a cabeça e desiste. O PIX garante o dinheiro na hora!
* Use integrações gateway que geram o QR Code do PIX diretamente na tela de finalização.

${setupNote}`;
  }

  if (
    msg.includes("cluster") ||
    msg.includes("agrupamento") ||
    msg.includes("grupo")
  ) {
    const clusterTexts = dashboardState.clusters
      .map(
        (c) =>
          `**Grupo ${c.id}** — ${c.count} pedidos, R$ ${c.averageValue.toFixed(0)} médio, via ${c.payment} (${c.status})`,
      )
      .join("\n");

    return `📊 **Explicando os Grupos (Clusters) de forma simples**

Pense em **Clusters** como **"Grupos de Comportamento dos Seus Clientes"**. Em vez de olhar todos como iguais, dividimos em grupos:

${clusterTexts}

*Focar nos grupos com maior taxa de entrega e replicar o padrão deles é o segredo para crescer!*

${setupNote}`;
  }

  if (
    msg.includes("churn") ||
    msg.includes("risco") ||
    msg.includes("inativ")
  ) {
    const topChurn = dashboardState.churnScores.slice(0, 3);
    const churnTexts =
      topChurn.length > 0
        ? topChurn
            .map(
              (c) =>
                `* **${c.customerName}**: risco ${c.riskLevel}, score ${c.score.toFixed(0)}, ${c.daysSinceLastPurchase}d sem comprar, receita em risco ${formatCurrency(c.estimatedLostRevenue)}`,
            )
            .join("\n")
        : "* Nenhum cliente em risco crítico identificado no momento.";

    return `🛡️ **Análise de Churn Risk**

Receita total em risco: **${formatCurrency(dashboardState.customerIntelligenceSummary.revenueAtRisk)}**

Clientes mais críticos:
${churnTexts}

**Ações sugeridas:**
1. Contate clientes em risco alto/crítico com oferta personalizada.
2. Ative régua de reativação para quem está há mais de 90 dias sem comprar.
3. Monitore a migração entre segmentos para detectar deterioração precoce.

${setupNote}`;
  }

  if (
    msg.includes("clv") ||
    msg.includes("ltv") ||
    msg.includes("lifetime") ||
    msg.includes("valor vital")
  ) {
    const topClv = [...dashboardState.clvEstimates]
      .sort((a, b) => b.estimatedLifetimeValue - a.estimatedLifetimeValue)
      .slice(0, 3);

    const clvTexts =
      topClv.length > 0
        ? topClv
            .map(
              (c) =>
                `* **${c.customerName}** (${c.segmentName}): CLV ${formatCurrency(c.estimatedLifetimeValue)}, projeção 6m ${formatCurrency(c.predictedRevenue6m)}`,
            )
            .join("\n")
        : "* Sem estimativas de CLV disponíveis.";

    return `👑 **Customer Lifetime Value (CLV)**

CLV total estimado da base: **${formatCurrency(dashboardState.overview.clvTotal)}**

Top clientes por valor vitalício:
${clvTexts}

**Ações sugeridas:**
1. Proteja clientes VIP com programa de fidelidade.
2. Invista em upsell nos clientes de alto potencial.
3. Use o CLV para priorizar orçamento de retenção vs. aquisição.

${setupNote}`;
  }

  if (
    msg.includes("produto") ||
    msg.includes("catálogo") ||
    msg.includes("catalogo") ||
    msg.includes("bcg") ||
    msg.includes("portfólio") ||
    msg.includes("portfolio")
  ) {
    const diagnosticTexts = dashboardState.productIntelligence.diagnostics
      .slice(0, 4)
      .map((diagnostic) => `* **${diagnostic.title}:** ${diagnostic.message}`)
      .join("\n");

    const bcgTexts = dashboardState.bcgMatrix.products
      .slice(0, 4)
      .map(
        (product) =>
          `* **${product.productName}** — ${product.quadrant}: share ${product.revenueShare.toFixed(1)}%, crescimento ${product.growthRate.toFixed(1)}%`,
      )
      .join("\n");

    const catalog = dashboardState.catalogHealth.summary;

    return `📦 **Inteligência de Produtos**

Diagnósticos automáticos:
${diagnosticTexts || "* Sem diagnósticos no período analisado."}

Matriz BCG (top produtos):
${bcgTexts || "* Sem classificação BCG disponível."}

Saúde do catálogo:
* **${catalog.paretoCount}** produtos concentram **${catalog.paretoRevenueShare.toFixed(0)}%** da receita
* **${catalog.noSale90Count}** sem venda há 90 dias
* **${catalog.decliningCount}** em queda de demanda
* **${catalog.growingCount}** em crescimento acelerado

**Ações sugeridas:**
1. Proteja os produtos campeões e diversifique dependência.
2. Invista em estrelas BCG com maior potencial de crescimento.
3. Descontinue ou promova itens da cauda longa sem tração.

${setupNote}`;
  }

  if (msg.includes("migra") || msg.includes("segmento")) {
    const segmentTexts = dashboardState.customerSegments
      .map(
        (s) =>
          `* **${s.name}**: ${s.customerCount} clientes (${s.customerShare.toFixed(1)}%), receita ${s.revenueShare.toFixed(1)}%`,
      )
      .join("\n");

    return `🔀 **Segmentação de Clientes**

Segmentos atuais:
${segmentTexts || "* Nenhum segmento identificado."}

**Ações sugeridas:**
1. Replique estratégias dos segmentos com maior receita.
2. Crie campanhas para mover clientes de alto potencial para VIP.
3. Monitore churn nos segmentos de maior valor.

${setupNote}`;
  }

  if (
    msg.includes("oportunidade") ||
    msg.includes("receita incremental") ||
    msg.includes("recuper")
  ) {
    const opportunities = dashboardState.revenueOpportunities;
    const oppTexts =
      opportunities.length > 0
        ? opportunities
            .map(
              (o) =>
                `* **${o.title}**: ${formatCurrency(o.estimatedValue)} (${o.customerCount} clientes) — ${o.description}`,
            )
            .join("\n")
        : "* Nenhuma oportunidade calculada no momento.";

    return `💰 **Oportunidades de Receita**

Receita recuperável: **${formatCurrency(dashboardState.customerIntelligenceSummary.recoverableRevenue)}**
Receita incremental: **${formatCurrency(dashboardState.customerIntelligenceSummary.incrementalRevenue)}**

Oportunidades identificadas:
${oppTexts}

${setupNote}`;
  }

  if (
    msg.includes("anomalia") ||
    msg.includes("produto") ||
    msg.includes("gargalo")
  ) {
    const anomalies = dashboardState.productAnomalies.slice(0, 3);
    const anomalyTexts =
      anomalies.length > 0
        ? anomalies
            .map(
              (p) =>
                `* **${p.name}** (${p.clusterName}): score ${p.anomalyScore}, ação ${p.action}`,
            )
            .join("\n")
        : `* Produto gargalo: **${dashboardState.diagnostics.bottleneckProduct}**`;

    return `📦 **Análise de Produtos (Agrupamento)**

Produto campeão: **${dashboardState.diagnostics.championProduct}**
Produto gargalo: **${dashboardState.diagnostics.bottleneckProduct}**

Anomalias detectadas:
${anomalyTexts}

${setupNote}`;
  }

  return `👋 **Olá! Sou o Crystal Copilot, seu mentor de vendas.**

Estou analisando seu e-commerce agora:
* **${dashboardState.overview.totalClientes} clientes** em **${dashboardState.overview.totalClusters} clusters**
* **${dashboardState.overview.totalPedidos} pedidos** · cancelamento **${overview.taxaCancelamento.toFixed(1)}%**
* CLV total: **${formatCurrency(dashboardState.overview.clvTotal)}**

Posso ajudar com:
* **"explicar clusters"** — segmentação por agrupamento
* **"churn risk"** — clientes em risco de abandono
* **"CLV"** — valor vitalício dos clientes
* **"produtos"** — inteligência de produtos e matriz BCG
* **"oportunidades"** — receita recuperável e incremental

${setupNote}`;
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
          text: `O lojista acabou de perguntar: "${lastUserMessage}". Responda em português focado em ajudá-lo de forma didática com sugestões lucrativas.`,
        },
      ],
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.75,
      },
    });

    return {
      text:
        response.text ||
        "Desculpe, tive um problema ao formular meu conselho. Tente novamente!",
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    const causeCode =
      err instanceof Error && err.cause instanceof Error
        ? (err.cause as NodeJS.ErrnoException).code
        : undefined;

    console.error("Gemini Error:", message, causeCode ? `(${causeCode})` : "");

    const fallback = buildKeywordFallback(lastUserMessage, dashboardState, {
      showSetupNote: false,
    });

    if (
      message.includes("404") ||
      message.includes("NOT_FOUND") ||
      message.includes("no longer available")
    ) {
      return {
        text: `⚠️ **Modelo Gemini indisponível**

O modelo configurado (${getGeminiModel()}) não está mais disponível. Defina \`GEMINI_MODEL=gemini-2.5-flash\` no \`.env\` e reinicie o servidor.

Enquanto isso, segue uma orientação baseada nos seus dados:

${fallback}`,
      };
    }

    if (message.includes("429") || message.includes("RESOURCE_EXHAUSTED")) {
      return {
        text: `⚠️ **Limite da API Gemini atingido**

A cota gratuita do modelo foi esgotada. Enquanto isso, segue uma orientação baseada nos seus dados:

${fallback}`,
      };
    }

    if (
      causeCode === "UNABLE_TO_VERIFY_LEAF_SIGNATURE" ||
      message.includes("fetch failed")
    ) {
      return {
        text: `⚠️ **Conexão com Gemini indisponível**

Não foi possível validar o certificado SSL da API (comum em redes corporativas). Enquanto isso, segue uma orientação baseada nos seus dados:

${fallback}`,
      };
    }

    return {
      text: `⚠️ **Conexão com Gemini indisponível**

${fallback}`,
    };
  }
}
