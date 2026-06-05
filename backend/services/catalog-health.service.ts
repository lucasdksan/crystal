import type {
  BCGMatrixResult,
  CatalogHealthProduct,
  CatalogHealthResult,
  ProductStat,
} from "@/backend/types/analysis";
import type { ProcessedOrder } from "@/backend/types/order";

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function toCatalogProduct(
  stat: ProductStat,
  extras?: { daysSinceLastSale?: number; growthRate?: number },
): CatalogHealthProduct {
  return {
    productKey: stat.key,
    productName: stat.label,
    revenue: round2(stat.revenue),
    totalOrders: stat.totalOrders,
    ...extras,
  };
}

function computeLastSaleDates(
  orders: ProcessedOrder[],
): Map<string, number> {
  const lastSaleMap = new Map<string, number>();

  orders
    .filter((order) => order.statusRaw !== "canceled")
    .forEach((order) => {
      const orderTime = new Date(order.creationDate).getTime();
      order.items.forEach((item) => {
        const key = item.productId || item.description || "unknown";
        const current = lastSaleMap.get(key) ?? 0;
        if (orderTime > current) {
          lastSaleMap.set(key, orderTime);
        }
      });
    });

  return lastSaleMap;
}

function getReferenceDate(orders: ProcessedOrder[]): number {
  const timestamps = orders
    .filter((order) => order.statusRaw !== "canceled")
    .map((order) => new Date(order.creationDate).getTime());

  if (timestamps.length === 0) {
    return Date.now();
  }

  return Math.max(...timestamps);
}

export function runCatalogHealth(
  orders: ProcessedOrder[],
  productStats: ProductStat[],
  bcgMatrix: BCGMatrixResult,
): CatalogHealthResult {
  const lastSaleDates = computeLastSaleDates(orders);
  const referenceDate = getReferenceDate(orders);
  const growthByKey = new Map(
    bcgMatrix.products.map((product) => [product.productKey, product.growthRate]),
  );

  const msPerDay = 1000 * 60 * 60 * 24;

  const productsWithDays = productStats.map((stat) => {
    const lastSale = lastSaleDates.get(stat.key);
    const daysSinceLastSale =
      lastSale !== undefined
        ? Math.floor((referenceDate - lastSale) / msPerDay)
        : undefined;

    return toCatalogProduct(stat, {
      daysSinceLastSale,
      growthRate: growthByKey.get(stat.key),
    });
  });

  const noSale30Days = productsWithDays.filter(
    (product) => (product.daysSinceLastSale ?? 0) >= 30,
  );
  const noSale60Days = productsWithDays.filter(
    (product) => (product.daysSinceLastSale ?? 0) >= 60,
  );
  const noSale90Days = productsWithDays.filter(
    (product) => (product.daysSinceLastSale ?? 0) >= 90,
  );
  const singleSaleProducts = productsWithDays.filter(
    (product) => product.totalOrders === 1,
  );

  const totalRevenue = productStats.reduce((sum, stat) => sum + stat.revenue, 0);
  const sortedByRevenue = [...productStats].sort((a, b) => b.revenue - a.revenue);
  const paretoProducts: CatalogHealthProduct[] = [];
  let cumulative = 0;

  for (const stat of sortedByRevenue) {
    cumulative += stat.revenue;
    paretoProducts.push(
      toCatalogProduct(stat, {
        growthRate: growthByKey.get(stat.key),
      }),
    );
    if (totalRevenue > 0 && cumulative / totalRevenue >= 0.8) {
      break;
    }
  }

  const decliningProducts = productsWithDays.filter(
    (product) => (product.growthRate ?? 0) < -10,
  );
  const growingProducts = productsWithDays.filter(
    (product) => (product.growthRate ?? 0) > 20,
  );

  const paretoRevenueShare =
    totalRevenue > 0
      ? round2(
          (paretoProducts.reduce((sum, p) => sum + p.revenue, 0) / totalRevenue) *
            100,
        )
      : 0;

  return {
    noSale30Days: noSale30Days.sort(
      (a, b) => (b.daysSinceLastSale ?? 0) - (a.daysSinceLastSale ?? 0),
    ),
    noSale60Days: noSale60Days.sort(
      (a, b) => (b.daysSinceLastSale ?? 0) - (a.daysSinceLastSale ?? 0),
    ),
    noSale90Days: noSale90Days.sort(
      (a, b) => (b.daysSinceLastSale ?? 0) - (a.daysSinceLastSale ?? 0),
    ),
    singleSaleProducts: singleSaleProducts.sort((a, b) => b.revenue - a.revenue),
    paretoProducts,
    decliningProducts: decliningProducts.sort((a, b) =>
      (a.growthRate ?? 0) < (b.growthRate ?? 0) ? -1 : 1,
    ),
    growingProducts: growingProducts.sort(
      (a, b) => (b.growthRate ?? 0) - (a.growthRate ?? 0),
    ),
    summary: {
      totalProducts: productStats.length,
      paretoCount: paretoProducts.length,
      paretoRevenueShare,
      singleSaleCount: singleSaleProducts.length,
      noSale90Count: noSale90Days.length,
      decliningCount: decliningProducts.length,
      growingCount: growingProducts.length,
    },
  };
}
