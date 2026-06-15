import type {
  FraudResult,
  HealthScoreBreakdown,
  InventoryResult,
} from "@/backend/types/analysis";

interface HealthContext {
  cancelRate: number;
  deliveryRate: number;
  inventory: InventoryResult;
  fraud: FraudResult;
  revenueConcentration: number;
}

function scoreFromRate(rate: number, invert = false): number {
  const normalized = invert ? 100 - rate : rate;
  return Math.max(0, Math.min(100, normalized));
}

export function calculateHealthScore(context: HealthContext): HealthScoreBreakdown {
  const cancellation = scoreFromRate(context.cancelRate, true);
  const delivery = scoreFromRate(context.deliveryRate);
  const inventory = scoreFromRate(context.inventory.ruptureRisk.filter((r) => r.classification === "Crítico").length / Math.max(context.inventory.ruptureRisk.length, 1) * 100, true);

  const deadStockRatio =
    context.inventory.deadStock.length /
    Math.max(context.inventory.abcCurve.length, 1);
  const inventoryAdjusted = Math.round((inventory + scoreFromRate(deadStockRatio * 100, true)) / 2);

  const revenueConcentration = scoreFromRate(context.revenueConcentration * 100, true);

  const fraudScore =
    context.fraud.summary.totalFlagged > 0
      ? scoreFromRate(
          (context.fraud.summary.highRisk / context.fraud.summary.totalFlagged) * 100,
          true,
        )
      : 100;

  const overall = Math.round(
    cancellation * 0.3 +
      delivery * 0.2 +
      inventoryAdjusted * 0.2 +
      revenueConcentration * 0.15 +
      fraudScore * 0.15,
  );

  return {
    cancellation: Math.round(cancellation),
    delivery: Math.round(delivery),
    inventory: inventoryAdjusted,
    revenueConcentration: Math.round(revenueConcentration),
    fraud: Math.round(fraudScore),
    overall: Math.max(0, Math.min(100, overall)),
  };
}

export function getHealthLabel(score: number): string {
  if (score >= 70) return "Saudável";
  if (score >= 40) return "Atenção";
  return "Crítico";
}

export function getHealthColor(score: number): string {
  if (score >= 70) return "text-emerald-600";
  if (score >= 40) return "text-amber-600";
  return "text-rose-600";
}
