"use client";

import React, { useMemo } from "react";
import type { AnomalyProduct, DashboardData } from "@/frontend/types/dashboard";
import {
  TrendingDown,
  AlertTriangle,
  DollarSign,
  Zap,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { ChartContainer } from "@/frontend/components/ChartContainer";

interface AnomalyTabProps {
  data: DashboardData;
}

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function getActionStyles(action: string): string {
  switch (action) {
    case "Descontinuar":
      return "bg-rose-500/20 text-rose-300 border-rose-500/30";
    case "Investigar":
      return "bg-orange-500/20 text-orange-300 border-orange-500/30";
    case "Monitorar":
      return "bg-amber-500/20 text-amber-300 border-amber-500/30";
    default:
      return "bg-slate-800 text-slate-400 border-slate-700";
  }
}

function groupCanceledRevenueByCluster(products: AnomalyProduct[]) {
  const map = new Map<string, number>();

  products.forEach((product) => {
    map.set(
      product.clusterName,
      (map.get(product.clusterName) ?? 0) + product.canceledRevenue,
    );
  });

  return Array.from(map.entries())
    .map(([name, revenue]) => ({ name, revenue }))
    .sort((a, b) => b.revenue - a.revenue);
}

function groupCancelRateByCluster(products: AnomalyProduct[]) {
  const map = new Map<string, { totalRate: number; count: number }>();

  products.forEach((product) => {
    const current = map.get(product.clusterName) ?? { totalRate: 0, count: 0 };
    current.totalRate += product.cancellationRate;
    current.count += 1;
    map.set(product.clusterName, current);
  });

  return Array.from(map.entries())
    .map(([name, stats]) => ({
      name,
      cancelRate: stats.count > 0 ? stats.totalRate / stats.count : 0,
    }))
    .sort((a, b) => b.cancelRate - a.cancelRate);
}

export function AnomalyTab({ data }: AnomalyTabProps) {
  const productAnomalies = data.productAnomalies ?? [];

  const atRiskProducts = useMemo(
    () => productAnomalies.filter((product) => product.anomalyScore >= 50),
    [productAnomalies],
  );

  const revenueAtRisk = useMemo(
    () =>
      atRiskProducts.reduce(
        (sum, product) => sum + product.canceledRevenue,
        0,
      ),
    [atRiskProducts],
  );

  const urgentCount = useMemo(
    () => atRiskProducts.filter((product) => product.anomalyScore >= 75).length,
    [atRiskProducts],
  );

  const canceledRevenueByCluster = useMemo(
    () => groupCanceledRevenueByCluster(atRiskProducts),
    [atRiskProducts],
  );

  const cancelRateByCluster = useMemo(
    () => groupCancelRateByCluster(atRiskProducts),
    [atRiskProducts],
  );

  const topProducts = useMemo(
    () =>
      [...atRiskProducts]
        .sort((a, b) => b.canceledRevenue - a.canceledRevenue)
        .slice(0, 5),
    [atRiskProducts],
  );

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="bg-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute -top-24 -right-12 w-96 h-96 bg-rose-600/20 rounded-full blur-3xl -z-1" />
        <div className="absolute -bottom-24 -left-12 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl -z-1" />

        <div className="relative space-y-6">
          <div className="space-y-1">
            <span className="text-rose-400 font-mono text-xs font-bold tracking-wider uppercase flex items-center gap-1.5">
              <TrendingDown className="w-3.5 h-3.5" /> Perdas Identificadas
            </span>
            <h2 className="text-xl md:text-2xl font-bold font-sans">
              Quanto dinheiro seu catálogo está perdendo em produtos atípicos
            </h2>
            <p className="text-slate-400 text-xs md:text-sm max-w-2xl leading-relaxed">
              Visão financeira dos SKUs com comportamento fora do padrão —
              foco em receita cancelada, perfil de portfólio e ações de
              correção no catálogo.
            </p>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl px-5 py-4">
            <p className="text-sm md:text-base font-semibold text-slate-100">
              R$ {formatCurrency(revenueAtRisk)} em risco · {atRiskProducts.length}{" "}
              produto{atRiskProducts.length !== 1 ? "s" : ""} · {urgentCount}{" "}
              precisam de ação hoje
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-rose-950 to-rose-900 p-5 rounded-xl border border-rose-800">
              <div className="flex items-center justify-between opacity-80 text-xs font-semibold uppercase text-rose-200">
                <span>Receita Cancelada</span>
                <DollarSign className="w-4 h-4 text-rose-300" />
              </div>
              <span className="block text-2xl md:text-3xl font-extrabold text-white tracking-tight mt-2">
                R$ {formatCurrency(revenueAtRisk)}
              </span>
              <span className="text-[11px] text-rose-300 block mt-1">
                Valor total perdido em produtos fora do padrão
              </span>
            </div>

            <div className="bg-gradient-to-br from-violet-950 to-violet-900 p-5 rounded-xl border border-violet-800">
              <div className="flex items-center justify-between opacity-80 text-xs font-semibold uppercase text-violet-200">
                <span>Produtos em Risco</span>
                <AlertTriangle className="w-4 h-4 text-violet-300" />
              </div>
              <span className="block text-2xl md:text-3xl font-extrabold text-white tracking-tight mt-2">
                {atRiskProducts.length}
              </span>
              <span className="text-[11px] text-violet-300 block mt-1">
                De {productAnomalies.length} produtos analisados no lote
              </span>
            </div>

            <div className="bg-gradient-to-br from-amber-950 to-amber-900 p-5 rounded-xl border border-amber-800">
              <div className="flex items-center justify-between opacity-80 text-xs font-semibold uppercase text-amber-200">
                <span>Ação Imediata</span>
                <Zap className="w-4 h-4 text-amber-300" />
              </div>
              <span className="block text-2xl md:text-3xl font-extrabold text-white tracking-tight mt-2">
                {urgentCount}
              </span>
              <span className="text-[11px] text-amber-300 block mt-1">
                Produtos que precisam de revisão hoje
              </span>
            </div>
          </div>

          {atRiskProducts.length === 0 ? (
            <div className="bg-slate-950/50 p-8 rounded-2xl border border-slate-800 text-center">
              <p className="text-slate-400 text-sm">
                Nenhuma perda identificada no catálogo atual. Seus produtos
                estão dentro do padrão comercial esperado.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-slate-950/50 p-5 rounded-2xl border border-slate-800 space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-200">
                      Receita Cancelada por Cluster
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Quais grupos de produtos concentram mais perda
                    </p>
                  </div>
                  <ChartContainer height={220}>
                    <BarChart
                      data={canceledRevenueByCluster}
                      margin={{ top: 10, right: 10, left: 0, bottom: 40 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#334155"
                      />
                      <XAxis
                        dataKey="name"
                        fontSize={10}
                        stroke="#94a3b8"
                        angle={-25}
                        textAnchor="end"
                        interval={0}
                        height={60}
                      />
                      <YAxis
                        fontSize={10}
                        stroke="#94a3b8"
                        tickFormatter={(value) =>
                          `R$ ${Number(value).toLocaleString("pt-BR")}`
                        }
                      />
                      <Tooltip
                        formatter={(value) => [
                          `R$ ${formatCurrency(Number(value))}`,
                          "Receita cancelada",
                        ]}
                        contentStyle={{
                          borderRadius: "10px",
                          fontSize: "11px",
                          backgroundColor: "#0f172a",
                          borderColor: "#334155",
                          color: "#f1f5f9",
                        }}
                      />
                      <Bar
                        dataKey="revenue"
                        fill="#f43f5e"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ChartContainer>
                </div>

                <div className="bg-slate-950/50 p-5 rounded-2xl border border-slate-800 space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-200">
                      Taxa de Cancelamento por Cluster
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Média de cancelamento em cada grupo de produtos
                    </p>
                  </div>
                  <ChartContainer height={220}>
                    <BarChart
                      data={cancelRateByCluster}
                      margin={{ top: 10, right: 10, left: 0, bottom: 40 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#334155"
                      />
                      <XAxis
                        dataKey="name"
                        fontSize={10}
                        stroke="#94a3b8"
                        angle={-25}
                        textAnchor="end"
                        interval={0}
                        height={60}
                      />
                      <YAxis
                        fontSize={10}
                        stroke="#94a3b8"
                        tickFormatter={(value) =>
                          `${(Number(value) * 100).toFixed(0)}%`
                        }
                      />
                      <Tooltip
                        formatter={(value) => [
                          formatPercent(Number(value)),
                          "Taxa de cancelamento",
                        ]}
                        contentStyle={{
                          borderRadius: "10px",
                          fontSize: "11px",
                          backgroundColor: "#0f172a",
                          borderColor: "#334155",
                          color: "#f1f5f9",
                        }}
                      />
                      <Bar
                        dataKey="cancelRate"
                        fill="#f59e0b"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ChartContainer>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-200">
                    Top 5 Produtos por Receita Cancelada
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Priorize a correção começando pelos maiores valores perdidos
                  </p>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-950/80 text-slate-400 uppercase tracking-wider text-[10px]">
                        <th className="px-4 py-3 font-bold">#</th>
                        <th className="px-4 py-3 font-bold">Produto</th>
                        <th className="px-4 py-3 font-bold">Cluster</th>
                        <th className="px-4 py-3 font-bold">Cancelamentos</th>
                        <th className="px-4 py-3 font-bold">
                          Receita Cancelada
                        </th>
                        <th className="px-4 py-3 font-bold">Cancelados %</th>
                        <th className="px-4 py-3 font-bold">Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topProducts.map((product, index) => (
                        <tr
                          key={product.productKey}
                          className="border-t border-slate-800/80 hover:bg-slate-950/40 transition-colors"
                        >
                          <td className="px-4 py-3 font-mono text-slate-500">
                            {index + 1}
                          </td>
                          <td className="px-4 py-3 font-semibold text-white max-w-[180px] truncate">
                            {product.name}
                          </td>
                          <td className="px-4 py-3 text-slate-300 max-w-[140px] truncate">
                            {product.clusterName}
                          </td>
                          <td className="px-4 py-3 text-slate-300">
                            {product.totalOrders}
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-200">
                            R$ {formatCurrency(product.canceledRevenue)}
                          </td>
                          <td className="px-4 py-3 text-slate-300">
                            {formatPercent(product.cancellationRate)}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`text-[10px] font-bold px-2 py-1 rounded border whitespace-nowrap ${getActionStyles(product.action)}`}
                            >
                              {product.action}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
