import { describe, expect, it } from "vitest";
import { buildHtmlReport } from "@/frontend/lib/report";
import { fixtureDashboardState } from "@/tests/fixtures/dashboard-state";

describe("buildHtmlReport", () => {
  it("gera HTML com seções do dashboard v3", () => {
    const html = buildHtmlReport(fixtureDashboardState);

    expect(html).toContain("Crystal v3");
    expect(html).toContain("Health Score");
    expect(html).toContain("Alertas Prioritários");
    expect(html).toContain("Relacionamento — Perfis de Clientes");
    expect(html).toContain("Estoque e Ruptura");
    expect(html).toContain("Fraude — Pedidos Sinalizados");
    expect(html).toContain("Estratégias Prioritárias");
    expect(html).toContain("Recomendações de Compra");
    expect(html).toContain(fixtureDashboardState.diagnostics.championProduct);
    expect(html).toContain(fixtureDashboardState.alerts[0].title);
  });

  it("não quebra com dados vazios", () => {
    const empty = {
      ...fixtureDashboardState,
      clusters: [],
      alerts: [],
      rfm: { segments: [], recommendations: [], totalClients: 0 },
      inventory: { ruptureRisk: [], deadStock: [], abcCurve: [] },
      productAnomalies: [],
      diagnostics: {
        ...fixtureDashboardState.diagnostics,
        risks: [],
        allStrategies: [],
        suggestions: [],
      },
      forecast: { forecasts: [], purchaseRecommendations: [] },
    };

    expect(() => buildHtmlReport(empty)).not.toThrow();
    const html = buildHtmlReport(empty);
    expect(html).toContain("Nenhum alerta ativo no momento.");
  });
});
