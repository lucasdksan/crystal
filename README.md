# Crystal

Projeto para análise de performance em e-commerces usando machine learning. O backend busca pedidos na VTEX OMS, aplica clustering (K-Means + SOM) e gera diagnósticos estratégicos de portfólio.

## Arquitetura

```
Frontend (Client Components)
        │
        ▼
backend/actions/analysis.ts   ← Server Actions (controller)
        │
        ├── backend/services/vtex.service.ts
        ├── backend/services/normalization.service.ts
        ├── backend/services/kmeans.service.ts
        ├── backend/services/som.service.ts
        └── backend/services/diagnostics.service.ts
```

- **Actions** (`backend/actions/`): ponto de entrada do frontend. Orquestram os services e retornam dados tipados.
- **Services** (`backend/services/`): lógica de negócio pura — fetch VTEX, normalização, ML e diagnósticos.
- **Types** (`backend/types/`): contratos TypeScript do backend.
- **Ambient types** (`types/`): declarações de tipos para pacotes sem `@types` (ex: `ml-som`).

O frontend deve se comunicar **apenas via Server Actions**. Não há API Routes.

## Configuração

Copie `.env.example` para `.env.local` e preencha as credenciais:

```env
VTEX_BASE_URL=https://your-account.myvtex.com/
VTEX_APP_KEY=your-app-key
VTEX_APP_TOKEN=your-app-token

# Opcional — Mentor IA (Gemini)
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.5-flash

# Opcional — iterações do SOM (padrão: 20)
SOM_ITERATIONS=20
```

## Uso no Frontend

```tsx
import { runAnalysis } from "@/backend/actions/analysis";

// Lote padrão (comportamento SSR atual)
const response = await runAnalysis();

// Com filtro de período (mesmo formato do Admin VTEX: f_creationDate)
const filtered = await runAnalysis({
  startDate: "2026-04-01T00:00:00.000Z",
  endDate: "2026-06-30T23:59:59.999Z",
  perPage: 50,
  page: 1,
});
```

No dashboard, use os campos **De** / **Até** (calendário nativo) e clique em **Aplicar**. Ex.: 01/04/2026 até 30/06/2026.

```tsx
if (!response.success) {
  console.error(response.error);
  return;
}

const { orders, kmeans, som, productKmeans, diagnostics, normalizationMeta } =
  response.data;
```

## Contrato de Dados — `runAnalysis()`

A action retorna um discriminated union:

```ts
type AnalysisResponse =
  | { success: true; data: AnalysisResult }
  | { success: false; error: string };
```

### `AnalysisResult`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `orders` | `ProcessedOrder[]` | Pedidos enriquecidos com campos codificados para ML |
| `kmeans` | `KmeansResult` | Resultado do clustering K-Means (pedidos) |
| `som` | `SomResult` | Resultado do Self-Organizing Map |
| `productKmeans` | `ProductKmeansResult` | Clustering de produtos para anomalias |
| `diagnostics` | `DiagnosticsResult` | Diagnósticos estratégicos de portfólio |
| `normalizationMeta` | `{ mins, maxs }` | Limites min-max usados na normalização (9 dims) |

---

### `ProcessedOrder`

Cada pedido contém os dados originais mais campos numéricos para clustering:

```ts
{
  orderId: string;
  clientName: string;
  creationDate: string;          // ISO 8601
  items: ProcessedOrderItem[];
  totalValue: number;
  totalItems: number;
  origin: number;                // codificado (Marketplace = 0, desconhecido = -1)
  paymentNames: number;          // codificado (Pix = 3, Cartão de Crédito = 4, etc.)
  status: number;                // codificado (canceled = 0, delivered = 4, etc.)
  statusRaw: string;             // valor original da VTEX
  paymentRaw: string;
  originRaw: string;
  hourOfDay: number;             // 0–23
  dayOfWeek: number;             // 0–6 (domingo = 0)
  salesChannel: number;          // codificado dinamicamente
  salesChannelRaw: string;
  workflowInErrorState: number;    // 0 ou 1
  isAllDelivered: number;        // 0 ou 1
}
```

