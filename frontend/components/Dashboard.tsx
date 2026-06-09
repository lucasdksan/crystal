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
import { buildHtmlReport } from "@/frontend/lib/report";
import { KPICard } from "@/frontend/components/KPICard";
import { ClustersTab } from "@/frontend/components/ClustersTab";
import { CustomerIntelligenceTab } from "@/frontend/components/CustomerIntelligenceTab";
import { ChurnRiskTab } from "@/frontend/components/ChurnRiskTab";
import { CLVTab } from "@/frontend/components/CLVTab";
import { ProductIntelligenceTab } from "@/frontend/components/ProductIntelligenceTab";
import { BCGMatrixTab } from "@/frontend/components/BCGMatrixTab";
import { InsightsAcoesTab } from "@/frontend/components/InsightsAcoesTab";
import { SalesFunnel } from "@/frontend/components/SalesFunnel";
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
  Download,
  Users,
  ShieldAlert,
  Crown,
  Package,
  Grid3X3,
} from "lucide-react";

interface DashboardProps {
  initialData: DashboardData;
}

type DashboardTab =
  | "geral"
  | "clientes"
  | "churn"
  | "clv"
  | "insights-acoes"
  | "produtos"
  | "bcg"
  | "mentor";

export function Dashboard({ initialData }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<DashboardTab>("geral");
  const [dashboardData, setDashboardData] =
    useState<DashboardData>(initialData);
  const [baselineData, setBaselineData] = useState<DashboardData>(initialData);
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

  const fetchAnalysisForRange = async (
    startDate: string,
    endDate: string,
    successLabel: string,
  ) => {
    setIsRefreshing(true);

    try {
      const result = await runAnalysis({
        startDate,
        endDate,
        perPage: 50,
      });

      if (result.success) {
        const mapped = mapAnalysisResultToDashboard(result.data);
        setDashboardData(mapped);
        setDateFilterMode("custom");
        showTemporarySuccess(
          `${successLabel} (${mapped.overview.totalPedidos} pedidos, ${mapped.overview.totalClientes} clientes)`,
        );
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
          if (parsed.overview && parsed.clusters) {
            setDashboardData(parsed);
            setBaselineData(parsed);
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
    setDateFilterMode("all");
    showTemporarySuccess("Dados restaurados para o relatório original.");
  };

  const isDataModified =
    dashboardData !== baselineData || dateFilterMode !== "all";

  const analysisKey = `${dashboardData.reportId}-${dashboardData.overview.totalPedidos}-${dashboardData.overview.totalClientes}`;

  const isCritical = dashboardData.overview.taxaCancelamento > 50;
  const healthState = getHealthState(
    dashboardData.overview.taxaCancelamento,
    false,
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
        "Relatório completo aberto! Use Ctrl+P (ou Cmd+P) para salvar como PDF.",
      );
    }
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };

  const tabs: Array<{ id: DashboardTab; label: string; icon: React.ReactNode }> = [
    { id: "geral", label: "Painel Executivo", icon: <Layers className="w-4 h-4" /> },
    { id: "clientes", label: "Segmentação", icon: <Users className="w-4 h-4" /> },
    { id: "churn", label: "Churn Risk", icon: <ShieldAlert className="w-4 h-4" /> },
    { id: "clv", label: "CLV", icon: <Crown className="w-4 h-4" /> },
    { id: "insights-acoes", label: "Insights e Ações", icon: <Lightbulb className="w-4 h-4" /> },
    { id: "produtos", label: "Produtos", icon: <Package className="w-4 h-4" /> },
    { id: "bcg", label: "Matriz BCG", icon: <Grid3X3 className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-[#fafbfe] text-slate-800 flex flex-col justify-between font-sans selection:bg-indigo-100 antialiased">
      {isCritical && (
        <div className="bg-gradient-to-r from-red-600 to-rose-600 text-white text-xs py-2 px-4 shadow-xs text-center font-semibold tracking-wide flex items-center justify-center gap-2">
          <AlertOctagon className="w-4 h-4 text-amber-300 animate-bounce flex-shrink-0" />
          <span>
            ALERTA: Taxa de cancelamento crítica (
            {dashboardData.overview.taxaCancelamento.toFixed(1)}%). Receita em
            risco: R${" "}
            {dashboardData.overview.receitaEmRisco.toLocaleString("pt-BR", {
              minimumFractionDigits: 2,
            })}
          </span>
        </div>
      )}

      <div className="flex-1 w-full max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        <header className="space-y-6 pb-6 border-b border-slate-100">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 bg-slate-100 border border-slate-200 text-slate-600 rounded-md">
                  Customer Intelligence Crystal v3.0
                </span>
                <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-amber-600 bg-amber-50 px-2 rounded border border-amber-100">
                  <Activity className="w-3 h-3 animate-pulse" /> Análise Ativa
                </span>
              </div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight font-sans">
                Inteligência de Clientes VTEX
              </h1>
              <p className="text-slate-500 text-sm max-w-xl font-sans">
                Segmente clientes, identifique risco de churn, estime LTV e
                descubra oportunidades de receita com impacto financeiro.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 p-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl shadow-xs cursor-pointer transition-colors"
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
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Limpar</span>
                </button>
              )}

              <button
                onClick={handleExportReport}
                className="flex items-center gap-2 p-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl shadow-xs cursor-pointer transition-colors"
              >
                <Download className="w-4 h-4 text-indigo-500" />
                <span>Exportar Relatório</span>
              </button>
            </div>
          </div>

          <div className="w-full">
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
            id="kpi-clv"
            title="CLV Total Estimado"
            value={`R$ ${dashboardData.overview.clvTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
            icon={<Crown className="w-5 h-5" />}
            badge="Projetado"
            badgeType="info"
            description="Valor futuro estimado da base de clientes."
          />
          <KPICard
            id="kpi-clients"
            title="Total de Clientes"
            value={String(dashboardData.overview.totalClientes)}
            icon={<Users className="w-5 h-5" />}
            badge={`${dashboardData.overview.totalClusters} segmentos`}
            badgeType="info"
            description="Clientes únicos identificados no período."
          />
          <KPICard
            id="kpi-risk"
            title="Receita em Risco"
            value={`R$ ${dashboardData.overview.receitaEmRisco.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
            icon={<ShieldAlert className="w-5 h-5" />}
            badge={dashboardData.overview.receitaEmRisco > 0 ? "Atenção" : "OK"}
            badgeType={dashboardData.overview.receitaEmRisco > 0 ? "warning" : "success"}
            description="Receita potencial em risco por churn crítico."
          />
          <KPICard
            id="kpi-revenue"
            title="Receita Total"
            value={`R$ ${dashboardData.overview.receitaTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
            icon={<DollarSign className="w-5 h-5" />}
            badge="Período"
            badgeType="info"
            description={`${dashboardData.overview.totalPedidos} pedidos analisados.`}
          />
        </section>

        <div className="flex border-b border-slate-200 bg-white p-2 rounded-2xl border border-slate-100 shadow-xs overflow-x-auto">
          <nav className="flex gap-1.5 min-w-max">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`p-2.5 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
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
                      Painel Executivo — Customer Intelligence
                    </span>
                    <h3 className="text-2xl font-black text-slate-950 tracking-tight">
                      {EXECUTIVE_TITLES[healthState]}
                    </h3>
                    <p className="text-sm text-slate-650 leading-relaxed">
                      {dashboardData.diagnostics.summary ||
                        `${dashboardData.overview.totalClientes} clientes em ${dashboardData.overview.totalClusters} segmentos. CLV total estimado: R$ ${dashboardData.overview.clvTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}.`}
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100/70 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-1">
                      <span className="text-xs text-slate-500">Segmentos</span>
                      <span className="block font-extrabold text-slate-900 font-mono text-sm">
                        {dashboardData.overview.totalClusters} clusters
                      </span>
                    </div>
                    <div className="space-y-1 md:border-x md:border-slate-200 md:px-6">
                      <span className="text-xs text-slate-500">Recuperável</span>
                      <span className="block font-extrabold text-emerald-600 font-mono text-sm">
                        R${" "}
                        {dashboardData.customerIntelligenceSummary.recoverableRevenue.toLocaleString(
                          "pt-BR",
                          { minimumFractionDigits: 2 },
                        )}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-slate-500">Incremental</span>
                      <span className="block font-extrabold text-indigo-600 font-mono text-sm">
                        R${" "}
                        {dashboardData.customerIntelligenceSummary.incrementalRevenue.toLocaleString(
                          "pt-BR",
                          { minimumFractionDigits: 2 },
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                    <button
                      onClick={() => setActiveTab("insights-acoes")}
                      className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs tracking-wide shadow-xs transition-colors cursor-pointer text-center"
                    >
                      Ver Insights e Ações
                    </button>
                    <button
                      onClick={() => setActiveTab("mentor")}
                      className="px-5 py-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold rounded-xl text-xs transition-colors cursor-pointer text-center"
                    >
                      Mentor IA Copilot
                    </button>
                  </div>
                </div>

                <div className="lg:col-span-4 bg-white border border-slate-100 rounded-3xl p-6 flex flex-col justify-between">
                  <div className="space-y-5">
                    <span className="text-[11px] font-bold font-mono text-indigo-600 block uppercase tracking-wide">
                      Plano de Ação Recomendado
                    </span>
                    <h4 className="text-base font-bold text-slate-900 leading-snug">
                      {ACTION_PLAN_HEADERS[healthState]}
                    </h4>
                    <div className="space-y-4 text-xs">
                      {ACTION_PLAN_ITEMS[healthState].map((item) => {
                        const colorClass =
                          actionPlanColorClasses[item.color] ??
                          actionPlanColorClasses.rose;
                        return (
                          <div key={item.num} className="flex gap-2.5 items-start">
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
                  <FileSpreadsheet className="w-5 h-5 text-indigo-500" />
                  <div>
                    <span className="text-xs font-bold text-slate-500 uppercase block">
                      Relatório Ativo
                    </span>
                    <span className="text-sm font-extrabold text-slate-800 block">
                      {dashboardData.reportId} ({dashboardData.reportDate})
                    </span>
                  </div>
                </div>
                <div className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  Ticket médio: R${" "}
                  {dashboardData.overview.ticketMedio.toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                  })}{" "}
                  · Taxa cancelamento:{" "}
                  {dashboardData.overview.taxaCancelamento.toFixed(1)}%
                </div>
              </div>

              <SalesFunnel data={dashboardData} />
            </div>
          )}

          {activeTab === "clientes" && (
            <>
              <CustomerIntelligenceTab key={analysisKey} data={dashboardData} />
              <div className="mt-8">
                <ClustersTab key={`${analysisKey}-clusters`} data={dashboardData} />
              </div>
            </>
          )}
          {activeTab === "churn" && (
            <ChurnRiskTab key={analysisKey} data={dashboardData} />
          )}
          {activeTab === "clv" && (
            <CLVTab key={analysisKey} data={dashboardData} />
          )}
          {activeTab === "insights-acoes" && (
            <InsightsAcoesTab key={analysisKey} data={dashboardData} />
          )}
          {activeTab === "produtos" && (
            <ProductIntelligenceTab key={analysisKey} data={dashboardData} />
          )}
          {activeTab === "bcg" && (
            <BCGMatrixTab key={analysisKey} data={dashboardData} />
          )}
          {activeTab === "mentor" && (
            <MentorChat key={analysisKey} data={dashboardData} />
          )}
        </main>
      </div>

      <footer className="bg-white border-t border-slate-100 py-6 mt-12 text-center text-xs text-slate-400">
        <p className="flex items-center justify-center gap-1.5 flex-wrap">
          <span>Customer Intelligence © 2026</span>
          <span className="text-slate-200">|</span>
          <span>Desenvolvido por Lucas da Silva Leoncio</span>
          <span className="text-slate-200">|</span>
          <span className="flex items-center gap-0.5">
            <Heart className="w-3 h-3 text-red-500 fill-red-500" /> para
            Gestores de E-commerce
          </span>
        </p>
      </footer>

      {activeTab !== "mentor" && (
        <button
          onClick={() => setActiveTab("mentor")}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-sm rounded-2xl shadow-xl px-5 py-3.5 transition-all cursor-pointer border border-indigo-500"
        >
          <Sparkles className="w-5 h-5 text-indigo-200 animate-pulse flex-shrink-0" />
          <span>Mentor IA</span>
        </button>
      )}
    </div>
  );
}
