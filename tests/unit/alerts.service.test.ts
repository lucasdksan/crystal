import { describe, expect, it } from "vitest";
import { buildAlerts } from "@/backend/services/alerts.service";
import { buildInventory } from "@/backend/services/inventory.service";
import { detectFraud } from "@/backend/services/fraud.service";
import { buildRFM } from "@/backend/services/rfm.service";
import { runKPrototypes } from "@/backend/services/kprototype.service";
import {
  buildMixedDataPoints,
  normalizeMixedData,
  processOrders,
} from "@/backend/services/normalization.service";
import { fixtureVtexOrdersNormalized } from "../fixtures/vtex-orders";

describe("alerts.service", () => {
  it("creates cancellation alert when rate exceeds 20%", async () => {
    const rawList = fixtureVtexOrdersNormalized();
    const orders = processOrders(rawList);
    const mixed = normalizeMixedData(buildMixedDataPoints(orders)).normalized;
    const kprototypes = runKPrototypes(mixed);
    const inventory = await buildInventory(rawList);
    const fraud = detectFraud(rawList);
    const rfm = buildRFM(rawList);

    const totalRevenue = orders.reduce((s, o) => s + o.totalValue, 0);
    const canceledCount = orders.filter((o) => o.statusRaw === "canceled").length;
    const cancelRate = (canceledCount / orders.length) * 100;

    const alerts = buildAlerts({
      cancelRate,
      totalRevenue,
      totalOrders: orders.length,
      ticketMedio: totalRevenue / orders.length,
      inventory,
      fraud,
      kprototypes,
      rfm,
    });

    if (cancelRate > 20) {
      expect(alerts.some((a) => a.category === "cancellation")).toBe(true);
    }

    alerts.forEach((alert) => {
      expect(alert.id).toBeTruthy();
      expect(alert.severity).toBeTruthy();
      expect(alert.financialImpact).toBeGreaterThanOrEqual(0);
    });
  });
});
