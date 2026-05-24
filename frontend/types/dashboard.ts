export interface OverviewStats {
  receitaTotal: number;
  ticketMedio: number;
  taxaCancelamento: number;
  taxaEntrega: number;
  errosWorkflow: number;
  totalPedidos: number;
  totalClusters: number;
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

export interface SOMNeuron {
  row: number;
  col: number;
  count: number;
  value: number;
  label: string;
  cancelRate: number;
  deliveryRate: number;
  paymentMix: Record<string, number>;
  peakHour: number;
  peakDay: string;
  topProducts: ProductRank[];
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
  somGrid: SOMNeuron[];
  operationalHours: OperationalHour[];
  operationalDays: OperationalDay[];
  statuses: StatusDistribution[];
  products: ProductRank[];
  productAnomalies: AnomalyProduct[];
  diagnostics: StrategicDiagnostics;
}

export interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: string;
}
