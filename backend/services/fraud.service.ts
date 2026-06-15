import type { FraudFlag, FraudResult } from "@/backend/types/analysis";
import type { VtexOrder } from "@/backend/types/vtex";

interface ClientProfile {
  clientId: string;
  orders: VtexOrder[];
  cancelRate: number;
  avgTicket: number;
  orderCount: number;
}

function getClientId(order: VtexOrder): string {
  return order.clientEmail?.trim() || order.clientName.trim() || order.orderId;
}

function buildClientProfiles(orders: VtexOrder[]): ClientProfile[] {
  const map = new Map<string, VtexOrder[]>();

  orders.forEach((order) => {
    const clientId = getClientId(order);
    const existing = map.get(clientId) ?? [];
    existing.push(order);
    map.set(clientId, existing);
  });

  return [...map.entries()].map(([clientId, clientOrders]) => {
    const canceled = clientOrders.filter((o) => o.status === "canceled").length;
    const totalValue = clientOrders.reduce((s, o) => s + o.totalValue, 0);

    return {
      clientId,
      orders: clientOrders,
      cancelRate: clientOrders.length > 0 ? canceled / clientOrders.length : 0,
      avgTicket: clientOrders.length > 0 ? totalValue / clientOrders.length : 0,
      orderCount: clientOrders.length,
    };
  });
}

function isolationScore(
  value: number,
  values: number[],
): number {
  if (values.length <= 1) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const range = max - min;

  if (range === 0) return 0;

  const normalized = (value - min) / range;
  const deviation = Math.abs(normalized - 0.5) * 2;
  return deviation;
}

function detectRapidOrders(orders: VtexOrder[]): boolean {
  if (orders.length < 3) return false;

  const sorted = [...orders].sort(
    (a, b) =>
      new Date(a.creationDate).getTime() - new Date(b.creationDate).getTime(),
  );

  for (let i = 2; i < sorted.length; i++) {
    const diff =
      new Date(sorted[i].creationDate).getTime() -
      new Date(sorted[i - 2].creationDate).getTime();
    if (diff < 60 * 60 * 1000) return true;
  }

  return false;
}

function scoreToRiskLevel(score: number): FraudFlag["riskLevel"] {
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}

export function detectFraud(orders: VtexOrder[]): FraudResult {
  if (orders.length === 0) {
    return {
      flaggedOrders: [],
      summary: {
        totalFlagged: 0,
        estimatedExposure: 0,
        highRisk: 0,
        mediumRisk: 0,
        lowRisk: 0,
      },
    };
  }

  const profiles = buildClientProfiles(orders);
  const avgTickets = profiles.map((p) => p.avgTicket);
  const cancelRates = profiles.map((p) => p.cancelRate);
  const orderCounts = profiles.map((p) => p.orderCount);
  const globalAvgTicket =
    orders.reduce((s, o) => s + o.totalValue, 0) / orders.length;

  const flaggedOrders: FraudFlag[] = [];

  profiles.forEach((profile) => {
    const reasons: string[] = [];
    let score = 0;

    const ticketAnomaly = isolationScore(profile.avgTicket, avgTickets);
    if (ticketAnomaly > 0.7 && profile.avgTicket > globalAvgTicket * 2) {
      score += 25;
      reasons.push("Ticket fora do padrão (>2x média)");
    }

    if (profile.cancelRate > 0.5 && profile.orderCount >= 2) {
      score += 30;
      reasons.push(`Alta taxa de cancelamento (${(profile.cancelRate * 100).toFixed(0)}%)`);
    }

    const cancelAnomaly = isolationScore(profile.cancelRate, cancelRates);
    if (cancelAnomaly > 0.8) {
      score += 15;
      reasons.push("Comportamento anômalo de cancelamento");
    }

    const freqAnomaly = isolationScore(profile.orderCount, orderCounts);
    if (freqAnomaly > 0.8 && profile.orderCount >= 5) {
      score += 20;
      reasons.push("Múltiplos pedidos suspeitos");
    }

    if (detectRapidOrders(profile.orders)) {
      score += 20;
      reasons.push("Pedidos em rápida sucessão");
    }

    if (score >= 30) {
      const latestOrder = profile.orders.sort(
        (a, b) =>
          new Date(b.creationDate).getTime() -
          new Date(a.creationDate).getTime(),
      )[0];

      flaggedOrders.push({
        orderId: latestOrder.orderId,
        clientId: profile.clientId,
        score: Math.min(100, score),
        riskLevel: scoreToRiskLevel(score),
        reasons,
      });
    }
  });

  flaggedOrders.sort((a, b) => b.score - a.score);

  const highRisk = flaggedOrders.filter((f) => f.riskLevel === "high").length;
  const mediumRisk = flaggedOrders.filter((f) => f.riskLevel === "medium").length;
  const lowRisk = flaggedOrders.filter((f) => f.riskLevel === "low").length;

  const estimatedExposure = flaggedOrders.reduce((sum, flag) => {
    const order = orders.find((o) => o.orderId === flag.orderId);
    return sum + (order?.totalValue ?? 0);
  }, 0);

  return {
    flaggedOrders,
    summary: {
      totalFlagged: flaggedOrders.length,
      estimatedExposure: Math.round(estimatedExposure * 100) / 100,
      highRisk,
      mediumRisk,
      lowRisk,
    },
  };
}
