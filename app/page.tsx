"use client";

import { useState } from "react";
import { runAnalysis } from "@/backend/actions/analysis";

export default function Home() {
  const [loading, setLoading] = useState(false);

  async function handleRunAnalysis() {
    setLoading(true);

    try {
      const response = await runAnalysis();
      console.log("runAnalysis response:", response);

      if (response.success) {
        console.log("orders:", response.data.orders);
        console.log("kmeans:", response.data.kmeans);
        console.log("som:", response.data.som);
        console.log("diagnostics:", response.data.diagnostics);
      } else {
        console.error("runAnalysis error:", response.error);
      }
    } catch (error) {
      console.error("runAnalysis failed:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-col items-center gap-6 px-8 py-16">
        <h1 className="text-3xl font-semibold text-black dark:text-zinc-50">
          Crystal
        </h1>
        <p className="max-w-md text-center text-zinc-600 dark:text-zinc-400">
          Execute a análise e veja os resultados no console do navegador.
        </p>
        <button
          type="button"
          onClick={handleRunAnalysis}
          disabled={loading}
          className="rounded-full bg-black px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
        >
          {loading ? "Analisando..." : "Executar análise"}
        </button>
      </main>
    </div>
  );
}
