export interface OrderTimelineEntry {
  date: string;
  value: number;
  orderId: string;
}

export interface CustomerProfile {
  clientId: string;
  clientName: string;
  clientEmail: string;
  totalSpent: number;
  totalOrders: number;
  averageTicket: number;
  daysSinceLastPurchase: number;
  averageDaysBetweenOrders: number;
  purchaseFrequency: number;
  uniqueProducts: number;
  uniqueCategories: number;
  preferredPaymentMethod: string;
  preferredSalesChannel: string;
  preferredHour: number;
  weekendPurchaseRate: number;
  nightPurchaseRate: number;
  ordersTimeline: OrderTimelineEntry[];
  allPaymentMethods: string[];
  productIds: string[];
  productNames: string[];
}

export interface CustomerSegment {
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

export type ChurnRiskLevel = "baixo" | "medio" | "alto" | "critico";

export interface ChurnScore {
  customerId: string;
  customerName: string;
  score: number;
  riskLevel: ChurnRiskLevel;
  estimatedLostRevenue: number;
  daysSinceLastPurchase: number;
  purchaseFrequency: number;
}

export interface CLVEstimate {
  customerId: string;
  customerName: string;
  currentRevenue: number;
  predictedRevenue6m: number;
  estimatedLifetimeValue: number;
  segmentName: string;
}

export type RevenueOpportunityType =
  | "frequency_increase"
  | "ticket_growth"
  | "segment_expansion"
  | "recoverable"
  | "incremental"
  | "at_risk";

export interface RevenueOpportunity {
  type: RevenueOpportunityType;
  title: string;
  description: string;
  estimatedValue: number;
  customerCount: number;
}

export interface ProductAffinityRule {
  antecedent: string;
  consequent: string;
  support: number;
  confidence: number;
  lift: number;
}

export interface MigrationFlow {
  fromSegment: string;
  toSegment: string;
  customerCount: number;
  revenueImpact: number;
}

export type InsightPriority = "alta" | "media" | "baixa";

export interface ExecutiveInsight {
  text: string;
  financialImpact: number;
  priority: InsightPriority;
  category: string;
}

export interface CustomerIntelligenceResult {
  customerProfiles: CustomerProfile[];
  segments: CustomerSegment[];
  churnScores: ChurnScore[];
  clvEstimates: CLVEstimate[];
  revenueOpportunities: RevenueOpportunity[];
  affinityRules: ProductAffinityRule[];
  migrationFlows: MigrationFlow[];
  executiveInsights: ExecutiveInsight[];
  summary: {
    recoverableRevenue: number;
    incrementalRevenue: number;
    revenueAtRisk: number;
    totalClv: number;
  };
}
