import { describe, expect, it } from "vitest";
import { buildRFM } from "@/backend/services/rfm.service";
import type { VtexOrder } from "@/backend/types/vtex";

function createOrder(overrides: Partial<VtexOrder> & Pick<VtexOrder, "orderId">): VtexOrder {
  return {
    clientName: "Cliente",
    clientEmail: "client@test.com",
    creationDate: "2025-01-15T10:00:00.000Z",
    items: [],
    totalValue: 100,
    totalItems: 1,
    origin: "Marketplace",
    paymentNames: "Pix",
    status: "delivered",
    salesChannel: "1",
    workflowInErrorState: false,
    isAllDelivered: true,
    ...overrides,
  };
}

describe("rfm.service", () => {
  it("segments clients into RFM groups", () => {
    const orders: VtexOrder[] = [
      createOrder({ orderId: "1", clientEmail: "vip@test.com", totalValue: 500, creationDate: "2025-06-01T10:00:00.000Z" }),
      createOrder({ orderId: "2", clientEmail: "vip@test.com", totalValue: 600, creationDate: "2025-06-10T10:00:00.000Z" }),
      createOrder({ orderId: "3", clientEmail: "vip@test.com", totalValue: 400, creationDate: "2025-06-12T10:00:00.000Z" }),
      createOrder({ orderId: "4", clientEmail: "new@test.com", totalValue: 50, creationDate: "2025-06-13T10:00:00.000Z" }),
    ];

    const result = buildRFM(orders);

    expect(result.clients).toHaveLength(2);
    expect(result.segments.length).toBeGreaterThan(0);
    expect(result.recommendations.length).toBeGreaterThan(0);
  });

  it("returns empty result for no orders", () => {
    const result = buildRFM([]);
    expect(result.clients).toHaveLength(0);
    expect(result.segments).toHaveLength(0);
  });
});
