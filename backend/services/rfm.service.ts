import type {
  RFMClient,
  RFMRecommendation,
  RFMResult,
  RFMSegment,
} from "@/backend/types/analysis";
import type { VtexOrder } from "@/backend/types/vtex";

const SEGMENT_ACTIONS: Record<string, string> = {
  Campeões: "Criar programa VIP com benefícios exclusivos",
  Fiéis: "Programa de fidelidade com cashback progressivo",
  "Potenciais Fiéis": "Campanhas de reativação com cupom personalizado",
  "Novos Clientes": "Sequência de boas-vindas com desconto na 2ª compra",
  "Em Risco": "Campanha win-back urgente com oferta exclusiva",
  Perdidos: "Pesquisa de satisfação + cupom de retorno",
  Hibernando: "Newsletter segmentada com novidades e promoções",
};

function getClientId(order: VtexOrder): string {
  return order.clientEmail?.trim() || order.clientName.trim() || order.orderId;
}

function assignSegment(r: number, f: number, m: number): string {
  if (r >= 4 && f >= 4 && m >= 4) return "Campeões";
  if (f >= 3 && m >= 3) return "Fiéis";
  if (r >= 3 && f <= 2) return "Potenciais Fiéis";
  if (r >= 4 && f === 1) return "Novos Clientes";
  if (r <= 2 && f >= 3) return "Em Risco";
  if (r === 1 && f >= 2) return "Perdidos";
  if (r <= 2 && f <= 2) return "Hibernando";
  return "Hibernando";
}

function quintileScore(value: number, sortedValues: number[], invert = false): number {
  if (sortedValues.length === 0) return 1;
  const rank = sortedValues.filter((v) => v <= value).length / sortedValues.length;
  const score = Math.ceil(rank * 5) || 1;
  return invert ? 6 - score : score;
}

export function buildRFM(orders: VtexOrder[]): RFMResult {
  if (orders.length === 0) {
    return { segments: [], clients: [], recommendations: [] };
  }

  const referenceDate = orders.reduce((latest, order) => {
    const date = new Date(order.creationDate);
    return date > latest ? date : latest;
  }, new Date(0));

  const clientMap = new Map<
    string,
    { lastOrder: Date; frequency: number; monetary: number }
  >();

  orders.forEach((order) => {
    const clientId = getClientId(order);
    const orderDate = new Date(order.creationDate);
    const existing = clientMap.get(clientId);

    if (!existing) {
      clientMap.set(clientId, {
        lastOrder: orderDate,
        frequency: 1,
        monetary: order.totalValue,
      });
    } else {
      existing.frequency += 1;
      existing.monetary += order.totalValue;
      if (orderDate > existing.lastOrder) {
        existing.lastOrder = orderDate;
      }
    }
  });

  const clients: RFMClient[] = [...clientMap.entries()].map(
    ([clientId, stats]) => ({
      clientId,
      recency: Math.floor(
        (referenceDate.getTime() - stats.lastOrder.getTime()) /
          (1000 * 60 * 60 * 24),
      ),
      frequency: stats.frequency,
      monetary: stats.monetary,
      rScore: 0,
      fScore: 0,
      mScore: 0,
      segment: "",
    }),
  );

  const recencies = clients.map((c) => c.recency).sort((a, b) => a - b);
  const frequencies = clients.map((c) => c.frequency).sort((a, b) => a - b);
  const monetaries = clients.map((c) => c.monetary).sort((a, b) => a - b);

  clients.forEach((client) => {
    client.rScore = quintileScore(client.recency, recencies, true);
    client.fScore = quintileScore(client.frequency, frequencies);
    client.mScore = quintileScore(client.monetary, monetaries);
    client.segment = assignSegment(client.rScore, client.fScore, client.mScore);
  });

  const segmentNames = [
    "Campeões",
    "Fiéis",
    "Potenciais Fiéis",
    "Novos Clientes",
    "Em Risco",
    "Perdidos",
    "Hibernando",
  ];

  const segments: RFMSegment[] = segmentNames
    .map((name) => {
      const segmentClients = clients.filter((c) => c.segment === name);
      if (segmentClients.length === 0) return null;

      return {
        name,
        count: segmentClients.length,
        revenue: segmentClients.reduce((s, c) => s + c.monetary, 0),
        avgRecency:
          segmentClients.reduce((s, c) => s + c.recency, 0) /
          segmentClients.length,
        avgFrequency:
          segmentClients.reduce((s, c) => s + c.frequency, 0) /
          segmentClients.length,
        avgMonetary:
          segmentClients.reduce((s, c) => s + c.monetary, 0) /
          segmentClients.length,
      };
    })
    .filter((s): s is RFMSegment => s !== null);

  const recommendations: RFMRecommendation[] = segments.map((segment) => ({
    segment: segment.name,
    action: SEGMENT_ACTIONS[segment.name] ?? "Monitorar segmento",
    clientCount: segment.count,
    revenue: segment.revenue,
  }));

  return { segments, clients, recommendations };
}
