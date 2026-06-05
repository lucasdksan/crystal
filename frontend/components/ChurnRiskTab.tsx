"use client";

import React from "react";
import type { DashboardData } from "@/frontend/types/dashboard";
import { AlertTriangle, ShieldAlert } from "lucide-react";

interface ChurnRiskTabProps {
  data: DashboardData;
}

const RISK_COLORS = {
  baixo: "bg-emerald-50 text-emerald-700 border-emerald-200",
  medio: "bg-amber-50 text-amber-700 border-amber-200",
  alto: "bg-orange-50 text-orange-700 border-orange-200",
  critico: "bg-rose-50 text-rose-700 border-rose-200",
};

const RISK_LABELS = {
  baixo: "Baixo Risco",
  medio: "Médio Risco",
  alto: "Alto Risco",
  critico: "Crítico",
};

export function ChurnRiskTab({ data }: ChurnRiskTabProps) {
  const grouped = {
    critico: data.churnScores.filter((c) => c.riskLevel === "critico"),
    alto: data.churnScores.filter((c) => c.riskLevel === "alto"),
    medio: data.churnScores.filter((c) => c.riskLevel === "medio"),
    baixo: data.churnScores.filter((c) => c.riskLevel === "baixo"),
  };

  const totalAtRisk = grouped.critico.length + grouped.alto.length;
  const totalLostRevenue = data.churnScores.reduce(
    (s, c) => s + c.estimatedLostRevenue,
    0,
  );

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="bg-gradient-to-r from-rose-50/50 to-slate-50 rounded-2xl p-6 border border-slate-100">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-rose-600" />
          Churn Risk Analysis
        </h2>
        <p className="text-sm text-slate-600 mt-1">
          Score de risco de abandono baseado em recência, frequência e tendência
          de compras.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <span className="text-xs text-slate-500">Clientes em risco</span>
          <p className="text-2xl font-black text-rose-600">{totalAtRisk}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <span className="text-xs text-slate-500">Receita em risco</span>
          <p className="text-2xl font-black text-slate-900">
            R$ {data.customerIntelligenceSummary.revenueAtRisk.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <span className="text-xs text-slate-500">Impacto potencial total</span>
          <p className="text-2xl font-black text-amber-600">
            R$ {totalLostRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(Object.keys(grouped) as Array<keyof typeof grouped>).map((level) => (
          <div
            key={level}
            className={`rounded-xl border p-4 ${RISK_COLORS[level]}`}
          >
            <span className="text-[10px] font-bold uppercase">{RISK_LABELS[level]}</span>
            <p className="text-2xl font-black mt-1">{grouped[level].length}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-500" />
            Clientes Prioritários para Retenção
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px]">
              <tr>
                <th className="text-left p-3">Cliente</th>
                <th className="text-left p-3">Score</th>
                <th className="text-left p-3">Risco</th>
                <th className="text-left p-3">Dias s/ compra</th>
                <th className="text-right p-3">Receita em risco</th>
              </tr>
            </thead>
            <tbody>
              {[...data.churnScores]
                .sort((a, b) => b.score - a.score)
                .slice(0, 20)
                .map((score) => (
                  <tr key={score.customerId} className="border-t border-slate-50">
                    <td className="p-3 font-medium text-slate-800">
                      {score.customerName}
                    </td>
                    <td className="p-3 font-mono">{score.score}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${RISK_COLORS[score.riskLevel]}`}
                      >
                        {RISK_LABELS[score.riskLevel]}
                      </span>
                    </td>
                    <td className="p-3">{score.daysSinceLastPurchase}d</td>
                    <td className="p-3 text-right font-mono text-rose-600">
                      R$ {score.estimatedLostRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
