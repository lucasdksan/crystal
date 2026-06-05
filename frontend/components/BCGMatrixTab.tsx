"use client";

import React from "react";
import type { BCGQuadrantUI, DashboardData } from "@/frontend/types/dashboard";
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
import { Grid3X3 } from "lucide-react";

interface BCGMatrixTabProps {
  data: DashboardData;
}

const QUADRANT_META: Record<
  BCGQuadrantUI,
  { label: string; emoji: string; color: string; bg: string }
> = {
  star: {
    label: "Estrelas",
    emoji: "⭐",
    color: "#f59e0b",
    bg: "bg-amber-50 border-amber-200",
  },
  cash_cow: {
    label: "Vacas Leiteiras",
    emoji: "🐄",
    color: "#10b981",
    bg: "bg-emerald-50 border-emerald-200",
  },
  question: {
    label: "Interrogações",
    emoji: "❓",
    color: "#3b82f6",
    bg: "bg-blue-50 border-blue-200",
  },
  dog: {
    label: "Abacaxis",
    emoji: "🥔",
    color: "#94a3b8",
    bg: "bg-slate-50 border-slate-200",
  },
};

export function BCGMatrixTab({ data }: BCGMatrixTabProps) {
  const { bcgMatrix } = data;
  const chartData = bcgMatrix.products.map((product) => ({
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

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="bg-gradient-to-r from-violet-50/50 to-slate-50 rounded-2xl p-6 border border-slate-100">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Grid3X3 className="w-5 h-5 text-violet-600" />
          Matriz BCG Automática
        </h2>
        <p className="text-sm text-slate-600 mt-1">
          Eixo X: participação na receita · Eixo Y: crescimento de vendas no
          período.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {(Object.keys(QUADRANT_META) as BCGQuadrantUI[]).map((quadrant) => {
          const meta = QUADRANT_META[quadrant];
          return (
            <div
              key={quadrant}
              className={`rounded-2xl border p-4 ${meta.bg}`}
            >
              <span className="text-lg">{meta.emoji}</span>
              <p className="text-xs font-bold text-slate-700 mt-1">
                {meta.label}
              </p>
              <p className="text-2xl font-black text-slate-900">
                {bcgMatrix.quadrantCounts[quadrant]}
              </p>
            </div>
          );
        })}
      </div>

      {chartData.length > 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h3 className="text-sm font-bold text-slate-900">
              Mapa de Portfólio
            </h3>
            <div className="text-[10px] text-slate-500 font-mono">
              Mediana share: {bcgMatrix.medianRevenueShare.toFixed(1)}% · Mediana
              crescimento: {bcgMatrix.medianGrowthRate.toFixed(1)}%
            </div>
          </div>

          <ChartContainer height={420}>
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                type="number"
                dataKey="x"
                name="Participação"
                unit="%"
                fontSize={10}
                label={{
                  value: "Participação na Receita (%)",
                  position: "insideBottom",
                  offset: -10,
                  fontSize: 11,
                }}
              />
              <YAxis
                type="number"
                dataKey="y"
                name="Crescimento"
                unit="%"
                fontSize={10}
                label={{
                  value: "Crescimento de Vendas (%)",
                  angle: -90,
                  position: "insideLeft",
                  fontSize: 11,
                }}
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
                cursor={{ strokeDasharray: "3 3" }}
                formatter={(value, name) => {
                  if (name === "Participação" || name === "Crescimento") {
                    return [`${Number(value).toFixed(1)}%`, name];
                  }
                  return [value, name];
                }}
                content={({ active, payload }) => {
                  if (!active || !payload?.[0]?.payload) return null;
                  const item = payload[0].payload as (typeof chartData)[0];
                  const meta = QUADRANT_META[item.quadrant];
                  return (
                    <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-lg text-xs">
                      <p className="font-bold text-slate-900">{item.productName}</p>
                      <p className="text-slate-500 mt-1">
                        {meta.emoji} {meta.label}
                      </p>
                      <p className="mt-1">
                        Share: {item.revenueShare.toFixed(1)}%
                      </p>
                      <p>Crescimento: {item.growthRate.toFixed(1)}%</p>
                      <p>
                        Receita: R${" "}
                        {item.revenue.toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                        })}
                      </p>
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
        <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-sm text-slate-500">
          Sem produtos com vendas suficientes para a matriz BCG.
        </div>
      )}

      {chartData.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">
              Produtos por Quadrante
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="text-left p-3 font-semibold">Produto</th>
                  <th className="text-left p-3 font-semibold">Quadrante</th>
                  <th className="text-right p-3 font-semibold">Share</th>
                  <th className="text-right p-3 font-semibold">Crescimento</th>
                  <th className="text-right p-3 font-semibold">Receita</th>
                </tr>
              </thead>
              <tbody>
                {chartData.slice(0, 15).map((product) => {
                  const meta = QUADRANT_META[product.quadrant];
                  return (
                    <tr
                      key={product.productKey}
                      className="border-t border-slate-50 hover:bg-slate-50/50"
                    >
                      <td className="p-3 font-medium text-slate-800">
                        {product.productName}
                      </td>
                      <td className="p-3 text-slate-600">
                        {meta.emoji} {meta.label}
                      </td>
                      <td className="p-3 text-right font-mono">
                        {product.revenueShare.toFixed(1)}%
                      </td>
                      <td
                        className={`p-3 text-right font-mono ${
                          product.growthRate >= 0
                            ? "text-emerald-600"
                            : "text-rose-600"
                        }`}
                      >
                        {product.growthRate > 0 ? "+" : ""}
                        {product.growthRate.toFixed(1)}%
                      </td>
                      <td className="p-3 text-right font-mono">
                        R${" "}
                        {product.revenue.toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
