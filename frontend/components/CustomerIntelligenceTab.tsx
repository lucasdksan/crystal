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
import { Users, TrendingUp, DollarSign } from "lucide-react";

interface CustomerIntelligenceTabProps {
  data: DashboardData;
}

export function CustomerIntelligenceTab({ data }: CustomerIntelligenceTabProps) {
  const chartData = data.customerSegments.map((s) => ({
    name: s.name.length > 18 ? `${s.name.slice(0, 16)}…` : s.name,
    clientes: s.customerCount,
    receita: s.totalRevenue,
    ticket: s.averageTicket,
  }));

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="bg-gradient-to-r from-indigo-50/50 to-slate-50 rounded-2xl p-6 border border-slate-100">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Users className="w-5 h-5 text-indigo-600" />
          Customer Intelligence — Segmentação Automática
        </h2>
        <p className="text-sm text-slate-600 mt-1 max-w-2xl">
          {data.overview.totalClientes} clientes agrupados em{" "}
          {data.customerSegments.length} segmentos com base em valor, frequência
          e comportamento de compra.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.customerSegments.map((segment) => (
          <div
            key={segment.id}
            className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3 shadow-xs"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-bold text-slate-900 text-sm">{segment.name}</h3>
              <span className="text-[10px] font-bold uppercase bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md">
                {segment.customerShare}% base
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              {segment.description}
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-50 p-2 rounded-lg">
                <span className="text-slate-400 block">Clientes</span>
                <span className="font-bold text-slate-800">
                  {segment.customerCount}
                </span>
              </div>
              <div className="bg-slate-50 p-2 rounded-lg">
                <span className="text-slate-400 block">Receita</span>
                <span className="font-bold text-emerald-600">
                  {segment.revenueShare}%
                </span>
              </div>
              <div className="bg-slate-50 p-2 rounded-lg">
                <span className="text-slate-400 block">Ticket médio</span>
                <span className="font-bold text-slate-800">
                  R$ {segment.averageTicket.toLocaleString("pt-BR")}
                </span>
              </div>
              <div className="bg-slate-50 p-2 rounded-lg">
                <span className="text-slate-400 block">Frequência</span>
                <span className="font-bold text-slate-800">
                  {segment.averageFrequency}/mês
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-slate-400">
              <DollarSign className="w-3 h-3" />
              R$ {segment.totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
          </div>
        ))}
      </div>

      {chartData.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
          <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-500" />
            Receita por Segmento
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={10} />
                <YAxis fontSize={10} />
                <Tooltip
                  formatter={(val) => [
                    `R$ ${Number(val).toLocaleString("pt-BR")}`,
                    "Receita",
                  ]}
                />
                <Bar dataKey="receita" fill="#4f46e5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
