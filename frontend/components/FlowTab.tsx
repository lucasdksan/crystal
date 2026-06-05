"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { DashboardData, SOMNeuron } from "@/frontend/types/dashboard";
import { HelpCircle, Activity } from "lucide-react";

interface FlowTabProps {
  data: DashboardData;
}

export function FlowTab({ data }: FlowTabProps) {
  const [hoveredNeuron, setHoveredNeuron] = useState<SOMNeuron | null>(null);
  const [selectedNeuron, setSelectedNeuron] = useState<SOMNeuron | null>(null);
  const [showSOMExplanation, setShowSOMExplanation] = useState(false);

  const totalClients = data.overview.totalClientes;

  const getNeuronBg = (neuron: SOMNeuron) => {
    if (neuron.count === 0) return "bg-slate-50 border-slate-100/60 text-slate-300";
    if (neuron.value > 3000)
      return "bg-pink-100 border-pink-300 text-pink-800 shadow-sm cursor-pointer hover:bg-pink-200";
    if (neuron.value > 2000)
      return "bg-emerald-100 border-emerald-300 text-emerald-800 shadow-sm cursor-pointer hover:bg-emerald-200";
    if (neuron.value > 1000)
      return "bg-amber-100 border-amber-300 text-amber-800 shadow-sm cursor-pointer hover:bg-amber-200";
    return "bg-blue-100 border-blue-300 text-blue-800 shadow-sm cursor-pointer hover:bg-blue-200";
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="bg-gradient-to-r from-indigo-50/50 to-slate-50 rounded-2xl p-6 border border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            Mapa SOM — Densidade de Clientes
          </h2>
          <p className="text-sm text-slate-600 max-w-2xl">
            Visualização espacial da distribuição de clientes por similaridade
            comportamental. SOM como ferramenta visual — a interpretação
            principal está nos segmentos de Customer Intelligence.
          </p>
        </div>
        <button
          onClick={() => setShowSOMExplanation(!showSOMExplanation)}
          className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-slate-200 shadow-xs hover:bg-slate-50 transition-colors text-slate-700 text-sm font-medium cursor-pointer"
        >
          <HelpCircle className="w-4 h-4 text-indigo-500" />
          {showSOMExplanation ? "Ocultar Explicação" : "O que é o Mapa SOM?"}
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
              <h3 className="font-bold text-base">Mapa de Calor SOM</h3>
            </div>
            <p className="text-sm text-indigo-100 leading-relaxed">
              O SOM posiciona clientes com perfis semelhantes em quadrantes
              vizinhos. Células coloridas indicam densidade de clientes e ticket
              médio. Use este mapa para explorar distribuição — os insights
              estratégicos estão nas abas de Segmentação, Churn e CLV.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-2xl border border-slate-100 p-6 flex flex-col justify-between space-y-6 max-w-lg mx-auto">
        <div>
          <h3 className="text-base font-bold text-slate-900">
            Mapa de Calor — Clientes
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            {totalClients} clientes mapeados · K={data.overview.totalClusters}
          </p>
        </div>

        <div className="flex flex-col items-center justify-center py-4">
          {(() => {
            const cols =
              data.somGrid.length > 0
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
                          {neuron.count} cli.
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
                Célula [{hoveredNeuron.row}, {hoveredNeuron.col}]
              </span>
              <p className="text-xs text-slate-800 font-medium">
                {hoveredNeuron.label}
              </p>
              <span className="text-[11px] text-indigo-600 block font-semibold">
                Ticket Médio: R${" "}
                {hoveredNeuron.value.toLocaleString("pt-BR")} ·{" "}
                {hoveredNeuron.revenueShare?.toFixed(1) ?? 0}% receita
              </span>
            </div>
          ) : selectedNeuron && selectedNeuron.count > 0 ? (
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-bold text-indigo-600 font-mono block">
                CÉLULA [{selectedNeuron.row}, {selectedNeuron.col}]
              </span>
              <p className="text-xs text-slate-900 font-bold">
                {selectedNeuron.label}
              </p>
              {Object.keys(selectedNeuron.paymentMix).length > 0 && (
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
              )}
            </div>
          ) : (
            <div className="text-center text-slate-400 text-xs py-2 italic">
              Passe o mouse nos quadrantes ativos para ver detalhes dos
              clientes.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
