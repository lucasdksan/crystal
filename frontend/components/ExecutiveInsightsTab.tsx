"use client";

import React from "react";
import type { DashboardData } from "@/frontend/types/dashboard";
import { Lightbulb, DollarSign } from "lucide-react";

interface ExecutiveInsightsTabProps {
  data: DashboardData;
}

const PRIORITY_STYLES = {
  alta: "bg-rose-50 border-rose-200 text-rose-800",
  media: "bg-amber-50 border-amber-200 text-amber-800",
  baixa: "bg-slate-50 border-slate-200 text-slate-700",
};

const PRIORITY_LABELS = {
  alta: "Alta Prioridade",
  media: "Média Prioridade",
  baixa: "Baixa Prioridade",
};

export function ExecutiveInsightsTab({ data }: ExecutiveInsightsTabProps) {
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="bg-gradient-to-r from-indigo-50/50 to-slate-50 rounded-2xl p-6 border border-slate-100">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-amber-500" />
          Executive Insights
        </h2>
        <p className="text-sm text-slate-600 mt-1">
          Insights quantitativos orientados a negócio com impacto financeiro
          estimado.
        </p>
      </div>

      {data.executiveInsights.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-slate-400 text-sm">
          Nenhum insight gerado para o lote atual.
        </div>
      ) : (
        <div className="space-y-3">
          {data.executiveInsights.map((insight, idx) => (
            <div
              key={idx}
              className={`rounded-2xl border p-5 ${PRIORITY_STYLES[insight.priority]}`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex-1">
                  <span className="text-[10px] font-bold uppercase tracking-wide opacity-70">
                    {PRIORITY_LABELS[insight.priority]} · {insight.category}
                  </span>
                  <p className="text-sm font-semibold mt-1 leading-relaxed">
                    {insight.text}
                  </p>
                </div>
                {insight.financialImpact > 0 && (
                  <div className="flex items-center gap-1.5 bg-white/60 px-3 py-1.5 rounded-lg border border-current/10 flex-shrink-0">
                    <DollarSign className="w-4 h-4" />
                    <span className="text-sm font-black">
                      R$ {insight.financialImpact.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
