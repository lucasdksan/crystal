import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchVtexOrders } from "@/backend/services/vtex.service";
import { fixtureVtexOrdersRaw } from "../fixtures/vtex-orders";

describe("vtex.service", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.VTEX_BASE_URL = "https://example.myvtex.com/";
    process.env.VTEX_APP_KEY = "test-app-key";
    process.env.VTEX_APP_TOKEN = "test-app-token";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it("throws when VTEX credentials are missing", async () => {
    delete process.env.VTEX_APP_KEY;

    await expect(fetchVtexOrders()).rejects.toThrow(/Missing VTEX credentials/);
  });

  it("calls VTEX OMS with expected URL and headers", async () => {
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ list: fixtureVtexOrdersRaw.slice(0, 2) }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await fetchVtexOrders();

    const calledUrl = decodeURIComponent(String(fetchMock.mock.calls[0][0]));
    expect(calledUrl).toContain("_items=1");
    expect(calledUrl).toContain("orderBy=creationDate,desc");
    expect(calledUrl).toContain("page=1");
    expect(calledUrl).toContain("per_page=100");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("api/oms/pvt/orders"),
      expect.objectContaining({
        headers: expect.objectContaining({
          "X-VTEX-API-AppKey": "test-app-key",
          "X-VTEX-API-AppToken": "test-app-token",
        }),
        cache: "no-store",
      }),
    );
  });

  it("converts monetary values from cents to currency", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ list: [fixtureVtexOrdersRaw[0]] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const [order] = await fetchVtexOrders();

    expect(order.totalValue).toBe(fixtureVtexOrdersRaw[0].totalValue / 100);
    expect(order.items[0].price).toBe(fixtureVtexOrdersRaw[0].items[0].price / 100);
    expect(order.items[0].sellingPrice).toBe(
      fixtureVtexOrdersRaw[0].items[0].sellingPrice / 100,
    );
  });

  it("throws when VTEX returns an empty order list", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ list: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(fetchVtexOrders()).rejects.toThrow(/Nenhum pedido encontrado/);
  });

  it("handles orders without items in list response", async () => {
    const orderWithoutItems = {
      ...fixtureVtexOrdersRaw[0],
      items: null,
    };

    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ list: [orderWithoutItems] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const [order] = await fetchVtexOrders();

    expect(order.items).toEqual([]);
  });

  it("appends date filter and pagination params when options provided", async () => {
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ list: fixtureVtexOrdersRaw.slice(0, 2) }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await fetchVtexOrders({
      page: 2,
      perPage: 50,
      startDate: "2025-01-01T00:00:00.000Z",
      endDate: "2025-01-31T23:59:59.999Z",
    });

    const calledUrl = decodeURIComponent(String(fetchMock.mock.calls[0][0]));
    expect(calledUrl).toContain("_items=1");
    expect(calledUrl).toContain("page=2");
    expect(calledUrl).toContain("per_page=50");
    expect(calledUrl).toContain("f_creationDate=creationDate:[");
    expect(calledUrl).toContain("2025-01-01T00:00:00Z");
    expect(calledUrl).toContain("2025-01-31T23:59:59Z");
  });

  it("fetches all pages when a date range is provided", async () => {
    const fetchMock = vi
      .spyOn(global, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            list: fixtureVtexOrdersRaw.slice(0, 2),
            paging: { total: 3, pages: 2, currentPage: 1, perPage: 2 },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            list: [fixtureVtexOrdersRaw[2]],
            paging: { total: 3, pages: 2, currentPage: 2, perPage: 2 },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );

    const orders = await fetchVtexOrders({
      startDate: "2025-01-01T00:00:00.000Z",
      endDate: "2025-01-31T23:59:59.999Z",
      perPage: 2,
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(orders).toHaveLength(3);
  });

  it("throws when VTEX responds with HTTP error", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response("Unauthorized", { status: 401, statusText: "Unauthorized" }),
    );

    await expect(fetchVtexOrders()).rejects.toThrow(/VTEX API request failed: 401/);
  });
});
