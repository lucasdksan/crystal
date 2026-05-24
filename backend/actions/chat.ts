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
  const { overview, clusters, diagnostics } = dashboardState;

  const clusterSummary = clusters
    .map(
      (c) =>
        `- ${c.name}: ${c.count} pedidos (${c.percentage}%), ticket médio R$ ${c.averageValue.toFixed(2)}, cancelamento ${c.cancelRate}%, receita ${c.revenueShare}% da loja, pagamento via ${c.payment}, entrega ${c.deliveryRate.toFixed(0)}%.${c.topProducts.length > 0 ? ` Top produto: ${c.topProducts[0].name}.` : ""}`,
    )
    .join("\n");

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

  return `Você é o "Crystal Copilot", um consultor de negócios especializado em e-commerce, análise de dados de vendas (K-Means, mapas SOM) e mentoria comercial.
Seu objetivo principal é explicar termos complexos (como clusters, centróides, mapa SOM, score de silhueta) de forma extremamente simples, didática, amigável e descontraída em PORTUGUÊS (PT-BR) para um lojista totalmente leigo em programação e estatística.

Dados atuais da loja:
- Faturamento Total: R$ ${overview.receitaTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
- Ticket Médio: R$ ${overview.ticketMedio.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
- Taxa de Cancelamento: ${overview.taxaCancelamento.toFixed(1)}%${overview.taxaCancelamento > 50 ? " (CRÍTICO!)" : ""}
- Taxa de Entrega: ${overview.taxaEntrega.toFixed(1)}%
- Total de Pedidos: ${overview.totalPedidos}
- Total de Clusters: ${overview.totalClusters}
- Score de Silhueta do K selecionado: ${dashboardState.bestSilhouetteScore.toFixed(3)}

Resumo dos Clusters (com métricas comerciais):
${clusterSummary}

Clusters de maior risco:
${clusterRiskSummary || "Nenhum cluster de risco crítico identificado."}

Estratégias prioritárias do Diagnostics:
${strategySummary || "Nenhuma estratégia adicional disponível."}

Produto campeão: ${diagnostics.championProduct}
Produto gargalo: ${diagnostics.bottleneckProduct}

Diretrizes:
1. Responda educadamente, focando no crescimento do lojista.
2. Explique os termos como se estivesse conversando com um amigo que tem uma lojinha física.
3. Destaque ações práticas segmentadas por cluster (ex: desativar boleto só no cluster de risco, campanha PIX no horário de pico do cluster saudável).
4. Cruze informações de clusters com estratégias do Diagnostics quando relevante.
5. Mantenha os textos curtos e divididos em parágrafos legíveis.`;
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
    msg.includes("kmeans") ||
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

  if (msg.includes("som") || msg.includes("mapa") || msg.includes("neur")) {
    return `🗺️ **O que é o Mapa SOM (Self-Organizing Map)?**

Imagine um tabuleiro onde cada cliente ocupa uma casinha de acordo com o quanto se parece com os vizinhos. Clientes parecidos ficam próximos!

* **Casas vazias**: Comportamentos que sua loja nunca registrou.
* **Casas cheias com vermelho**: Zona de alto risco (muitos cancelamentos concentrados).
* **Casas cheias com verde**: Zona saudável de pagamento imediato.

O SOM complementa o K-Means mostrando visualmente *onde* cada grupo está no espectro de comportamento.

${setupNote}`;
  }

  return `👋 **Olá! Sou o Crystal Copilot, seu mentor de vendas.**

Estou analisando seu e-commerce agora. Vejo que sua loja tem **${dashboardState.overview.totalPedidos} pedidos** e taxa de cancelamento de **${overview.taxaCancelamento.toFixed(1)}%**.

Posso ajudar com:
* **"como reduzir cancelamento"** — plano de ação tático
* **"explicar clusters"** — quem são seus compradores
* **"meio de pagamento"** — alternativas de faturamento imediato
* **"o que é SOM"** — explicação do mapa de comportamento

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
