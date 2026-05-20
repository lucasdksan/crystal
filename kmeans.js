const { kmeans } = require("ml-kmeans");

const MAX_K = 10;
const MIN_K = 4;

function calculateWCSS(data, centroids, clusters) {
    let sum = 0;

    data.forEach((point, index) => {
        const centroid = centroids[clusters[index]];

        const distance = point.reduce((acc, value, i) => {
            return acc + Math.pow(value - centroid[i], 2);
        }, 0);

        sum += distance;
    });

    return sum;
}

function findBestK(data, maxK = MAX_K) {
    const safeMaxK = Math.min(maxK, data.length - 1);
    const results = [];

    for (let k = 1; k <= safeMaxK; k++) {
        const result = kmeans(data, k);
        const wcss = calculateWCSS(data, result.centroids, result.clusters);

        results.push({ k, wcss });
    }

    return results;
}

function findOptimalK(elbowResults) {
    const effectiveMinK = Math.min(MIN_K, elbowResults.length);

    if (elbowResults.length <= 1) {
        return 1;
    }

    if (elbowResults.length <= 2) {
        return effectiveMinK;
    }

    const deltas = [];

    for (let i = 0; i < elbowResults.length - 1; i++) {
        deltas.push(elbowResults[i].wcss - elbowResults[i + 1].wcss);
    }

    let bestK = effectiveMinK;
    let maxSecondDerivative = -Infinity;

    for (let i = 0; i < deltas.length - 1; i++) {
        const secondDerivative = deltas[i] - deltas[i + 1];

        if (secondDerivative > maxSecondDerivative) {
            maxSecondDerivative = secondDerivative;
            bestK = elbowResults[i + 1].k;
        }
    }

    return Math.max(effectiveMinK, Math.min(bestK, elbowResults.length));
}

function runKmeans(normalizedVectors, maxK = MAX_K) {
    const safeMaxK = Math.min(maxK, normalizedVectors.length - 1);
    const elbowAnalysis = findBestK(normalizedVectors, safeMaxK);
    const bestK = findOptimalK(elbowAnalysis);
    const result = kmeans(normalizedVectors, bestK);

    return { result, elbowAnalysis, bestK };
}

module.exports = { runKmeans };
