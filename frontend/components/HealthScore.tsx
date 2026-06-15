"use client";

import type { HealthScoreInfo } from "@/frontend/types/dashboard";

interface HealthScoreProps {
  score: HealthScoreInfo;
}

function getScoreColor(value: number): string {
  if (value >= 70) return "bg-emerald-500";
  if (value >= 40) return "bg-amber-500";
  return "bg-rose-500";
}

function getLabelColor(label: string): string {
  if (label === "Saudável") return "text-emerald-600 bg-emerald-50 border-emerald-200";
  if (label === "Atenção") return "text-amber-600 bg-amber-50 border-amber-200";
  return "text-rose-600 bg-rose-50 border-rose-200";
}

export function HealthScore({ score }: HealthScoreProps) {
  const dimensions = [
    { label: "Cancelamento", value: score.cancellation },
    { label: "Entrega", value: score.delivery },
    { label: "Estoque", value: score.inventory },
    { label: "Concentração", value: score.revenueConcentration },
    { label: "Fraude", value: score.fraud },
  ];

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
            Health Score
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-4xl font-black text-slate-900">{score.overall}</span>
            <span className="text-sm text-slate-400 font-medium">/100</span>
          </div>
        </div>
        <span
          className={`text-xs font-bold px-3 py-1 rounded-full border ${getLabelColor(score.label)}`}
        >
          {score.label}
        </span>
      </div>

      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${getScoreColor(score.overall)}`}
          style={{ width: `${score.overall}%` }}
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {dimensions.map((dim) => (
          <div key={dim.label} className="space-y-1">
            <span className="text-[10px] text-slate-400 font-medium">{dim.label}</span>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${getScoreColor(dim.value)}`}
                  style={{ width: `${dim.value}%` }}
                />
              </div>
              <span className="text-[10px] font-bold text-slate-600 w-6 text-right">
                {dim.value}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
