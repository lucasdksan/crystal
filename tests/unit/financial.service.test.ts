import { describe, expect, it } from "vitest";
import { calculateFinancialImpact } from "@/backend/services/financial.service";

describe("financial.service", () => {
  it("calculates financial impact with ROI", () => {
    const result = calculateFinancialImpact(
      "Alta taxa de cancelamento PIX",
      "Enviar lembrete WhatsApp",
      0.2,
      { totalRevenue: 100000, cancelRate: 20, totalOrders: 100, ticketMedio: 1000 },
    );

    expect(result.estimatedLoss).toBe(20000);
    expect(result.estimatedRecovery).toBeGreaterThan(0);
    expect(result.roi).toBeGreaterThan(0);
    expect(["alta", "media", "baixa"]).toContain(result.priority);
  });
});
