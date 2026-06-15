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

export interface KPrototypeCentroid {
  numeric: number[];
  categorical: {
    paymentMethod: string;
    origin: string;
    salesChannel: string;
    status: string;
    dayOfWeek: string;
  };
}

export interface ClusterProfile {
  clusterId: number;
  name: string;
  description: string;
  dominantPayment: string;
  dominantOrigin: string;
  avgTicket: number;
}

export interface KPrototypeResult {
  clusters: number[];
  centroids: KPrototypeCentroid[];
  orderDistances: number[];
  elbowAnalysis: ElbowPoint[];
  silhouetteAnalysis: SilhouettePoint[];
  bestK: number;
  clusterProfiles: ClusterProfile[];
  gamma: number;
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

export interface FinancialImpact {
  problem: string;
  estimatedLoss: number;
  recommendedAction: string;
  estimatedRecovery: number;
  estimatedCost: number;
  roi: number;
  priority: "alta" | "media" | "baixa";
}

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
  financialImpact?: FinancialImpact;
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

export interface RFMSegment {
  name: string;
  count: number;
  revenue: number;
  avgRecency: number;
  avgFrequency: number;
  avgMonetary: number;
}

export interface RFMClient {
  clientId: string;
  recency: number;
  frequency: number;
  monetary: number;
  rScore: number;
  fScore: number;
  mScore: number;
  segment: string;
}

export interface RFMRecommendation {
  segment: string;
  action: string;
  clientCount: number;
  revenue: number;
}

export interface RFMResult {
  segments: RFMSegment[];
  clients: RFMClient[];
  recommendations: RFMRecommendation[];
}

export interface RuptureRiskItem {
  skuId: string;
  name: string;
  currentStock: number;
  avgDailySales: number;
  daysRemaining: number;
  classification: "Crítico" | "Atenção" | "Saudável";
}

export interface DeadStockItem {
  skuId: string;
  name: string;
  daysSinceLastSale: number;
  currentStock: number;
}

export interface ABCItem {
  skuId: string;
  name: string;
  class: "A" | "B" | "C";
  revenue: number;
  cumulativeRevenue: number;
  share: number;
  cumulativeShare: number;
}

export interface InventoryResult {
  ruptureRisk: RuptureRiskItem[];
  deadStock: DeadStockItem[];
  abcCurve: ABCItem[];
}

export interface Alert {
  id: string;
  severity: "critical" | "warning" | "info";
  category: "cancellation" | "inventory" | "fraud" | "financial" | "operational";
  title: string;
  description: string;
  financialImpact: number;
  recommendedAction: string;
  confidence: number;
  createdAt: string;
  financialDetails?: FinancialImpact;
}

export interface FraudFlag {
  orderId: string;
  clientId: string;
  score: number;
  riskLevel: "low" | "medium" | "high";
  reasons: string[];
}

export interface FraudResult {
  flaggedOrders: FraudFlag[];
  summary: {
    totalFlagged: number;
    estimatedExposure: number;
    highRisk: number;
    mediumRisk: number;
    lowRisk: number;
  };
}

export interface SKUForecast {
  skuId: string;
  name: string;
  trend: "growing" | "stable" | "declining";
  forecast7d: number;
  forecast30d: number;
  forecast90d: number;
  expectedGrowth: number;
}

export interface PurchaseRecommendation {
  skuId: string;
  name: string;
  recommendedQty: number;
  reason: string;
  urgency: "alta" | "media" | "baixa";
}

export interface ForecastResult {
  forecasts: SKUForecast[];
  purchaseRecommendations: PurchaseRecommendation[];
}

export interface HealthScoreBreakdown {
  cancellation: number;
  delivery: number;
  inventory: number;
  revenueConcentration: number;
  fraud: number;
  overall: number;
}

export interface AnalysisResult {
  orders: ProcessedOrder[];
  kprototypes: KPrototypeResult;
  productKmeans: ProductKmeansResult;
  diagnostics: DiagnosticsResult;
  normalizationMeta: NormalizationMeta;
  rfm: RFMResult;
  inventory: InventoryResult;
  alerts: Alert[];
  fraud: FraudResult;
  forecast: ForecastResult;
  healthScore: HealthScoreBreakdown;
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
