import type {
  ClusterProfile,
  ElbowPoint,
  KPrototypeCentroid,
  KPrototypeResult,
  SilhouettePoint,
} from "@/backend/types/analysis";
import type { MixedDataPoint } from "@/backend/types/order";

const MAX_K = 8;
const MIN_K = 3;
const MAX_ITERATIONS = 100;

function euclideanDistance(a: number[], b: number[]): number {
  return Math.sqrt(a.reduce((sum, val, i) => sum + (val - b[i]) ** 2, 0));
}

function categoricalDistance(
  a: MixedDataPoint["categorical"],
  b: MixedDataPoint["categorical"],
): number {
  const keys = Object.keys(a) as (keyof MixedDataPoint["categorical"])[];
  let mismatches = 0;
  keys.forEach((key) => {
    if (a[key] !== b[key]) mismatches++;
  });
  return mismatches / keys.length;
}

function mixedDistance(
  a: MixedDataPoint,
  b: KPrototypeCentroid,
  gamma: number,
): number {
  const numDist = euclideanDistance(a.numeric, b.numeric);
  const catDist = categoricalDistance(a.categorical, b.categorical);
  return numDist + gamma * catDist;
}

function computeGamma(data: MixedDataPoint[]): number {
  if (data.length === 0) return 1;

  const stds: number[] = [];
  for (let col = 0; col < 4; col++) {
    const values = data.map((d) => d.numeric[col]);
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const variance =
      values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
    stds.push(Math.sqrt(variance));
  }

  const avgStd = stds.reduce((s, v) => s + v, 0) / stds.length;
  return avgStd > 0 ? avgStd : 1;
}

function mode(values: string[]): string {
  const freq = new Map<string, number>();
  values.forEach((v) => freq.set(v, (freq.get(v) ?? 0) + 1));
  return [...freq.entries()].reduce((a, b) => (b[1] > a[1] ? b : a))[0];
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function initializeCentroids(
  data: MixedDataPoint[],
  k: number,
): KPrototypeCentroid[] {
  const indices = new Set<number>();
  while (indices.size < k && indices.size < data.length) {
    indices.add(Math.floor(Math.random() * data.length));
  }

  return [...indices].map((idx) => ({
    numeric: [...data[idx].numeric],
    categorical: { ...data[idx].categorical },
  }));
}

function updateCentroids(
  data: MixedDataPoint[],
  clusters: number[],
  k: number,
): KPrototypeCentroid[] {
  const centroids: KPrototypeCentroid[] = [];

  for (let c = 0; c < k; c++) {
    const assigned = data.filter((_, i) => clusters[i] === c);

    if (assigned.length === 0) {
      const randomIdx = Math.floor(Math.random() * data.length);
      centroids.push({
        numeric: [...data[randomIdx].numeric],
        categorical: { ...data[randomIdx].categorical },
      });
      continue;
    }

    centroids.push({
      numeric: [
        mean(assigned.map((d) => d.numeric[0])),
        mean(assigned.map((d) => d.numeric[1])),
        mean(assigned.map((d) => d.numeric[2])),
        mean(assigned.map((d) => d.numeric[3])),
      ],
      categorical: {
        paymentMethod: mode(assigned.map((d) => d.categorical.paymentMethod)),
        origin: mode(assigned.map((d) => d.categorical.origin)),
        salesChannel: mode(assigned.map((d) => d.categorical.salesChannel)),
        status: mode(assigned.map((d) => d.categorical.status)),
        dayOfWeek: mode(assigned.map((d) => d.categorical.dayOfWeek)),
      },
    });
  }

  return centroids;
}

function assignClusters(
  data: MixedDataPoint[],
  centroids: KPrototypeCentroid[],
  gamma: number,
): number[] {
  return data.map((point) => {
    let bestCluster = 0;
    let bestDist = Infinity;

    centroids.forEach((centroid, idx) => {
      const dist = mixedDistance(point, centroid, gamma);
      if (dist < bestDist) {
        bestDist = dist;
        bestCluster = idx;
      }
    });

    return bestCluster;
  });
}

function runKPrototypesOnce(
  data: MixedDataPoint[],
  k: number,
  gamma: number,
): { clusters: number[]; centroids: KPrototypeCentroid[] } {
  let centroids = initializeCentroids(data, k);
  let clusters = assignClusters(data, centroids, gamma);

  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    const newCentroids = updateCentroids(data, clusters, k);
    const newClusters = assignClusters(data, newCentroids, gamma);

    const converged = newClusters.every((c, i) => c === clusters[i]);
    centroids = newCentroids;
    clusters = newClusters;

    if (converged) break;
  }

  return { clusters, centroids };
}

