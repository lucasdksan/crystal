export interface OverviewStats {
  receitaTotal: number;
  ticketMedio: number;
  taxaCancelamento: number;
  taxaEntrega: number;
  errosWorkflow: number;
  totalPedidos: number;
  totalClusters: number;
  healthScore: number;
  perdaEstimada: number;
}

export interface ProductRank {
  name: string;
  quantity: number;
  revenue: number;
}

export interface ClusterInfo {
  id: number;
  name: string;
  count: number;
  percentage: number;
  averageValue: number;
  avgItems: number;
  avgQuantity: number;
  avgPrice: number;
  payment: string;
  status: string;
  origin: string;
  deliveryRate: number;
  description: string;
  subtitle: string;
  cancelRate: number;
  totalRevenue: number;
  revenueShare: number;
  errorRate: number;
  paymentMix: Record<string, number>;
  hourDistribution: number[];
  dayDistribution: number[];
  topProducts: ProductRank[];
  profileName?: string;
}

export interface CentroidNormalized {
  clusterId: number;
  name: string;
  valorTotal: number;
  totalItens: number;
  quantidadeTotal: number;
  precoMedio: number;
  pagamento: string;
  origem: string;
  status: string;
  diaDaSemana: string;
  canalVendas: string;
}

export interface CentroidDenormalized {
  clusterId: number;
  name: string;
  valorTotal: number;
  totalItens: number;
  quantidadeTotal: number;
  precoMedio: number;
  origem: string;
  pagamento: string;
  status: string;
  diaDaSemana: string;
  canalVendas: string;
}

export interface ElbowPoint {
  k: number;
  wcss: number;
}

export interface SilhouettePoint {
  k: number;
  score: number;
}

export interface OperationalHour {
  hour: string;
  count: number;
}

export interface OperationalDay {
  day: string;
  count: number;
}

export interface StatusDistribution {
  name: string;
  count: number;
  color: string;
}

export interface StrategicRisk {
  product: string;
  type: string;
  gravity: "Baixo" | "Médio" | "Alto";
}

export interface KitSuggestion {
  name: string;
  objective: string;
  products: string[];
  details: string;
}

export interface StrategyAction {
  label: string;
  description: string;
}

export interface FinancialImpactInfo {
  problem: string;
  estimatedLoss: number;
  recommendedAction: string;
  estimatedRecovery: number;
  estimatedCost: number;
  roi: number;
  priority: "alta" | "media" | "baixa";
}

export interface StrategyInfo {
  type: string;
  label: string;
  priorityScore: number;
  justifications: string[];
  actions: StrategyAction[];
  financialImpact?: FinancialImpactInfo;
}

export interface ClusterRisk {
  clusterId: number;
  clusterName: string;
  cancelRate: number;
  revenueShare: number;
}

export interface AnomalyProduct {
  productKey: string;
  name: string;
  clusterId: number;
  clusterName: string;
  revenue: number;
  canceledRevenue: number;
  cancellationRate: number;
  totalOrders: number;
  anomalyScore: number;
  action: string;
}

export interface StrategicDiagnostics {
  summary: string;
  championProduct: string;
  bottleneckProduct: string;
  risks: StrategicRisk[];
  suggestions: KitSuggestion[];
  allStrategies: StrategyInfo[];
  clusterRisks: ClusterRisk[];
}

export interface RFMSegmentInfo {
  name: string;
  count: number;
  revenue: number;
  avgRecency: number;
  avgFrequency: number;
  avgMonetary: number;
}

export interface RFMRecommendationInfo {
  segment: string;
  action: string;
  clientCount: number;
  revenue: number;
}

export interface RFMDashboard {
  segments: RFMSegmentInfo[];
  recommendations: RFMRecommendationInfo[];
  totalClients: number;
}

export interface RuptureRiskInfo {
  skuId: string;
  name: string;
  currentStock: number;
  avgDailySales: number;
  daysRemaining: number;
  classification: "Crítico" | "Atenção" | "Saudável";
}

export interface DeadStockInfo {
  skuId: string;
  name: string;
  daysSinceLastSale: number;
  currentStock: number;
}

export interface ABCItemInfo {
  skuId: string;
  name: string;
  class: "A" | "B" | "C";
  revenue: number;
  cumulativeRevenue: number;
  share: number;
  cumulativeShare: number;
}

export interface InventoryDashboard {
  ruptureRisk: RuptureRiskInfo[];
  deadStock: DeadStockInfo[];
  abcCurve: ABCItemInfo[];
}

export interface AlertInfo {
  id: string;
  severity: "critical" | "warning" | "info";
  category: string;
  title: string;
  description: string;
  financialImpact: number;
  recommendedAction: string;
  confidence: number;
  createdAt: string;
  financialDetails?: FinancialImpactInfo;
}

export interface FraudFlagInfo {
  orderId: string;
  clientId: string;
  score: number;
  riskLevel: "low" | "medium" | "high";
  reasons: string[];
}

export interface FraudDashboard {
  flaggedOrders: FraudFlagInfo[];
  summary: {
    totalFlagged: number;
    estimatedExposure: number;
    highRisk: number;
    mediumRisk: number;
    lowRisk: number;
  };
}

export interface SKUForecastInfo {
  skuId: string;
  name: string;
  trend: "growing" | "stable" | "declining";
  forecast7d: number;
  forecast30d: number;
  forecast90d: number;
  expectedGrowth: number;
}

export interface PurchaseRecommendationInfo {
  skuId: string;
  name: string;
  recommendedQty: number;
  reason: string;
  urgency: "alta" | "media" | "baixa";
}

export interface ForecastDashboard {
  forecasts: SKUForecastInfo[];
  purchaseRecommendations: PurchaseRecommendationInfo[];
}

export interface HealthScoreInfo {
  overall: number;
  cancellation: number;
  delivery: number;
  inventory: number;
  revenueConcentration: number;
  fraud: number;
  label: string;
}

export interface DashboardData {
  reportDate: string;
  reportId: string;
  overview: OverviewStats;
  clusters: ClusterInfo[];
  centroids: CentroidNormalized[];
  denormalizedCentroids: CentroidDenormalized[];
  elbowCurve: ElbowPoint[];
  silhouetteCurve: SilhouettePoint[];
  bestSilhouetteScore: number;
  operationalHours: OperationalHour[];
  operationalDays: OperationalDay[];
  statuses: StatusDistribution[];
  products: ProductRank[];
  productAnomalies: AnomalyProduct[];
  diagnostics: StrategicDiagnostics;
  rfm: RFMDashboard;
  inventory: InventoryDashboard;
  alerts: AlertInfo[];
  fraud: FraudDashboard;
  forecast: ForecastDashboard;
  healthScore: HealthScoreInfo;
}

export interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: string;
}

export type DashboardTabId =
  | "resumo"
  | "clientes"
  | "relacionamento"
  | "estoque"
  | "alertas"
  | "riscos"
  | "oportunidades"
  | "mentor";
