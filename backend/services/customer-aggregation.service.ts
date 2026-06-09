import type { ProcessedOrder } from "@/backend/types/order";
import type { CustomerProfile, OrderTimelineEntry } from "@/backend/types/customer";

function resolveClientId(order: ProcessedOrder): string {
  const email = order.clientEmail?.trim().toLowerCase();
  if (email) return email;
  return order.clientName.trim().toLowerCase() || order.orderId;
}

function mostCommon(values: string[]): string {
  if (values.length === 0) return "Desconhecido";
  const freq = new Map<string, number>();
  values.forEach((v) => freq.set(v, (freq.get(v) ?? 0) + 1));
  return [...freq.entries()].reduce((a, b) => (b[1] > a[1] ? b : a))[0];
}

function averageDaysBetween(dates: Date[]): number {
  if (dates.length < 2) return 0;
  const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime());
  let totalGap = 0;
  for (let i = 1; i < sorted.length; i++) {
    totalGap +=
      (sorted[i].getTime() - sorted[i - 1].getTime()) / (1000 * 60 * 60 * 24);
  }
  return totalGap / (sorted.length - 1);
}

const MIN_FREQUENCY_WINDOW_DAYS = 30;
const MAX_ORDERS_PER_MONTH = 8;

function computePurchaseFrequency(
  orderCount: number,
  firstDate: Date,
  lastDate: Date,
): number {
  const observedSpanDays = Math.max(
    0,
    (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24),
  );
  const spanDays = Math.max(MIN_FREQUENCY_WINDOW_DAYS, observedSpanDays);
  const raw = (orderCount / spanDays) * 30;
  return Math.min(raw, MAX_ORDERS_PER_MONTH);
}

export function aggregateByCustomer(orders: ProcessedOrder[]): CustomerProfile[] {
  const groups = new Map<string, ProcessedOrder[]>();

  orders.forEach((order) => {
    const clientId = resolveClientId(order);
    if (!groups.has(clientId)) groups.set(clientId, []);
    groups.get(clientId)!.push(order);
  });

  const now = Date.now();

  return [...groups.entries()].map(([clientId, clientOrders]) => {
    const sorted = [...clientOrders].sort(
      (a, b) =>
        new Date(a.creationDate).getTime() - new Date(b.creationDate).getTime(),
    );

    const dates = sorted.map((o) => new Date(o.creationDate));
    const firstDate = dates[0];
    const lastDate = dates[dates.length - 1];

    const totalSpent = sorted.reduce((sum, o) => sum + o.totalValue, 0);
    const totalOrders = sorted.length;
    const averageTicket = totalOrders > 0 ? totalSpent / totalOrders : 0;
    const daysSinceLastPurchase = Math.max(
      0,
      (now - lastDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    const averageDaysBetweenOrders = averageDaysBetween(dates);
    const purchaseFrequency = computePurchaseFrequency(
      totalOrders,
      firstDate,
      lastDate,
    );

    const productIds = new Set<string>();
    const productNames = new Set<string>();
    sorted.forEach((order) => {
      order.items.forEach((item) => {
        if (item.productId) productIds.add(item.productId);
        if (item.description) productNames.add(item.description);
      });
    });

    const weekendOrders = sorted.filter((o) => {
      const day = new Date(o.creationDate).getDay();
      return day === 0 || day === 6;
    }).length;
    const nightOrders = sorted.filter((o) => {
      const hour = new Date(o.creationDate).getHours();
      return hour >= 20 || hour < 6;
    }).length;

    const hourCounts = Array(24).fill(0);
    sorted.forEach((o) => {
      hourCounts[new Date(o.creationDate).getHours()]++;
    });
    const preferredHour = hourCounts.indexOf(Math.max(...hourCounts));

    const ordersTimeline: OrderTimelineEntry[] = sorted.map((o) => ({
      date: o.creationDate,
      value: o.totalValue,
      orderId: o.orderId,
    }));

    const allPaymentMethods = [
      ...new Set(sorted.map((o) => o.paymentRaw || "Desconhecido")),
    ];

    const firstPurchaseDate = sorted[0].creationDate;
    const recencia = daysSinceLastPurchase;
    const frequencia = totalOrders;
    const valorMonetario = totalSpent;

    return {
      clientId,
      clientName: sorted[0].clientName || clientId,
      clientEmail: sorted[0].clientEmail || "",
      firstPurchaseDate,
      totalSpent,
      totalOrders,
      averageTicket,
      daysSinceLastPurchase,
      recencia,
      frequencia,
      valorMonetario,
      rfmProfile: { recencia, frequencia, valorMonetario },
      averageDaysBetweenOrders,
      purchaseFrequency,
      uniqueProducts: productIds.size,
      uniqueCategories: productNames.size,
      preferredPaymentMethod: mostCommon(
        sorted.map((o) => o.paymentRaw || "Desconhecido"),
      ),
      preferredSalesChannel: mostCommon(
        sorted.map((o) => o.salesChannelRaw || "Desconhecido"),
      ),
      preferredHour,
      weekendPurchaseRate: totalOrders > 0 ? weekendOrders / totalOrders : 0,
      nightPurchaseRate: totalOrders > 0 ? nightOrders / totalOrders : 0,
      ordersTimeline,
      allPaymentMethods,
      productIds: [...productIds],
      productNames: [...productNames],
    };
  });
}
