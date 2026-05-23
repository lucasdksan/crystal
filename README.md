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

Copie `.env.example` para `.env.local` e preencha as credenciais VTEX:

```env
VTEX_BASE_URL=https://your-account.myvtex.com/
VTEX_APP_KEY=your-app-key
VTEX_APP_TOKEN=your-app-token
```

## Uso no Frontend

```tsx
import { runAnalysis } from "@/backend/actions/analysis";

const response = await runAnalysis();

if (!response.success) {
  console.error(response.error);
  return;
}

const { orders, kmeans, som, diagnostics } = response.data;
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
| `kmeans` | `KmeansResult` | Resultado do clustering K-Means |
| `som` | `SomResult` | Resultado do Self-Organizing Map |
| `diagnostics` | `DiagnosticsResult` | Diagnósticos estratégicos de portfólio |

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
  elbowAnalysis: { k: number; wcss: number }[];  // curva do cotovelo
  bestK: number;                   // K ótimo selecionado (mínimo 4)
}
```

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
npm run dev      # servidor de desenvolvimento
npm run build    # build de produção
npm run lint     # lint
```
