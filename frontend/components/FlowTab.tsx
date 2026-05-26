"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { DashboardData, SOMNeuron } from "@/frontend/types/dashboard";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import { ChartContainer } from "@/frontend/components/ChartContainer";
import {
  Clock,
  Calendar,
  HelpCircle,
  Activity,
  ShieldAlert,
} from "lucide-react";

interface FlowTabProps {
  data: DashboardData;
}

export function FlowTab({ data }: FlowTabProps) {
  const [hoveredNeuron, setHoveredNeuron] = useState<SOMNeuron | null>(null);
  const [selectedNeuron, setSelectedNeuron] = useState<SOMNeuron | null>(null);
  const [showSOMExplanation, setShowSOMExplanation] = useState(false);

  const totalOrders = data.overview.totalPedidos;

  const getNeuronBg = (neuron: SOMNeuron) => {
    if (neuron.count === 0) return "bg-slate-50 border-slate-100/60 text-slate-300";
    if (neuron.value > 3000)
      return "bg-pink-100 border-pink-300 text-pink-800 shadow-sm cursor-pointer hover:bg-pink-200";
    if (neuron.value > 2000)
      return "bg-emerald-100 border-emerald-300 text-emerald-800 shadow-sm cursor-pointer hover:bg-emerald-200 animate-pulse";
    if (neuron.value > 1000)
      return "bg-amber-100 border-amber-300 text-amber-800 shadow-sm cursor-pointer hover:bg-amber-200";
    return "bg-blue-100 border-blue-300 text-blue-800 shadow-sm cursor-pointer hover:bg-blue-200";
  };

  const canceledStatus = data.statuses.find((s) =>
    s.name.toLowerCase().includes("cancelado"),
  );

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="bg-gradient-to-r from-indigo-50/50 to-slate-50 rounded-2xl p-6 border border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-sans font-bold text-slate-900 flex items-center gap-2">
            🚀 Como a sua Loja Respira: Fluxo Comportamental & Operação
          </h2>
          <p className="text-sm text-slate-600 max-w-2xl font-sans">
            Análise do comportamento das vendas de acordo com o{" "}
            <strong>Tempo (horas/dias)</strong> e{" "}
            <strong>Similaridade de Comportamento Visual (Mapa de Comportamento)</strong>.
            Descubra em que momentos sua operação recebe mais golpes de boletos
            não pagos.
          </p>
        </div>
        <button
          onClick={() => setShowSOMExplanation(!showSOMExplanation)}
          className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-slate-200 shadow-xs hover:bg-slate-50 transition-colors text-slate-700 font-sans text-sm font-medium cursor-pointer"
        >
          <HelpCircle className="w-4 h-4 text-indigo-500" />
          {showSOMExplanation ? "Ocultar Explicação" : "O que é o Mapa de Comportamento?"}
        </button>
      </div>

      <AnimatePresence>
        {showSOMExplanation && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden bg-indigo-950 text-white rounded-2xl p-6 border border-indigo-900 space-y-4"
          >
            <div className="flex gap-2.5 items-center">
              <Activity className="text-emerald-400 w-5 h-5" />
              <h3 className="font-bold text-base font-sans">
                O que é o Mapa de Comportamento?
              </h3>
            </div>
            <p className="text-sm text-indigo-100 leading-relaxed font-sans">
              O <strong>Mapa de Comportamento</strong> funciona como uma redoma
              onde colocamos todos os clientes e deixamos que eles se alinhem de
              acordo com sua semelhança em um tabuleiro. Casas vizinhas
              representam clientes muito parecidos comercialmente. Casas vazias
              representam comportamentos que sua loja nunca teve.
            </p>
            <div className="text-xs bg-indigo-900/40 p-3 rounded-lg border border-indigo-800 font-sans">
              💡 <strong>Como usar o Mapa abaixo:</strong> Passe o mouse ou
              clique sobre qualquer quadrante colorido ativo do mapa para
              visualizar o raio-X detalhado do comportamento naquela célula!
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-2xl border border-slate-100 p-6 flex flex-col justify-between space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 font-sans flex items-center gap-2">
              🧭 Mapa de Calor do Tabuleiro Comportamental
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Visualização espacial do comportamento semelhante de compra. Passe
              o mouse ou clique nas células coloridas.
            </p>
          </div>

          <div className="flex flex-col items-center justify-center py-4">
            {(() => {
              const cols = data.somGrid.length > 0
                ? Math.max(...data.somGrid.map((n) => n.col)) + 1
                : 4;
              return (
                <div
                  className="grid gap-3.5 bg-slate-100 p-4 rounded-3xl border border-slate-200 shadow-inner w-full max-w-[340px] aspect-square"
                  style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
                >
                  {data.somGrid.map((neuron, index) => {
                    const isActive = neuron.count > 0;
                    const isSelected =
                      selectedNeuron?.row === neuron.row &&
                      selectedNeuron?.col === neuron.col;
                    return (
                      <motion.div
                        key={`som-${index}`}
                        onClick={() => {
                          if (isActive)
                            setSelectedNeuron(isSelected ? null : neuron);
                        }}
                        onMouseEnter={() => {
                          if (isActive) setHoveredNeuron(neuron);
                        }}
                        onMouseLeave={() => setHoveredNeuron(null)}
                        whileHover={isActive ? { scale: 1.1 } : {}}
                        className={`aspect-square rounded-xl flex flex-col items-center justify-center p-1 border font-sans text-center transition-all ${getNeuronBg(neuron)} ${isSelected ? "ring-2 ring-indigo-600 ring-offset-2" : ""}`}
                      >
                        <span className="text-[10px] font-semibold text-slate-400 font-mono block">
                          {neuron.row},{neuron.col}
                        </span>
                        {isActive ? (
                          <span className="text-xs font-bold block leading-none mt-1">
                            {neuron.count} ped.
                          </span>
                        ) : (
                          <span className="text-[9px] text-slate-300 block leading-none mt-1">
                            Vazio
                          </span>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 min-h-[90px] flex flex-col justify-center">
            {hoveredNeuron && hoveredNeuron.count > 0 ? (
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 font-mono block">
                  Examinando Célula [{hoveredNeuron.row}, {hoveredNeuron.col}]
                </span>
                <p className="text-xs text-slate-800 font-medium">
                  {hoveredNeuron.label}
                </p>
                <div className="flex flex-wrap gap-2 text-[10px]">
                  <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-100">
                    Cancel: {hoveredNeuron.cancelRate}%
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100">
                    Entrega: {hoveredNeuron.deliveryRate}%
                  </span>
                  <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                    Pico: {hoveredNeuron.peakHour}h · {hoveredNeuron.peakDay}
                  </span>
                </div>
                <span className="text-[11px] text-indigo-600 block font-semibold">
                  Ticket Médio: R${" "}
                  {hoveredNeuron.value.toLocaleString("pt-BR")} | Clique para
                  travar detalhes
                </span>
              </div>
            ) : selectedNeuron && selectedNeuron.count > 0 ? (
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-bold text-indigo-600 font-mono block">
                  📌 CÉLULA SELECIONADA [{selectedNeuron.row},{" "}
                  {selectedNeuron.col}]
                </span>
                <p className="text-xs text-slate-900 font-bold">
                  {selectedNeuron.label}
                </p>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div className="bg-white p-2 rounded-lg border border-slate-100">
                    <span className="text-slate-400 block">Cancelamento</span>
                    <span className="font-bold text-rose-600">
                      {selectedNeuron.cancelRate}%
                    </span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-100">
                    <span className="text-slate-400 block">Entrega</span>
                    <span className="font-bold text-emerald-600">
                      {selectedNeuron.deliveryRate}%
                    </span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-100">
                    <span className="text-slate-400 block">Hora de Pico</span>
                    <span className="font-bold text-slate-800">
                      {selectedNeuron.peakHour}h
                    </span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-100">
                    <span className="text-slate-400 block">Dia de Pico</span>
                    <span className="font-bold text-slate-800">
                      {selectedNeuron.peakDay}
                    </span>
                  </div>
                </div>
                {Object.keys(selectedNeuron.paymentMix).length > 0 && (
                  <div>
                    <span className="text-[10px] font-bold text-slate-600 block mb-1">
                      Mix de Pagamento
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(selectedNeuron.paymentMix).map(
                        ([method, pct]) => (
                          <span
                            key={method}
                            className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600"
                          >
                            {method}: {pct}%
                          </span>
                        ),
                      )}
                    </div>
                  </div>
                )}
                {selectedNeuron.topProducts.length > 0 && (
                  <div>
                    <span className="text-[10px] font-bold text-slate-600 block mb-1">
                      Top Produtos
                    </span>
                    {selectedNeuron.topProducts.map((p, idx) => (
                      <div
                        key={idx}
                        className="text-[10px] text-slate-600 flex justify-between"
                      >
                        <span className="truncate max-w-[120px]">{p.name}</span>
                        <span className="font-mono">{p.quantity} un.</span>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-[11px] text-slate-500 font-sans leading-tight">
                  Esta zona concentra{" "}
                  {totalOrders > 0
                    ? ((selectedNeuron.count / totalOrders) * 100).toFixed(1)
                    : 0}
                  % dos seus pedidos nessa microregião.
                </p>
              </div>
            ) : (
              <div className="text-center text-slate-400 text-xs py-2 font-sans italic">
                *Dica: Passe o mouse nos quadrantes ativos do tabuleiro acima
                para descriptografar os hábitos dos clientes vizinhos!
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-6 flex flex-col justify-between space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 font-sans flex items-center gap-2">
              🚨 Saúde Operacional dos Pedidos (Faturamento vs Estorno)
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Divisão atual do status físico dos pedidos no lote de faturamento
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <ChartContainer height={176}>
              <PieChart>
                  <Pie
                    data={data.statuses}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={4}
                    dataKey="count"
                  >
                    {data.statuses.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [`${value} pedidos`, "Volume"]}
                  />
              </PieChart>
            </ChartContainer>

            <div className="space-y-3">
              {data.statuses.map((entry, idx) => (
                <div key={`stat-${idx}`} className="flex items-start gap-2.5">
                  <span
                    className="w-3.5 h-3.5 rounded-full mt-0.5 flex-shrink-0"
                    style={{ backgroundColor: entry.color }}
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      {entry.name}: {entry.count} Pedido(s) (
                      {totalOrders > 0
                        ? ((entry.count / totalOrders) * 100).toFixed(1)
                        : 0}
                      %)
                    </span>
                    <p className="text-[11px] text-slate-400">
                      {entry.name.toLowerCase().includes("cancelado")
                        ? "Pedidos que prenderam estoque, mas faturamento caiu a zero por falta de pagamento."
                        : "Pedidos saudáveis, prontos para separação logística imediata."}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {canceledStatus && canceledStatus.count > 0 && (
            <div className="bg-rose-50 border border-rose-200/60 rounded-xl p-4 flex gap-3 text-red-800 text-xs">
              <ShieldAlert className="w-5 h-5 flex-shrink-0 text-rose-500 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold">
                  Efeito Casco Vazio no Centro de Distribuição:
                </span>
                <p className="leading-relaxed">
                  {canceledStatus.count} pedido(s) cancelado(s) geraram
                  separação inútil ou reserva indevida no estoque. Desativar
                  boleto sem confirmação prévia liberará produtividade da
                  embalagem física!
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-slate-400" />
            <div>
              <h3 className="text-sm font-bold text-slate-900 font-sans">
                Em que horário ocorrem as compras? (Volume por Hora)
              </h3>
              <p className="text-xs text-slate-400">
                Ponto de pico de transações brutas da loja
              </p>
            </div>
          </div>

          <ChartContainer height={208}>
            <BarChart
              data={data.operationalHours}
                margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#f8fafc"
                />
                <XAxis dataKey="hour" fontSize={10} stroke="#94a3b8" />
                <YAxis fontStyle="normal" stroke="#94a3b8" fontSize={10} />
                <Tooltip
                  formatter={(val) => [`${val} pedidos`, "Volume de Pedidos"]}
                  contentStyle={{
                    borderRadius: "10px",
                    fontSize: "11px",
                    borderColor: "#f1f5f9",
                  }}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
          </ChartContainer>
          <p className="text-xs text-slate-500 leading-relaxed italic text-center">
            🔥 Identifique o pico comercial — este é o melhor momento para
            enviar campanhas de SMS de recuperação!
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-slate-400" />
            <div>
              <h3 className="text-sm font-bold text-slate-900 font-sans">
                Concentração por Dia da Semana
              </h3>
              <p className="text-xs text-slate-400">
                Dias de maior faturamento gerado
              </p>
            </div>
          </div>

          <ChartContainer height={208}>
            <BarChart
              data={data.operationalDays}
                margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#f8fafc"
                />
                <XAxis dataKey="day" fontSize={10} stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" fontSize={10} />
                <Tooltip
                  formatter={(val) => [`${val} pedidos`, "Volume de Pedidos"]}
                  contentStyle={{
                    borderRadius: "10px",
                    fontSize: "11px",
                    borderColor: "#f1f5f9",
                  }}
                />
                <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]}>
                  {data.operationalDays.map((entry, idx) => (
                    <Cell
                      key={`cell-${idx}`}
                      fill={entry.count > 4 ? "#4f46e5" : "#94a3b8"}
                    />
                  ))}
                </Bar>
            </BarChart>
          </ChartContainer>
          <p className="text-xs text-slate-500 leading-relaxed italic text-center">
            📅 Concentrações de pedidos cancelados em dias específicos podem
            indicar automação de bots ou compras falsas.
          </p>
        </div>
      </div>
    </div>
  );
}
