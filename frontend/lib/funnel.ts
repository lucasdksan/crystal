import type { DashboardData } from "@/frontend/types/dashboard";

export interface FunnelStage {
  id: string;
  label: string;
  count: number;
  rate: number;
}

const PAYMENT_PENDING_NAMES = new Set([
  "Pagamento Pendente",
  "Pendente",
  "Aguardando Confirmação",
  "Janela de Cancelamento",
]);

const PAYMENT_APPROVED_NAMES = new Set([
  "Pagamento Aprovado",
  "Em Separação",
  "Pronto para Separação",
]);

const FULFILLED_NAMES = new Set([
  "Faturado",
  "Enviado",
  "Entregue",
  "Concluído",
]);

function countByNames(
  statuses: DashboardData["statuses"],
  names: Set<string>,
): number {
  return statuses
    .filter((s) => names.has(s.name))
    .reduce((sum, s) => sum + s.count, 0);
}

export function buildFunnelStages(data: DashboardData): FunnelStage[] {
  const total = data.overview.totalPedidos;
  if (total === 0) return [];

  const paymentPending = countByNames(data.statuses, PAYMENT_PENDING_NAMES);
  const paymentApproved = countByNames(data.statuses, PAYMENT_APPROVED_NAMES);
  const fulfilled = countByNames(data.statuses, FULFILLED_NAMES);

  return [
    {
      id: "created",
      label: "Pedidos Criados",
      count: total,
      rate: 100,
    },
    {
      id: "payment",
      label: "Em Pagamento",
      count: paymentPending,
      rate: (paymentPending / total) * 100,
    },
    {
      id: "approved",
      label: "Pagamento Aprovado",
      count: paymentApproved,
      rate: (paymentApproved / total) * 100,
    },
    {
      id: "fulfilled",
      label: "Entregues / Faturados",
      count: fulfilled,
      rate: (fulfilled / total) * 100,
    },
  ];
}

export function findWorstDropoff(stages: FunnelStage[]): number {
  if (stages.length < 2) return -1;

  let worstIdx = 0;
  let worstDrop = -1;

  for (let i = 1; i < stages.length; i++) {
    const drop = stages[i - 1].rate - stages[i].rate;
    if (drop > worstDrop) {
      worstDrop = drop;
      worstIdx = i;
    }
  }

  return worstIdx;
}
