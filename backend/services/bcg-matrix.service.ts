import type {
  BCGMatrixResult,
  BCGProduct,
  BCGQuadrant,
  ProductStat,
} from "@/backend/types/analysis";
import type { ProcessedOrder } from "@/backend/types/order";

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function classifyQuadrant(
  revenueShare: number,
  growthRate: number,
  medianShare: number,
  medianGrowth: number,
): BCGQuadrant {
  const highShare = revenueShare >= medianShare;
  const highGrowth = growthRate >= medianGrowth;

  if (highShare && highGrowth) return "star";
  if (highShare && !highGrowth) return "cash_cow";
  if (!highShare && highGrowth) return "question";
  return "dog";
}

function computeProductGrowth(
  orders: ProcessedOrder[],
): Map<string, { firstHalf: number; secondHalf: number }> {
  const validOrders = orders.filter((order) => order.statusRaw !== "canceled");
  if (validOrders.length === 0) {
    return new Map();
  }

  const timestamps = validOrders.map((order) =>
    new Date(order.creationDate).getTime(),
  );
  const minTime = Math.min(...timestamps);
  const maxTime = Math.max(...timestamps);
  const midTime = minTime + (maxTime - minTime) / 2;

  const growthMap = new Map<string, { firstHalf: number; secondHalf: number }>();

  validOrders.forEach((order) => {
    const orderTime = new Date(order.creationDate).getTime();
    const isSecondHalf = orderTime > midTime;

    order.items.forEach((item) => {
      const key = item.productId || item.description || "unknown";
      const revenue = item.sellingPrice * item.quantity;
      const entry = growthMap.get(key) ?? { firstHalf: 0, secondHalf: 0 };

      if (isSecondHalf) {
        entry.secondHalf += revenue;
      } else {
        entry.firstHalf += revenue;
      }

      growthMap.set(key, entry);
    });
  });

  return growthMap;
}

export function runBcgMatrix(
  orders: ProcessedOrder[],
  productStats: ProductStat[],
): BCGMatrixResult {
  const totalRevenue = productStats.reduce((sum, stat) => sum + stat.revenue, 0);
  const growthMap = computeProductGrowth(orders);

  const products: BCGProduct[] = productStats
    .filter((stat) => stat.revenue > 0 || stat.totalOrders > 0)
    .map((stat) => {
      const growth = growthMap.get(stat.key) ?? { firstHalf: 0, secondHalf: 0 };
      const growthRate =
        growth.firstHalf > 0
          ? (growth.secondHalf - growth.firstHalf) / growth.firstHalf
          : growth.secondHalf > 0
            ? 1
            : 0;
      const revenueShare =
        totalRevenue > 0 ? (stat.revenue / totalRevenue) * 100 : 0;

      return {
        productKey: stat.key,
        productName: stat.label,
        revenueShare: round2(revenueShare),
        growthRate: round2(growthRate * 100),
        quadrant: "dog" as BCGQuadrant,
        revenue: round2(stat.revenue),
        totalOrders: stat.totalOrders,
      };
    });

  const medianRevenueShare = median(products.map((p) => p.revenueShare));
  const medianGrowthRate = median(products.map((p) => p.growthRate));

  const classified = products.map((product) => ({
    ...product,
    quadrant: classifyQuadrant(
      product.revenueShare,
      product.growthRate,
      medianRevenueShare,
      medianGrowthRate,
    ),
  }));

  const quadrantCounts: Record<BCGQuadrant, number> = {
    star: 0,
    cash_cow: 0,
    question: 0,
    dog: 0,
  };

  classified.forEach((product) => {
    quadrantCounts[product.quadrant] += 1;
  });

  return {
    products: classified.sort((a, b) => b.revenue - a.revenue),
    medianRevenueShare: round2(medianRevenueShare),
    medianGrowthRate: round2(medianGrowthRate),
    quadrantCounts,
  };
}
