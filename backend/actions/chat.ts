"use server";

import { GoogleGenAI } from "@google/genai";
import { computeABCCurve } from "@/frontend/lib/abc-curve";
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
        `- ${c.name}${c.rfmLabel ? ` (${c.rfmLabel})` : ""}: ${c.count} clientes (${c.percentage}%), ticket médio ${formatCurrency(c.averageValue)}, cancelamento ${c.cancelRate}%, receita ${c.revenueShare}% da loja, pagamento via ${c.payment}, entrega ${c.deliveryRate.toFixed(0)}%, frequência ${c.averageFrequency?.toFixed(1) ?? "—"}/mês.${c.rfm ? ` RFM: recência ${c.rfm.recencia}d, frequência ${c.rfm.frequencia} ped., valor ${formatCurrency(c.rfm.valorMonetario)}.` : ""}${c.topProducts.length > 0 ? ` Top produto: ${c.topProducts[0].name}.` : ""}`,
    )
    .join("\n");

  return `=== SEGMENTAÇÃO — K-MEANS COM RFM ===
O K-means agora usa Recência, Frequência e Valor Monetário (RFM) como variáveis de entrada, normalizadas com z-score. Os clusters recebem rótulos automáticos (ex: Campeões, Em Risco, Alto Potencial).

- K ótimo (curva do cotovelo): ${elbowK} | K por métodos de pagamento: ${paymentMethodsK}
- K selecionado: ${overview.totalClusters} | Score de Silhueta: ${bestSilhouetteScore.toFixed(3)}
- Curva do Cotovelo: ${elbowSummary || "não disponível"}
- Curva de Silhueta: ${silhouetteSummary || "não disponível"}

Centróides desnormalizados (perfil médio de cada cluster):
${centroidsSummary || "Não disponível"}

Resumo dos clusters (com perfil RFM):
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

=== INSIGHTS E AÇÕES (aba unificada) ===
Oportunidades de receita:
${opportunitiesSummary || "Nenhuma oportunidade calculada."}

Insights executivos prescritivos:
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

  const abcProducts = computeABCCurve(bcgMatrix.products);
  const abcCounts = {
    A: abcProducts.filter((p) => p.curve === "A").length,
    B: abcProducts.filter((p) => p.curve === "B").length,
    C: abcProducts.filter((p) => p.curve === "C").length,
  };

  const abcSummary = abcProducts
    .slice(0, 8)
    .map(
      (p) =>
        `- [Curva ${p.curve}] ${p.productName}: ${formatCurrency(p.revenue)} (${p.revenueShare.toFixed(1)}% share, acumulado ${p.cumulativeShare.toFixed(1)}%)`,
    )
    .join("\n");

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

  return `=== PRODUTOS (aba unificada: clusters + Curva ABC + BCG) ===
A aba Produtos concentra inteligência de portfólio. A antiga aba Catálogo foi absorvida aqui.

Curva ABC (A=até 80% receita acumulada, B=até 95%, C=resto):
- Curva A: ${abcCounts.A} produtos | Curva B: ${abcCounts.B} | Curva C: ${abcCounts.C}
${abcSummary || "Sem classificação ABC disponível."}

Clusters de produtos:
${clusterSummary || "Sem clusters de produtos."}

Diagnósticos automáticos:
${diagnosticSummary || "Sem diagnósticos automáticos."}

Matriz BCG (cruzada com Curva ABC — filtro por curva A/B/C na UI):
Estrelas: ${bcgMatrix.quadrantCounts.star} | Vacas Leiteiras: ${bcgMatrix.quadrantCounts.cash_cow} | Interrogações: ${bcgMatrix.quadrantCounts.question} | Abacaxis: ${bcgMatrix.quadrantCounts.dog}
${bcgSummary || "Sem produtos classificados na matriz BCG."}

Indicadores de saúde do catálogo (integrados em Produtos):
${catalogSummary}

