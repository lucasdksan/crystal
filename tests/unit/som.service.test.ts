import { describe, expect, it } from "vitest";
import { runSom } from "@/backend/services/som.service";

describe("som.service", () => {
  it("returns default 3x3 grid for empty input", () => {
    const result = runSom([]);

    expect(result.predictions).toEqual([]);
    expect(result.gridX).toBe(3);
    expect(result.gridY).toBe(3);
  });

  it("produces square grid clamped between 3 and 8", () => {
    const vectors = Array.from({ length: 25 }, () =>
      Array.from({ length: 9 }, () => Math.random()),
    );

    const result = runSom(vectors);

    expect(result.gridX).toBe(result.gridY);
    expect(result.gridX).toBeGreaterThanOrEqual(3);
    expect(result.gridX).toBeLessThanOrEqual(8);
  });

  it("returns one prediction per input vector", () => {
    const vectors = [
      [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9],
      [0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1],
      [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
      [0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
      [0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8],
    ];

    const result = runSom(vectors);

    expect(result.predictions).toHaveLength(vectors.length);
    result.predictions.forEach((pred) => {
      expect(pred).toHaveLength(2);
      expect(pred[0]).toBeGreaterThanOrEqual(0);
      expect(pred[0]).toBeLessThan(result.gridX);
      expect(pred[1]).toBeGreaterThanOrEqual(0);
      expect(pred[1]).toBeLessThan(result.gridY);
    });
  });

  it("grid cell count equals gridX times gridY", () => {
    const vectors = Array.from({ length: 10 }, (_, i) =>
      Array.from({ length: 9 }, (_, j) => (i + j) / 20),
    );

    const result = runSom(vectors);

    expect(result.gridX * result.gridY).toBeGreaterThanOrEqual(9);
    expect(result.gridX * result.gridY).toBeLessThanOrEqual(64);
  });
});
