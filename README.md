# Crystal

Dashboard de inteligência para e-commerce que conecta à VTEX OMS, aplica machine learning e gera diagnósticos estratégicos de portfólio, clientes, estoque e riscos operacionais.

## O que o Crystal faz

- **Clustering de pedidos** com K-Prototypes (dados numéricos + categóricos: pagamento, origem, canal, status)
- **Segmentação RFM** de clientes com recomendações de ação por segmento
- **Diagnósticos de portfólio** — dependência de produto campeão, riscos, estratégias priorizadas e impacto financeiro estimado
- **Análise de estoque** — curva ABC, risco de ruptura e estoque parado
- **Detecção de fraude** heurística em pedidos suspeitos
- **Previsão de demanda** por SKU com recomendações de compra
- **Alertas operacionais** com severidade, impacto financeiro e ação recomendada
- **Health Score** consolidado (cancelamento, entrega, estoque, concentração de receita, fraude)
- **Mentor IA** (Gemini) com contexto do dashboard para perguntas em linguagem natural
- **Exportação de relatório HTML** a partir do dashboard

## Stack

| Camada | Tecnologias |
|--------|-------------|
| App | Next.js 16, React 19, Tailwind CSS 4 |
| Backend | Server Actions (sem API Routes) |
| ML | K-Prototypes, K-Means (produtos), heurísticas estatísticas |
| IA | Google Gemini (`@google/genai`) |
| Gráficos | Recharts |
| Testes | Vitest |

## Arquitetura

```
app/page.tsx (SSR)
        │
        ▼
backend/actions/analysis.ts          ← Server Action principal
        │
        ├── vtex.service.ts          ← fetch pedidos VTEX OMS
        ├── normalization.service.ts ← processamento + normalização min-max
        ├── kprototype.service.ts    ← clustering de pedidos (mixed data)
        ├── product-kmeans.service.ts ← anomalias por produto
        ├── diagnostics.service.ts   ← portfólio, riscos e estratégias
        ├── rfm.service.ts           ← segmentação de clientes
        ├── inventory.service.ts     ← ABC, ruptura, estoque parado
        ├── fraud.service.ts         ← flags de fraude
        ├── forecast.service.ts      ← previsão de demanda
        ├── alerts.service.ts        ← alertas consolidados
        ├── financial.service.ts     ← impacto financeiro nas estratégias
        └── health.service.ts        ← score de saúde da operação

frontend/lib/mapper.ts               ← AnalysisResult → DashboardData
frontend/components/Dashboard.tsx    ← abas e visualizações
backend/actions/chat.ts              ← Mentor IA (Gemini)
```

**Convenções:**

- **Actions** (`backend/actions/`): ponto de entrada do frontend. Orquestram services e retornam dados tipados.
- **Services** (`backend/services/`): lógica de negócio pura — fetch VTEX, normalização, ML e diagnósticos.
- **Types** (`backend/types/`): contratos TypeScript do backend.
- O frontend se comunica **apenas via Server Actions** — não há API Routes.

## Pré-requisitos

- Node.js 22+
- Conta VTEX com credenciais de app (App Key + App Token) e acesso à OMS
- *(Opcional)* Chave da API Google Gemini para o Mentor IA

## Configuração

1. Clone o repositório e instale as dependências:

```bash
git clone https://github.com/lucasdksan/crystal.git
cd crystal
npm install
```

2. Copie `.env.example` para `.env.local` e preencha as credenciais:

```env
VTEX_BASE_URL=https://your-account.myvtex.com/
VTEX_APP_KEY=your-app-key
VTEX_APP_TOKEN=your-app-token

# Opcional — Mentor IA (Gemini)
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.5-flash
```

3. Inicie o servidor de desenvolvimento:

```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000). A página inicial executa `runAnalysis()` no servidor e renderiza o dashboard com os dados retornados.

## Dashboard

| Aba | Conteúdo |
|-----|----------|
| **Resumo Executivo** | KPIs, health score, diagnóstico e visão geral |
| **Clientes** | Clusters de pedidos (K-Prototypes) e perfis |
| **Relacionamento** | Segmentação RFM e recomendações |
| **Estoque** | Curva ABC, risco de ruptura, estoque parado |
| **Alertas** | Alertas operacionais priorizados por impacto |
| **Riscos** | Riscos de portfólio e flags de fraude |
| **Oportunidades** | Estratégias, kits e previsões de compra |

Use o filtro **De / Até** (calendário nativo) e clique em **Aplicar** para reexecutar a análise em um período específico. O formato de data segue o padrão do Admin VTEX (`f_creationDate`).

O **Mentor IA** fica disponível como painel lateral quando `GEMINI_API_KEY` está configurada.

## Uso programático

```tsx
import { runAnalysis } from "@/backend/actions/analysis";

