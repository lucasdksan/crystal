"use client";

import React from "react";
import type { DashboardData } from "@/frontend/types/dashboard";
import { Filter, AlertTriangle } from "lucide-react";

interface SalesFunnelProps {
  data: DashboardData;
}

interface FunnelStage {
  id: string;
  label: string;
  count: number;
  rate: number;
}

const PAYMENT_PENDING_NAMES = new Set([
  "Pagamento Pendente",
  "Pendente",
  "Aguardando Confirmação",
  "Janela de Cancelamento",
]);

const PAYMENT_APPROVED_NAMES = new Set([
  "Pagamento Aprovado",
  "Em Separação",
  "Pronto para Separação",
]);

const FULFILLED_NAMES = new Set([
  "Faturado",
  "Enviado",
  "Entregue",
  "Concluído",
]);

function countByNames(
  statuses: DashboardData["statuses"],
  names: Set<string>,
): number {
  return statuses
    .filter((s) => names.has(s.name))
    .reduce((sum, s) => sum + s.count, 0);
}

function buildFunnelStages(data: DashboardData): FunnelStage[] {
  const total = data.overview.totalPedidos;
  if (total === 0) return [];

  const paymentPending = countByNames(data.statuses, PAYMENT_PENDING_NAMES);
  const paymentApproved = countByNames(data.statuses, PAYMENT_APPROVED_NAMES);
  const fulfilled = countByNames(data.statuses, FULFILLED_NAMES);

  const stages: FunnelStage[] = [
    {
      id: "created",
      label: "Pedidos Criados",
      count: total,
      rate: 100,
    },
    {
      id: "payment",
      label: "Em Pagamento",
      count: paymentPending,
      rate: (paymentPending / total) * 100,
    },
    {
      id: "approved",
      label: "Pagamento Aprovado",
      count: paymentApproved,
      rate: (paymentApproved / total) * 100,
    },
    {
      id: "fulfilled",
      label: "Entregues / Faturados",
      count: fulfilled,
      rate: (fulfilled / total) * 100,
    },
  ];

  return stages;
}

function findWorstDropoff(stages: FunnelStage[]): number {
  if (stages.length < 2) return -1;

  let worstIdx = 0;
  let worstDrop = -1;

  for (let i = 1; i < stages.length; i++) {
    const drop = stages[i - 1].rate - stages[i].rate;
    if (drop > worstDrop) {
      worstDrop = drop;
      worstIdx = i;
    }
  }

  return worstIdx;
}

export function SalesFunnel({ data }: SalesFunnelProps) {
  const stages = buildFunnelStages(data);
  const worstDropIdx = findWorstDropoff(stages);

  if (stages.length === 0) {
    return (
      <div className="bg-white border border-slate-100 rounded-2xl p-6 text-sm text-slate-500 text-center">
        Sem pedidos no período para montar o funil de conversão.
      </div>
    );
  }

  const maxCount = stages[0].count;

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Filter className="w-4 h-4 text-indigo-500" />
            Funil de Conversão
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Visitas ao site não disponíveis via VTEX OMS — funil inicia em
            pedido criado.
          </p>
        </div>
        {worstDropIdx > 0 && (
          <div className="flex items-center gap-2 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>
              Maior perda entre{" "}
              <strong>{stages[worstDropIdx - 1].label}</strong> e{" "}
              <strong>{stages[worstDropIdx].label}</strong> (
              {(stages[worstDropIdx - 1].rate - stages[worstDropIdx].rate).toFixed(
                1,
              )}
              %)
            </span>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {stages.map((stage, idx) => {
          const widthPct = maxCount > 0 ? (stage.count / maxCount) * 100 : 0;
          const isWorst = idx === worstDropIdx;

          return (
            <div key={stage.id} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span
                  className={`font-semibold ${isWorst ? "text-rose-700" : "text-slate-700"}`}
                >
                  {stage.label}
                  {isWorst && (
                    <span className="ml-2 text-[10px] text-rose-600 font-bold uppercase">
                      maior drop-off
                    </span>
                  )}
                </span>
                <span className="font-mono text-slate-500">
                  {stage.count} ({stage.rate.toFixed(1)}%)
                </span>
              </div>
              <div className="h-8 bg-slate-50 rounded-lg overflow-hidden border border-slate-100">
                <div
                  className={`h-full rounded-lg transition-all ${
                    isWorst
                      ? "bg-gradient-to-r from-rose-500 to-rose-400"
                      : "bg-gradient-to-r from-indigo-600 to-indigo-400"
                  }`}
                  style={{ width: `${Math.max(widthPct, 2)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
