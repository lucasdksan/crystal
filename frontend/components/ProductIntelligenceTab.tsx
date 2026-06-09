"use client";

import React, { useMemo, useState } from "react";
import type { BCGQuadrantUI, DashboardData } from "@/frontend/types/dashboard";
import {
  computeABCCurve,
  filterProductsByCurve,
  type ABCCurve,
} from "@/frontend/lib/abc-curve";
import {
  AlertTriangle,
  BarChart3,
  Grid3X3,
  Package,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
} from "lucide-react";
import {
  CartesianGrid,
  ReferenceLine,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { ChartContainer } from "@/frontend/components/ChartContainer";

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

const CURVE_STYLES: Record<ABCCurve, string> = {
  A: "bg-emerald-100 text-emerald-800 border-emerald-200",
  B: "bg-amber-100 text-amber-800 border-amber-200",
  C: "bg-slate-100 text-slate-700 border-slate-200",
};

const QUADRANT_META: Record<
  BCGQuadrantUI,
  { label: string; emoji: string; color: string }
> = {
  star: { label: "Estrelas", emoji: "⭐", color: "#f59e0b" },
  cash_cow: { label: "Vacas Leiteiras", emoji: "🐄", color: "#10b981" },
  question: { label: "Interrogações", emoji: "❓", color: "#3b82f6" },
  dog: { label: "Abacaxis", emoji: "🥔", color: "#94a3b8" },
};

type CurveFilter = "all" | ABCCurve;

export function ProductIntelligenceTab({ data }: ProductIntelligenceTabProps) {
  const { productIntelligence, bcgMatrix } = data;
  const [curveFilter, setCurveFilter] = useState<CurveFilter>("all");

  const abcProducts = useMemo(
    () => computeABCCurve(bcgMatrix.products),
    [bcgMatrix.products],
  );

  const filteredBcgProducts = useMemo(
    () => filterProductsByCurve(bcgMatrix.products, abcProducts, curveFilter),
    [bcgMatrix.products, abcProducts, curveFilter],
  );

  const chartData = filteredBcgProducts.map((product) => ({
    ...product,
    x: product.revenueShare,
    y: product.growthRate,
    z: Math.max(product.revenue, 1),
  }));

  const grouped = {
    star: chartData.filter((p) => p.quadrant === "star"),
    cash_cow: chartData.filter((p) => p.quadrant === "cash_cow"),
    question: chartData.filter((p) => p.quadrant === "question"),
    dog: chartData.filter((p) => p.quadrant === "dog"),
  };

  const curveCounts = {
    A: abcProducts.filter((p) => p.curve === "A").length,
    B: abcProducts.filter((p) => p.curve === "B").length,
    C: abcProducts.filter((p) => p.curve === "C").length,
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="bg-gradient-to-r from-indigo-50/50 to-slate-50 rounded-2xl p-6 border border-slate-100">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-600" />
          Inteligência de Produtos
        </h2>
        <p className="text-sm text-slate-600 mt-1">
          Agrupamento por comportamento de venda, Curva ABC e Matriz BCG
          cruzadas.
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

      {abcProducts.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-500" />
            <h3 className="text-sm font-bold text-slate-900">Curva ABC</h3>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {(["A", "B", "C"] as ABCCurve[]).map((curve) => (
              <div
                key={curve}
                className={`rounded-xl border p-3 text-center ${CURVE_STYLES[curve]}`}
              >
                <span className="text-[10px] font-bold uppercase">Curva {curve}</span>
                <p className="text-xl font-black mt-1">{curveCounts[curve]}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="text-left p-3 font-semibold">Produto</th>
                    <th className="text-center p-3 font-semibold">Curva</th>
                    <th className="text-right p-3 font-semibold">Receita</th>
                    <th className="text-right p-3 font-semibold">Share</th>
                    <th className="text-left p-3 font-semibold w-40">
                      Acumulado
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {abcProducts.slice(0, 15).map((product) => (
                    <tr
                      key={product.productKey}
                      className="border-t border-slate-50 hover:bg-slate-50/50"
                    >
                      <td className="p-3 font-medium text-slate-800">
                        {product.productName}
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${CURVE_STYLES[product.curve]}`}
                        >
                          {product.curve}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono">
                        R${" "}
                        {product.revenue.toLocaleString("pt-BR", {
                          minimumFractionDigits: 0,
                        })}
                      </td>
                      <td className="p-3 text-right font-mono">
                        {product.revenueShare.toFixed(1)}%
                      </td>
                      <td className="p-3">
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-500 rounded-full"
                            style={{
                              width: `${Math.min(product.cumulativeShare, 100)}%`,
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {bcgMatrix.products.length > 0 && (
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <Grid3X3 className="w-4 h-4 text-violet-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Matriz BCG por Curva ABC
              </h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {(["all", "A", "B", "C"] as CurveFilter[]).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setCurveFilter(filter)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                    curveFilter === filter
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {filter === "all" ? "Todos" : `Curva ${filter}`}
                </button>
              ))}
            </div>
          </div>

          {chartData.length > 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-6">
              <ChartContainer height={380}>
                <ScatterChart
                  margin={{ top: 20, right: 20, bottom: 20, left: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    type="number"
                    dataKey="x"
                    name="Participação"
                    unit="%"
                    fontSize={10}
                  />
                  <YAxis
                    type="number"
                    dataKey="y"
                    name="Crescimento"
                    unit="%"
                    fontSize={10}
                  />
                  <ZAxis type="number" dataKey="z" range={[40, 400]} />
                  <ReferenceLine
                    x={bcgMatrix.medianRevenueShare}
                    stroke="#cbd5e1"
                    strokeDasharray="4 4"
                  />
                  <ReferenceLine
                    y={bcgMatrix.medianGrowthRate}
                    stroke="#cbd5e1"
                    strokeDasharray="4 4"
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.[0]?.payload) return null;
                      const item = payload[0].payload as (typeof chartData)[0];
                      const meta = QUADRANT_META[item.quadrant];
                      return (
                        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-lg text-xs">
                          <p className="font-bold text-slate-900">
                            {item.productName}
                          </p>
                          <p className="text-slate-500 mt-1">
                            {meta.emoji} {meta.label}
                          </p>
                          <p className="mt-1">
                            Share: {item.revenueShare.toFixed(1)}%
                          </p>
                          <p>Crescimento: {item.growthRate.toFixed(1)}%</p>
                        </div>
                      );
                    }}
                  />
                  {(Object.keys(grouped) as BCGQuadrantUI[]).map((quadrant) => (
                    <Scatter
                      key={quadrant}
                      name={QUADRANT_META[quadrant].label}
                      data={grouped[quadrant]}
                      fill={QUADRANT_META[quadrant].color}
                    />
                  ))}
                </ScatterChart>
              </ChartContainer>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 p-6 text-center text-sm text-slate-500">
              Nenhum produto na curva selecionada para exibir na matriz BCG.
            </div>
          )}
        </section>
      )}

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
