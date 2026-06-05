"use client";

import React from "react";
import type { DashboardData } from "@/frontend/types/dashboard";
import { Target, TrendingUp, AlertTriangle, RefreshCw } from "lucide-react";

interface RevenueOpportunityTabProps {
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

export function RevenueOpportunityTab({ data }: RevenueOpportunityTabProps) {
  const summary = data.customerIntelligenceSummary;

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="bg-gradient-to-r from-emerald-50/50 to-slate-50 rounded-2xl p-6 border border-slate-100">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Target className="w-5 h-5 text-emerald-600" />
          Revenue Opportunity Analysis
        </h2>
        <p className="text-sm text-slate-600 mt-1">
          Oportunidades de crescimento com estimativa de impacto financeiro.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-emerald-200 p-5">
          <span className="text-xs text-emerald-600 font-semibold">
            Receita Recuperável
          </span>
          <p className="text-2xl font-black text-emerald-700 mt-1">
            R$ {summary.recoverableRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-indigo-200 p-5">
          <span className="text-xs text-indigo-600 font-semibold">
            Receita Incremental
          </span>
          <p className="text-2xl font-black text-indigo-700 mt-1">
            R$ {summary.incrementalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-rose-200 p-5">
          <span className="text-xs text-rose-600 font-semibold">
            Receita em Risco
          </span>
          <p className="text-2xl font-black text-rose-700 mt-1">
            R$ {summary.revenueAtRisk.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
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
                <h3 className="font-bold text-slate-900 text-sm">{opp.title}</h3>
                <p className="text-xs text-slate-500 mt-1">{opp.description}</p>
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-50">
              <span className="text-[10px] text-slate-400">
                {opp.customerCount} cliente(s)
              </span>
              <span className="text-sm font-black text-emerald-600">
                R$ {opp.estimatedValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
