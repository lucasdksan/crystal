import { describe, expect, it } from "vitest";
import { buildDiagnostics } from "@/backend/services/diagnostics.service";
import { fixtureVtexOrdersNormalized } from "../fixtures/vtex-orders";

describe("diagnostics.service", () => {
  describe("buildDiagnostics", () => {
    it("returns the expected result shape", () => {
      const result = buildDiagnostics(fixtureVtexOrdersNormalized());

      expect(result.diagnosis.executiveSummary).toBeTruthy();
      expect(result.productStats.length).toBeGreaterThan(0);
      expect(result.productScores).toHaveLength(result.productStats.length);
      expect(result.portfolioScores).toMatchObject({
        dependencyScore: expect.any(Number),
        portfolioRiskScore: expect.any(Number),
        cancelRateNorm: expect.any(Number),
        portfolioHealth: expect.any(Number),
        avgBundleScore: expect.any(Number),
      });
      expect(result.strategies.length).toBeGreaterThan(0);
    });

    it("detects revenue illusion risk for products with high cancellation rate", () => {
      const result = buildDiagnostics(fixtureVtexOrdersNormalized());
      const revenueIllusionRisks = result.risks.filter(
        (risk) => risk.riskType === "Ilusão de Receita (Cancelamentos)",
      );

      expect(revenueIllusionRisks.length).toBeGreaterThan(0);
      expect(revenueIllusionRisks.some((risk) => risk.product === "Camiseta Premium")).toBe(
        true,
      );
    });

    it("identifies champion and bottleneck products", () => {
      const result = buildDiagnostics(fixtureVtexOrdersNormalized());

      expect(result.diagnosis.championProduct).toBe("Meia Esportiva");
      expect(result.diagnosis.bottleneckProduct).toBeTruthy();
    });

    it("sorts strategies by priority score descending", () => {
      const result = buildDiagnostics(fixtureVtexOrdersNormalized());

      for (let i = 1; i < result.strategies.length; i++) {
        expect(result.strategies[i - 1].priorityScore).toBeGreaterThanOrEqual(
          result.strategies[i].priorityScore,
        );
      }
    });
  });
});
