"use client";

import React, { useState, useRef } from "react";
import type { DashboardData } from "@/frontend/types/dashboard";
import { runAnalysis } from "@/backend/actions/analysis";
import { mapAnalysisResultToDashboard } from "@/frontend/lib/mapper";
import {
  ACTION_PLAN_FOOTNOTES,
  ACTION_PLAN_HEADERS,
  ACTION_PLAN_ITEMS,
  EXECUTIVE_TITLES,
  actionPlanColorClasses,
  getHealthState,
} from "@/frontend/lib/action-plan";
import { applyHealthySimulation } from "@/frontend/lib/simulation";
import { buildHtmlReport } from "@/frontend/lib/report";
import { KPICard } from "@/frontend/components/KPICard";
import { ClustersTab } from "@/frontend/components/ClustersTab";
import { FlowTab } from "@/frontend/components/FlowTab";
import { DiagnosticsTab } from "@/frontend/components/DiagnosticsTab";
import { AnomalyTab } from "@/frontend/components/AnomalyTab";
import { MentorChat } from "@/frontend/components/MentorChat";
import {
  DateRangeFilter,
  type DateFilterMode,
} from "@/frontend/components/DateRangeFilter";
import {
  calendarDateToVtexIso,
  formatCalendarDatePtBr,
  getDefaultEndDate,
  getDefaultStartDate,
  getQuickRangeDays,
  validateDateRange,
} from "@/frontend/lib/vtex-dates";
import {
  DollarSign,
  TrendingUp,
  ShoppingCart,
  AlertOctagon,
  Sparkles,
  RefreshCw,
  Upload,
  CheckCircle,
  AlertTriangle,
  Lightbulb,
  FileSpreadsheet,
  Layers,
  Activity,
  Heart,
  TrendingDown,
  Download,
} from "lucide-react";

interface DashboardProps {
  initialData: DashboardData;
}

