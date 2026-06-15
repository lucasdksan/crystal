"use client";

import type { DashboardData } from "@/frontend/types/dashboard";
import { Shield, AlertTriangle, TrendingDown } from "lucide-react";

interface RisksTabProps {
  data: DashboardData;
}

const riskLevelStyles = {
  high: "bg-rose-100 text-rose-700 border-rose-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  low: "bg-slate-100 text-slate-600 border-slate-200",
};

const riskLevelLabels = {
  high: "Alto",
  medium: "Médio",
  low: "Baixo",
};

function getActionStyles(action: string): string {
  switch (action) {
    case "Descontinuar":
      return "bg-rose-50 text-rose-700 border-rose-200";
    case "Investigar":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "Monitorar":
      return "bg-blue-50 text-blue-700 border-blue-200";
    default:
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }
}

export function RisksTab({ data }: RisksTabProps) {
  const { fraud, productAnomalies, diagnostics } = data;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-100 rounded-2xl p-5">
          <Shield className="w-5 h-5 text-rose-500 mb-2" />
          <span className="text-2xl font-black text-slate-900">{fraud.summary.totalFlagged}</span>
          <p className="text-xs text-slate-500 mt-1">Pedidos sinalizados</p>
        </div>
        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-5">
          <span className="text-2xl font-black text-rose-600">{fraud.summary.highRisk}</span>
          <p className="text-xs text-rose-500 mt-1">Risco alto</p>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5">
          <span className="text-2xl font-black text-amber-600">{fraud.summary.mediumRisk}</span>
          <p className="text-xs text-amber-500 mt-1">Risco médio</p>
        </div>
        <div className="bg-white border border-slate-100 rounded-2xl p-5">
          <span className="text-2xl font-black text-slate-900">
            R$ {fraud.summary.estimatedExposure.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
          </span>
          <p className="text-xs text-slate-500 mt-1">Exposição estimada</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-100 rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-500" />
            Detecção de Fraudes Operacionais
          </h3>
          {fraud.flaggedOrders.length > 0 ? (
            <div className="space-y-3">
              {fraud.flaggedOrders.slice(0, 10).map((flag) => (
                <div
                  key={flag.orderId}
                  className="border border-slate-100 rounded-xl p-4 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">{flag.clientId}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-900">{flag.score}/100</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${riskLevelStyles[flag.riskLevel]}`}
                      >
                        {riskLevelLabels[flag.riskLevel]}
                      </span>
                    </div>
                  </div>
                  <ul className="text-[10px] text-slate-500 space-y-0.5">
                    {flag.reasons.map((reason) => (
                      <li key={reason}>• {reason}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400">Nenhuma fraude operacional detectada.</p>
          )}
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-amber-500" />
            Produtos Fora do Padrão
          </h3>
          {productAnomalies.length > 0 ? (
            <div className="space-y-2">
              {productAnomalies.slice(0, 8).map((product) => (
                <div
                  key={product.productKey}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100"
                >
                  <div>
                    <p className="text-xs font-bold text-slate-800">{product.name}</p>
                    <p className="text-[10px] text-slate-400">
                      Risco: {product.anomalyScore}% · {product.clusterName.replace(/^Cluster /, "Grupo ")}
                    </p>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getActionStyles(product.action)}`}
                  >
                    {product.action}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400">Nenhum produto fora do padrão detectado.</p>
          )}
        </div>
      </div>

      {diagnostics.risks.length > 0 && (
        <div className="bg-white border border-slate-100 rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Riscos Estratégicos</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {diagnostics.risks.map((risk) => (
              <div
                key={`${risk.product}-${risk.type}`}
                className="border border-slate-100 rounded-xl p-4 space-y-1"
              >
                <p className="text-xs font-bold text-slate-800">{risk.product}</p>
                <p className="text-[10px] text-slate-500">{risk.type}</p>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block ${
                    risk.gravity === "Alto"
                      ? "bg-rose-100 text-rose-700"
                      : risk.gravity === "Médio"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  {risk.gravity}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
