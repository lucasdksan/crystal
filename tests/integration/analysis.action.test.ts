import { beforeEach, describe, expect, it, vi } from "vitest";
import { runAnalysis } from "@/backend/actions/analysis";
import { fixtureVtexOrdersNormalized } from "../fixtures/vtex-orders";

const fetchVtexOrdersMock = vi.fn();

vi.mock("@/backend/services/vtex.service", () => ({
  fetchVtexOrders: (...args: unknown[]) => fetchVtexOrdersMock(...args),
}));

describe("runAnalysis", () => {
  beforeEach(() => {
    fetchVtexOrdersMock.mockReset();
  });

  it("returns the full analysis payload on success", async () => {
    fetchVtexOrdersMock.mockResolvedValue(fixtureVtexOrdersNormalized());

    const response = await runAnalysis();

    expect(response.success).toBe(true);
    if (!response.success) return;

    expect(response.data.orders.length).toBe(fixtureVtexOrdersNormalized().length);
    expect(response.data.kmeans.clusters).toHaveLength(response.data.orders.length);
    expect(response.data.som.predictions).toHaveLength(response.data.orders.length);
    expect(response.data.diagnostics.strategies.length).toBeGreaterThan(0);
    expect(response.data.productKmeans).toBeDefined();
    expect(response.data.normalizationMeta.mins).toHaveLength(9);
  });

  it("returns an error response when VTEX fetch fails", async () => {
    fetchVtexOrdersMock.mockRejectedValue(new Error("VTEX indisponível"));

    const response = await runAnalysis();

    expect(response).toEqual({
      success: false,
      error: "VTEX indisponível",
    });
  });
});
