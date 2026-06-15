"use client";

import type { DashboardData } from "@/frontend/types/dashboard";
import { AlertCard } from "@/frontend/components/AlertCard";
import { Bell } from "lucide-react";

interface AlertsTabProps {
  data: DashboardData;
}

export function AlertsTab({ data }: AlertsTabProps) {
  const critical = data.alerts.filter((a) => a.severity === "critical");
  const warning = data.alerts.filter((a) => a.severity === "warning");
  const info = data.alerts.filter((a) => a.severity === "info");

  const totalImpact = data.alerts.reduce((s, a) => s + a.financialImpact, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-100 rounded-2xl p-5">
          <Bell className="w-5 h-5 text-indigo-500 mb-2" />
          <span className="text-2xl font-black text-slate-900">{data.alerts.length}</span>
          <p className="text-xs text-slate-500 mt-1">Alertas ativos</p>
        </div>
        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-5">
          <span className="text-2xl font-black text-rose-600">{critical.length}</span>
          <p className="text-xs text-rose-500 mt-1">Críticos</p>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5">
          <span className="text-2xl font-black text-amber-600">{warning.length}</span>
          <p className="text-xs text-amber-500 mt-1">Atenção</p>
        </div>
        <div className="bg-white border border-slate-100 rounded-2xl p-5">
          <span className="text-2xl font-black text-slate-900">
            R$ {totalImpact.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
          </span>
          <p className="text-xs text-slate-500 mt-1">Impacto total</p>
        </div>
      </div>

      {critical.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-bold text-rose-600">Alertas Críticos</h3>
          {critical.map((alert) => (
            <AlertCard key={alert.id} alert={alert} />
          ))}
        </section>
      )}

      {warning.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-bold text-amber-600">Alertas de Atenção</h3>
          {warning.map((alert) => (
            <AlertCard key={alert.id} alert={alert} />
          ))}
        </section>
      )}

      {info.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-bold text-blue-600">Informativos</h3>
          {info.map((alert) => (
            <AlertCard key={alert.id} alert={alert} />
          ))}
        </section>
      )}

      {data.alerts.length === 0 && (
        <div className="bg-white border border-slate-100 rounded-2xl p-12 text-center">
          <p className="text-sm text-slate-400">Nenhum alerta ativo. Operação saudável.</p>
        </div>
      )}
    </div>
  );
}
