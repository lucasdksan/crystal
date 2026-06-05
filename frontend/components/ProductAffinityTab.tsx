"use client";

import React from "react";
import type { DashboardData } from "@/frontend/types/dashboard";
import { Link2, ShoppingBag } from "lucide-react";

interface ProductAffinityTabProps {
  data: DashboardData;
}

export function ProductAffinityTab({ data }: ProductAffinityTabProps) {
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="bg-gradient-to-r from-purple-50/50 to-slate-50 rounded-2xl p-6 border border-slate-100">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-purple-600" />
          Product Affinity Analysis
        </h2>
        <p className="text-sm text-slate-600 mt-1">
          Market Basket Analysis — descubra relações entre produtos para
          cross-sell e upsell.
        </p>
      </div>

      {data.affinityRules.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-slate-400 text-sm">
          Dados insuficientes para gerar regras de afinidade. Importe mais
          pedidos com múltiplos produtos por cliente.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Link2 className="w-4 h-4 text-purple-500" />
              Regras de Associação (Top {data.affinityRules.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px]">
                <tr>
                  <th className="text-left p-3">Produto A</th>
                  <th className="text-left p-3">→</th>
                  <th className="text-left p-3">Produto B</th>
                  <th className="text-right p-3">Support</th>
                  <th className="text-right p-3">Confidence</th>
                  <th className="text-right p-3">Lift</th>
                </tr>
              </thead>
              <tbody>
                {data.affinityRules.map((rule, idx) => (
                  <tr key={idx} className="border-t border-slate-50">
                    <td className="p-3 font-medium text-slate-800 max-w-[180px] truncate">
                      {rule.antecedent}
                    </td>
                    <td className="p-3 text-slate-300">→</td>
                    <td className="p-3 font-medium text-slate-800 max-w-[180px] truncate">
                      {rule.consequent}
                    </td>
                    <td className="p-3 text-right font-mono">
                      {(rule.support * 100).toFixed(1)}%
                    </td>
                    <td className="p-3 text-right font-mono">
                      {(rule.confidence * 100).toFixed(1)}%
                    </td>
                    <td className="p-3 text-right">
                      <span
                        className={`font-bold font-mono px-2 py-0.5 rounded-md ${
                          rule.lift > 2
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-indigo-50 text-indigo-700"
                        }`}
                      >
                        {rule.lift}x
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 bg-slate-50 text-[10px] text-slate-500 border-t border-slate-100">
            Lift &gt; 1 indica correlação positiva. Confidence &gt; 30% indica
            associação forte o suficiente para ação comercial.
          </div>
        </div>
      )}
    </div>
  );
}
