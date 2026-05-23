import type { VtexOrder } from "@/backend/types/vtex";
import type { FeatureVector, ProcessedOrder } from "@/backend/types/order";

const ORIGIN_MAP: Record<string, number> = {
  Marketplace: 0,
};

const PAYMENT_MAP: Record<string, number> = {
  Promissory: 0,
  "Boleto Bancário": 1,
  Dinheiro: 2,
  Pix: 3,
  "Cartão de Crédito": 4,
  "Cartão de Débito": 5,
  Visa: 6,
  Mastercard: 7,
  "American Express": 8,
  "Diners Club": 9,
  Hipercard: 10,
  Aura: 11,
  Elo: 12,
  JCB: 13,
  Discover: 14,
};

const STATUS_MAP: Record<string, number> = {
  canceled: 0,
  pending: 1,
  success: 2,
  shipped: 3,
  delivered: 4,
  invoiced: 5,
  "payment-approved": 6,
  "payment-pending": 7,
  "ready-for-handling": 8,
  handling: 9,
  "window-to-cancel": 10,
  "waiting-for-sellers-confirmation": 11,
};

function buildSalesChannelMap(list: VtexOrder[]): Record<string, number> {
  const channels = [
    ...new Set(list.map((order) => order.salesChannel).filter(Boolean)),
  ];

  return Object.fromEntries(channels.map((channel, index) => [channel, index]));
}

export function processOrders(list: VtexOrder[]): ProcessedOrder[] {
  const salesChannelMap = buildSalesChannelMap(list);

  return list.map((order) => {
    const creationDate = new Date(order.creationDate);

    return {
      orderId: order.orderId,
      clientName: order.clientName,
      creationDate: order.creationDate,
      items: order.items.map((item) => ({
        quantity: item.quantity,
        price: item.price,
        sellingPrice: item.sellingPrice,
        description: item.description,
        productId: item.productId,
        seller: item.seller,
      })),
      totalValue: order.totalValue,
      totalItems: order.totalItems,
      origin: ORIGIN_MAP[order.origin] ?? -1,
      paymentNames: PAYMENT_MAP[order.paymentNames] ?? -1,
      status: STATUS_MAP[order.status] ?? -1,
      statusRaw: order.status,
      paymentRaw: order.paymentNames,
      originRaw: order.origin,
      hourOfDay: creationDate.getHours(),
      dayOfWeek: creationDate.getDay(),
      salesChannel: salesChannelMap[order.salesChannel] ?? -1,
      salesChannelRaw: order.salesChannel,
      workflowInErrorState: order.workflowInErrorState ? 1 : 0,
      isAllDelivered: order.isAllDelivered ? 1 : 0,
    };
  });
}

export function orderToVector(order: ProcessedOrder): FeatureVector {
  const totalQuantity = order.items.reduce((acc, item) => acc + item.quantity, 0);
  const avgPrice =
    order.items.length > 0
      ? order.items.reduce((acc, item) => acc + item.sellingPrice, 0) /
        order.items.length
      : 0;

  return [
    order.totalValue,
    order.totalItems,
    totalQuantity,
    avgPrice,
    order.origin,
    order.paymentNames,
    order.hourOfDay,
    order.dayOfWeek,
    order.salesChannel,
  ];
}

export function normalize(vectors: number[][]): number[][] {
  if (vectors.length === 0) {
    return [];
  }

  const cols = vectors[0].length;
  const mins = Array(cols).fill(Infinity);
  const maxs = Array(cols).fill(-Infinity);

  vectors.forEach((row) => {
    row.forEach((value, i) => {
      mins[i] = Math.min(mins[i], value);
      maxs[i] = Math.max(maxs[i], value);
    });
  });

  return vectors.map((row) =>
    row.map((value, i) => {
      const range = maxs[i] - mins[i];

      if (range === 0) {
        return 0;
      }

      return (value - mins[i]) / range;
    }),
  );
}

export function buildFeatureVectors(orders: ProcessedOrder[]): {
  rawVectors: FeatureVector[];
  normalizedVectors: number[][];
} {
  const rawVectors = orders.map(orderToVector);
  const normalizedVectors = normalize(rawVectors);

  return { rawVectors, normalizedVectors };
}
