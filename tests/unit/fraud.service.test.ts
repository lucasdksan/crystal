import { describe, expect, it } from "vitest";
import { detectFraud } from "@/backend/services/fraud.service";
import type { VtexOrder } from "@/backend/types/vtex";

function createOrder(overrides: Partial<VtexOrder> & Pick<VtexOrder, "orderId">): VtexOrder {
  return {
    clientName: "Cliente",
    clientEmail: "client@test.com",
    creationDate: "2025-01-15T10:00:00.000Z",
    items: [{ quantity: 1, price: 100, sellingPrice: 100, description: "Prod", productId: "p1", seller: "1" }],
    totalValue: 100,
    totalItems: 1,
    origin: "Marketplace",
    paymentNames: "Pix",
    status: "canceled",
    salesChannel: "1",
    workflowInErrorState: false,
    isAllDelivered: false,
    ...overrides,
  };
}

describe("fraud.service", () => {
  it("flags clients with high cancellation rate", () => {
    const orders: VtexOrder[] = [
      createOrder({ orderId: "1", clientEmail: "bad@test.com", status: "canceled" }),
      createOrder({ orderId: "2", clientEmail: "bad@test.com", status: "canceled", creationDate: "2025-01-15T10:01:00.000Z" }),
      createOrder({ orderId: "3", clientEmail: "bad@test.com", status: "canceled", creationDate: "2025-01-15T10:02:00.000Z" }),
      createOrder({ orderId: "4", clientEmail: "good@test.com", status: "delivered" }),
    ];

    const result = detectFraud(orders);

    expect(result.summary.totalFlagged).toBeGreaterThan(0);
    result.flaggedOrders.forEach((flag) => {
      expect(flag.score).toBeGreaterThanOrEqual(0);
      expect(flag.score).toBeLessThanOrEqual(100);
      expect(["low", "medium", "high"]).toContain(flag.riskLevel);
    });
  });

  it("returns empty for no orders", () => {
    const result = detectFraud([]);
    expect(result.flaggedOrders).toHaveLength(0);
  });
});
