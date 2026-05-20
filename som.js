const SOM = require("ml-som");

const DEFAULT_ITERATIONS = 20;

function computeGridSize(n) {
    return Math.max(3, Math.min(8, Math.round(Math.sqrt(n))));
}

function runSom(normalizedVectors) {
    if (!normalizedVectors || normalizedVectors.length === 0) {
        return { predictions: [], gridX: 3, gridY: 3 };
    }

    const gridSize = computeGridSize(normalizedVectors.length);
    const gridX = gridSize;
    const gridY = gridSize;
    const inputSize = normalizedVectors[0].length;

    const som = new SOM(gridX, gridY, {
        fields: inputSize,
        iterations: DEFAULT_ITERATIONS,
    });

    som.train(normalizedVectors);
    const predictions = som.predict(normalizedVectors);

    return { predictions, gridX, gridY };
}

module.exports = { runSom };
