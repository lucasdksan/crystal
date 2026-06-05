"use client";

import React, { useState } from "react";
import type { CatalogHealthProductUI, DashboardData } from "@/frontend/types/dashboard";
import {
  ChevronDown,
  ChevronUp,
  HeartPulse,
  PackageX,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

interface CatalogHealthTabProps {
  data: DashboardData;
}

interface ProductListSectionProps {
  title: string;
  description: string;
  products: CatalogHealthProductUI[];
  emptyMessage: string;
  renderMeta?: (product: CatalogHealthProductUI) => string;
}

function ProductListSection({
  title,
  description,
  products,
  emptyMessage,
  renderMeta,
}: ProductListSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? products : products.slice(0, 5);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="w-full p-4 flex items-center justify-between gap-4 text-left hover:bg-slate-50 transition-colors cursor-pointer"
      >
        <div>
          <h3 className="text-sm font-bold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg font-black text-slate-900">
            {products.length}
          </span>
          {products.length > 5 &&
            (expanded ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            ))}
        </div>
      </button>
      {products.length > 0 ? (
        <div className="border-t border-slate-100 divide-y divide-slate-50">
          {visible.map((product) => (
            <div
              key={product.productKey}
              className="px-4 py-3 flex items-center justify-between gap-3 text-xs"
            >
              <span className="font-medium text-slate-800 truncate">
                {product.productName}
              </span>
              <span className="text-slate-500 whitespace-nowrap">
                {renderMeta
                  ? renderMeta(product)
                  : `${product.totalOrders} ped. · R$ ${product.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="border-t border-slate-100 p-4 text-xs text-slate-400">
          {emptyMessage}
        </div>
      )}
    </div>
  );
}

export function CatalogHealthTab({ data }: CatalogHealthTabProps) {
  const { catalogHealth } = data;
  const { summary } = catalogHealth;

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="bg-gradient-to-r from-emerald-50/50 to-slate-50 rounded-2xl p-6 border border-slate-100">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <HeartPulse className="w-5 h-5 text-emerald-600" />
          Saúde do Catálogo
        </h2>
        <p className="text-sm text-slate-600 mt-1">
          Indicadores de vitalidade do portfólio para decisões rápidas de
          gestão.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <span className="text-[10px] text-slate-500 uppercase font-bold">
            Sem venda 90d
          </span>
          <p className="text-2xl font-black text-rose-600 mt-1">
            {summary.noSale90Count}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <span className="text-[10px] text-slate-500 uppercase font-bold">
            1 venda apenas
          </span>
          <p className="text-2xl font-black text-amber-600 mt-1">
            {summary.singleSaleCount}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <span className="text-[10px] text-slate-500 uppercase font-bold">
            Pareto 80%
          </span>
          <p className="text-2xl font-black text-indigo-600 mt-1">
            {summary.paretoCount}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <span className="text-[10px] text-slate-500 uppercase font-bold">
            Queda demanda
          </span>
          <p className="text-2xl font-black text-orange-600 mt-1">
            {summary.decliningCount}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <span className="text-[10px] text-slate-500 uppercase font-bold">
            Crescimento
          </span>
          <p className="text-2xl font-black text-emerald-600 mt-1">
            {summary.growingCount}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <span className="text-[10px] text-slate-500 uppercase font-bold">
            Total catálogo
          </span>
          <p className="text-2xl font-black text-slate-900 mt-1">
            {summary.totalProducts}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <div className="flex items-center justify-between gap-4 mb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Regra 80/20 — Pareto
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {summary.paretoCount} produtos concentram{" "}
              {summary.paretoRevenueShare.toFixed(0)}% da receita
            </p>
          </div>
          <span className="text-2xl font-black text-indigo-600">
            {summary.paretoRevenueShare.toFixed(0)}%
          </span>
        </div>
        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all"
            style={{ width: `${Math.min(summary.paretoRevenueShare, 100)}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ProductListSection
          title="Sem venda há 30 dias"
          description="Produtos sem movimentação recente"
          products={catalogHealth.noSale30Days}
          emptyMessage="Nenhum produto sem venda há 30 dias."
          renderMeta={(product) =>
            `${product.daysSinceLastSale ?? 0} dias · ${product.totalOrders} ped.`
          }
        />
        <ProductListSection
          title="Sem venda há 60 dias"
          description="Risco de estoque parado"
          products={catalogHealth.noSale60Days}
          emptyMessage="Nenhum produto sem venda há 60 dias."
          renderMeta={(product) =>
            `${product.daysSinceLastSale ?? 0} dias · R$ ${product.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`
          }
        />
        <ProductListSection
          title="Sem venda há 90 dias"
          description="Candidatos a descontinuação"
          products={catalogHealth.noSale90Days}
          emptyMessage="Nenhum produto sem venda há 90 dias."
          renderMeta={(product) =>
            `${product.daysSinceLastSale ?? 0} dias sem venda`
          }
        />
        <ProductListSection
          title="Apenas 1 venda"
          description="Produtos com baixa tração"
          products={catalogHealth.singleSaleProducts}
          emptyMessage="Nenhum produto com apenas 1 venda."
        />
        <ProductListSection
          title="Queda de demanda"
          description="Crescimento negativo superior a 10%"
          products={catalogHealth.decliningProducts}
          emptyMessage="Nenhum produto em queda significativa."
          renderMeta={(product) =>
            `${(product.growthRate ?? 0).toFixed(1)}% · R$ ${product.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`
          }
        />
        <ProductListSection
          title="Crescimento acelerado"
          description="Crescimento superior a 20%"
          products={catalogHealth.growingProducts}
          emptyMessage="Nenhum produto em crescimento acelerado."
          renderMeta={(product) =>
            `+${(product.growthRate ?? 0).toFixed(1)}% · ${product.totalOrders} ped.`
          }
        />
      </div>

      {catalogHealth.paretoProducts.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-500" />
            <h3 className="text-sm font-bold text-slate-900">
              Produtos responsáveis por 80% da receita
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="text-left p-3 font-semibold">#</th>
                  <th className="text-left p-3 font-semibold">Produto</th>
                  <th className="text-right p-3 font-semibold">Pedidos</th>
                  <th className="text-right p-3 font-semibold">Receita</th>
                </tr>
              </thead>
              <tbody>
                {catalogHealth.paretoProducts.map((product, index) => (
                  <tr
                    key={product.productKey}
                    className="border-t border-slate-50"
                  >
                    <td className="p-3 text-slate-400 font-mono">{index + 1}</td>
                    <td className="p-3 font-medium text-slate-800">
                      {product.productName}
                    </td>
                    <td className="p-3 text-right font-mono">
                      {product.totalOrders}
                    </td>
                    <td className="p-3 text-right font-mono">
                      R${" "}
                      {product.revenue.toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {summary.totalProducts === 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-sm text-slate-500 flex flex-col items-center gap-2">
          <PackageX className="w-8 h-8 text-slate-300" />
          <span>Nenhum produto encontrado no período analisado.</span>
        </div>
      )}

      {summary.decliningCount > 0 && summary.growingCount === 0 && (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-xs text-amber-800 flex items-start gap-2">
          <TrendingDown className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>
            O catálogo apresenta mais produtos em queda do que em crescimento.
            Revise precificação, visibilidade e estoque dos itens em declínio.
          </span>
        </div>
      )}
    </div>
  );
}