// Lote padrão (comportamento SSR da página inicial)
const response = await runAnalysis();

// Com filtro de período
const filtered = await runAnalysis({
  startDate: "2026-04-01T00:00:00.000Z",
  endDate: "2026-06-30T23:59:59.999Z",
  perPage: 50,
  page: 1,
});

if (!response.success) {
  console.error(response.error);
  return;
}

const {
  orders,
  kprototypes,
  productKmeans,
  diagnostics,
  normalizationMeta,
  rfm,
  inventory,
  alerts,
  fraud,
  forecast,
  healthScore,
} = response.data;
```

## Contrato de dados — `runAnalysis()`

A action retorna um discriminated union:

```ts
type AnalysisResponse =
  | { success: true; data: AnalysisResult }
  | { success: false; error: string };
```

### `AnalysisResult`

| Campo | Descrição |
|-------|-----------|
| `orders` | Pedidos processados com campos codificados para ML |
| `kprototypes` | Clustering K-Prototypes de pedidos (mixed data) |
| `productKmeans` | Clustering de produtos para detecção de anomalias |
| `diagnostics` | Diagnósticos, riscos, estratégias e scores de portfólio |
| `normalizationMeta` | Limites min-max usados na normalização |
| `rfm` | Segmentação RFM de clientes |
| `inventory` | Curva ABC, ruptura e estoque parado |
| `alerts` | Alertas operacionais consolidados |
| `fraud` | Pedidos sinalizados e resumo de exposição |
| `forecast` | Previsões por SKU e recomendações de compra |
| `healthScore` | Score de saúde da operação (0–100 por dimensão) |

### Vetor de features (pedidos)

**Numérico (4 dims):** `totalValue`, `totalItems`, `totalQuantity`, `avgPrice`

**Categórico (5 dims):** `paymentMethod`, `origin`, `salesChannel`, `status`, `dayOfWeek`

Os valores numéricos passam por normalização min-max antes do clustering. O K-Prototypes escolhe automaticamente o K ótimo entre candidatos `k = 3 … 8` pelo maior score de silhueta.

### Relação entre arrays

Arrays indexados (`kprototypes.clusters`, etc.) seguem a **mesma ordem** de `orders[]`:

```ts
orders[i]                  → pedido
kprototypes.clusters[i]    → cluster do pedido
kprototypes.orderDistances[i] → distância ao centróide
```

### `DiagnosticsResult` (resumo)

```ts
{
  diagnosis: {
    executiveSummary: string;
    excessiveDependency: boolean;  // campeão > 50% do volume
    championProduct: string;
    bottleneckProduct: string;
  };
  risks: { product, riskType, severity }[];
  strategies: {
    type: StrategyType;            // RISK_MITIGATION | DIVERSIFICATION | KIT_OPPORTUNITY | ...
    label: string;
    confidenceScore: number;       // 0–1
    impactScore: number;
    riskScore: number;
    priorityScore: number;         // impactScore × confidenceScore
    justifications: string[];
    evidence: Record<string, unknown>;
    actions: { label, description }[];
    kits?: { commercialName, compositeItems, strategicObjective, salesRationale }[];
    financialImpact?: { problem, estimatedLoss, recommendedAction, estimatedRecovery, estimatedCost, roi, priority };
  }[];
  productStats: ProductStat[];
  productScores: ProductScore[];   // stats + riskScore, bundleScore, volumeShare
  portfolioScores: { dependencyScore, portfolioRiskScore, cancelRateNorm, portfolioHealth, avgBundleScore };
}
```

Tipos completos em [`backend/types/analysis.ts`](backend/types/analysis.ts).

## Estrutura do projeto

```
app/                    # Rotas Next.js (App Router)
backend/
  actions/              # Server Actions (analysis, chat)
  services/             # Lógica de negócio e ML
  types/                # Tipos do backend
frontend/
  components/           # Abas e componentes do dashboard
  lib/                  # Mapper, datas VTEX, relatório HTML, simulação
  types/                # Tipos do dashboard
tests/
  unit/                 # Testes de services e libs
  integration/          # Testes de actions e VTEX
  fixtures/             # Dados de exemplo
```

## Testes

```bash
npm run test           # roda todos os testes
npm run test:watch     # modo interativo
npm run test:coverage  # relatório de cobertura
```

A CI (GitHub Actions) executa lint, testes e build em cada push/PR para `main`/`master`.

## Scripts

```bash
npm run dev            # servidor de desenvolvimento
npm run build          # build de produção
npm run start          # servidor de produção
npm run lint           # ESLint
```

## Licença

ISC — veja [LICENSE](LICENSE).
