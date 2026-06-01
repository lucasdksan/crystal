import SOM from "ml-som";
import type { SomResult } from "@/backend/types/analysis";

function getSomIterations(): number {
  const parsed = Number(process.env.SOM_ITERATIONS);
  if (Number.isFinite(parsed) && parsed > 0) {
    return Math.floor(parsed);
  }
  return 20;
}

function computeGridSize(n: number): number {
  return Math.max(3, Math.min(8, Math.round(Math.sqrt(n))));
}

export function runSom(normalizedVectors: number[][]): SomResult {
  if (!normalizedVectors || normalizedVectors.length === 0) {
    return { predictions: [], gridX: 3, gridY: 3 };
  }

  const gridSize = computeGridSize(normalizedVectors.length);
  const gridX = gridSize;
  const gridY = gridSize;
  const inputSize = normalizedVectors[0].length;

  const som = new SOM(gridX, gridY, {
    fields: inputSize,
    iterations: getSomIterations(),
  });

  som.train(normalizedVectors);
  const predictions = som.predict(normalizedVectors);

  return { predictions, gridX, gridY };
}
