import { kmeans } from "ml-kmeans";
import type { AgrupamentoResult, ElbowPoint, SilhouettePoint } from "@/backend/types/analysis";

const MAX_K = 8;
const MIN_K = 3;

function euclideanDistance(a: number[], b: number[]): number {
  return Math.sqrt(a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0));
}

function calculateWCSS(
  data: number[][],
  centroids: number[][],
  clusters: number[],
): number {
  let sum = 0;

  data.forEach((point, index) => {
    const centroid = centroids[clusters[index]];

    const distance = point.reduce((acc, value, i) => {
      return acc + Math.pow(value - centroid[i], 2);
    }, 0);

    sum += distance;
  });

  return sum;
}

function calculateAverageSilhouette(
  data: number[][],
  clusters: number[],
  centroids: number[][],
): number {
  if (centroids.length < 2) return 0;

  let totalScore = 0;

  for (let i = 0; i < data.length; i++) {
    const point = data[i];
    const ownCluster = clusters[i];
    const a = euclideanDistance(point, centroids[ownCluster]);

    let b = Infinity;
    for (let c = 0; c < centroids.length; c++) {
      if (c === ownCluster) continue;
      const dist = euclideanDistance(point, centroids[c]);
      if (dist < b) b = dist;
    }

    const denom = Math.max(a, b);
    totalScore += denom === 0 ? 0 : (b - a) / denom;
  }

  return totalScore / data.length;
}

interface KCandidate {
  k: number;
  wcss: number;
  silhouette: number;
}

function findCandidates(data: number[][], maxK: number = MAX_K): KCandidate[] {
  const safeMaxK = Math.min(maxK, data.length - 1);
  const results: KCandidate[] = [];

  for (let k = 1; k <= safeMaxK; k++) {
    const result = kmeans(data, k, {});
    const wcss = calculateWCSS(data, result.centroids, result.clusters);
    const silhouette = calculateAverageSilhouette(
      data,
      result.clusters,
      result.centroids,
    );

    results.push({ k, wcss, silhouette });
  }

  return results;
}

function findOptimalKBySilhouette(candidates: KCandidate[]): number {
  const effectiveMinK = Math.min(MIN_K, candidates.length);

  if (candidates.length <= 1) return 1;
  if (candidates.length <= 2) return effectiveMinK;

  const eligible = candidates.filter((c) => c.k >= effectiveMinK);

  if (eligible.length === 0) return effectiveMinK;

  const best = eligible.reduce((prev, curr) =>
    curr.silhouette > prev.silhouette ? curr : prev,
  );

  return Math.min(best.k, candidates.length);
}

function findOptimalKByElbow(candidates: KCandidate[]): number {
  if (candidates.length <= 2) return Math.min(MIN_K, candidates.length);

  let maxDrop = -Infinity;
  let elbowK = candidates[0].k;

  for (let i = 1; i < candidates.length - 1; i++) {
    const prevDrop = candidates[i - 1].wcss - candidates[i].wcss;
    const nextDrop = candidates[i].wcss - candidates[i + 1].wcss;
    const curvature = prevDrop - nextDrop;

    if (curvature > maxDrop) {
      maxDrop = curvature;
      elbowK = candidates[i].k;
    }
  }

  return Math.max(elbowK, MIN_K);
}

function resolveBestK(
  candidates: KCandidate[],
  uniquePaymentMethods: number,
): number {
  if (candidates.length === 0) return 1;

  const elbowK = findOptimalKByElbow(candidates);
  const silhouetteK = findOptimalKBySilhouette(candidates);
  const paymentK = Math.min(
    Math.max(uniquePaymentMethods, MIN_K),
    candidates.length,
  );

  const candidateK = Math.max(
    MIN_K,
    Math.min(paymentK, Math.max(elbowK, silhouetteK)),
  );

  const match = candidates.find((c) => c.k === candidateK);
  return match ? candidateK : silhouetteK;
}

function calculateOrderDistances(
  data: number[][],
  clusters: number[],
  centroids: number[][],
): number[] {
  return data.map((point, index) =>
    euclideanDistance(point, centroids[clusters[index]]),
  );
}

export function runAgrupamento(
  normalizedVectors: number[][],
  maxK: number = MAX_K,
): AgrupamentoResult {
  return runAgrupamentoClientes(normalizedVectors, MIN_K, maxK);
}

export function runAgrupamentoClientes(
  normalizedVectors: number[][],
  uniquePaymentMethods: number,
  maxK: number = MAX_K,
): AgrupamentoResult {
  const safeMaxK = Math.min(maxK, normalizedVectors.length - 1);
  const candidates = findCandidates(normalizedVectors, safeMaxK);

  const elbowAnalysis: ElbowPoint[] = candidates.map(({ k, wcss }) => ({
    k,
    wcss,
  }));
  const silhouetteAnalysis: SilhouettePoint[] = candidates.map(
    ({ k, silhouette }) => ({ k, score: silhouette }),
  );

  const elbowK = findOptimalKByElbow(candidates);
  const paymentMethodsK = Math.min(
    Math.max(uniquePaymentMethods, MIN_K),
    candidates.length || MIN_K,
  );
  const bestK = resolveBestK(candidates, uniquePaymentMethods);
  const result = kmeans(normalizedVectors, bestK, {});

  return {
    clusters: result.clusters,
    centroids: result.centroids,
    orderDistances: calculateOrderDistances(
      normalizedVectors,
      result.clusters,
      result.centroids,
    ),
    elbowAnalysis,
    silhouetteAnalysis,
    bestK,
    elbowK,
    paymentMethodsK,
  };
}
