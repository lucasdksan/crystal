export type HealthState = "critical" | "warning" | "healthy" | "simulation";

export function getHealthState(
  taxaCancelamento: number,
  isSimulation: boolean,
): HealthState {
  if (isSimulation) return "simulation";
  if (taxaCancelamento > 50) return "critical";
  if (taxaCancelamento < 15) return "healthy";
  return "warning";
}

export const EXECUTIVE_TITLES: Record<HealthState, string> = {
  critical:
    "Sua Loja possui uma Ilusão de Caixa e Carga Logística Estéril.",
  warning: "Sua Loja opera com Alto Risco de Receita. Corrija agora.",
  healthy: "Sua Loja está Saudável. Continue escalando com inteligência.",
  simulation:
    "Cenário ilustrativo — meta de 15% de cancelamento (dados fictícios).",
};

export const ACTION_PLAN_HEADERS: Record<HealthState, string> = {
  critical: "Prioridades para Sair do Abismo",
  warning: "Ações Urgentes para Estabilizar Receita",
  healthy: "Próximos Passos para Escalar",
  simulation: "Manter o Momentum Pós-Correção",
};

export const ACTION_PLAN_ITEMS: Record<
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

export const ACTION_PLAN_FOOTNOTES: Record<HealthState, string> = {
  critical:
    "*Garantia: Resolver boletos eleva o lucro líquido em até 45% sem necessidade de aumentar novos anúncios.",
  warning:
    "*Dados reais: cada ponto percentual de cancelamento reduzido representa receita líquida recuperada imediatamente.",
  healthy:
    "*Parabéns! Sua taxa de cancelamento está abaixo de 15% — foco agora em crescimento e retenção.",
  simulation:
    "*Cenário ilustrativo: estes dados são fictícios e não refletem predição real da sua loja.",
};

export const actionPlanColorClasses: Record<
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
