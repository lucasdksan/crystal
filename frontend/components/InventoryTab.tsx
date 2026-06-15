"use client";

import type { DashboardData } from "@/frontend/types/dashboard";
import { Package, AlertTriangle, TrendingUp, ShoppingBag } from "lucide-react";

interface InventoryTabProps {
  data: DashboardData;
}

const classificationColors = {
  Crítico: "bg-rose-100 text-rose-700 border-rose-200",
  Atenção: "bg-amber-100 text-amber-700 border-amber-200",
  Saudável: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

const trendIcons = {
  growing: { label: "Crescendo", color: "text-emerald-600" },
  stable: { label: "Estável", color: "text-slate-600" },
  declining: { label: "Caindo", color: "text-rose-600" },
};

export function InventoryTab({ data }: InventoryTabProps) {
  const { inventory, forecast } = data;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-100 rounded-2xl p-5">
          <AlertTriangle className="w-5 h-5 text-rose-500 mb-2" />
          <span className="text-2xl font-black text-slate-900">
            {inventory.ruptureRisk.filter((r) => r.classification === "Crítico").length}
          </span>
          <p className="text-xs text-slate-500 mt-1">SKUs em risco de ruptura</p>
        </div>
        <div className="bg-white border border-slate-100 rounded-2xl p-5">
          <Package className="w-5 h-5 text-amber-500 mb-2" />
          <span className="text-2xl font-black text-slate-900">{inventory.deadStock.length}</span>
          <p className="text-xs text-slate-500 mt-1">Produtos parados (&gt;60 dias)</p>
        </div>
        <div className="bg-white border border-slate-100 rounded-2xl p-5">
          <TrendingUp className="w-5 h-5 text-indigo-500 mb-2" />
          <span className="text-2xl font-black text-slate-900">
            {inventory.abcCurve.filter((a) => a.class === "A").length}
          </span>
          <p className="text-xs text-slate-500 mt-1">Produtos classe A</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-100 rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Risco de Ruptura</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-400 border-b border-slate-100">
                  <th className="text-left py-2 font-semibold">SKU</th>
                  <th className="text-right py-2 font-semibold">Dias</th>
                  <th className="text-right py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {inventory.ruptureRisk.slice(0, 8).map((item) => (
                  <tr key={item.skuId} className="border-b border-slate-50">
                    <td className="py-2.5 font-medium text-slate-800 truncate max-w-[180px]">
                      {item.name}
                    </td>
                    <td className="py-2.5 text-right font-mono text-slate-600">
                      {item.daysRemaining === Infinity ? "∞" : item.daysRemaining.toFixed(0)}
                    </td>
                    <td className="py-2.5 text-right">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${classificationColors[item.classification]}`}
                      >
                        {item.classification}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Estoque Parado</h3>
          {inventory.deadStock.length > 0 ? (
            <div className="space-y-2">
              {inventory.deadStock.slice(0, 8).map((item) => (
                <div
                  key={item.skuId}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100"
                >
                  <div>
                    <p className="text-xs font-bold text-slate-800">{item.name}</p>
                    <p className="text-[10px] text-slate-400">{item.currentStock} un. em estoque</p>
                  </div>
                  <span className="text-xs font-bold text-amber-600">
                    {item.daysSinceLastSale}d sem venda
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400">Nenhum estoque parado detectado.</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-100 rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Curva ABC</h3>
          <div className="space-y-2">
            {inventory.abcCurve.slice(0, 10).map((item) => (
              <div key={item.skuId} className="flex items-center gap-3">
                <span
                  className={`text-[10px] font-black w-6 h-6 flex items-center justify-center rounded-md ${
                    item.class === "A"
                      ? "bg-emerald-100 text-emerald-700"
                      : item.class === "B"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {item.class}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-800 truncate">{item.name}</p>
                  <div className="h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full"
                      style={{ width: `${item.share}%` }}
                    />
                  </div>
                </div>
                <span className="text-xs font-mono text-slate-500">{item.share}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-indigo-500" />
            Previsão de Demanda
          </h3>
          <div className="space-y-2">
            {forecast.forecasts.slice(0, 6).map((f) => (
              <div
                key={f.skuId}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100"
              >
                <div>
                  <p className="text-xs font-bold text-slate-800">{f.name}</p>
                  <p className={`text-[10px] font-semibold ${trendIcons[f.trend].color}`}>
                    {trendIcons[f.trend].label}
                    {f.expectedGrowth !== 0 && ` (${f.expectedGrowth > 0 ? "+" : ""}${f.expectedGrowth}%)`}
                  </p>
                </div>
                <div className="text-right text-[10px] font-mono text-slate-500">
                  <div>7d: {f.forecast7d.toFixed(0)}</div>
                  <div>30d: {f.forecast30d.toFixed(0)}</div>
                </div>
              </div>
            ))}
          </div>

          {forecast.purchaseRecommendations.length > 0 && (
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <h4 className="text-xs font-bold text-slate-700">Recomendações de Compra</h4>
              {forecast.purchaseRecommendations.slice(0, 4).map((rec) => (
                <div key={rec.skuId} className="text-xs text-slate-600">
                  <span className="font-bold text-slate-800">{rec.name}</span>
                  {" — "}
                  {rec.recommendedQty} un. ({rec.urgency})
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
