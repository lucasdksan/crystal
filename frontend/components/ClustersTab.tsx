"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { DashboardData } from "@/frontend/types/dashboard";
import {
  HelpCircle,
  ChevronRight,
  Info,
  CheckCircle2,
  AlertTriangle,
  Landmark,
  CreditCard,
  Banknote,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceDot,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { ChartContainer } from "@/frontend/components/ChartContainer";

interface ClustersTabProps {
  data: DashboardData;
}

const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

export function ClustersTab({ data }: ClustersTabProps) {
  const [selectedClusterId, setSelectedClusterId] = useState<number | null>(
    null,
  );
  const [showExplanation, setShowExplanation] = useState(false);

  const getPaymentIcon = (payment: string) => {
    const p = payment.toLowerCase();
    if (p.includes("boleto"))
      return <Landmark className="w-4 h-4 text-amber-600 inline mr-1" />;
    if (p.includes("dinheiro"))
      return <Banknote className="w-4 h-4 text-emerald-600 inline mr-1" />;
    return <CreditCard className="w-4 h-4 text-rose-500 inline mr-1" />;
  };

  const getStatusColor = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes("cancelado")) return "bg-rose-50 text-rose-700 border-rose-200";
    if (s.includes("pronto") || s.includes("separação"))
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    return "bg-blue-50 text-blue-700 border-blue-200";
  };

  const getClusterBadgeColor = (id: number) => {
    switch (id) {
      case 0:
        return "bg-amber-100 text-amber-800 border-amber-200";
      case 1:
        return "bg-rose-100 text-rose-800 border-rose-200";
      case 2:
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case 3:
        return "bg-orange-100 text-orange-800 border-orange-200";
      default:
        return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  const currentSelectedCluster = data.clusters.find(
    (c) => c.id === selectedClusterId,
  );

  const currentDenormalizedCentroid = data.denormalizedCentroids.find(
    (c) => c.clusterId === selectedClusterId,
  );

  const bestK = data.overview.totalClusters;

  const hourChartData =
    currentSelectedCluster?.hourDistribution.map((count, hour) => ({
      hour: `${hour}h`,
      count,
    })) ?? [];

  const dayChartData =
    currentSelectedCluster?.dayDistribution.map((count, day) => ({
      day: DAY_LABELS[day],
      count,
    })) ?? [];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50/40 rounded-2xl p-6 border border-blue-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-sans font-bold text-slate-900 flex items-center gap-2">
            🔬 Entendendo os Seus Grupos de Clientes
          </h2>
          <p className="text-sm text-slate-600 max-w-2xl font-sans">
            Com base em Inteligência de Dados, agrupamos seus{" "}
            <strong>{data.overview.totalPedidos} pedidos</strong> em{" "}
            <strong>{data.overview.totalClusters} perfis distintos</strong> de
            comportamento com <em>segmentação inteligente</em>. O número ideal de
            grupos foi
            escolhido pelo <strong>score de silhueta</strong> (
            {data.bestSilhouetteScore.toFixed(3)}).
          </p>
        </div>
        <button
          onClick={() => setShowExplanation(!showExplanation)}
          className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-slate-200 shadow-xs hover:bg-slate-50 transition-colors text-slate-700 font-sans text-sm font-medium cursor-pointer"
        >
          <HelpCircle className="w-4 h-4 text-indigo-500" />
          {showExplanation ? "Ocultar Explicação" : "Como funciona a segmentação?"}
        </button>
      </div>

      <AnimatePresence>
        {showExplanation && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4 grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              <div className="space-y-3">
                <h3 className="font-bold text-slate-900 font-sans text-base flex items-center gap-2">
                  <Info className="w-5 h-5 text-indigo-500" />
                  Como funcionam esses Grupos?
                </h3>
                <p className="text-sm text-slate-600 font-sans leading-relaxed">
                  Imagine que você tem centenas de clientes na loja e não dá
                  tempo de atender um por um de forma diferente.{" "}
                  A <strong>segmentação inteligente</strong> analisa a receita, o
                  número de produtos, o pagamento
                  utilizado e o horário e, de forma mágica, "empilha" pessoas
                  com comportamentos muito parecidos em gavetas (os chamados{" "}
                  <em>Clusters</em>).
                </p>
                <div className="flex gap-2">
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex-1">
                    <span className="block text-xs font-semibold text-slate-700">
                      Score de Silhueta
                    </span>
                    <span className="text-xs text-slate-500">
                      Mede o quão bem cada pedido se encaixa no seu grupo. Quanto
                      mais próximo de 1, melhor a segmentação. É o critério usado
                      para escolher o K ideal.
                    </span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex-1">
                    <span className="block text-xs font-semibold text-slate-700">
                      Curva de Cotovelo (WCSS)
                    </span>
                    <span className="text-xs text-slate-500">
                      Gráfico complementar que mostra a dispersão interna dos
                      grupos. Útil para visualizar, mas o K final é definido
                      pela silhueta.
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-100 flex flex-col items-center">
                  <span className="text-xs font-semibold text-slate-700 mb-2 font-mono flex items-center gap-1.5 self-start">
                    📈 Score de Silhueta por K (critério de seleção)
                  </span>
                  <ChartContainer height={160}>
                    <LineChart
                      data={data.silhouetteCurve}
                      margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#f1f5f9"
                      />
                      <XAxis
                        dataKey="k"
                        stroke="#94a3b8"
                        fontSize={11}
                        label={{
                          value: "Nº Grupos (K)",
                          position: "insideBottom",
                          offset: -5,
                          fill: "#64748b",
                        }}
                      />
                      <YAxis stroke="#94a3b8" fontSize={11} domain={[0, 1]} />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-slate-900 text-white p-2 rounded-lg text-xs font-sans">
                                <p className="font-semibold">
                                  K = {payload[0].payload.k} grupos
                                </p>
                                <p className="opacity-80">
                                  Silhueta:{" "}
                                  {payload[0].payload.score.toFixed(3)}
                                </p>
                                {payload[0].payload.k === bestK && (
                                  <p className="text-emerald-400 font-bold mt-1">
                                    ✓ K Selecionado!
                                  </p>
                                )}
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="score"
                        stroke="#10b981"
                        strokeWidth={2.5}
                        dot={{ r: 4, stroke: "#10b981", strokeWidth: 1 }}
                        activeDot={{ r: 7 }}
                      />
                      <ReferenceDot
                        x={bestK}
                        y={
                          data.silhouetteCurve.find((p) => p.k === bestK)
                            ?.score ?? 0
                        }
                        r={8}
                        fill="#10b981"
                        stroke="#ffffff"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ChartContainer>
                  <p className="text-[11px] text-slate-500 font-sans mt-2 text-center">
                    K={bestK} selecionado com score{" "}
                    <strong>{data.bestSilhouetteScore.toFixed(3)}</strong> — melhor
                    equilíbrio entre coesão e separação dos grupos.
                  </p>
                </div>

                <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-100 flex flex-col items-center">
                  <span className="text-xs font-semibold text-slate-700 mb-2 font-mono flex items-center gap-1.5 self-start">
                    🔍 Curva de Cotovelo (WCSS — complementar)
                  </span>
                  <ChartContainer height={160}>
                    <LineChart
                      data={data.elbowCurve}
                      margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#f1f5f9"
                      />
                      <XAxis
                        dataKey="k"
                        stroke="#94a3b8"
                        fontSize={11}
                      />
                      <YAxis stroke="#94a3b8" fontSize={11} />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-slate-900 text-white p-2 rounded-lg text-xs font-sans">
                                <p className="font-semibold">
                                  K = {payload[0].payload.k} grupos
                                </p>
                                <p className="opacity-80">
                                  Dispersão:{" "}
                                  {payload[0].payload.wcss.toFixed(2)}
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="wcss"
                        stroke="#4f46e5"
                        strokeWidth={2}
                        dot={{ r: 3, stroke: "#4f46e5", strokeWidth: 1 }}
                      />
                      <ReferenceDot
                        x={bestK}
                        r={6}
                        fill="#6366f1"
                        stroke="#ffffff"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ChartContainer>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-base font-bold text-slate-900 font-sans flex items-center gap-2">
            📊 Tabela Resumo dos Perfis Encontrados
          </h3>
          <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse font-sans">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-600 text-xs font-semibold uppercase tracking-wider">
                    <th className="py-4 px-5">Grupo</th>
                    <th className="py-4 px-4">Pedidos / %</th>
                    <th className="py-4 px-4 text-right">Ticket Médio</th>
                    <th className="py-4 px-4">Cancelamento</th>
                    <th className="py-4 px-4">Método Pagamento</th>
                    <th className="py-4 px-4">Status Comum</th>
                    <th className="py-4 px-5 text-right">Ver</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {data.clusters.map((cluster) => {
                    const isSelected = selectedClusterId === cluster.id;
                    return (
                      <tr
                        key={cluster.id}
                        onClick={() =>
                          setSelectedClusterId(isSelected ? null : cluster.id)
                        }
                        className={`hover:bg-indigo-50/20 transition-colors cursor-pointer ${isSelected ? "bg-indigo-50/40 relative font-medium" : ""}`}
                      >
                        <td className="py-4 px-5 flex items-center gap-2.5">
                          <span
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-mono border ${getClusterBadgeColor(cluster.id)}`}
                          >
                            {cluster.id}
                          </span>
                          <div>
                            <span className="block text-slate-800">
                              {cluster.name.replace(
                                `Cluster ${cluster.id} - `,
                                "",
                              )}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-slate-700 block">
                            {cluster.count} pedidos
                          </span>
                          <span className="text-[11px] text-slate-400 block">
                            {cluster.percentage}% do total
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right font-semibold text-slate-900 whitespace-nowrap">
                          R${" "}
                          {cluster.averageValue.toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        <td className="py-4 px-4">
                          <span
                            className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${
                              cluster.cancelRate > 30
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : "bg-emerald-50 text-emerald-700 border-emerald-200"
                            }`}
                          >
                            {cluster.cancelRate}%
                          </span>
                        </td>
                        <td className="py-4 px-4 text-slate-600">
                          <span className="flex items-center">
                            {getPaymentIcon(cluster.payment)}
                            <span className="truncate max-w-[120px]">
                              {cluster.payment}
                            </span>
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span
                            className={`text-[11px] px-2.5 py-0.5 rounded-full border font-medium ${getStatusColor(cluster.status)}`}
                          >
                            {cluster.status}
                          </span>
                        </td>
                        <td className="py-4 px-5 text-right">
                          <ChevronRight
                            className={`w-4 h-4 text-slate-400 transition-transform ${isSelected ? "rotate-90 text-indigo-600" : ""}`}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <p className="text-xs text-slate-400 font-sans italic">
            *Dica: Clique em qualquer perfil da tabela para carregar um raio-X
            completo e recomendações urgentes à direita!
          </p>
        </div>

        <div className="lg:col-span-1">
          <AnimatePresence mode="wait">
            {currentSelectedCluster ? (
              <motion.div
                key={currentSelectedCluster.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col gap-4 h-full min-h-[460px] relative overflow-hidden overflow-y-auto max-h-[800px]"
              >
                <div
                  className={`absolute top-0 left-0 right-0 h-2 bg-gradient-to-r ${
                    currentSelectedCluster.id === 0
                      ? "from-amber-400 to-yellow-500"
                      : currentSelectedCluster.id === 1
                        ? "from-rose-400 to-pink-500"
                        : currentSelectedCluster.id === 2
                          ? "from-emerald-400 to-teal-500"
                          : "from-orange-400 to-amber-500"
                  }`}
                />

                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold font-mono tracking-wider uppercase text-slate-400">
                      Raio-X do Grupo {currentSelectedCluster.id}
                    </span>
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full border font-bold ${getClusterBadgeColor(currentSelectedCluster.id)}`}
                    >
                      {currentSelectedCluster.percentage}% dos Clientes
                    </span>
                  </div>

                  <div>
                    <h4 className="text-lg font-sans font-extrabold text-slate-800">
                      {currentSelectedCluster.name}
                    </h4>
                    <p className="text-xs text-slate-400 font-sans mt-0.5">
                      {currentSelectedCluster.subtitle}
                    </p>
                  </div>

                  <p className="text-sm text-slate-600 font-sans leading-relaxed border-l-2 border-slate-100 pl-3 py-1 bg-slate-50/50 p-2 rounded-r-lg">
                    {currentSelectedCluster.description}
                  </p>

                  <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <span className="text-xs font-bold text-slate-700 block uppercase tracking-wide">
                      Métricas Comerciais
                    </span>
                    <div className="grid grid-cols-2 gap-3 text-xs font-sans">
                      <div className="bg-white p-2 rounded-lg text-center">
                        <span className="text-slate-400 block text-[10px]">
                          Receita Total
                        </span>
                        <span className="font-bold text-slate-800 text-xs">
                          R${" "}
                          {currentSelectedCluster.totalRevenue.toLocaleString(
                            "pt-BR",
                          )}
                        </span>
                      </div>
                      <div className="bg-white p-2 rounded-lg text-center">
                        <span className="text-slate-400 block text-[10px]">
                          % da Receita
                        </span>
                        <span className="font-bold text-slate-800">
                          {currentSelectedCluster.revenueShare}%
                        </span>
                      </div>
                      <div className="bg-white p-2 rounded-lg text-center">
                        <span className="text-slate-400 block text-[10px]">
                          Cancelamento
                        </span>
                        <span
                          className={`font-bold ${currentSelectedCluster.cancelRate > 30 ? "text-rose-600" : "text-emerald-600"}`}
                        >
                          {currentSelectedCluster.cancelRate}%
                        </span>
                      </div>
                      <div className="bg-white p-2 rounded-lg text-center">
                        <span className="text-slate-400 block text-[10px]">
                          Erros Workflow
                        </span>
                        <span className="font-bold text-slate-800">
                          {currentSelectedCluster.errorRate}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {Object.keys(currentSelectedCluster.paymentMix).length > 0 && (
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-slate-700 block">
                        Mix de Pagamento
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(currentSelectedCluster.paymentMix).map(
                          ([method, pct]) => (
                            <span
                              key={method}
                              className="text-[10px] px-2 py-1 rounded-md bg-slate-100 text-slate-600 font-sans"
                            >
                              {method}: {pct}%
                            </span>
                          ),
                        )}
                      </div>
                    </div>
                  )}

                  {currentDenormalizedCentroid && (
                    <div className="space-y-2 bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
                      <span className="text-xs font-bold text-indigo-700 block uppercase tracking-wide">
                        Perfil Prototípico (Centróide)
                      </span>
                      <div className="grid grid-cols-2 gap-2 text-xs font-sans">
                        <div>
                          <span className="text-slate-400 block text-[10px]">
                            Ticket Típico
                          </span>
                          <span className="font-bold text-slate-800">
                            R${" "}
                            {currentDenormalizedCentroid.valorTotal.toLocaleString(
                              "pt-BR",
                            )}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">
                            Pagamento
                          </span>
                          <span className="font-bold text-slate-800">
                            {currentDenormalizedCentroid.pagamento}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">
                            Hora Típica
                          </span>
                          <span className="font-bold text-slate-800">
                            {currentDenormalizedCentroid.horaDoDia}h
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">
                            Dia Típico
                          </span>
                          <span className="font-bold text-slate-800">
                            {currentDenormalizedCentroid.diaDaSemana}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <span className="text-xs font-bold text-slate-700 block uppercase tracking-wide">
                      Métricas Médias do Grupo
                    </span>
                    <div className="grid grid-cols-2 gap-3 text-xs font-sans">
                      <div className="bg-white p-2 rounded-lg text-center">
                        <span className="text-slate-400 block text-[10px]">
                          Valor do Carrinho
                        </span>
                        <span className="font-bold text-slate-800 text-xs leading-tight break-all">
                          R${" "}
                          {currentSelectedCluster.averageValue.toLocaleString(
                            "pt-BR",
                          )}
                        </span>
                      </div>
                      <div className="bg-white p-2 rounded-lg text-center">
                        <span className="text-slate-400 block text-[10px]">
                          Preço Unitário
                        </span>
                        <span className="font-bold text-slate-800 text-xs leading-tight break-all">
                          R${" "}
                          {currentSelectedCluster.avgPrice.toLocaleString(
                            "pt-BR",
                          )}
                        </span>
                      </div>
                      <div className="bg-white p-2 rounded-lg text-center">
                        <span className="text-slate-400 block text-[10px]">
                          Qtd de Itens
                        </span>
                        <span className="font-bold text-slate-800">
                          {currentSelectedCluster.avgQuantity} un.
                        </span>
                      </div>
                      <div className="bg-white p-2 rounded-lg text-center">
                        <span className="text-slate-400 block text-[10px]">
                          Canal de Venda
                        </span>
                        <span className="font-bold text-slate-800">
                          {currentSelectedCluster.origin}
                        </span>
                      </div>
                    </div>
                  </div>

                  {hourChartData.some((d) => d.count > 0) && (
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-slate-700 block">
                        Horário de Compra
                      </span>
                      <ChartContainer height={100}>
                        <BarChart
                          data={hourChartData}
                          margin={{ top: 0, right: 0, left: -25, bottom: 0 }}
                        >
                          <XAxis dataKey="hour" fontSize={8} stroke="#94a3b8" />
                          <YAxis fontSize={8} stroke="#94a3b8" />
                          <Bar
                            dataKey="count"
                            fill="#6366f1"
                            radius={[2, 2, 0, 0]}
                          />
                        </BarChart>
                      </ChartContainer>
                    </div>
                  )}

                  {dayChartData.some((d) => d.count > 0) && (
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-slate-700 block">
                        Dia da Semana
                      </span>
                      <ChartContainer height={100}>
                        <BarChart
                          data={dayChartData}
                          margin={{ top: 0, right: 0, left: -25, bottom: 0 }}
                        >
                          <XAxis dataKey="day" fontSize={8} stroke="#94a3b8" />
                          <YAxis fontSize={8} stroke="#94a3b8" />
                          <Bar
                            dataKey="count"
                            fill="#4f46e5"
                            radius={[2, 2, 0, 0]}
                          />
                        </BarChart>
                      </ChartContainer>
                    </div>
                  )}

                  {currentSelectedCluster.topProducts.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-slate-700 block">
                        Top Produtos do Grupo
                      </span>
                      <div className="space-y-1.5">
                        {currentSelectedCluster.topProducts.map((product, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between text-[11px] bg-slate-50 px-3 py-2 rounded-lg border border-slate-100"
                          >
                            <span className="text-slate-700 truncate max-w-[140px]">
                              {product.name}
                            </span>
                            <span className="text-slate-500 font-mono">
                              {product.quantity} un. · R${" "}
                              {product.revenue.toLocaleString("pt-BR", {
                                maximumFractionDigits: 0,
                              })}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-700 block">
                      Status Operacional de Integridade:
                    </span>
                    <div className="flex gap-2 items-center">
                      {currentSelectedCluster.cancelRate < 30 ? (
                        <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 text-xs font-medium px-4 py-2.5 rounded-xl border border-emerald-200">
                          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                          <span>
                            Padrão comercial excelente! Estimule esse público
                            com promoções e fidelização.
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 bg-rose-50 text-rose-700 text-xs font-medium px-4 py-2.5 rounded-xl border border-rose-200">
                          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                          <span>
                            Risco Crítico de Abandono! Sugerimos ligar para
                            estes {currentSelectedCluster.count} clientes ou
                            desativar o método {currentSelectedCluster.payment}.
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                  {currentSelectedCluster.cancelRate < 30 ? (
                    <span className="text-emerald-600 font-bold text-xs flex items-center gap-1">
                      👑 Grupo VIP Saudável
                    </span>
                  ) : (
                    <span className="text-rose-500 font-bold text-xs flex items-center gap-1 animate-pulse">
                      🚨 Alerta de Abandono
                    </span>
                  )}
                  <button
                    onClick={() => setSelectedClusterId(null)}
                    className="text-xs text-slate-400 hover:text-slate-600 font-sans py-1 px-3 border border-slate-100 rounded-lg hover:bg-slate-50 cursor-pointer"
                  >
                    Fechar Raio-X
                  </button>
                </div>
              </motion.div>
            ) : (
              <div className="bg-slate-50 border border-slate-100/80 rounded-3xl p-8 flex flex-col items-center justify-center text-center h-full min-h-[460px] text-slate-400">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-indigo-500 mb-4 shadow-inner border border-slate-200/50">
                  <Info className="w-8 h-8 opacity-80" />
                </div>
                <h4 className="text-slate-800 text-base font-bold font-sans">
                  Selecione um Grupo
                </h4>
                <p className="text-xs text-slate-500 max-w-[200px] mt-2 leading-relaxed">
                  Clique em um dos perfis de cluster da tabela à esquerda para
                  visualizar mais detalhes e conselhos comerciais.
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 font-sans">
            Comparações de Receita Média (Valor do Carrinho por Grupo)
          </h3>
          <p className="text-xs text-slate-500">
            Compare o ticket médio de cada grupo com a média global da loja
          </p>
        </div>
        <ChartContainer className="mt-4" height={256}>
          <BarChart
            data={data.clusters}
            margin={{ top: 10, right: 10, left: -10, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#f1f5f9"
            />
            <XAxis
              dataKey="name"
              tickFormatter={(val) => val.replace("Cluster ", "Grupo ")}
              fontSize={11}
              stroke="#64748b"
            />
            <YAxis
              fontStyle="normal"
              stroke="#64748b"
              fontSize={11}
              tickFormatter={(v: number) =>
                v >= 1000000
                  ? `${(v / 1000000).toFixed(1)}M`
                  : v >= 1000
                    ? `${(v / 1000).toFixed(0)}k`
                    : String(v)
              }
            />
            <Tooltip
              formatter={(val) => [
                `R$ ${parseFloat(val as string).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
                "Valor Médio",
              ]}
              contentStyle={{
                borderRadius: "12px",
                borderColor: "#f1f5f9",
                fontFamily: "sans-serif",
                fontSize: "12px",
              }}
            />
            <Bar dataKey="averageValue" radius={[8, 8, 0, 0]}>
              {data.clusters.map((_, index) => {
                const colors = ["#f59e0b", "#f43f5e", "#10b981", "#f97316"];
                return (
                  <Cell
                    key={`cell-${index}`}
                    fill={colors[index % colors.length]}
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ChartContainer>
      </div>
    </div>
  );
}
