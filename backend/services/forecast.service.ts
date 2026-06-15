import type {
  ForecastResult,
  PurchaseRecommendation,
  SKUForecast,
} from "@/backend/types/analysis";
import type { VtexOrder } from "@/backend/types/vtex";

interface DailySales {
  skuId: string;
  name: string;
  dailyQty: Map<string, number>;
  totalQty: number;
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function buildDailySales(orders: VtexOrder[]): DailySales[] {
  const map = new Map<string, DailySales>();

  orders.forEach((order) => {
    if (order.status === "canceled") return;

    const day = dateKey(new Date(order.creationDate));

    (order.items ?? []).forEach((item) => {
      const skuId = item.productId || item.description;
      const existing = map.get(skuId) ?? {
        skuId,
        name: item.description || skuId,
        dailyQty: new Map<string, number>(),
        totalQty: 0,
      };

      existing.dailyQty.set(day, (existing.dailyQty.get(day) ?? 0) + item.quantity);
      existing.totalQty += item.quantity;
      map.set(skuId, existing);
    });
  });

  return [...map.values()];
}

function exponentialSmoothing(values: number[], alpha = 0.3): number {
  if (values.length === 0) return 0;
  if (values.length === 1) return values[0];

  let smoothed = values[0];
  for (let i = 1; i < values.length; i++) {
    smoothed = alpha * values[i] + (1 - alpha) * smoothed;
  }
  return smoothed;
}

function holtWintersSimple(
  values: number[],
  periods: number,
): number {
  if (values.length === 0) return 0;

  const level = exponentialSmoothing(values, 0.3);
  const trend =
    values.length >= 2
      ? (values[values.length - 1] - values[0]) / values.length
      : 0;

  return Math.max(0, level + trend * periods);
}

function computeTrend(values: number[]): SKUForecast["trend"] {
  if (values.length < 3) return "stable";

  const firstHalf = values.slice(0, Math.floor(values.length / 2));
  const secondHalf = values.slice(Math.floor(values.length / 2));

  const avgFirst =
    firstHalf.reduce((s, v) => s + v, 0) / Math.max(firstHalf.length, 1);
  const avgSecond =
    secondHalf.reduce((s, v) => s + v, 0) / Math.max(secondHalf.length, 1);

  const change = avgFirst > 0 ? (avgSecond - avgFirst) / avgFirst : 0;

  if (change > 0.1) return "growing";
  if (change < -0.1) return "declining";
  return "stable";
}

function buildSKUForecast(sales: DailySales): SKUForecast {
  const sortedDays = [...sales.dailyQty.entries()].sort(([a], [b]) =>
    a.localeCompare(b),
  );
  const values = sortedDays.map(([, qty]) => qty);

  const forecast7d = holtWintersSimple(values, 7);
  const forecast30d = holtWintersSimple(values, 30);
  const forecast90d = holtWintersSimple(values, 90);
  const trend = computeTrend(values);

  const recentAvg =
    values.length > 0
      ? values.slice(-7).reduce((s, v) => s + v, 0) /
        Math.max(values.slice(-7).length, 1)
      : 0;
  const expectedGrowth =
    recentAvg > 0 ? ((forecast30d / 30 - recentAvg) / recentAvg) * 100 : 0;

  return {
    skuId: sales.skuId,
    name: sales.name,
    trend,
    forecast7d: Math.round(forecast7d * 10) / 10,
    forecast30d: Math.round(forecast30d * 10) / 10,
    forecast90d: Math.round(forecast90d * 10) / 10,
    expectedGrowth: Math.round(expectedGrowth * 10) / 10,
  };
}

function buildPurchaseRecommendations(
  forecasts: SKUForecast[],
): PurchaseRecommendation[] {
  return forecasts
    .filter((f) => f.trend === "growing" || f.forecast7d > 5)
    .map((f) => {
      const recommendedQty = Math.ceil(f.forecast30d * 1.2);
      let urgency: PurchaseRecommendation["urgency"] = "baixa";
      if (f.trend === "growing" && f.expectedGrowth > 20) urgency = "alta";
      else if (f.forecast7d > 10) urgency = "media";

      return {
        skuId: f.skuId,
        name: f.name,
        recommendedQty,
        reason:
          f.trend === "growing"
            ? `Demanda crescente (+${f.expectedGrowth.toFixed(0)}%)`
            : `Previsão de ${f.forecast30d.toFixed(0)} un. em 30 dias`,
        urgency,
      };
    })
    .sort((a, b) => {
      const urgencyOrder = { alta: 0, media: 1, baixa: 2 };
      return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    })
    .slice(0, 10);
}

export function buildForecast(orders: VtexOrder[]): ForecastResult {
  const dailySales = buildDailySales(orders);

  const forecasts = dailySales
    .filter((s) => s.totalQty > 0)
    .map(buildSKUForecast)
    .sort((a, b) => b.forecast30d - a.forecast30d);

  return {
    forecasts,
    purchaseRecommendations: buildPurchaseRecommendations(forecasts),
  };
}
