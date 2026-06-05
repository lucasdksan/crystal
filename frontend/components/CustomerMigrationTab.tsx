"use client";

import React from "react";
import type { DashboardData } from "@/frontend/types/dashboard";
import { ArrowRight, GitBranch } from "lucide-react";

interface CustomerMigrationTabProps {
  data: DashboardData;
}

export function CustomerMigrationTab({ data }: CustomerMigrationTabProps) {
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="bg-gradient-to-r from-blue-50/50 to-slate-50 rounded-2xl p-6 border border-slate-100">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-blue-600" />
          Customer Migration Analysis
        </h2>
        <p className="text-sm text-slate-600 mt-1">
          Monitoramento de movimentação entre segmentos ao longo do tempo.
        </p>
      </div>

      {data.migrationFlows.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-slate-400 text-sm">
          Dados insuficientes para detectar migrações. São necessários clientes
          com múltiplos pedidos distribuídos no período.
        </div>
      ) : (
        <div className="space-y-3">
          {data.migrationFlows.map((flow, idx) => (
            <div
              key={idx}
              className="bg-white rounded-2xl border border-slate-100 p-5 flex flex-col sm:flex-row sm:items-center gap-4"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="text-sm font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg truncate">
                  {flow.fromSegment}
                </span>
                <ArrowRight className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                <span className="text-sm font-bold text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg truncate">
                  {flow.toSegment}
                </span>
              </div>
              <div className="flex items-center gap-6 text-xs">
                <div>
                  <span className="text-slate-400 block">Clientes</span>
                  <span className="font-bold text-slate-800">
                    {flow.customerCount}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Impacto</span>
                  <span className="font-bold text-emerald-600">
                    R$ {flow.revenueImpact.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
