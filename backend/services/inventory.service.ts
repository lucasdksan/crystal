import type {
  ABCItem,
  DeadStockItem,
  InventoryResult,
  RuptureRiskItem,
} from "@/backend/types/analysis";
import type { VtexOrder } from "@/backend/types/vtex";

interface SKUStats {
  skuId: string;
  name: string;
  totalQty: number;
  revenue: number;
  lastSaleDate: Date | null;
  orderDates: Date[];
}

function buildSKUStats(orders: VtexOrder[]): SKUStats[] {
  const map = new Map<string, SKUStats>();

  orders.forEach((order) => {
    const orderDate = new Date(order.creationDate);
    const isCanceled = order.status === "canceled";

    (order.items ?? []).forEach((item) => {
      const skuId = item.productId || item.description;
      const existing = map.get(skuId) ?? {
        skuId,
        name: item.description || skuId,
        totalQty: 0,
        revenue: 0,
        lastSaleDate: null,
        orderDates: [],
      };

      if (!isCanceled) {
        existing.totalQty += item.quantity;
        existing.revenue += item.sellingPrice * item.quantity;
        existing.orderDates.push(orderDate);
        if (!existing.lastSaleDate || orderDate > existing.lastSaleDate) {
          existing.lastSaleDate = orderDate;
        }
      }

      map.set(skuId, existing);
    });
  });

  return [...map.values()];
}

function computeDaysInRange(orders: VtexOrder[]): number {
  if (orders.length === 0) return 30;

  const dates = orders.map((o) => new Date(o.creationDate).getTime());
  const min = Math.min(...dates);
  const max = Math.max(...dates);
  const days = Math.ceil((max - min) / (1000 * 60 * 60 * 24)) || 1;
  return Math.max(days, 1);
}

function estimateStock(totalQty: number, avgDailySales: number): number {
  if (avgDailySales <= 0) return totalQty;
  return Math.max(Math.round(avgDailySales * 15), totalQty);
}

function classifyRupture(daysRemaining: number): RuptureRiskItem["classification"] {
  if (daysRemaining < 5) return "Crítico";
  if (daysRemaining <= 15) return "Atenção";
  return "Saudável";
}

function buildRuptureRisk(
  stats: SKUStats[],
  daysInRange: number,
): RuptureRiskItem[] {
  return stats
    .filter((s) => s.totalQty > 0)
    .map((s) => {
      const avgDailySales = s.totalQty / daysInRange;
      const currentStock = estimateStock(s.totalQty, avgDailySales);
      const daysRemaining =
        avgDailySales > 0 ? currentStock / avgDailySales : Infinity;

      return {
        skuId: s.skuId,
        name: s.name,
        currentStock,
        avgDailySales: Math.round(avgDailySales * 100) / 100,
        daysRemaining: Math.round(daysRemaining * 10) / 10,
        classification: classifyRupture(daysRemaining),
      };
    })
    .sort((a, b) => a.daysRemaining - b.daysRemaining);
}

function buildDeadStock(
  stats: SKUStats[],
  referenceDate: Date,
): DeadStockItem[] {
  return stats
    .filter((s) => s.lastSaleDate !== null)
    .map((s) => {
      const daysSinceLastSale = Math.floor(
        (referenceDate.getTime() - s.lastSaleDate!.getTime()) /
          (1000 * 60 * 60 * 24),
      );
      const avgDailySales =
        s.orderDates.length > 0 ? s.totalQty / Math.max(s.orderDates.length, 1) : 0;
      const currentStock = estimateStock(s.totalQty, avgDailySales);

      return {
        skuId: s.skuId,
        name: s.name,
        daysSinceLastSale,
        currentStock,
      };
    })
    .filter((s) => s.daysSinceLastSale > 60 && s.currentStock > 0)
    .sort((a, b) => b.daysSinceLastSale - a.daysSinceLastSale);
}

function buildABCCurve(stats: SKUStats[]): ABCItem[] {
  const sorted = [...stats]
    .filter((s) => s.revenue > 0)
    .sort((a, b) => b.revenue - a.revenue);

  const totalRevenue = sorted.reduce((s, item) => s + item.revenue, 0);
  if (totalRevenue === 0) return [];

  let cumulative = 0;

  return sorted.map((s) => {
    cumulative += s.revenue;
    const share = (s.revenue / totalRevenue) * 100;
    const cumulativeShare = (cumulative / totalRevenue) * 100;

    let classLabel: "A" | "B" | "C" = "C";
    if (cumulativeShare <= 80) classLabel = "A";
    else if (cumulativeShare <= 95) classLabel = "B";

    return {
      skuId: s.skuId,
      name: s.name,
      class: classLabel,
      revenue: s.revenue,
      cumulativeRevenue: cumulative,
      share: Math.round(share * 10) / 10,
      cumulativeShare: Math.round(cumulativeShare * 10) / 10,
    };
  });
}

export async function buildInventory(orders: VtexOrder[]): Promise<InventoryResult> {
  const stats = buildSKUStats(orders);
  const daysInRange = computeDaysInRange(orders);

  const referenceDate = orders.reduce((latest, order) => {
    const date = new Date(order.creationDate);
    return date > latest ? date : latest;
  }, new Date(0));

  return {
    ruptureRisk: buildRuptureRisk(stats, daysInRange),
    deadStock: buildDeadStock(stats, referenceDate),
    abcCurve: buildABCCurve(stats),
  };
}

export async function fetchSkuStock(
  skuId: string,
): Promise<number | null> {
  const baseUrl = process.env.VTEX_BASE_URL;
  const appKey = process.env.VTEX_APP_KEY;
  const appToken = process.env.VTEX_APP_TOKEN;

  if (!baseUrl || !appKey || !appToken) return null;

  try {
    const url = `${baseUrl.replace(/\/$/, "")}/api/logistics/pvt/inventory/skus/${skuId}`;
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        "X-VTEX-API-AppKey": appKey,
        "X-VTEX-API-AppToken": appToken,
      },
      cache: "no-store",
    });

    if (!response.ok) return null;

    const data = (await response.json()) as { balance?: Array<{ totalQuantity?: number }> };
    const balance = data.balance?.[0]?.totalQuantity;
    return balance ?? null;
  } catch {
    return null;
  }
}