function calculateWCSS(
  data: MixedDataPoint[],
  clusters: number[],
  centroids: KPrototypeCentroid[],
  gamma: number,
): number {
  return data.reduce((sum, point, i) => {
    return sum + mixedDistance(point, centroids[clusters[i]], gamma) ** 2;
  }, 0);
}

function calculateAverageSilhouette(
  data: MixedDataPoint[],
  clusters: number[],
  centroids: KPrototypeCentroid[],
  gamma: number,
): number {
  if (centroids.length < 2 || data.length < 2) return 0;

  let totalScore = 0;

  for (let i = 0; i < data.length; i++) {
    const ownCluster = clusters[i];
    const a = mixedDistance(data[i], centroids[ownCluster], gamma);

    let b = Infinity;
    for (let c = 0; c < centroids.length; c++) {
      if (c === ownCluster) continue;
      const dist = mixedDistance(data[i], centroids[c], gamma);
      if (dist < b) b = dist;
    }

    const denom = Math.max(a, b);
    totalScore += denom === 0 ? 0 : (b - a) / denom;
  }

  return totalScore / data.length;
}

function generateClusterProfile(
  clusterId: number,
  centroid: KPrototypeCentroid,
  assignedData: MixedDataPoint[],
): ClusterProfile {
  const avgTicket = mean(assignedData.map((d) => d.numeric[0]));
  const payment = centroid.categorical.paymentMethod;
  const origin = centroid.categorical.origin;

  let name = `Cluster ${clusterId}`;
  let description = "Perfil de compra identificado";

  const isHighTicket = avgTicket > 500;
  const isCard =
    payment.toLowerCase().includes("cartão") ||
    payment.toLowerCase().includes("visa") ||
    payment.toLowerCase().includes("mastercard");
  const isPix = payment.toLowerCase().includes("pix");
  const isBoleto = payment.toLowerCase().includes("boleto");
  const isOwnStore = !origin.toLowerCase().includes("marketplace");

  if (isHighTicket && isCard && isOwnStore) {
    name = "Clientes Premium de Alta Conversão";
    description = "Ticket alto, pagamento via cartão, loja própria";
  } else if (isPix && isHighTicket) {
    name = "Compradores Rápidos PIX";
    description = "Alto ticket com pagamento instantâneo via PIX";
  } else if (isBoleto) {
    name = "Grupo Boleto — Risco de Abandono";
    description = "Pagamento via boleto com risco elevado de cancelamento";
  } else if (isHighTicket) {
    name = "Compradores de Alto Valor";
    description = `Ticket médio R$ ${avgTicket.toFixed(0)}, via ${payment}`;
  } else if (isPix) {
    name = "Conversores PIX";
    description = "Pagamento imediato via PIX, boa taxa de conversão";
  } else {
    name = `Segmento ${payment}`;
    description = `${origin}, ticket médio R$ ${avgTicket.toFixed(0)}`;
  }

  return {
    clusterId,
    name,
    description,
    dominantPayment: payment,
    dominantOrigin: origin,
    avgTicket,
  };
}