**Vetor de features (9 dimensões):** `totalValue`, `totalItems`, `totalQuantity`, `avgPrice`, `origin`, `paymentNames`, `hourOfDay`, `dayOfWeek`, `salesChannel`. Os valores são normalizados (min-max) antes do clustering.

---

### `KmeansResult`

```ts
{
  clusters: number[];              // cluster id por pedido (mesmo índice de orders[])
  centroids: number[][];           // coordenadas de cada centróide
  orderDistances: number[];        // distância euclidiana ao centróide
  elbowAnalysis: { k: number; wcss: number }[];  // curva do cotovelo
  silhouetteAnalysis: { k: number; score: number }[];  // silhueta por K
  bestK: number;                   // K ótimo (silhueta média, mínimo 3)
}
```

O K é escolhido automaticamente entre candidatos `k = 1 … 8` pelo maior **score de silhueta** entre `k >= 3`, não por valor fixo.

---

### `SomResult`

```ts
{
  predictions: [number, number][]; // posição [x, y] no grid SOM por pedido
  gridX: number;                   // largura do grid (3–8)
  gridY: number;                   // altura do grid (3–8)
}
```

---

### `ProductKmeansResult`

```ts
{
  productKeys: string[];   // chaves dos produtos elegíveis (>= 2 pedidos)
  clusters: number[];      // cluster por produto
  distances: number[];     // distância ao centróide (base do score de anomalia)
  bestK: number;
}
```

---

### `DiagnosticsResult`

```ts
{
  diagnosis: {
    executiveSummary: string;      // resumo executivo em texto
    excessiveDependency: boolean;  // true se campeão > 50% do volume
    championProduct: string;       // produto com maior volume efetivo
    bottleneckProduct: string;     // produto com pior relação cancelamento/volume
  };
  risks: {
    product: string;
    riskType: string;              // "Ilusão de Receita (Cancelamentos)" | "Estoque Parado"
    severity: string;                // "Alta" | "Média"
  }[];
  strategies: {
    type: string;                    // RISK_MITIGATION | DIVERSIFICATION | KIT_OPPORTUNITY | ...
    label: string;                   // label legível em português
    confidenceScore: number;         // 0–1
    impactScore: number;             // 0–1
    riskScore: number;               // 0–1
    priorityScore: number;           // impactScore × confidenceScore
    justifications: string[];
    evidence: Record<string, unknown>;
    actions: { label: string; description: string }[];
    kits?: {
      commercialName: string;
      compositeItems: string[];
      strategicObjective: string;
      salesRationale: string;
    }[];
  }[];
  productStats: ProductStat[];       // estatísticas brutas por produto
  productScores: ProductScore[];     // stats + riskScore, bundleScore, volumeShare
  portfolioScores: {
    dependencyScore: number;         // 0–1, share do produto campeão
    portfolioRiskScore: number;      // 0–1
    cancelRateNorm: number;          // 0–1
    portfolioHealth: number;         // 0–1
    avgBundleScore: number;          // 0–1
  };
}
```

---

## Relação entre arrays

Todos os arrays indexados (`clusters`, `predictions`) seguem a **mesma ordem** de `orders[]`:

```ts
orders[i]        → pedido
kmeans.clusters[i] → cluster do pedido
som.predictions[i] → posição [x, y] no mapa SOM
```

## Visualização

A geração de gráficos e relatórios HTML (antigo `charts.js`) é responsabilidade do **frontend**. Os dados retornados por `runAnalysis()` contêm tudo necessário para renderizar:

- Curva do cotovelo → `kmeans.elbowAnalysis`
- Scatter de clusters → `kmeans.clusters` + `orders`
- Mapa SOM → `som.predictions` + `som.gridX/gridY`
- KPIs e diagnósticos → `diagnostics.*`

## Scripts

```bash
npm run dev           # servidor de desenvolvimento
npm run build         # build de produção
npm run lint          # lint
npm run test          # roda todos os testes
npm run test:watch    # modo interativo
npm run test:coverage # relatório de cobertura
```
