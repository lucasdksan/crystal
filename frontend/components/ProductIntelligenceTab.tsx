"use client";

import React from "react";
import type { DashboardData } from "@/frontend/types/dashboard";
import {
  AlertTriangle,
  Package,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
} from "lucide-react";

interface ProductIntelligenceTabProps {
  data: DashboardData;
}

const SEVERITY_STYLES = {
  info: "bg-indigo-50 border-indigo-100 text-indigo-900",
  warning: "bg-amber-50 border-amber-100 text-amber-900",
  critical: "bg-rose-50 border-rose-100 text-rose-900",
};

const DIAGNOSTIC_ICONS = {
  champion: Trophy,
  dependency: AlertTriangle,
  risk: AlertTriangle,
  long_tail: Package,
  opportunity: Target,
};

const CLUSTER_COLORS = [
  "bg-indigo-50 border-indigo-200 text-indigo-700",
  "bg-amber-50 border-amber-200 text-amber-700",
  "bg-slate-50 border-slate-200 text-slate-700",
  "bg-emerald-50 border-emerald-200 text-emerald-700",
];

export function ProductIntelligenceTab({ data }: ProductIntelligenceTabProps) {
  const { productIntelligence } = data;

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="bg-gradient-to-r from-indigo-50/50 to-slate-50 rounded-2xl p-6 border border-slate-100">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-600" />
          Inteligência de Produtos
        </h2>
        <p className="text-sm text-slate-600 mt-1">
          Agrupamento por comportamento de venda com diagnósticos
          automáticos do portfólio.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <span className="text-xs text-slate-500">Produtos no catálogo</span>
          <p className="text-2xl font-black text-slate-900">
            {productIntelligence.totalProducts}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <span className="text-xs text-slate-500">Clusters identificados</span>
          <p className="text-2xl font-black text-indigo-600">
            {productIntelligence.clusters.length}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <span className="text-xs text-slate-500">Diagnósticos gerados</span>
          <p className="text-2xl font-black text-emerald-600">
            {productIntelligence.diagnostics.length}
          </p>
        </div>
      </div>

      {productIntelligence.diagnostics.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-500" />
            Diagnósticos Automáticos
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {productIntelligence.diagnostics.map((diagnostic, idx) => {
              const Icon = DIAGNOSTIC_ICONS[diagnostic.type] ?? Sparkles;
              return (
                <div
                  key={`${diagnostic.type}-${idx}`}
                  className={`rounded-2xl border p-5 ${SEVERITY_STYLES[diagnostic.severity]}`}
                >
                  <div className="flex items-start gap-3">
                    <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wide opacity-70">
                        {diagnostic.title}
                      </span>
                      <p className="text-sm font-semibold mt-1 leading-relaxed">
                        {diagnostic.message}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {productIntelligence.clusters.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {productIntelligence.clusters.map((cluster, idx) => (
            <div
              key={cluster.id}
              className="bg-white rounded-2xl border border-slate-100 overflow-hidden"
            >
              <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-4">
                <div>
                  <span
                    className={`inline-flex text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${CLUSTER_COLORS[idx % CLUSTER_COLORS.length]}`}
                  >
                    {cluster.name}
                  </span>
                  <h3 className="text-base font-bold text-slate-900 mt-2">
                    {cluster.productCount} produtos
                  </h3>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500 block">Receita</span>
                  <span className="text-lg font-black text-slate-900">
                    {cluster.revenueShare.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="p-5 space-y-3">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>
                    R${" "}
                    {cluster.totalRevenue.toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                  <span>
                    Cancelamento médio:{" "}
                    {(cluster.averageCancellationRate * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="space-y-2">
                  {cluster.products.slice(0, 5).map((product) => (
                    <div
                      key={product.productKey}
                      className="flex items-center justify-between text-xs bg-slate-50 rounded-lg px-3 py-2"
                    >
                      <span className="font-medium text-slate-700 truncate pr-2">
                        {product.name}
                      </span>
                      <span className="text-slate-500 whitespace-nowrap">
                        {product.totalOrders} ped. · R${" "}
                        {product.revenue.toLocaleString("pt-BR", {
                          minimumFractionDigits: 0,
                        })}
                      </span>
                    </div>
                  ))}
                  {cluster.products.length > 5 && (
                    <p className="text-[10px] text-slate-400 text-center">
                      +{cluster.products.length - 5} produtos
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-sm text-slate-500">
          Dados insuficientes para clusterização de produtos no período
          selecionado.
        </div>
      )}
    </div>
  );
}
