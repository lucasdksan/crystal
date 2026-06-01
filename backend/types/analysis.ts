import type { ProcessedOrder } from "./order";

export interface ElbowPoint {
  k: number;
  wcss: number;
}

export interface SilhouettePoint {
  k: number;
  score: number;
}

export interface KmeansResult {
  clusters: number[];
  centroids: number[][];
  orderDistances: number[];
  elbowAnalysis: ElbowPoint[];
  silhouetteAnalysis: SilhouettePoint[];
  bestK: number;
}

export interface SomResult {
  predictions: [number, number][];
  gridX: number;
  gridY: number;
}

export interface ProductKmeansResult {
  productKeys: string[];
  clusters: number[];
  distances: number[];
  bestK: number;
}

export interface ProductStat {
  key: string;
  label: string;
  totalOrders: number;
  canceledOrders: number;
  effectiveQty: number;
  canceledQty: number;
  revenue: number;
  canceledRevenue: number;
  cancellationRate: number;
}

export interface ProductScore extends ProductStat {
  riskScore: number;
  bundleScore: number;
  volumeShare: number;
  stagnantFactor: number;
}

export interface PortfolioScores {
  dependencyScore: number;
  portfolioRiskScore: number;
  cancelRateNorm: number;
  portfolioHealth: number;
  avgBundleScore: number;
}

export interface Diagnosis {
  executiveSummary: string;
  excessiveDependency: boolean;
  championProduct: string;
  bottleneckProduct: string;
}

export interface Risk {
  product: string;
  riskType: string;
  severity: string;
}

export interface StrategyAction {
  label: string;
  description: string;
}

export interface Kit {
  commercialName: string;
  compositeItems: string[];
  strategicObjective: string;
  salesRationale: string;
}

export const STRATEGY_TYPE = {
  RISK_MITIGATION: "RISK_MITIGATION",
  DIVERSIFICATION: "DIVERSIFICATION",
  KIT_OPPORTUNITY: "KIT_OPPORTUNITY",
  CONVERSION_RECOVERY: "CONVERSION_RECOVERY",
  EXPANSION: "EXPANSION",
  STABILITY_MAINTENANCE: "STABILITY_MAINTENANCE",
} as const;

export type StrategyType = (typeof STRATEGY_TYPE)[keyof typeof STRATEGY_TYPE];

export interface Strategy {
  type: StrategyType;
  label: string;
  confidenceScore: number;
  impactScore: number;
  riskScore: number;
  priorityScore: number;
  justifications: string[];
  evidence: Record<string, unknown>;
  actions: StrategyAction[];
  kits?: Kit[];
}

export interface DiagnosticsResult {
  diagnosis: Diagnosis;
  risks: Risk[];
  strategies: Strategy[];
  productStats: ProductStat[];
  productScores: ProductScore[];
  portfolioScores: PortfolioScores;
}

export interface NormalizationMeta {
  mins: number[];
  maxs: number[];
}

export interface AnalysisResult {
  orders: ProcessedOrder[];
  kmeans: KmeansResult;
  som: SomResult;
  productKmeans: ProductKmeansResult;
  diagnostics: DiagnosticsResult;
  normalizationMeta: NormalizationMeta;
}

export interface AnalysisError {
  success: false;
  error: string;
}

export interface AnalysisSuccess {
  success: true;
  data: AnalysisResult;
}

export type AnalysisResponse = AnalysisSuccess | AnalysisError;

export interface AnalysisOptions {
  page?: number;
  perPage?: number;
  startDate?: string;
  endDate?: string;
}
