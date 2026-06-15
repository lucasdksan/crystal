"use client";

import type { DashboardData } from "@/frontend/types/dashboard";
import { Heart, Users, DollarSign, Target } from "lucide-react";

interface RelationshipTabProps {
  data: DashboardData;
}

const SEGMENT_COLORS: Record<string, string> = {
  Campeões: "bg-amber-100 text-amber-800 border-amber-200",
  Fiéis: "bg-emerald-100 text-emerald-800 border-emerald-200",
  "Potenciais Fiéis": "bg-blue-100 text-blue-800 border-blue-200",
  "Novos Clientes": "bg-indigo-100 text-indigo-800 border-indigo-200",
  "Em Risco": "bg-rose-100 text-rose-800 border-rose-200",
  Perdidos: "bg-slate-100 text-slate-700 border-slate-200",
  Hibernando: "bg-purple-100 text-purple-800 border-purple-200",
};

export function RelationshipTab({ data }: RelationshipTabProps) {
  const { rfm } = data;
  const totalRevenue = rfm.segments.reduce((s, seg) => s + seg.revenue, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-100 rounded-2xl p-5">
          <Users className="w-5 h-5 text-indigo-500 mb-2" />
          <span className="text-2xl font-black text-slate-900">{rfm.totalClients}</span>
          <p className="text-xs text-slate-500 mt-1">Clientes únicos</p>
        </div>
        <div className="bg-white border border-slate-100 rounded-2xl p-5">
          <Heart className="w-5 h-5 text-rose-500 mb-2" />
          <span className="text-2xl font-black text-slate-900">{rfm.segments.length}</span>
          <p className="text-xs text-slate-500 mt-1">Perfis de clientes</p>
        </div>
        <div className="bg-white border border-slate-100 rounded-2xl p-5">
          <DollarSign className="w-5 h-5 text-emerald-500 mb-2" />
          <span className="text-2xl font-black text-slate-900">
            R$ {totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
          </span>
          <p className="text-xs text-slate-500 mt-1">Receita total clientes</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-100 rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Distribuição por perfil</h3>
          <div className="space-y-3">
            {rfm.segments.map((segment) => {
              const pct = rfm.totalClients > 0
                ? (segment.count / rfm.totalClients) * 100
                : 0;
              const colorClass = SEGMENT_COLORS[segment.name] ?? "bg-slate-100 text-slate-700";

              return (
                <div key={segment.name} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${colorClass}`}>
                      {segment.name}
                    </span>
                    <span className="text-xs text-slate-500">
                      {segment.count} clientes · R$ {segment.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Target className="w-4 h-4 text-indigo-500" />
            Recomendações por Segmento
          </h3>
          <div className="space-y-3">
            {rfm.recommendations.map((rec) => (
              <div
                key={rec.segment}
                className="border border-slate-100 rounded-xl p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-900">{rec.segment}</span>
                  <span className="text-xs text-slate-500">{rec.clientCount} clientes</span>
                </div>
                <p className="text-xs text-slate-600">{rec.action}</p>
                <p className="text-xs font-bold text-emerald-600">
                  Receita: R$ {rec.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
