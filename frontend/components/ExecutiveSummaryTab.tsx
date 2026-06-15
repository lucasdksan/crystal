"use client";

import type { DashboardData } from "@/frontend/types/dashboard";
import { HealthScore } from "@/frontend/components/HealthScore";
import { AlertCard } from "@/frontend/components/AlertCard";
import { KPICard } from "@/frontend/components/KPICard";
import {
  DollarSign,
  AlertOctagon,
  ShoppingCart,
  TrendingUp,
  Users,
  Bell,
} from "lucide-react";

interface ExecutiveSummaryTabProps {
  data: DashboardData;
  onNavigate: (tab: string) => void;
}

export function ExecutiveSummaryTab({ data, onNavigate }: ExecutiveSummaryTabProps) {
  const isCritical = data.overview.taxaCancelamento > 50;
  const topAlerts = data.alerts.slice(0, 3);

  return (
    <div className="space-y-6 animate-fade-in">
      <HealthScore score={data.healthScore} />

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          id="kpi-gross"
          title="Faturamento Bruto"
          value={`R$ ${data.overview.receitaTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
          icon={<DollarSign className="w-5 h-5" />}
          badge="Total"
          badgeType="info"
          description={`${data.overview.totalPedidos} pedidos no período`}
        />
        <KPICard
          id="kpi-cancel"
          title="Taxa de Cancelamento"
          value={`${data.overview.taxaCancelamento.toFixed(1)}%`}
          icon={<AlertOctagon className="w-5 h-5" />}
          badge={isCritical ? "Crítico" : "OK"}
          badgeType={isCritical ? "error" : "success"}
          description={`Perda: R$ ${data.overview.perdaEstimada.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
        />
        <KPICard
          id="kpi-delivery"
          title="Taxa de Entrega"
          value={`${data.overview.taxaEntrega.toFixed(1)}%`}
          icon={<ShoppingCart className="w-5 h-5" />}
          badge={data.overview.taxaEntrega > 30 ? "Eficiente" : "Baixo"}
          badgeType={data.overview.taxaEntrega > 30 ? "success" : "warning"}
          description="Pedidos concluídos com entrega"
        />
        <KPICard
          id="kpi-clusters"
          title="Segmentos"
          value={`${data.overview.totalClusters}`}
          icon={<Users className="w-5 h-5" />}
          badge="Identificados"
          badgeType="info"
          description={`${data.rfm.totalClients} clientes mapeados`}
        />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-100 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Bell className="w-4 h-4 text-rose-500" />
              Alertas Prioritários
            </h3>
            <button
              onClick={() => onNavigate("alertas")}
              className="text-xs text-indigo-600 font-semibold hover:underline cursor-pointer"
            >
              Ver todos ({data.alerts.length})
            </button>
          </div>
          {topAlerts.length > 0 ? (
            <div className="space-y-3">
              {topAlerts.map((alert) => (
                <AlertCard key={alert.id} alert={alert} />
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400">Nenhum alerta ativo no momento.</p>
          )}
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-500" />
            Diagnóstico Rápido
          </h3>
          <p className="text-sm text-slate-700 font-medium">{data.diagnostics.summary}</p>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
              <span className="text-[10px] text-slate-400 uppercase font-bold">Campeão</span>
              <p className="text-xs font-bold text-slate-800 mt-1 truncate">
                {data.diagnostics.championProduct}
              </p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
              <span className="text-[10px] text-slate-400 uppercase font-bold">Gargalo</span>
              <p className="text-xs font-bold text-slate-800 mt-1 truncate">
                {data.diagnostics.bottleneckProduct}
              </p>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={() => onNavigate("oportunidades")}
              className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              Ver Oportunidades
            </button>
            <button
              onClick={() => onNavigate("mentor")}
              className="flex-1 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Consultar Mentor IA
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
