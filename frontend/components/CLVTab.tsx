"use client";

import React from "react";
import type { DashboardData } from "@/frontend/types/dashboard";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { Crown, TrendingUp } from "lucide-react";

interface CLVTabProps {
  data: DashboardData;
}

export function CLVTab({ data }: CLVTabProps) {
  const topClients = [...data.clvEstimates]
    .sort((a, b) => b.estimatedLifetimeValue - a.estimatedLifetimeValue)
    .slice(0, 10);

  const chartData = topClients.map((c) => ({
    name: c.customerName.length > 12 ? `${c.customerName.slice(0, 10)}…` : c.customerName,
    atual: c.currentRevenue,
    previsto: c.predictedRevenue6m,
    ltv: c.estimatedLifetimeValue,
  }));

  const highPotential = data.clvEstimates.filter(
    (c) => c.predictedRevenue6m > c.currentRevenue * 0.5,
  );

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="bg-gradient-to-r from-amber-50/50 to-slate-50 rounded-2xl p-6 border border-slate-100">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Crown className="w-5 h-5 text-amber-600" />
          Customer Lifetime Value (CLV)
        </h2>
        <p className="text-sm text-slate-600 mt-1">
          Estimativa de valor futuro dos clientes com base em frequência,
          ticket e probabilidade de churn.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <span className="text-xs text-slate-500">CLV Total Estimado</span>
          <p className="text-2xl font-black text-indigo-600">
            R$ {data.customerIntelligenceSummary.totalClv.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <span className="text-xs text-slate-500">Clientes analisados</span>
          <p className="text-2xl font-black text-slate-900">
            {data.clvEstimates.length}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <span className="text-xs text-slate-500">Alto potencial</span>
          <p className="text-2xl font-black text-emerald-600">
            {highPotential.length}
          </p>
        </div>
      </div>

      {chartData.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
          <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-amber-500" />
            Top 10 Clientes por LTV
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={9} />
                <YAxis fontSize={10} />
                <Tooltip
                  formatter={(val) => [
                    `R$ ${Number(val).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
                  ]}
                />
                <Bar dataKey="atual" fill="#94a3b8" name="Receita Atual" radius={[2, 2, 0, 0]} />
                <Bar dataKey="previsto" fill="#f59e0b" name="Previsto 6m" radius={[2, 2, 0, 0]} />
                <Bar dataKey="ltv" fill="#4f46e5" name="LTV" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900">Ranking de Clientes</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px]">
              <tr>
                <th className="text-left p-3">#</th>
                <th className="text-left p-3">Cliente</th>
                <th className="text-left p-3">Segmento</th>
                <th className="text-right p-3">Receita Atual</th>
                <th className="text-right p-3">Previsto 6m</th>
                <th className="text-right p-3">LTV</th>
              </tr>
            </thead>
            <tbody>
              {topClients.map((client, idx) => (
                <tr key={client.customerId} className="border-t border-slate-50">
                  <td className="p-3 font-mono text-slate-400">{idx + 1}</td>
                  <td className="p-3 font-medium text-slate-800">
                    {client.customerName}
                  </td>
                  <td className="p-3 text-slate-500">{client.segmentName}</td>
                  <td className="p-3 text-right font-mono">
                    R$ {client.currentRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-3 text-right font-mono text-amber-600">
                    R$ {client.predictedRevenue6m.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-indigo-600">
                    R$ {client.estimatedLifetimeValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
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