export function Dashboard({ initialData }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<
    "geral" | "clientes" | "fluxo" | "anomalias" | "diagnósticos" | "mentor"
  >("geral");
  const [dashboardData, setDashboardData] =
    useState<DashboardData>(initialData);
  const [baselineData, setBaselineData] = useState<DashboardData>(initialData);
  const [isHealthySimulation, setIsHealthySimulation] = useState(false);
  const [dateFilterMode, setDateFilterMode] = useState<DateFilterMode>("all");
  const [startDateInput, setStartDateInput] = useState(() =>
    getDefaultStartDate(30),
  );
  const [endDateInput, setEndDateInput] = useState(() => getDefaultEndDate());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showTemporarySuccess = (msg: string) => {
    setSuccessMessage(msg);
    setErrorMessage(null);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const showTemporaryError = (msg: string) => {
    setErrorMessage(msg);
    setSuccessMessage(null);
    setTimeout(() => setErrorMessage(null), 4500);
  };

  const handleToggleSimulation = () => {
    if (!isHealthySimulation) {
      setDashboardData((prev) => applyHealthySimulation(prev));
      setIsHealthySimulation(true);
      showTemporarySuccess(
        "Cenário ilustrativo ativado — dados fictícios para demonstração.",
      );
    } else {
      setDashboardData(baselineData);
      setIsHealthySimulation(false);
      showTemporarySuccess("Voltando para os dados reais registrados.");
    }
  };

  const fetchAnalysisForRange = async (
    startDate: string,
    endDate: string,
    successLabel: string,
  ) => {
    setIsRefreshing(true);
    setIsHealthySimulation(false);

    try {
      const result = await runAnalysis({
        startDate,
        endDate,
        perPage: 50,
      });

      if (result.success) {
        setDashboardData(mapAnalysisResultToDashboard(result.data));
        setDateFilterMode("custom");
        showTemporarySuccess(successLabel);
      } else {
        showTemporaryError(result.error);
      }
    } catch {
      showTemporaryError("Erro ao atualizar análise para o período selecionado.");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleApplyCustomRange = async () => {
    const validationError = validateDateRange(startDateInput, endDateInput);
    if (validationError) {
      showTemporaryError(validationError);
      return;
    }

    const startDate = calendarDateToVtexIso(startDateInput, "start");
    const endDate = calendarDateToVtexIso(endDateInput, "end");

    await fetchAnalysisForRange(
      startDate,
      endDate,
      `Análise atualizada — ${formatCalendarDatePtBr(startDateInput)} até ${formatCalendarDatePtBr(endDateInput)}.`,
    );
  };

  const handleQuickRange = async (days: number) => {
    const end = getDefaultEndDate();
    const start = getDefaultStartDate(days);
    setStartDateInput(start);
    setEndDateInput(end);

    const { startDate, endDate } = getQuickRangeDays(days);
    await fetchAnalysisForRange(
      startDate,
      endDate,
      `Análise atualizada — últimos ${days} dias.`,
    );
  };

  const handleResetToFullBatch = () => {
    setDateFilterMode("all");
    setDashboardData(baselineData);
    setIsHealthySimulation(false);
    showTemporarySuccess("Período restaurado para o lote completo (SSR).");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (file.name.endsWith(".json")) {
          const parsed = JSON.parse(text);
          if (parsed.overview && parsed.clusters && parsed.centroids) {
            setDashboardData(parsed);
            setBaselineData(parsed);
            setIsHealthySimulation(false);
            setDateFilterMode("all");
            showTemporarySuccess(
              `Sucesso! Relatório '${file.name}' importado com êxito!`,
            );
          } else {
            showTemporaryError(
              "O JSON importado não possui o formato de relatório Crystal.",
            );
          }
        } else {
          showTemporaryError(
            "No momento, aceitamos apenas arquivos .json estruturados.",
          );
        }
      } catch {
        showTemporaryError(
          "Falha ao analisar o arquivo. Verifique se a formatação JSON está íntegra.",
        );
      }
    };
    reader.readAsText(file);
  };

  const handleResetData = () => {
    setDashboardData(initialData);
    setBaselineData(initialData);
    setIsHealthySimulation(false);
    setDateFilterMode("all");
    showTemporarySuccess("Dados restaurados para o relatório original.");
  };

  const isDataModified =
    dashboardData !== baselineData ||
    isHealthySimulation ||
    dateFilterMode !== "all";

  const isCritical = dashboardData.overview.taxaCancelamento > 50;
  const healthState = getHealthState(
    dashboardData.overview.taxaCancelamento,
    isHealthySimulation,
  );

  const handleExportReport = () => {
    const html = buildHtmlReport(dashboardData);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank");
    if (!win) {
      showTemporaryError(
        "Pop-up bloqueado. Permita pop-ups neste site para exportar o relatório.",
      );
    } else {
      showTemporarySuccess(
        "Relatório aberto! Use Ctrl+P (ou Cmd+P) para salvar como PDF.",
      );
    }
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };

  return (
    <div className="min-h-screen bg-[#fafbfe] text-slate-800 flex flex-col justify-between font-sans selection:bg-indigo-100 antialiased">
      {isCritical && !isHealthySimulation && (
        <div className="bg-gradient-to-r from-red-600 to-rose-600 text-white text-xs py-2 px-4 shadow-xs text-center font-semibold tracking-wide flex items-center justify-center gap-2">
          <AlertOctagon className="w-4 h-4 text-amber-300 animate-bounce flex-shrink-0" />
          <span>
            ALERTA DE SEGURANÇA COMERCIAL: Sua Taxa de Cancelamento atual é
            extremamente crítica ({dashboardData.overview.taxaCancelamento.toFixed(1)}%). Apenas{" "}
            {Math.round(
              dashboardData.overview.totalPedidos *
                (dashboardData.overview.taxaEntrega / 100),
            )}{" "}
            de {dashboardData.overview.totalPedidos} pedidos geraram faturamento
            físico saudável.
          </span>
          <button
            onClick={handleToggleSimulation}
            className="ml-4 bg-white/20 hover:bg-white/30 text-white font-bold p-1 px-2.5 rounded-md transition-colors border border-white/20 uppercase text-[9px]"
            title="Ativa cenário ilustrativo com dados fictícios — não é predição real"
          >
            Ver Cenário Ilustrativo
          </button>
        </div>
      )}

      <div className="flex-1 w-full max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 bg-slate-100 border border-slate-200 text-slate-600 rounded-md">
                Auditoria de Negócios Crystal v2.1
              </span>
              <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-amber-600 bg-amber-50 px-2 rounded border border-amber-100">
                <Activity className="w-3 h-3 animate-pulse" /> Auditor Líder
                Ativo
              </span>
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight font-sans">
              Análise de Vendas Simplificada
            </h1>
            <p className="text-slate-500 text-sm max-w-xl font-sans">
              Segmente clientes, descubra gargalos, identifique fraudes
              operacionais e converse diretamente com seu Mentor IA em
              português.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <DateRangeFilter
              mode={dateFilterMode}
              startDate={startDateInput}
              endDate={endDateInput}
              isLoading={isRefreshing}
              onStartDateChange={setStartDateInput}
              onEndDateChange={setEndDateInput}
              onApplyCustomRange={handleApplyCustomRange}
              onResetToFullBatch={handleResetToFullBatch}
              onQuickRange={handleQuickRange}
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 p-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl shadow-xs cursor-pointer transition-colors"
              title="Importar um lote de transações em JSON personalizado"
            >
              <Upload className="w-4 h-4 text-slate-500" />
              <span>Importar Lote JSON</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
            />

            {isDataModified && (
              <button
                onClick={handleResetData}
                className="flex items-center gap-2 p-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                title="Restaurar relatório padrão"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Limpar</span>
              </button>
            )}

            <button
              onClick={handleToggleSimulation}
              className={`flex items-center gap-2 p-2.5 px-4 text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer ${
                isHealthySimulation
                  ? "bg-slate-900 text-white border border-slate-950 hover:bg-slate-800"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-700"
              }`}
              title="Exibe dados fictícios de demonstração — não é predição real nem meta garantida"
            >
              <Sparkles className="w-4 h-4 text-emerald-300 animate-pulse" />
              <span>
                {isHealthySimulation
                  ? "Sair do Cenário Ilustrativo"
                  : "Cenário Ilustrativo 15%"}
              </span>
            </button>

            <button
              onClick={handleExportReport}
              className="flex items-center gap-2 p-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl shadow-xs cursor-pointer transition-colors"
              title="Exportar relatório resumido para o cliente"
            >
              <Download className="w-4 h-4 text-indigo-500" />
              <span>Exportar Relatório</span>
            </button>
          </div>
        </header>

        {successMessage && (
          <div className="bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800 p-4 rounded-xl text-xs flex gap-2 items-center animate-pulse">
            <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
            <span className="font-semibold">{successMessage}</span>
          </div>
        )}
        {errorMessage && (
          <div className="bg-rose-50 border-l-4 border-rose-500 text-rose-800 p-4 rounded-xl text-xs flex gap-2 items-center">
            <AlertTriangle className="w-5 h-5 text-rose-500 flex-shrink-0" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
        )}

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            id="kpi-gross"
            title="Valor Faturamento Bruto"
            value={`R$ ${dashboardData.overview.receitaTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
            icon={<DollarSign className="w-5 h-5" />}
            badge="Calculado"
            badgeType="info"
            description="Faturamento virtual de todos os pedidos gerados no lote."
          />
          <KPICard
            id="kpi-ticket"
            title="Ticket Médio"
            value={`R$ ${dashboardData.overview.ticketMedio.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
            icon={<TrendingUp className="w-5 h-5" />}
            badge="Mediano"
            badgeType="info"
            description="Média de gasto por carrinho cadastrado."
          />
          <KPICard
            id="kpi-cancellation"
            title="Taxa de Cancelamento"
            value={`${dashboardData.overview.taxaCancelamento.toFixed(1)}%`}
            icon={<AlertOctagon className="w-5 h-5" />}
            badge={isCritical ? "Crítico!" : "Saudável!"}
            badgeType={isCritical ? "error" : "success"}
            description={
              isCritical
                ? "Perda massiva de faturamento líquido."
                : "Excelente nível de conversão comercial!"
            }
          />
          <KPICard
            id="kpi-efficiency"
            title="Pedidos Concluídos (Entrega)"
            value={`${dashboardData.overview.taxaEntrega.toFixed(1)}%`}
            icon={<ShoppingCart className="w-5 h-5" />}
            badge={
              dashboardData.overview.taxaEntrega > 30 ? "Eficiente" : "Inativo"
            }
            badgeType={
              dashboardData.overview.taxaEntrega > 30 ? "success" : "warning"
            }
            description="Pedidos despachados físicos e faturados e-commerce."
          />
        </section>

        <div className="flex border-b border-slate-200 bg-white p-2 rounded-2xl border border-slate-100 shadow-xs">
          <nav className="flex flex-wrap gap-1.5 w-full">
            {(
              [
                { id: "geral", label: "Painel Executivo", icon: <Layers className="w-4 h-4" /> },
                { id: "clientes", label: "Segmentação de Clientes", icon: <FileSpreadsheet className="w-4 h-4" /> },
                { id: "fluxo", label: "Rotas Comportamentais & Operação", icon: <Activity className="w-4 h-4" /> },
                { id: "anomalias", label: "Perdas Identificadas", icon: <TrendingDown className="w-4 h-4" /> },
                { id: "diagnósticos", label: "Estratégias Comerciais", icon: <Lightbulb className="w-4 h-4" /> },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`p-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all font-sans cursor-pointer flex items-center gap-2 ${
                  activeTab === tab.id
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <main className="min-h-[450px]">
          {activeTab === "geral" && (
            <div className="space-y-8 animate-fade-in">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                <div className="lg:col-span-8 bg-white border border-slate-100 rounded-3xl p-6 md:p-8 flex flex-col justify-between space-y-6">
                  <div className="space-y-4">
                    <span className="text-[11px] font-bold font-mono text-slate-400 tracking-wider block uppercase">
                      Auditor Comercial - Diagnóstico Inicial
                    </span>
                    <h3 className="text-2xl font-black text-slate-950 font-sans tracking-tight">
                      {EXECUTIVE_TITLES[healthState]}
                    </h3>
                    <p className="text-sm text-slate-650 font-sans leading-relaxed">
                      {dashboardData.diagnostics.summary ||
                        `Com ${dashboardData.overview.totalPedidos} pedidos analisados e uma taxa de cancelamento de ${dashboardData.overview.taxaCancelamento.toFixed(1)}%, identificamos ${dashboardData.overview.totalClusters} perfis distintos de comportamento de compra.`}
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100/70 grid grid-cols-1 md:grid-cols-3 gap-6 font-sans">
                    <div className="space-y-1 min-w-0">
                      <span className="text-xs text-slate-500">
                        Grupos de Clientes:
                      </span>
                      <span className="block font-extrabold text-slate-900 font-mono text-sm wrap-break-word min-w-0">
                        {dashboardData.overview.totalClusters} clusters
                        identificados
                      </span>
                      <span className="text-[11px] text-slate-450 block">
                        Comportamentos distintos de compra mapeados.
                      </span>
                    </div>
                    <div className="space-y-1 min-w-0 md:border-x md:border-slate-200 md:px-6">
                      <span className="text-xs text-slate-500">
                        Faturamento Real Líquido:
                      </span>
                      <span className="block font-extrabold text-emerald-600 font-mono text-sm wrap-break-word min-w-0">
                        R${" "}
                        {(
                          dashboardData.overview.receitaTotal *
                          (1 - dashboardData.overview.taxaCancelamento / 100)
                        ).toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                      <span className="text-[11px] text-slate-450 block">
                        Dinheiro de caixa verdadeiro que entrou na conta.
                      </span>
                    </div>
                    <div className="space-y-1 min-w-0">
                      <span className="text-xs text-slate-500">
                        Perda de Estoque Travado:
                      </span>
                      <span className="block font-extrabold text-rose-500 font-mono text-sm wrap-break-word min-w-0">
                        R${" "}
                        {(
                          dashboardData.overview.receitaTotal *
                          (dashboardData.overview.taxaCancelamento / 100)
                        ).toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                      <span className="text-[11px] text-slate-450 block">
                        Valor preso em carrinhos cancelados.
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                    <button
                      onClick={() => setActiveTab("mentor")}
                      className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs font-sans tracking-wide shadow-xs transition-colors cursor-pointer text-center"
                    >
                      Bate-papo com Copilot IA de Vendas
                    </button>
                    <button
                      onClick={() => setActiveTab("diagnósticos")}
                      className="px-5 py-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold rounded-xl text-xs font-sans transition-colors cursor-pointer text-center"
                    >
                      Ver Estratégias Comerciais
                    </button>
                  </div>
                </div>

                <div className="lg:col-span-4 bg-white border border-slate-100 rounded-3xl p-6 flex flex-col justify-between">
                  <div className="space-y-5">
                    <span className="text-[11px] font-bold font-mono text-indigo-600 block uppercase tracking-wide">
                      📋 Plano de Ação Recomendado
                    </span>
                    <h4 className="text-base font-bold text-slate-900 leading-snug">
                      {ACTION_PLAN_HEADERS[healthState]}
                    </h4>

                    <div className="space-y-4 text-xs font-sans">
                      {ACTION_PLAN_ITEMS[healthState].map((item) => {
                        const colorClass =
                          actionPlanColorClasses[item.color] ??
                          actionPlanColorClasses.rose;

                        return (
                          <div
                            key={item.num}
                            className="flex gap-2.5 items-start"
                          >
                            <div
                              className={`h-5 w-5 ${colorClass.bg} border ${colorClass.border} rounded-md flex items-center justify-center ${colorClass.text} font-bold font-mono`}
                            >
                              {item.num}
                            </div>
                            <div>
                              <span className="font-bold text-slate-800 block">
                                {item.title}
                              </span>
                              <span className="text-slate-500">{item.desc}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100/80 text-[10px] text-slate-500 mt-4 font-mono leading-relaxed">
                    {ACTION_PLAN_FOOTNOTES[healthState]}
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-100 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex gap-3 items-center">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-650">
                    <FileSpreadsheet className="w-5 h-5 text-indigo-500" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-500 uppercase font-mono block">
                      Dados de Lote Ativos:
                    </span>
                    <span className="text-sm font-extrabold text-slate-800 font-sans block">
                      Relatório: {dashboardData.reportId} (
                      {dashboardData.reportDate})
                    </span>
                  </div>
                </div>
                <div className="text-xs text-slate-500 font-sans bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  🧬 <strong>Lojista Independente:</strong> Use o botão
                  &quot;Importar Lote JSON&quot; acima para subir planilhas exportadas das
                  suas vendas e obter gráficos de segmentação instantâneos!
                </div>
              </div>
            </div>
          )}

          {activeTab === "clientes" && (
            <ClustersTab data={dashboardData} />
          )}
          {activeTab === "fluxo" && <FlowTab data={dashboardData} />}
          {activeTab === "anomalias" && (
            <AnomalyTab data={dashboardData} />
          )}
          {activeTab === "diagnósticos" && (
            <DiagnosticsTab data={dashboardData} />
          )}
          {activeTab === "mentor" && <MentorChat data={dashboardData} />}
        </main>
      </div>

      <footer className="bg-white border-t border-slate-100 py-6 mt-12 text-center text-xs text-slate-400 font-sans">
        <p className="flex items-center justify-center gap-1.5">
          <span>Análise de Vendas Inteligente © 2026</span>
          <span className="text-slate-200">|</span>
          <span>Desenvolvido por Lucas da Silva Leoncio</span>
          <span className="text-slate-200">|</span>
          <span className="flex items-center gap-0.5">
            <Heart className="w-3 h-3 text-red-500 fill-red-500" /> para
            Líderes Logísticos
          </span>
        </p>
      </footer>

      {activeTab !== "mentor" && (
        <button
          onClick={() => setActiveTab("mentor")}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-sm rounded-2xl shadow-xl px-5 py-3.5 transition-all cursor-pointer border border-indigo-500"
          title="Abrir Mentor IA Copilot"
        >
          <Sparkles className="w-5 h-5 text-indigo-200 animate-pulse flex-shrink-0" />
          <span>Mentor IA</span>
        </button>
      )}
    </div>
  );
}
