import type { VtexOrder } from "@/backend/types/vtex";
import type { FeatureVector, ProcessedOrder } from "@/backend/types/order";
import type { CustomerProfile } from "@/backend/types/customer";

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

function extractClientEmail(order: VtexOrder): string {
  const raw = order as VtexOrder & {
    clientProfileData?: { email?: string };
  };
  return raw.clientProfileData?.email?.trim() || order.clientEmail?.trim() || "";
}

export function processOrders(list: VtexOrder[]): ProcessedOrder[] {
  const salesChannelMap = buildSalesChannelMap(list);

  return list.map((order) => {
    const creationDate = new Date(order.creationDate);

    return {
      orderId: order.orderId,
      clientName: order.clientName,
      clientEmail: extractClientEmail(order),
      creationDate: order.creationDate,
      items: (order.items ?? []).map((item) => ({
        quantity: item.quantity,
        price: item.price,
        sellingPrice: item.sellingPrice,
        description: item.description,
        productId: item.productId,
        seller: item.seller,
      })),
      totalValue: order.totalValue,
      totalItems: order.totalItems,
      origin: 0,
      paymentNames: 0,
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

export function normalize(vectors: number[][]): {
  normalized: number[][];
  mins: number[];
  maxs: number[];
} {
  if (vectors.length === 0) {
    return { normalized: [], mins: [], maxs: [] };
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

  const normalized = vectors.map((row) =>
    row.map((value, i) => {
      const range = maxs[i] - mins[i];

      if (range === 0) {
        return 0;
      }

      return (value - mins[i]) / range;
    }),
  );

  return { normalized, mins, maxs };
}

function cyclicEncode(value: number, period: number): [number, number] {
  const angle = (2 * Math.PI * value) / period;
  return [Math.sin(angle), Math.cos(angle)];
}

function buildVocabularies(profiles: CustomerProfile[]): {
  paymentMethods: string[];
  salesChannels: string[];
} {
  const paymentSet = new Set<string>();
  const channelSet = new Set<string>();

  profiles.forEach((profile) => {
    paymentSet.add(profile.preferredPaymentMethod || "Desconhecido");
    channelSet.add(profile.preferredSalesChannel || "Desconhecido");
  });

  return {
    paymentMethods: [...paymentSet].sort(),
    salesChannels: [...channelSet].sort(),
  };
}

export function customerToVector(
  profile: CustomerProfile,
  paymentMethods: string[],
  salesChannels: string[],
): number[] {
  const paymentOneHot = paymentMethods.map((method) =>
    profile.preferredPaymentMethod === method ? 1 : 0,
  );
  const channelOneHot = salesChannels.map((channel) =>
    profile.preferredSalesChannel === channel ? 1 : 0,
  );

  const [sinHour, cosHour] = cyclicEncode(profile.preferredHour, 24);

  return [
    profile.totalSpent,
    profile.totalOrders,
    profile.averageTicket,
    profile.daysSinceLastPurchase,
    profile.averageDaysBetweenOrders,
    profile.purchaseFrequency,
    profile.uniqueProducts,
    profile.weekendPurchaseRate,
    profile.nightPurchaseRate,
    sinHour,
    cosHour,
    ...paymentOneHot,
    ...channelOneHot,
  ];
}

export function buildFeatureVectors(orders: ProcessedOrder[]): {
  rawVectors: FeatureVector[];
  normalizedVectors: number[][];
  mins: number[];
  maxs: number[];
} {
  const rawVectors = orders.map(orderToVector);
  const { normalized, mins, maxs } = normalize(rawVectors);

  return { rawVectors, normalizedVectors: normalized, mins, maxs };
}

function zScoreNormalize(vectors: number[][]): number[][] {
  if (vectors.length === 0) return [];

  const cols = vectors[0].length;
  const means = Array(cols).fill(0);
  const stds = Array(cols).fill(0);

  vectors.forEach((row) => {
    row.forEach((value, i) => {
      means[i] += value;
    });
  });
  means.forEach((_, i) => {
    means[i] /= vectors.length;
  });

  vectors.forEach((row) => {
    row.forEach((value, i) => {
      stds[i] += Math.pow(value - means[i], 2);
    });
  });
  stds.forEach((_, i) => {
    stds[i] = Math.sqrt(stds[i] / vectors.length) || 1;
  });

  return vectors.map((row) =>
    row.map((value, i) => (value - means[i]) / stds[i]),
  );
}

export function buildRFMVectors(profiles: CustomerProfile[]): {
  vectors: number[][];
  labels: string[];
} {
  const rawVectors = profiles.map((profile) => [
    profile.recencia,
    profile.frequencia,
    profile.valorMonetario,
  ]);

  return {
    vectors: zScoreNormalize(rawVectors),
    labels: profiles.map((profile) => profile.clientId),
  };
}

export function buildCustomerFeatureVectors(profiles: CustomerProfile[]): {
  rawVectors: number[][];
  normalizedVectors: number[][];
  mins: number[];
  maxs: number[];
  uniquePaymentMethods: number;
  paymentMethods: string[];
  salesChannels: string[];
} {
  if (profiles.length === 0) {
    return {
      rawVectors: [],
      normalizedVectors: [],
      mins: [],
      maxs: [],
      uniquePaymentMethods: 0,
      paymentMethods: [],
      salesChannels: [],
    };
  }

  const { paymentMethods, salesChannels } = buildVocabularies(profiles);
  const uniquePaymentMethods = paymentMethods.length;

  const rawVectors = profiles.map((profile) =>
    customerToVector(profile, paymentMethods, salesChannels),
  );
  const { normalized, mins, maxs } = normalize(rawVectors);

  return {
    rawVectors,
    normalizedVectors: normalized,
    mins,
    maxs,
    uniquePaymentMethods,
    paymentMethods,
    salesChannels,
  };
}
