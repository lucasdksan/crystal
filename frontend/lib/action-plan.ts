export type HealthState = "critical" | "warning" | "healthy";

export function getHealthState(taxaCancelamento: number): HealthState {
  if (taxaCancelamento > 50) return "critical";
  if (taxaCancelamento < 15) return "healthy";
  return "warning";
}

export const EXECUTIVE_TITLES: Record<HealthState, string> = {
  critical:
    "Sua Loja possui uma Ilusão de Caixa e Carga Logística Estéril.",
  warning: "Sua Loja opera com Alto Risco de Receita. Corrija agora.",
  healthy: "Sua Loja está Saudável. Continue escalando com inteligência.",
};

export const ACTION_PLAN_HEADERS: Record<HealthState, string> = {
  critical: "Prioridades para Sair do Abismo",
  warning: "Ações Urgentes para Estabilizar Receita",
  healthy: "Próximos Passos para Escalar",
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
      desc: "Identifique grupos com cancelamento acima de 30% e restrinja métodos problemáticos.",
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
      desc: "Analise os grupos com alta conversão e incentive o mesmo perfil de compra.",
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
};

export const ACTION_PLAN_FOOTNOTES: Record<HealthState, string> = {
  critical:
    "*Garantia: Resolver boletos eleva o lucro líquido em até 45% sem necessidade de aumentar novos anúncios.",
  warning:
    "*Dados reais: cada ponto percentual de cancelamento reduzido representa receita líquida recuperada imediatamente.",
  healthy:
    "*Parabéns! Sua taxa de cancelamento está abaixo de 15% — foco agora em crescimento e retenção.",
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