Anomalias de produto (K-means):
${anomaliesSummary || "Nenhuma anomalia de produto detectada."}

Top produtos por receita:
${topProducts || "Sem dados de produtos."}`;
}

function buildCohortContext(dashboardState: DashboardData): string {
  const { cohortMatrix } = dashboardState;

  if (cohortMatrix.length === 0) {
    return `=== ANÁLISE DE COORTE (Churn Risk) ===
Sem coortes calculadas para o período analisado.`;
  }

  const alertCount = cohortMatrix.filter((c) => c.highChurnAlert).length;
  const cohortSummary = cohortMatrix
    .slice(0, 6)
    .map((row) => {
      const retentionText = row.retention
        .slice(0, 4)
        .map((pct, i) => `M${i}=${pct.toFixed(0)}%`)
        .join(", ");
      return `- Coorte ${row.cohortMonth}: ${row.cohortSize} clientes, retenção [${retentionText}]${row.highChurnAlert ? " ⚠️ ALTO CHURN (K-means)" : ""}`;
    })
    .join("\n");

  return `=== ANÁLISE DE COORTE (Churn Risk) ===
Coortes agrupadas pelo mês da primeira compra. Retenção mede % de clientes ativos em cada mês subsequente.
Coortes com alerta vermelho: ${alertCount} de ${cohortMatrix.length} (cruzamento com clusters K-means de alto churn e scores de risco).

${cohortSummary}`;
}

function buildSalesFunnelContext(dashboardState: DashboardData): string {
  const { overview, statuses } = dashboardState;
  const total = overview.totalPedidos;

  if (total === 0) {
    return `=== FUNIL DE CONVERSÃO (Painel Executivo) ===
Sem pedidos no período.`;
  }

  const paymentPending = statuses
    .filter((s) =>
      ["Pagamento Pendente", "Pendente", "Aguardando Confirmação", "Janela de Cancelamento"].includes(
        s.name,
      ),
    )
    .reduce((sum, s) => sum + s.count, 0);
  const paymentApproved = statuses
    .filter((s) =>
      ["Pagamento Aprovado", "Em Separação", "Pronto para Separação"].includes(s.name),
    )
    .reduce((sum, s) => sum + s.count, 0);
  const fulfilled = statuses
    .filter((s) =>
      ["Faturado", "Enviado", "Entregue", "Concluído"].includes(s.name),
    )
    .reduce((sum, s) => sum + s.count, 0);

  const stages = [
    { label: "Pedidos Criados", count: total, rate: 100 },
    { label: "Em Pagamento", count: paymentPending, rate: (paymentPending / total) * 100 },
    { label: "Pagamento Aprovado", count: paymentApproved, rate: (paymentApproved / total) * 100 },
    { label: "Entregues/Faturados", count: fulfilled, rate: (fulfilled / total) * 100 },
  ];

  let worstDropIdx = 1;
  let worstDrop = -1;
  for (let i = 1; i < stages.length; i++) {
    const drop = stages[i - 1].rate - stages[i].rate;
    if (drop > worstDrop) {
      worstDrop = drop;
      worstDropIdx = i;
    }
  }

  const stageSummary = stages
    .map(
      (s, i) =>
        `- ${s.label}: ${s.count} pedidos (${s.rate.toFixed(1)}%)${i === worstDropIdx ? " ← maior drop-off" : ""}`,
    )
    .join("\n");

  return `=== FUNIL DE CONVERSÃO (Painel Executivo) ===
Nota: visitas ao site não estão disponíveis via VTEX OMS — o funil inicia em pedido criado.

${stageSummary}

Maior perda entre "${stages[worstDropIdx - 1].label}" e "${stages[worstDropIdx].label}" (${worstDrop.toFixed(1)} p.p.).`;
}

function buildDashboardNavigationContext(): string {
  return `=== ESTRUTURA DO DASHBOARD (7 abas) ===
