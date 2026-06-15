import type { FinancialImpact } from "@/backend/types/analysis";

export interface FinancialContext {
  totalRevenue: number;
  cancelRate: number;
  totalOrders: number;
  ticketMedio: number;
}

export function calculateFinancialImpact(
  problem: string,
  recommendedAction: string,
  lossRate: number,
  context: FinancialContext,
  recoveryRate = 0.65,
  estimatedCost = 500,
): FinancialImpact {
  const monthlyRevenue = context.totalRevenue;
  const estimatedLoss = monthlyRevenue * lossRate;
  const estimatedRecovery = estimatedLoss * recoveryRate;
  const roi =
    estimatedCost > 0
      ? ((estimatedRecovery - estimatedCost) / estimatedCost) * 100
      : 0;

  let priority: FinancialImpact["priority"] = "baixa";
  if (estimatedLoss > monthlyRevenue * 0.15) priority = "alta";
  else if (estimatedLoss > monthlyRevenue * 0.05) priority = "media";

  return {
    problem,
    estimatedLoss: Math.round(estimatedLoss * 100) / 100,
    recommendedAction,
    estimatedRecovery: Math.round(estimatedRecovery * 100) / 100,
    estimatedCost,
    roi: Math.round(roi),
    priority,
  };
}

export function attachFinancialToStrategies(
  strategies: Array<{ label: string; justifications: string[]; actions: Array<{ label: string; description: string }> }>,
  context: FinancialContext,
): void {
  strategies.forEach((strategy) => {
    const lossRate = strategy.label.toLowerCase().includes("risco") ? 0.2 : 0.1;
    (strategy as { financialImpact?: FinancialImpact }).financialImpact =
      calculateFinancialImpact(
        strategy.justifications[0] ?? strategy.label,
        strategy.actions[0]?.description ?? strategy.label,
        lossRate,
        context,
      );
  });
}

export function enrichAlertFinancial(
  title: string,
  recommendedAction: string,
  financialImpact: number,
  context: FinancialContext,
): FinancialImpact {
  const lossRate =
    context.totalRevenue > 0 ? financialImpact / context.totalRevenue : 0;

  return calculateFinancialImpact(
    title,
    recommendedAction,
    lossRate,
    context,
  );
}
