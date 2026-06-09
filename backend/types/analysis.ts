import type { CustomerIntelligenceResult, CustomerProfile } from "./customer";
import type { ProcessedOrder } from "./order";

export interface ElbowPoint {
  k: number;
  wcss: number;
}

export interface SilhouettePoint {
  k: number;
  score: number;
}

export interface RFMCentroid {
  clusterId: number;
  label: string;
  recencia: number;
  frequencia: number;
  valorMonetario: number;
}

export interface CohortRow {
  cohortMonth: string;
  cohortSize: number;
  retention: number[];
  highChurnAlert: boolean;
}

export interface CohortAnalysisResult {
  cohorts: CohortRow[];
}

export interface AgrupamentoResult {
  clusters: number[];
  centroids: number[][];
  orderDistances: number[];
  elbowAnalysis: ElbowPoint[];
  silhouetteAnalysis: SilhouettePoint[];
  bestK: number;
  elbowK: number;
  paymentMethodsK: number;
  rfmCentroids: RFMCentroid[];
}

export interface ProductAgrupamentoResult {
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

export interface ProductClusterProduct {
  productKey: string;
  name: string;
  revenue: number;
  totalOrders: number;
  cancellationRate: number;
}

export interface ProductCluster {
  id: number;
  name: string;
  products: ProductClusterProduct[];
  totalRevenue: number;
  revenueShare: number;
  productCount: number;
  averageCancellationRate: number;
}

export type ProductDiagnosticType =
  | "champion"
  | "dependency"
  | "risk"
  | "long_tail"
  | "opportunity";

export type ProductDiagnosticSeverity = "info" | "warning" | "critical";

export interface ProductDiagnostic {
  type: ProductDiagnosticType;
  title: string;
  message: string;
  severity: ProductDiagnosticSeverity;
}

export interface ProductIntelligenceResult {
  clusters: ProductCluster[];
  diagnostics: ProductDiagnostic[];
  totalProducts: number;
}

export type BCGQuadrant = "star" | "cash_cow" | "question" | "dog";

export interface BCGProduct {
  productKey: string;
  productName: string;
  revenueShare: number;
  growthRate: number;
  quadrant: BCGQuadrant;
  revenue: number;
  totalOrders: number;
}

export interface BCGMatrixResult {
  products: BCGProduct[];
  medianRevenueShare: number;
  medianGrowthRate: number;
  quadrantCounts: Record<BCGQuadrant, number>;
}

export interface CatalogHealthProduct {
  productKey: string;
  productName: string;
  revenue: number;
  totalOrders: number;
  daysSinceLastSale?: number;
  growthRate?: number;
}

export interface CatalogHealthResult {
  noSale30Days: CatalogHealthProduct[];
  noSale60Days: CatalogHealthProduct[];
  noSale90Days: CatalogHealthProduct[];
  singleSaleProducts: CatalogHealthProduct[];
  paretoProducts: CatalogHealthProduct[];
  decliningProducts: CatalogHealthProduct[];
  growingProducts: CatalogHealthProduct[];
  summary: {
    totalProducts: number;
    paretoCount: number;
    paretoRevenueShare: number;
    singleSaleCount: number;
    noSale90Count: number;
    decliningCount: number;
    growingCount: number;
  };
}

export interface AnalysisResult {
  orders: ProcessedOrder[];
  customerProfiles: CustomerProfile[];
  agrupamento: AgrupamentoResult;
  agrupamentoProdutos: ProductAgrupamentoResult;
  diagnostics: DiagnosticsResult;
  customerIntelligence: CustomerIntelligenceResult;
  productIntelligence: ProductIntelligenceResult;
  bcgMatrix: BCGMatrixResult;
  catalogHealth: CatalogHealthResult;
  cohortAnalysis: CohortAnalysisResult;
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
