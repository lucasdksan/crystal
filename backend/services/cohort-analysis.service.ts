import type {
  AgrupamentoResult,
  CohortAnalysisResult,
  CohortRow,
} from "@/backend/types/analysis";
import type { ChurnScore, CustomerProfile } from "@/backend/types/customer";
import type { ProcessedOrder } from "@/backend/types/order";

function resolveClientId(order: ProcessedOrder): string {
  const email = order.clientEmail?.trim().toLowerCase();
  if (email) return email;
  return order.clientName.trim().toLowerCase() || order.orderId;
}

function toMonthKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function addMonths(monthKey: string, offset: number): string {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, month - 1 + offset, 1);
  return toMonthKey(date);
}

function monthsBetween(start: string, end: string): number {
  const [sy, sm] = start.split("-").map(Number);
  const [ey, em] = end.split("-").map(Number);
  return (ey - sy) * 12 + (em - sm);
}

export function runCohortAnalysis(
  orders: ProcessedOrder[],
  customerProfiles: CustomerProfile[],
  agrupamento: AgrupamentoResult,
  churnScores: ChurnScore[],
): CohortAnalysisResult {
  if (orders.length === 0 || customerProfiles.length === 0) {
    return { cohorts: [] };
  }

  const clientOrders = new Map<string, ProcessedOrder[]>();
  orders.forEach((order) => {
    const clientId = resolveClientId(order);
    if (!clientOrders.has(clientId)) clientOrders.set(clientId, []);
    clientOrders.get(clientId)!.push(order);
  });

  const clientCohort = new Map<string, string>();
  const clientActiveMonths = new Map<string, Set<string>>();

  customerProfiles.forEach((profile) => {
    const profileOrders = clientOrders.get(profile.clientId) ?? [];
    if (profileOrders.length === 0) return;

    const sorted = [...profileOrders].sort(
      (a, b) =>
        new Date(a.creationDate).getTime() -
        new Date(b.creationDate).getTime(),
    );

    const firstMonth = toMonthKey(new Date(sorted[0].creationDate));
    clientCohort.set(profile.clientId, firstMonth);

    const activeMonths = new Set<string>();
    sorted.forEach((order) => {
      activeMonths.add(toMonthKey(new Date(order.creationDate)));
    });
    clientActiveMonths.set(profile.clientId, activeMonths);
  });

  const cohortMembers = new Map<string, string[]>();
  clientCohort.forEach((cohortMonth, clientId) => {
    if (!cohortMembers.has(cohortMonth)) cohortMembers.set(cohortMonth, []);
    cohortMembers.get(cohortMonth)!.push(clientId);
  });

  const allOrderMonths = orders.map((o) =>
    toMonthKey(new Date(o.creationDate)),
  );
  const latestMonth = allOrderMonths.sort().at(-1) ?? toMonthKey(new Date());

  const churnRiskByClient = new Map(
    churnScores.map((score) => [score.customerId, score.riskLevel]),
  );

  const profileIndexByClient = new Map(
    customerProfiles.map((p, idx) => [p.clientId, idx]),
  );

  const highChurnClusterIds = new Set<number>();
  const clusterIds = [...new Set(agrupamento.clusters)];
  clusterIds.forEach((clusterId) => {
    const members = customerProfiles.filter(
      (_, idx) => agrupamento.clusters[idx] === clusterId,
    );
    if (members.length === 0) return;

    const avgRecency =
      members.reduce((sum, m) => sum + m.daysSinceLastPurchase, 0) /
      members.length;
    const avgFrequency =
      members.reduce((sum, m) => sum + m.totalOrders, 0) / members.length;

    if (avgRecency > 90 && avgFrequency >= 2) {
      highChurnClusterIds.add(clusterId);
    }
  });

  const cohorts: CohortRow[] = [...cohortMembers.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([cohortMonth, members]) => {
      const maxOffset = monthsBetween(cohortMonth, latestMonth);
      const retention: number[] = [];

      for (let offset = 0; offset <= maxOffset; offset++) {
        const targetMonth = addMonths(cohortMonth, offset);
        const activeCount = members.filter((clientId) =>
          clientActiveMonths.get(clientId)?.has(targetMonth),
        ).length;
        retention.push(
          members.length > 0 ? (activeCount / members.length) * 100 : 0,
        );
      }

      const highRiskCount = members.filter((clientId) => {
        const risk = churnRiskByClient.get(clientId);
        return risk === "alto" || risk === "critico";
      }).length;

      const highChurnClusterCount = members.filter((clientId) => {
        const idx = profileIndexByClient.get(clientId);
        if (idx === undefined) return false;
        const clusterId = agrupamento.clusters[idx];
        return highChurnClusterIds.has(clusterId);
      }).length;

      const highRiskShare =
        members.length > 0 ? highRiskCount / members.length : 0;
      const highChurnClusterShare =
        members.length > 0 ? highChurnClusterCount / members.length : 0;
      const month1Retention = retention[1] ?? retention[0] ?? 0;

      const highChurnAlert =
        highRiskShare >= 0.4 ||
        highChurnClusterShare >= 0.5 ||
        (month1Retention < 30 && highRiskShare >= 0.25);

      return {
        cohortMonth,
        cohortSize: members.length,
        retention,
        highChurnAlert,
      };
    });

  return { cohorts };
}