1. Painel Executivo — visão macro, plano de ação, funil de conversão
2. Segmentação — K-means com RFM (Recência, Frequência, Valor Monetário) + clusters detalhados
3. Churn Risk — scores de risco + análise de coorte com heatmap de retenção
4. CLV — valor vitalício estimado por cliente
5. Insights e Ações — oportunidades de receita + insights executivos (abas Oportunidades e Insights foram unificadas)
6. Produtos — clusters, diagnósticos, Curva ABC cruzada com Matriz BCG (aba Catálogo foi absorvida aqui)
7. Matriz BCG — mapa completo de portfólio por quadrante`;
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
Seu objetivo principal é explicar termos complexos (RFM, K-means, clusters, centróides, curva do cotovelo, score de silhueta, churn, coorte, CLV, Curva ABC, matriz BCG, funil de conversão) de forma extremamente simples, didática, amigável e descontraída em PORTUGUÊS (PT-BR) para um lojista totalmente leigo em programação e estatística.

Você tem acesso aos resultados completos dos modelos de Machine Learning executados sobre os dados reais da loja. Use SEMPRE esses dados numéricos nas respostas — nunca invente métricas.

${buildDashboardNavigationContext()}

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

${buildSalesFunnelContext(dashboardState)}

${buildAgrupamentoContext(dashboardState)}

${buildCustomerIntelligenceContext(dashboardState)}

${buildCohortContext(dashboardState)}

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
3. Cite números reais dos modelos ML (RFM, clusters, coortes, churn scores, CLV, Curva ABC, BCG, funil) ao dar recomendações.
4. Cruze informações entre abas quando relevante (ex: coorte com alto churn + segmento Em Risco + oportunidade de receita recuperável).
5. Destaque ações práticas segmentadas (ex: retenção para coortes em alerta, investir em estrelas BCG da Curva A, corrigir drop-off no funil de pagamento).
6. Saiba que o dashboard foi reorganizado: não existem mais abas separadas de Catálogo, Oportunidades ou Insights — use "Insights e Ações" e "Produtos".
7. O K-means de clientes usa RFM como entrada; explique Recência (dias desde última compra), Frequência (pedidos) e Valor Monetário (receita total).
8. Mantenha os textos curtos e divididos em parágrafos legíveis.
9. Use formatação markdown (títulos, negrito, listas) — ela será renderizada corretamente.
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
    msg.includes("rfm") ||
    msg.includes("recência") ||
    msg.includes("recencia") ||
    msg.includes("frequência") ||
    msg.includes("frequencia")
  ) {
    const rfmTexts = dashboardState.clusters
      .filter((c) => c.rfm)
      .map(
        (c) =>
          `* **${c.rfmLabel ?? c.name}** (Cluster ${c.id}): recência ${c.rfm!.recencia}d, frequência ${c.rfm!.frequencia} ped., valor ${formatCurrency(c.rfm!.valorMonetario)}`,
      )
      .join("\n");

    return `📊 **RFM — Recência, Frequência e Valor Monetário**

O K-means agora segmenta clientes usando essas 3 variáveis normalizadas:

${rfmTexts || "* Perfis RFM ainda não calculados para este lote."}

**Como interpretar:**
* **Recência baixa** = cliente comprou recentemente (bom sinal)
* **Frequência alta** = cliente compra com regularidade
* **Valor alto** = cliente gera mais receita

Rótulos automáticos incluem Campeões, Em Risco, Alto Potencial, Fiéis e Hibernando.

${setupNote}`;
  }

  if (
    msg.includes("cluster") ||
    msg.includes("agrupamento") ||
    msg.includes("grupo") ||
    msg.includes("segment")
  ) {
    const clusterTexts = dashboardState.clusters
      .map(
        (c) =>
          `**${c.rfmLabel ? `${c.rfmLabel} — ` : ""}Grupo ${c.id}** — ${c.count} clientes, ticket ${formatCurrency(c.averageValue)}, via ${c.payment}${c.rfm ? `, RFM: ${c.rfm.recencia}d / ${c.rfm.frequencia} ped.` : ""}`,
      )
      .join("\n");

    return `📊 **Segmentação com K-means + RFM**

