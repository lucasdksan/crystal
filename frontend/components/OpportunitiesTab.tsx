"use client";

import type { DashboardData } from "@/frontend/types/dashboard";
import { Lightbulb, Target, DollarSign } from "lucide-react";

interface OpportunitiesTabProps {
  data: DashboardData;
}

const priorityStyles = {
  alta: "bg-rose-100 text-rose-700 border-rose-200",
  media: "bg-amber-100 text-amber-700 border-amber-200",
  baixa: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

export function OpportunitiesTab({ data }: OpportunitiesTabProps) {
  const strategies = data.diagnostics.allStrategies;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-100 rounded-2xl p-5">
          <Lightbulb className="w-5 h-5 text-indigo-500 mb-2" />
          <span className="text-2xl font-black text-slate-900">{strategies.length}</span>
          <p className="text-xs text-slate-500 mt-1">Estratégias identificadas</p>
        </div>
        <div className="bg-white border border-slate-100 rounded-2xl p-5">
          <Target className="w-5 h-5 text-emerald-500 mb-2" />
          <span className="text-2xl font-black text-slate-900">
            {data.diagnostics.suggestions.length}
          </span>
          <p className="text-xs text-slate-500 mt-1">Kits sugeridos</p>
        </div>
        <div className="bg-white border border-slate-100 rounded-2xl p-5">
          <DollarSign className="w-5 h-5 text-amber-500 mb-2" />
          <span className="text-2xl font-black text-slate-900">
            {data.diagnostics.clusterRisks.filter((c) => c.cancelRate > 20).length}
          </span>
          <p className="text-xs text-slate-500 mt-1">Grupos de recuperação</p>
        </div>
      </div>

      <div className="space-y-4">
        {strategies.map((strategy, strategyIdx) => (
          <div
            key={strategyIdx}
            className="bg-white border border-slate-100 rounded-2xl p-6 space-y-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">{strategy.label}</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Prioridade: {(strategy.priorityScore * 100).toFixed(0)}%
                </p>
              </div>
              {strategy.financialImpact && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${priorityStyles[strategy.financialImpact.priority]}`}
                >
                  {strategy.financialImpact.priority.toUpperCase()}
                </span>
              )}
            </div>

            <ul className="text-xs text-slate-600 space-y-1">
              {strategy.justifications.map((j) => (
                <li key={j}>• {j}</li>
              ))}
            </ul>

            <div className="space-y-2">
              {strategy.actions.map((action, actionIdx) => (
                <div
                  key={actionIdx}
                  className="bg-slate-50 rounded-xl p-3 border border-slate-100"
                >
                  <p className="text-xs font-bold text-slate-800">{action.label}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{action.description}</p>
                </div>
              ))}
            </div>

            {strategy.financialImpact && (
              <div className="flex flex-wrap gap-4 pt-3 border-t border-slate-100 text-xs font-mono">
                <div>
                  <span className="text-slate-400">Perda: </span>
                  <span className="font-bold text-rose-600">
                    R$ {strategy.financialImpact.estimatedLoss.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Ganho: </span>
                  <span className="font-bold text-emerald-600">
                    R$ {strategy.financialImpact.estimatedRecovery.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Custo: </span>
                  <span className="font-bold text-slate-700">
                    R$ {strategy.financialImpact.estimatedCost.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">ROI: </span>
                  <span className="font-bold text-indigo-600">{strategy.financialImpact.roi}%</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {data.diagnostics.suggestions.length > 0 && (
        <div className="bg-white border border-slate-100 rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Sugestões de Kits</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {data.diagnostics.suggestions.map((kit) => (
              <div key={kit.name} className="border border-slate-100 rounded-xl p-4 space-y-2">
                <p className="text-xs font-bold text-slate-800">{kit.name}</p>
                <p className="text-[10px] text-slate-500">{kit.objective}</p>
                <div className="flex flex-wrap gap-1">
                  {kit.products.map((p) => (
                    <span
                      key={p}
                      className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
