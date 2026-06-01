import type { DashboardData } from "@/frontend/types/dashboard";

export const HEALTHY_OVERRIDE: Partial<DashboardData> = {
  reportId: "K-Opt-Healthy-Sim",
  reportDate: "Cenário Ilustrativo",
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
      "Cenário ilustrativo: loja em rota de recuperação comercial com meta de 15% de cancelamento. Dados fictícios para demonstração.",
    championProduct: "Produto Campeão de Vendas",
    bottleneckProduct: "Nenhum gargalo de estoque ativo no momento",
    risks: [
      {
        product: "Item de baixo risco",
        type: "Equilíbrio de Estoque",
        gravity: "Baixo",
      },
    ],
    suggestions: [],
    allStrategies: [],
    clusterRisks: [],
  },
};

export function applyHealthySimulation(current: DashboardData): DashboardData {
  return {
    ...current,
    ...HEALTHY_OVERRIDE,
    overview: { ...current.overview, ...HEALTHY_OVERRIDE.overview },
    statuses: HEALTHY_OVERRIDE.statuses ?? current.statuses,
    diagnostics: HEALTHY_OVERRIDE.diagnostics ?? current.diagnostics,
  };
}