Pense em **Clusters** como **"Grupos de Comportamento dos Seus Clientes"**, criados automaticamente a partir de Recência, Frequência e Valor Monetário:

${clusterTexts}

*Focar nos grupos Campeões e replicar o padrão deles é o segredo para crescer!*

${setupNote}`;
  }

  if (
    msg.includes("coorte") ||
    msg.includes("cohort") ||
    msg.includes("reten")
  ) {
    const cohortTexts =
      dashboardState.cohortMatrix.length > 0
        ? dashboardState.cohortMatrix
            .slice(0, 4)
            .map((row) => {
              const m1 = row.retention[1] ?? row.retention[0];
              return `* **${row.cohortMonth}**: ${row.cohortSize} clientes, retenção M1 ${m1?.toFixed(0) ?? "—"}%${row.highChurnAlert ? " ⚠️ alto churn" : ""}`;
            })
            .join("\n")
        : "* Sem coortes calculadas no período.";

    return `📅 **Análise de Coorte**

Coortes agrupam clientes pelo mês da primeira compra e medem quantos continuam ativos nos meses seguintes.

${cohortTexts}

Coortes em alerta (vermelho): **${dashboardState.cohortMatrix.filter((c) => c.highChurnAlert).length}**

**Ações sugeridas:**
1. Priorize retenção nas coortes com queda abrupta entre Mês 0 e Mês 1.
2. Cruze coortes em alerta com clientes de churn alto/crítico.
3. Compare coortes recentes vs. antigas para ver se a retenção está melhorando.

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

    const cohortAlerts = dashboardState.cohortMatrix.filter(
      (c) => c.highChurnAlert,
    ).length;

    return `🛡️ **Análise de Churn Risk**

Receita total em risco: **${formatCurrency(dashboardState.customerIntelligenceSummary.revenueAtRisk)}**
Coortes com alerta de alto churn: **${cohortAlerts}**

Clientes mais críticos:
${churnTexts}

**Ações sugeridas:**
1. Contate clientes em risco alto/crítico com oferta personalizada.
2. Analise o heatmap de coorte na aba Churn Risk para contexto temporal.
3. Monitore segmentos "Em Risco" do K-means RFM.

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
    msg.includes("abc") ||
    msg.includes("curva a") ||
    msg.includes("pareto")
  ) {
    const abcProducts = computeABCCurve(dashboardState.bcgMatrix.products);
    const abcTexts = abcProducts
      .slice(0, 5)
      .map(
        (p) =>
          `* **[${p.curve}] ${p.productName}**: ${formatCurrency(p.revenue)} (${p.revenueShare.toFixed(1)}%)`,
      )
      .join("\n");
    const counts = {
      A: abcProducts.filter((p) => p.curve === "A").length,
      B: abcProducts.filter((p) => p.curve === "B").length,
      C: abcProducts.filter((p) => p.curve === "C").length,
    };

    return `📈 **Curva ABC**

Classificação por faturamento acumulado:
* **Curva A** (${counts.A} produtos): até 80% da receita — prioridade máxima
* **Curva B** (${counts.B} produtos): até 95% — monitorar
* **Curva C** (${counts.C} produtos): cauda longa

Top produtos:
${abcTexts || "* Sem dados ABC."}

Na aba Produtos, você pode cruzar a Curva ABC com a Matriz BCG filtrando por curva.

${setupNote}`;
  }

  if (
    msg.includes("funil") ||
    msg.includes("convers") ||
    msg.includes("checkout") ||
    msg.includes("pagamento aprovado")
  ) {
    const funnelBlock = buildSalesFunnelContext(dashboardState);
    return `🔄 **Funil de Conversão (Painel Executivo)**

