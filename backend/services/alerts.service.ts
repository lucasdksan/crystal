import type {
  Alert,
  FraudResult,
  InventoryResult,
  KPrototypeResult,
  RFMResult,
} from "@/backend/types/analysis";
import {
  enrichAlertFinancial,
  type FinancialContext,
} from "@/backend/services/financial.service";

interface AlertContext {
  cancelRate: number;
  totalRevenue: number;
  totalOrders: number;
  ticketMedio: number;
  inventory: InventoryResult;
  fraud: FraudResult;
  kprototypes: KPrototypeResult;
  rfm: RFMResult;
}

function createAlert(
  partial: Omit<Alert, "id" | "createdAt">,
): Alert {
  return {
    ...partial,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
}

function getDominantPaymentMix(
  kprototypes: KPrototypeResult,
): string | null {
  if (kprototypes.centroids.length === 0) return null;

  const payments = kprototypes.centroids.map((c) => c.categorical.paymentMethod);
  const freq = new Map<string, number>();
  payments.forEach((p) => freq.set(p, (freq.get(p) ?? 0) + 1));
  return [...freq.entries()].reduce((a, b) => (b[1] > a[1] ? b : a))[0];
}

export function buildAlerts(context: AlertContext): Alert[] {
  const alerts: Alert[] = [];
  const financialContext: FinancialContext = {
    totalRevenue: context.totalRevenue,
    cancelRate: context.cancelRate,
    totalOrders: context.totalOrders,
    ticketMedio: context.ticketMedio,
  };

  if (context.cancelRate > 20) {
    const impact = context.totalRevenue * (context.cancelRate / 100);
    const alert = createAlert({
      severity: context.cancelRate > 50 ? "critical" : "warning",
      category: "cancellation",
      title: context.cancelRate > 50 ? "Cancelamento Crítico" : "Taxa de Cancelamento Elevada",
      description: `${context.cancelRate.toFixed(1)}% dos pedidos foram cancelados`,
      financialImpact: Math.round(impact * 100) / 100,
      recommendedAction: "Enviar lembrete WhatsApp após 2 horas para pagamentos pendentes",
      confidence: 0.85,
    });
    alert.financialDetails = enrichAlertFinancial(
      alert.title,
      alert.recommendedAction,
      alert.financialImpact,
      financialContext,
    );
    alerts.push(alert);
  }

  context.inventory.ruptureRisk
    .filter((item) => item.classification === "Crítico")
    .slice(0, 5)
    .forEach((item) => {
      const impact = item.avgDailySales * item.currentStock * 10;
      const alert = createAlert({
        severity: "critical",
        category: "inventory",
        title: "Alerta de Ruptura",
        description: `${item.name}: estoque para ${item.daysRemaining.toFixed(0)} dias`,
        financialImpact: Math.round(impact * 100) / 100,
        recommendedAction: `Repor estoque do SKU ${item.skuId} imediatamente`,
        confidence: 0.9,
      });
      alert.financialDetails = enrichAlertFinancial(
        alert.title,
        alert.recommendedAction,
        alert.financialImpact,
        financialContext,
      );
      alerts.push(alert);
    });

  context.inventory.deadStock.slice(0, 5).forEach((item) => {
    const alert = createAlert({
      severity: "warning",
      category: "inventory",
      title: "Alerta de Capital Parado",
      description: `${item.name}: ${item.daysSinceLastSale} dias sem venda, ${item.currentStock} un. em estoque`,
      financialImpact: Math.round(item.currentStock * context.ticketMedio * 100) / 100,
      recommendedAction: "Criar promoção relâmpago ou bundle para escoar estoque",
      confidence: 0.75,
    });
    alert.financialDetails = enrichAlertFinancial(
      alert.title,
      alert.recommendedAction,
      alert.financialImpact,
      financialContext,
    );
    alerts.push(alert);
  });

  const dominantPayment = getDominantPaymentMix(context.kprototypes);
  if (dominantPayment) {
    const paymentClusters = context.kprototypes.centroids.filter(
      (c) => c.categorical.paymentMethod === dominantPayment,
    );
    const concentration = paymentClusters.length / context.kprototypes.centroids.length;

    if (concentration > 0.7) {
      const alert = createAlert({
        severity: "warning",
        category: "financial",
        title: "Concentração de Pagamento",
        description: `${(concentration * 100).toFixed(0)}% dos clusters usam ${dominantPayment}`,
        financialImpact: Math.round(context.totalRevenue * 0.1 * 100) / 100,
        recommendedAction: "Diversificar meios de pagamento com incentivos",
        confidence: 0.7,
      });
      alert.financialDetails = enrichAlertFinancial(
        alert.title,
        alert.recommendedAction,
        alert.financialImpact,
        financialContext,
      );
      alerts.push(alert);
    }
  }

  context.fraud.flaggedOrders
    .filter((f) => f.score >= 70)
    .slice(0, 5)
    .forEach((flag) => {
      const order = context.totalOrders > 0 ? context.ticketMedio : 0;
      alerts.push(
        createAlert({
          severity: "critical",
          category: "fraud",
          title: "Comportamento Suspeito Detectado",
          description: `Cliente ${flag.clientId}: score ${flag.score}/100 — ${flag.reasons.join(", ")}`,
          financialImpact: Math.round(order * 100) / 100,
          recommendedAction: "Revisar pedidos do cliente e aplicar verificação adicional",
          confidence: flag.score / 100,
        }),
      );
    });

  const atRiskSegment = context.rfm.segments.find((s) => s.name === "Em Risco");
  if (atRiskSegment && atRiskSegment.count > 0) {
    alerts.push(
      createAlert({
        severity: "warning",
        category: "operational",
        title: "Clientes Fiéis em Risco",
        description: `${atRiskSegment.count} clientes fiéis sem comprar recentemente`,
        financialImpact: Math.round(atRiskSegment.revenue * 0.3 * 100) / 100,
        recommendedAction: "Campanha win-back com cupom exclusivo para clientes em risco",
        confidence: 0.8,
      }),
    );
  }

  const severityOrder = { critical: 0, warning: 1, info: 2 };
  return alerts.sort(
    (a, b) =>
      severityOrder[a.severity] - severityOrder[b.severity] ||
      b.financialImpact - a.financialImpact,
  );
}