function buildClusterProfiles(
  data: MixedDataPoint[],
  clusters: number[],
  centroids: KPrototypeCentroid[],
): ClusterProfile[] {
  return centroids.map((centroid, clusterId) => {
    const assignedData = data.filter((_, i) => clusters[i] === clusterId);
    return generateClusterProfile(clusterId, centroid, assignedData);
  });
}

export function countUsedPaymentMethods(data: MixedDataPoint[]): number {
  const frequencies = new Map<string, number>();
  data.forEach((point) => {
    const method = point.categorical.paymentMethod;
    frequencies.set(method, (frequencies.get(method) ?? 0) + 1);
  });

  return frequencies.size;
}

export function findElbowK(elbowAnalysis: ElbowPoint[], minK: number): number {
  const eligible = elbowAnalysis.filter((point) => point.k >= minK);
  if (eligible.length === 0) return minK;
  if (eligible.length === 1) return eligible[0].k;

  const first = eligible[0];
  const last = eligible[eligible.length - 1];

  let maxDistance = -1;
  let elbowK = eligible[0].k;

  eligible.forEach((point) => {
    const distance =
      Math.abs(
        (last.wcss - first.wcss) * point.k -
          (last.k - first.k) * point.wcss +
          last.k * first.wcss -
          last.wcss * first.k,
      ) /
      Math.sqrt((last.wcss - first.wcss) ** 2 + (last.k - first.k) ** 2);

    if (distance > maxDistance) {
      maxDistance = distance;
      elbowK = point.k;
    }
  });

  return elbowK;
}

export function findOptimalKByPaymentAndElbow(
  data: MixedDataPoint[],
  elbowAnalysis: ElbowPoint[],
  minK: number,
  maxK: number,
): number {
  const paymentMethodCount = countUsedPaymentMethods(data);
  const elbowK = findElbowK(elbowAnalysis, minK);
  const computedK = Math.round(paymentMethodCount + elbowK / 2);

  return Math.max(minK, Math.min(computedK, maxK));
}

export function runKPrototypes(
  data: MixedDataPoint[],
  maxK: number = MAX_K,
): KPrototypeResult {
  if (data.length === 0) {
    return {
      clusters: [],
      centroids: [],
      orderDistances: [],
      elbowAnalysis: [],
      silhouetteAnalysis: [],
      bestK: 0,
      clusterProfiles: [],
      gamma: 1,
    };
  }

  const gamma = computeGamma(data);
  const safeMaxK = Math.min(maxK, data.length - 1, MAX_K);
  const candidates: {
    k: number;
    wcss: number;
    silhouette: number;
    clusters: number[];
    centroids: KPrototypeCentroid[];
  }[] = [];

  for (let k = 1; k <= safeMaxK; k++) {
    const { clusters, centroids } = runKPrototypesOnce(data, k, gamma);
    const wcss = calculateWCSS(data, clusters, centroids, gamma);
    const silhouette = calculateAverageSilhouette(
      data,
      clusters,
      centroids,
      gamma,
    );
    candidates.push({ k, wcss, silhouette, clusters, centroids });
  }

  const elbowAnalysis: ElbowPoint[] = candidates.map(({ k, wcss }) => ({
    k,
    wcss,
  }));
  const silhouetteAnalysis: SilhouettePoint[] = candidates.map(
    ({ k, silhouette }) => ({ k, score: silhouette }),
  );

  const effectiveMinK = Math.min(MIN_K, candidates.length);
  const bestK = findOptimalKByPaymentAndElbow(
    data,
    elbowAnalysis,
    effectiveMinK,
    safeMaxK,
  );
  const best =
    candidates.find((candidate) => candidate.k === bestK) ?? candidates[0];

  const orderDistances = data.map((point, i) =>
    mixedDistance(point, best.centroids[best.clusters[i]], gamma),
  );

  return {
    clusters: best.clusters,
    centroids: best.centroids,
    orderDistances,
    elbowAnalysis,
    silhouetteAnalysis,
    bestK: best.k,
    clusterProfiles: buildClusterProfiles(data, best.clusters, best.centroids),
    gamma,
  };
}
