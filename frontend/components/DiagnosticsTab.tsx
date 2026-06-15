"use client";

import React from "react";
import type { ClusterInfo, DashboardData } from "@/frontend/types/dashboard";
import { AlertTriangle, Target } from "lucide-react";

interface DiagnosticsTabProps {
  data: DashboardData;
}

function getSeverityStyles(cluster: ClusterInfo) {
  if (cluster.cancelRate > 30) {
    return {
      card: "bg-rose-50 border-rose-200",
      badge: "bg-rose-100 text-rose-700 border-rose-200",
      label: "Crítico",
    };
  }
  if (cluster.cancelRate > 15) {
    return {
      card: "bg-amber-50 border-amber-200",
      badge: "bg-amber-100 text-amber-700 border-amber-200",
      label: "Atenção",
    };
  }
  return {
    card: "bg-emerald-50 border-emerald-200",
    badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
    label: "Saudável",
  };
}

export function DiagnosticsTab({ data }: DiagnosticsTabProps) {
  const clustersByPriority = [...data.clusters].sort(
    (a, b) => b.cancelRate - a.cancelRate,
  );

  const getRiskColor = (gravity: string) => {
    switch (gravity) {
      case "Alto":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "Médio":
        return "bg-amber-50 text-amber-700 border-amber-200";
      default:
        return "bg-green-50 text-green-700 border-green-200";
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 font-sans flex items-center gap-2">
            <Target className="w-5 h-5 text-indigo-600" />
            Plano de Recuperação por Perfil
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Ações prioritárias por grupo de clientes — foco em o que fazer, não
            em métricas exploratórias
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {clustersByPriority.map((cluster) => {
            const severity = getSeverityStyles(cluster);

            return (
              <div
                key={cluster.id}
                className={`p-5 rounded-2xl border space-y-4 ${severity.card}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-0.5 min-w-0">
                    <span className="text-sm font-bold text-slate-900 block truncate">
                      {cluster.name.replace(`Cluster ${cluster.id} - `, "")}
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      {cluster.count} pedido(s) · {cluster.payment}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-1 rounded-full border flex-shrink-0 ${severity.badge}`}
                  >
                    {severity.label}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-[11px]">
                  <div className="bg-white/70 p-2.5 rounded-lg border border-white">
                    <span className="text-slate-500 block">Cancelamento</span>
                    <span className="font-mono font-bold text-slate-800 block mt-0.5">
                      {cluster.cancelRate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="bg-white/70 p-2.5 rounded-lg border border-white">
                    <span className="text-slate-500 block">% da receita</span>
                    <span className="font-mono font-bold text-slate-800 block mt-0.5">
                      {cluster.revenueShare.toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div className="bg-white/80 p-3 rounded-xl border border-white space-y-1">
                  <span className="font-bold text-slate-800 block text-xs">
                    Ação prioritária
                  </span>
                  <p className="text-slate-600 leading-relaxed font-sans text-xs">
                    {cluster.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 bg-white border border-slate-100 rounded-2xl p-6 space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 font-sans">
              🏆 Top Produtos do Lote
            </h3>
            <p className="text-xs text-slate-500">
              Produtos com maior volume bruto no marketplace
            </p>
          </div>

          <div className="space-y-3.5">
            {data.products.slice(0, 5).map((product, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-100 font-sans hover:bg-slate-100/50 transition-colors"
              >
                <div className="space-y-1 max-w-[170px]">
                  <span className="font-semibold text-xs text-slate-800 truncate block">
                    {product.name}
                  </span>
                  <span className="text-[10px] text-slate-400 block font-mono">
                    Total: R${" "}
                    {product.revenue.toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="inline-block text-xs font-bold px-2 py-1 bg-indigo-50 text-indigo-700 rounded-md border border-indigo-100 font-mono">
                    {product.quantity} un.
                  </span>
                </div>
              </div>
            ))}
          </div>

          {data.diagnostics.bottleneckProduct && (
            <div className="text-[11px] text-slate-500 italic font-sans leading-normal">
              💡 Produto gargalo identificado:{" "}
              <strong>{data.diagnostics.bottleneckProduct}</strong>. Alto volume
              de cancelamentos associado a este item.
            </div>
          )}
        </div>

        <div className="lg:col-span-2 bg-white border border-slate-100 rounded-2xl p-6 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <h3 className="text-base font-bold text-slate-900 font-sans">
                Análise de Riscos e Gargalos do Estoque
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Fatores comerciais que reduzem a conversão final do seu negócio
            </p>
          </div>

          <div className="space-y-3">
            {data.diagnostics.risks.length === 0 ? (
              <div className="text-xs text-slate-500 italic p-4 bg-slate-50 rounded-xl">
                Nenhum risco crítico identificado no lote atual.
              </div>
            ) : (
              data.diagnostics.risks.map((risk, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-2.5 ${getRiskColor(risk.gravity)}`}
                >
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold uppercase tracking-wider block opacity-70">
                      {risk.type}
                    </span>
                    <span className="text-sm font-semibold block text-slate-800">
                      {risk.product}
                    </span>
                  </div>
                  <div className="flex-shrink-0">
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-md bg-black/5 uppercase font-mono">
                      Gravidade {risk.gravity}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="border-t border-slate-100 pt-4 mt-2">
            <span className="text-xs font-bold text-slate-700 block mb-1">
              Diagnóstico Geral Simplificado:
            </span>
            <p className="text-xs text-slate-600 font-sans leading-relaxed">
              {data.diagnostics.summary}
            </p>
          </div>
        </div>
      </div>

      {data.diagnostics.suggestions.length > 0 && (
        <div className="space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 font-sans">
              🎁 Táticas Recomendadas: Kits de Combinação Imediata
            </h3>
            <p className="text-xs text-slate-500">
              Sugestões de campanhas para reverter estorno e girar estoque
              retido
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {data.diagnostics.suggestions.map((suggestion, idx) => (
              <div
                key={idx}
                className="bg-white border border-slate-100 rounded-2xl p-5 hover:shadow-sm transition-all flex flex-col justify-between space-y-4 relative"
              >
                <div className="space-y-3">
                  <span className="inline-block text-[10px] font-mono font-bold tracking-wider uppercase text-indigo-600 bg-indigo-50 px-2 rounded">
                    Ação {idx + 1}
                  </span>
                  <h4 className="text-sm font-bold text-slate-800 leading-snug">
                    {suggestion.name}
                  </h4>
                  <p className="text-[11px] font-medium text-emerald-600">
                    <strong>Objetivo:</strong> {suggestion.objective}
                  </p>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs text-slate-600 space-y-1">
                  <span className="font-semibold block text-slate-800">
                    Como funciona:
                  </span>
                  <p className="leading-relaxed font-sans">
                    {suggestion.details}
                  </p>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {suggestion.products.map((p, pIdx) => (
                    <span
                      key={pIdx}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-sans truncate max-w-[200px]"
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

      {data.diagnostics.allStrategies.length > 0 && (
        <div className="space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 font-sans">
              📋 Estratégias Prioritárias
            </h3>
            <p className="text-xs text-slate-500">
              Recomendações cruzadas com grupos de clientes e portfólio
            </p>
          </div>
          <div className="space-y-4">
            {data.diagnostics.allStrategies.map((strategy, idx) => (
              <div
                key={idx}
                className="bg-white border border-slate-100 rounded-2xl p-5 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                      {strategy.type.replace(/_/g, " ")}
                    </span>
                    <h4 className="text-sm font-bold text-slate-800 mt-1">
                      {strategy.label}
                    </h4>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded">
                    Prioridade {strategy.priorityScore.toFixed(2)}
                  </span>
                </div>
                {strategy.justifications.length > 0 && (
                  <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside">
                    {strategy.justifications.map((j, jIdx) => (
                      <li key={jIdx}>{j}</li>
                    ))}
                  </ul>
                )}
                {strategy.actions.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    {strategy.actions.map((action, aIdx) => (
                      <div
                        key={aIdx}
                        className="bg-slate-50 p-3 rounded-lg text-xs"
                      >
                        <span className="font-bold text-slate-800 block">
                          {action.label}
                        </span>
                        <p className="text-slate-600 mt-0.5">
                          {action.description}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
