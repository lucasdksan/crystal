import { describe, expect, it } from "vitest";
import {
  countUsedPaymentMethods,
  findElbowK,
  findOptimalKByPaymentAndElbow,
  runKPrototypes,
} from "@/backend/services/kprototype.service";
import type { MixedDataPoint } from "@/backend/types/order";

const sampleData: MixedDataPoint[] = [
  {
    numeric: [100, 2, 3, 50],
    categorical: {
      paymentMethod: "Pix",
      origin: "Marketplace",
      salesChannel: "1",
      status: "delivered",
      dayOfWeek: "Seg",
    },
  },
  {
    numeric: [120, 1, 1, 120],
    categorical: {
      paymentMethod: "Pix",
      origin: "Marketplace",
      salesChannel: "1",
      status: "delivered",
      dayOfWeek: "Ter",
    },
  },
  {
    numeric: [80, 1, 1, 80],
    categorical: {
      paymentMethod: "Boleto Bancário",
      origin: "Marketplace",
      salesChannel: "1",
      status: "canceled",
      dayOfWeek: "Qua",
    },
  },
  {
    numeric: [200, 3, 5, 40],
    categorical: {
      paymentMethod: "Cartão de Crédito",
      origin: "Loja Própria",
      salesChannel: "2",
      status: "delivered",
      dayOfWeek: "Qui",
    },
  },
  {
    numeric: [90, 1, 2, 45],
    categorical: {
      paymentMethod: "Boleto Bancário",
      origin: "Marketplace",
      salesChannel: "1",
      status: "canceled",
      dayOfWeek: "Sex",
    },
  },
  {
    numeric: [150, 2, 2, 75],
    categorical: {
      paymentMethod: "Pix",
      origin: "Marketplace",
      salesChannel: "1",
      status: "delivered",
      dayOfWeek: "Seg",
    },
  },
];

describe("kprototype.service", () => {
  it("returns clusters for mixed data", () => {
    const result = runKPrototypes(sampleData);

    expect(result.clusters).toHaveLength(sampleData.length);
    expect(result.bestK).toBeGreaterThanOrEqual(1);
    expect(result.centroids).toHaveLength(result.bestK);
    expect(result.clusterProfiles).toHaveLength(result.bestK);
  });

  it("generates textual cluster profiles", () => {
    const result = runKPrototypes(sampleData);

    result.clusterProfiles.forEach((profile) => {
      expect(profile.name).toBeTruthy();
      expect(profile.description).toBeTruthy();
      expect(profile.dominantPayment).toBeTruthy();
    });
  });

  it("handles empty data", () => {
    const result = runKPrototypes([]);

    expect(result.clusters).toHaveLength(0);
    expect(result.bestK).toBe(0);
  });

  it("selects bestK from payment methods count plus half of elbow k", () => {
    const elbowAnalysis = [
      { k: 1, wcss: 100 },
      { k: 2, wcss: 60 },
      { k: 3, wcss: 40 },
      { k: 4, wcss: 35 },
      { k: 5, wcss: 33 },
    ];

    expect(countUsedPaymentMethods(sampleData)).toBe(3);
    expect(findElbowK(elbowAnalysis, 3)).toBe(4);
    expect(
      findOptimalKByPaymentAndElbow(sampleData, elbowAnalysis, 3, 5),
    ).toBe(5);

    const result = runKPrototypes(sampleData);
    const expectedBestK = findOptimalKByPaymentAndElbow(
      sampleData,
      result.elbowAnalysis,
      3,
      5,
    );
    expect(result.bestK).toBe(expectedBestK);
  });
});
