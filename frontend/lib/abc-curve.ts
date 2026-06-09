import type { BCGProductUI } from "@/frontend/types/dashboard";

export type ABCCurve = "A" | "B" | "C";

export interface ABCProduct {
  productKey: string;
  productName: string;
  revenue: number;
  curve: ABCCurve;
  revenueShare: number;
  cumulativeShare: number;
}

export function computeABCCurve(products: BCGProductUI[]): ABCProduct[] {
  if (products.length === 0) return [];

  const totalRevenue = products.reduce((sum, p) => sum + p.revenue, 0);
  const sorted = [...products].sort((a, b) => b.revenue - a.revenue);

  let cumulative = 0;

  return sorted.map((product) => {
    const revenueShare =
      totalRevenue > 0 ? (product.revenue / totalRevenue) * 100 : 0;
    cumulative += revenueShare;

    let curve: ABCCurve = "C";
    if (cumulative <= 80) curve = "A";
    else if (cumulative <= 95) curve = "B";

    return {
      productKey: product.productKey,
      productName: product.productName,
      revenue: product.revenue,
      curve,
      revenueShare,
      cumulativeShare: cumulative,
    };
  });
}

export function filterProductsByCurve(
  products: BCGProductUI[],
  abcProducts: ABCProduct[],
  curve: ABCCurve | "all",
): BCGProductUI[] {
  if (curve === "all") return products;

  const keysInCurve = new Set(
    abcProducts.filter((p) => p.curve === curve).map((p) => p.productKey),
  );

  return products.filter((p) => keysInCurve.has(p.productKey));
}
