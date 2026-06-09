"use client";

import React from "react";
import type { DashboardData } from "@/frontend/types/dashboard";
import {
  Target,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  Lightbulb,
  DollarSign,
} from "lucide-react";

interface InsightsAcoesTabProps {
  data: DashboardData;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  recoverable: <RefreshCw className="w-5 h-5 text-emerald-600" />,
  incremental: <TrendingUp className="w-5 h-5 text-indigo-600" />,
  at_risk: <AlertTriangle className="w-5 h-5 text-rose-600" />,
  frequency_increase: <TrendingUp className="w-5 h-5 text-blue-600" />,
  ticket_growth: <Target className="w-5 h-5 text-amber-600" />,
  segment_expansion: <Target className="w-5 h-5 text-purple-600" />,
};

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

export function InsightsAcoesTab({ data }: InsightsAcoesTabProps) {
  const summary = data.customerIntelligenceSummary;

  return (
    <div className="space-y-10 animate-fade-in">
      <div className="bg-gradient-to-r from-indigo-50/50 via-emerald-50/30 to-slate-50 rounded-2xl p-6 border border-slate-100">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-amber-500" />
          Insights e Ações
        </h2>
        <p className="text-sm text-slate-600 mt-1">
          Recomendações prescritivas e oportunidades de receita com impacto
          financeiro estimado.
        </p>
      </div>

      {/* Oportunidades de Receita */}
      <section className="space-y-6">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-emerald-600" />
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
            Oportunidades de Receita
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-emerald-200 p-5">
            <span className="text-xs text-emerald-600 font-semibold">
              Receita Recuperável
            </span>
            <p className="text-2xl font-black text-emerald-700 mt-1">
              R${" "}
              {summary.recoverableRevenue.toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
              })}
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-indigo-200 p-5">
            <span className="text-xs text-indigo-600 font-semibold">
              Receita Incremental
            </span>
            <p className="text-2xl font-black text-indigo-700 mt-1">
              R${" "}
              {summary.incrementalRevenue.toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
              })}
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-rose-200 p-5">
            <span className="text-xs text-rose-600 font-semibold">
              Receita em Risco
            </span>
            <p className="text-2xl font-black text-rose-700 mt-1">
              R${" "}
              {summary.revenueAtRisk.toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
              })}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.revenueOpportunities.map((opp, idx) => (
            <div
              key={`${opp.type}-${idx}`}
              className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3"
            >
              <div className="flex items-start gap-3">
                {TYPE_ICONS[opp.type] ?? (
                  <Target className="w-5 h-5 text-slate-400" />
                )}
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">
                    {opp.title}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    {opp.description}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                <span className="text-[10px] text-slate-400">
                  {opp.customerCount} cliente(s)
                </span>
                <span className="text-sm font-black text-emerald-600">
                  R${" "}
                  {opp.estimatedValue.toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Executive Insights */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-amber-500" />
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
            Insights Executivos
          </h3>
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
                        R${" "}
                        {insight.financialImpact.toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
