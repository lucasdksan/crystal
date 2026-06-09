export interface OverviewStats {
  receitaTotal: number;
  ticketMedio: number;
  taxaCancelamento: number;
  taxaEntrega: number;
  errosWorkflow: number;
  totalPedidos: number;
  totalClusters: number;
  totalClientes: number;
  receitaEmRisco: number;
  clvTotal: number;
}

export interface ProductRank {
  name: string;
  quantity: number;
  revenue: number;
}

export interface RFMProfileUI {
  recencia: number;
  frequencia: number;
  valorMonetario: number;
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
  averageFrequency?: number;
  averageDaysSinceLastPurchase?: number;
  rfm?: RFMProfileUI;
  rfmLabel?: string;
}

export interface CohortRowUI {
  cohortMonth: string;
  cohortSize: number;
  retention: number[];
  highChurnAlert: boolean;
}

export interface CentroidNormalized {
  clusterId: number;
  name: string;
  valorTotal: number;
  totalItens: number;
  quantidadeTotal: number;
  precoMedio: number;
  origem: number;
  pagamento: number;
  horaDoDia: number;
  diaDaSemana: number;
  canalVendas: number;
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
  horaDoDia: number;
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

export interface CustomerSegmentUI {
  id: number;
  name: string;
  description: string;
  customerCount: number;
  customerShare: number;
  revenueShare: number;
  averageTicket: number;
  averageFrequency: number;
  averageDaysSinceLastPurchase: number;
  totalRevenue: number;
}

export interface ChurnScoreUI {
  customerId: string;
  customerName: string;
  score: number;
  riskLevel: "baixo" | "medio" | "alto" | "critico";
  estimatedLostRevenue: number;
  daysSinceLastPurchase: number;
  purchaseFrequency: number;
}

export interface CLVEstimateUI {
  customerId: string;
  customerName: string;
  currentRevenue: number;
  predictedRevenue6m: number;
  estimatedLifetimeValue: number;
  segmentName: string;
}

export interface RevenueOpportunityUI {
  type: string;
  title: string;
  description: string;
  estimatedValue: number;
  customerCount: number;
}

export interface ExecutiveInsightUI {
  text: string;
  financialImpact: number;
  priority: "alta" | "media" | "baixa";
  category: string;
}

export interface CustomerIntelligenceSummary {
  recoverableRevenue: number;
  incrementalRevenue: number;
  revenueAtRisk: number;
  totalClv: number;
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

export interface StrategyInfo {
  type: string;
  label: string;
  priorityScore: number;
  justifications: string[];
  actions: StrategyAction[];
}

export interface ClusterRisk {
  clusterId: number;
  clusterName: string;
  cancelRate: number;
  revenueShare: number;
}

export interface ProductClusterProductUI {
  productKey: string;
  name: string;
  revenue: number;
  totalOrders: number;
  cancellationRate: number;
}

export interface ProductClusterUI {
  id: number;
  name: string;
  products: ProductClusterProductUI[];
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

export interface ProductDiagnosticUI {
  type: ProductDiagnosticType;
  title: string;
  message: string;
  severity: ProductDiagnosticSeverity;
}

export interface ProductIntelligenceUI {
  clusters: ProductClusterUI[];
  diagnostics: ProductDiagnosticUI[];
  totalProducts: number;
}

export type BCGQuadrantUI = "star" | "cash_cow" | "question" | "dog";

export interface BCGProductUI {
  productKey: string;
  productName: string;
  revenueShare: number;
  growthRate: number;
  quadrant: BCGQuadrantUI;
  revenue: number;
  totalOrders: number;
}

export interface BCGMatrixUI {
  products: BCGProductUI[];
  medianRevenueShare: number;
  medianGrowthRate: number;
  quadrantCounts: Record<BCGQuadrantUI, number>;
}

export interface CatalogHealthProductUI {
  productKey: string;
  productName: string;
  revenue: number;
  totalOrders: number;
  daysSinceLastSale?: number;
  growthRate?: number;
}

export interface CatalogHealthUI {
  noSale30Days: CatalogHealthProductUI[];
  noSale60Days: CatalogHealthProductUI[];
  noSale90Days: CatalogHealthProductUI[];
  singleSaleProducts: CatalogHealthProductUI[];
  paretoProducts: CatalogHealthProductUI[];
  decliningProducts: CatalogHealthProductUI[];
  growingProducts: CatalogHealthProductUI[];
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
  elbowK: number;
  paymentMethodsK: number;
  operationalHours: OperationalHour[];
  operationalDays: OperationalDay[];
  statuses: StatusDistribution[];
  products: ProductRank[];
  productAnomalies: AnomalyProduct[];
  diagnostics: StrategicDiagnostics;
  customerSegments: CustomerSegmentUI[];
  churnScores: ChurnScoreUI[];
  clvEstimates: CLVEstimateUI[];
  revenueOpportunities: RevenueOpportunityUI[];
  productIntelligence: ProductIntelligenceUI;
  bcgMatrix: BCGMatrixUI;
  catalogHealth: CatalogHealthUI;
  executiveInsights: ExecutiveInsightUI[];
  customerIntelligenceSummary: CustomerIntelligenceSummary;
  cohortMatrix: CohortRowUI[];
}

export interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: string;
}