${funnelBlock.replace("=== FUNIL DE CONVERSÃO (Painel Executivo) ===\n", "")}

**Ações sugeridas:**
1. Ataque a etapa com maior drop-off identificada acima.
2. Se a perda for em pagamento, incentive PIX com desconto.
3. Se a perda for pós-aprovação, revise logística e comunicação de status.

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

    const abcProducts = computeABCCurve(dashboardState.bcgMatrix.products);
    const abcTexts = abcProducts
      .filter((p) => p.curve === "A")
      .slice(0, 3)
      .map((p) => `* **[A] ${p.productName}**: ${formatCurrency(p.revenue)}`)
      .join("\n");

    const bcgTexts = dashboardState.bcgMatrix.products
      .slice(0, 4)
      .map(
        (product) =>
          `* **${product.productName}** — ${product.quadrant}: share ${product.revenueShare.toFixed(1)}%, crescimento ${product.growthRate.toFixed(1)}%`,
      )
      .join("\n");

    const catalog = dashboardState.catalogHealth.summary;

    return `📦 **Produtos (aba unificada)**

A aba Produtos concentra clusters, Curva ABC, Matriz BCG e indicadores de saúde do catálogo.

Curva A (campeões de faturamento):
${abcTexts || "* Sem produtos na Curva A."}

Diagnósticos automáticos:
${diagnosticTexts || "* Sem diagnósticos no período analisado."}

Matriz BCG (top produtos):
${bcgTexts || "* Sem classificação BCG disponível."}

Saúde do catálogo:
* **${catalog.paretoCount}** produtos concentram **${catalog.paretoRevenueShare.toFixed(0)}%** da receita
* **${catalog.noSale90Count}** sem venda há 90 dias
* **${catalog.decliningCount}** em queda | **${catalog.growingCount}** em crescimento

**Ações sugeridas:**
1. Proteja produtos Curva A e invista em estrelas BCG entre eles.
2. Avalie descontinuar itens Curva C sem tração na BCG.
3. Use o filtro BCG por curva na aba Produtos para focar nos campeões.

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
    msg.includes("insight") ||
    msg.includes("ação") ||
    msg.includes("acao") ||
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

    const insightTexts =
      dashboardState.executiveInsights.length > 0
        ? dashboardState.executiveInsights
            .slice(0, 4)
            .map(
              (i) =>
                `* **[${i.priority}]** ${i.text} (impacto ${formatCurrency(i.financialImpact)})`,
            )
            .join("\n")
        : "* Sem insights executivos no momento.";

    return `💡 **Insights e Ações**

Receita recuperável: **${formatCurrency(dashboardState.customerIntelligenceSummary.recoverableRevenue)}**
Receita incremental: **${formatCurrency(dashboardState.customerIntelligenceSummary.incrementalRevenue)}**
Receita em risco: **${formatCurrency(dashboardState.customerIntelligenceSummary.revenueAtRisk)}**

Oportunidades de receita:
${oppTexts}

Insights executivos:
${insightTexts}

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
* **${dashboardState.overview.totalClientes} clientes** em **${dashboardState.overview.totalClusters} clusters RFM**
* **${dashboardState.overview.totalPedidos} pedidos** · cancelamento **${overview.taxaCancelamento.toFixed(1)}%**
* CLV total: **${formatCurrency(dashboardState.overview.clvTotal)}**
* **${dashboardState.cohortMatrix.length} coortes** analisadas

Posso ajudar com:
* **"RFM / clusters"** — segmentação K-means com Recência, Frequência e Valor
* **"churn / coorte"** — risco de abandono e retenção temporal
* **"CLV"** — valor vitalício dos clientes
* **"produtos / ABC / BCG"** — Curva ABC cruzada com matriz BCG
* **"funil"** — conversão do pedido ao pagamento/entrega
* **"insights e ações"** — oportunidades e recomendações prescritivas

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
