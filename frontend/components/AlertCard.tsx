"use client";

import type { AlertInfo } from "@/frontend/types/dashboard";
import { AlertTriangle, AlertOctagon, Info } from "lucide-react";

interface AlertCardProps {
  alert: AlertInfo;
}

const severityStyles = {
  critical: {
    border: "border-rose-200",
    bg: "bg-rose-50",
    icon: AlertOctagon,
    iconColor: "text-rose-500",
    badge: "bg-rose-100 text-rose-700",
    label: "Crítico",
  },
  warning: {
    border: "border-amber-200",
    bg: "bg-amber-50",
    icon: AlertTriangle,
    iconColor: "text-amber-500",
    badge: "bg-amber-100 text-amber-700",
    label: "Atenção",
  },
  info: {
    border: "border-blue-200",
    bg: "bg-blue-50",
    icon: Info,
    iconColor: "text-blue-500",
    badge: "bg-blue-100 text-blue-700",
    label: "Info",
  },
};

export function AlertCard({ alert }: AlertCardProps) {
  const style = severityStyles[alert.severity];
  const Icon = style.icon;

  return (
    <div className={`rounded-xl border ${style.border} ${style.bg} p-4 space-y-3`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${style.iconColor}`} />
          <div>
            <h4 className="text-sm font-bold text-slate-900">{alert.title}</h4>
            <p className="text-xs text-slate-600 mt-0.5">{alert.description}</p>
          </div>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${style.badge}`}>
          {style.label}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs">
        <div>
          <span className="text-slate-400">Impacto: </span>
          <span className="font-bold text-slate-900">
            R$ {alert.financialImpact.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div>
          <span className="text-slate-400">Confiança: </span>
          <span className="font-bold text-slate-700">
            {(alert.confidence * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      <div className="text-xs bg-white/60 rounded-lg p-2.5 border border-white">
        <span className="text-slate-400">Ação: </span>
        <span className="font-semibold text-slate-800">{alert.recommendedAction}</span>
      </div>

      {alert.financialDetails && (
        <div className="flex flex-wrap gap-3 text-[10px] font-mono text-slate-500 pt-1 border-t border-white/80">
          <span>Custo: R$ {alert.financialDetails.estimatedCost.toFixed(0)}</span>
          <span>Ganho: R$ {alert.financialDetails.estimatedRecovery.toFixed(0)}</span>
          <span>ROI: {alert.financialDetails.roi}%</span>
        </div>
      )}
    </div>
  );
}
