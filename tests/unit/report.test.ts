import { describe, expect, it } from "vitest";
import { buildHtmlReport } from "@/frontend/lib/report";
import { fixtureDashboardState } from "../fixtures/dashboard-state";

describe("buildHtmlReport", () => {
  it("includes all major report sections", () => {
    const html = buildHtmlReport(fixtureDashboardState);

    expect(html).toContain("Resumo da Operação");
    expect(html).toContain('id="resumo"');
    expect(html).toContain('id="funil"');
    expect(html).toContain('id="segmentacao"');
    expect(html).toContain('id="clusters"');
    expect(html).toContain('id="churn"');
    expect(html).toContain('id="clv"');
    expect(html).toContain('id="insights"');
    expect(html).toContain('id="produtos"');
    expect(html).toContain('id="bcg"');
    expect(html).toContain('id="catalogo"');
    expect(html).toContain('id="operacional"');
    expect(html).toContain("Churn Risk");
    expect(html).toContain("Matriz BCG");
    expect(html).toContain("Saúde do Catálogo");
  });

  it("includes fixture data without arbitrary truncation", () => {
    const html = buildHtmlReport(fixtureDashboardState);

    expect(html).toContain("Maria Silva");
    expect(html).toContain("Ana Costa");
    expect(html).toContain("Clientes VIP");
    expect(html).toContain("Camiseta Premium");
    expect(html).toContain("Mitigação de Risco");
    expect(html).toContain("Reativação de inativos");
    expect(html).toContain("2 clientes VIP concentram 55% da receita");
  });

  it("limits long lists to keep the report concise", () => {
    const manyChurn = Array.from({ length: 12 }, (_, i) => ({
      customerId: `c${i}`,
      customerName: `Cliente ${i}`,
      score: 100 - i,
      riskLevel: "critico" as const,
      estimatedLostRevenue: 100,
      daysSinceLastPurchase: 100 + i,
      purchaseFrequency: 1,
    }));

    const html = buildHtmlReport({
      ...fixtureDashboardState,
      churnScores: manyChurn,
    });

    expect(html).toContain("Cliente 0");
    expect(html).toContain("Cliente 4");
    expect(html).not.toContain("Cliente 5");
    expect(html).toContain("+ 7 não exibido(s)");
  });

  it("escapes HTML in user-facing strings", () => {
    const html = buildHtmlReport({
      ...fixtureDashboardState,
      diagnostics: {
        ...fixtureDashboardState.diagnostics,
        summary: 'Resumo com <script>alert("x")</script>',
      },
    });

    expect(html).not.toContain('<script>alert("x")</script>');
    expect(html).toContain("&lt;script&gt;alert");
  });

  it("shows empty-state messages instead of omitting sections", () => {
    const html = buildHtmlReport({
      ...fixtureDashboardState,
      productAnomalies: [],
      statuses: [],
      products: [],
    });

    expect(html).toContain("Sem distribuição de status.");
    expect(html).toContain("Nenhuma anomalia identificada.");
  });

  it("omits empty catalog subsections", () => {
    const html = buildHtmlReport({
      ...fixtureDashboardState,
      catalogHealth: {
        ...fixtureDashboardState.catalogHealth,
        noSale30Days: [],
        noSale60Days: [],
        noSale90Days: [],
        singleSaleProducts: [],
        decliningProducts: [],
        growingProducts: [],
      },
    });

    expect(html).not.toContain("Sem venda 90 dias");
    expect(html).not.toContain("Nenhum produto nesta categoria.");
  });
});
