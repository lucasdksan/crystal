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
    expect(response.data.kprototypes.clusters).toHaveLength(response.data.orders.length);
    expect(response.data.diagnostics.strategies.length).toBeGreaterThan(0);
    expect(response.data.productKmeans).toBeDefined();
    expect(response.data.normalizationMeta.mins).toHaveLength(4);
    expect(response.data.rfm).toBeDefined();
    expect(response.data.inventory).toBeDefined();
    expect(response.data.alerts).toBeDefined();
    expect(response.data.fraud).toBeDefined();
    expect(response.data.forecast).toBeDefined();
    expect(response.data.healthScore).toBeDefined();
  });

  it("forwards analysis options to fetchVtexOrders", async () => {
    fetchVtexOrdersMock.mockResolvedValue(fixtureVtexOrdersNormalized());

    await runAnalysis({
      startDate: "2025-01-01T00:00:00.000Z",
      endDate: "2025-01-31T23:59:59.999Z",
      perPage: 50,
    });

    expect(fetchVtexOrdersMock).toHaveBeenCalledWith({
      startDate: "2025-01-01T00:00:00.000Z",
      endDate: "2025-01-31T23:59:59.999Z",
      perPage: 50,
    });
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
