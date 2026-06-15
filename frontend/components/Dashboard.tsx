"use client";

import React, { useState, useRef } from "react";
import type { DashboardData, DashboardTabId } from "@/frontend/types/dashboard";
import { runAnalysis } from "@/backend/actions/analysis";
import { mapAnalysisResultToDashboard } from "@/frontend/lib/mapper";
import { buildHtmlReport } from "@/frontend/lib/report";
import { ExecutiveSummaryTab } from "@/frontend/components/ExecutiveSummaryTab";
import { ClustersTab } from "@/frontend/components/ClustersTab";
import { RelationshipTab } from "@/frontend/components/RelationshipTab";
import { InventoryTab } from "@/frontend/components/InventoryTab";
import { AlertsTab } from "@/frontend/components/AlertsTab";
import { RisksTab } from "@/frontend/components/RisksTab";
import { OpportunitiesTab } from "@/frontend/components/OpportunitiesTab";
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
  Sparkles,
  RefreshCw,
  Upload,
  CheckCircle,
  AlertTriangle,
  Download,
  LayoutDashboard,
  Users,
  Heart,
  Package,
  Bell,
  Shield,
  Lightbulb,
  Activity,
  AlertOctagon,
} from "lucide-react";

interface DashboardProps {
  initialData: DashboardData;
}

const TABS: { id: DashboardTabId; label: string; icon: React.ReactNode }[] = [
  { id: "resumo", label: "Resumo Executivo", icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: "clientes", label: "Clientes", icon: <Users className="w-4 h-4" /> },
  { id: "relacionamento", label: "Relacionamento", icon: <Heart className="w-4 h-4" /> },
  { id: "estoque", label: "Estoque", icon: <Package className="w-4 h-4" /> },
  { id: "alertas", label: "Alertas", icon: <Bell className="w-4 h-4" /> },
  { id: "riscos", label: "Riscos", icon: <Shield className="w-4 h-4" /> },
  { id: "oportunidades", label: "Oportunidades", icon: <Lightbulb className="w-4 h-4" /> },
];

export function Dashboard({ initialData }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<DashboardTabId>("resumo");
  const [dashboardData, setDashboardData] = useState<DashboardData>(initialData);
  const [baselineData, setBaselineData] = useState<DashboardData>(initialData);
  const [dateFilterMode, setDateFilterMode] = useState<DateFilterMode>("all");
  const [startDateInput, setStartDateInput] = useState(() => getDefaultStartDate(30));
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
      const result = await runAnalysis({ startDate, endDate, perPage: 50 });
      if (result.success) {
        setDashboardData(mapAnalysisResultToDashboard(result.data));
        setBaselineData(mapAnalysisResultToDashboard(result.data));
        setDateFilterMode("custom");
        showTemporarySuccess(successLabel);
      } else {
        showTemporaryError(result.error);
      }
    } catch {
      showTemporaryError("Erro ao atualizar análise.");
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
    await fetchAnalysisForRange(
      calendarDateToVtexIso(startDateInput, "start"),
      calendarDateToVtexIso(endDateInput, "end"),
      `Análise atualizada — ${formatCalendarDatePtBr(startDateInput)} até ${formatCalendarDatePtBr(endDateInput)}.`,
    );
  };

  const handleQuickRange = async (days: number) => {
    const end = getDefaultEndDate();
    const start = getDefaultStartDate(days);
    setStartDateInput(start);
    setEndDateInput(end);
    const { startDate, endDate } = getQuickRangeDays(days);
    await fetchAnalysisForRange(startDate, endDate, `Análise atualizada — últimos ${days} dias.`);
  };

  const handleResetToFullBatch = () => {
    setDateFilterMode("all");
    setDashboardData(baselineData);
    showTemporarySuccess("Período restaurado para o lote completo.");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.overview && parsed.clusters) {
          setDashboardData(parsed);
          setBaselineData(parsed);
          setDateFilterMode("all");
          showTemporarySuccess(`Relatório '${file.name}' importado.`);
        } else {
          showTemporaryError("JSON não possui formato Crystal.");
        }
      } catch {
        showTemporaryError("Falha ao analisar o arquivo JSON.");
      }
    };
    reader.readAsText(file);
  };

  const handleResetData = () => {
    setDashboardData(initialData);
    setBaselineData(initialData);
    setDateFilterMode("all");
    showTemporarySuccess("Dados restaurados.");
  };

  const handleExportReport = () => {
    const html = buildHtmlReport(dashboardData);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank");
    if (!win) {
      showTemporaryError("Pop-up bloqueado.");
    } else {
      showTemporarySuccess("Relatório aberto. Use Ctrl+P para PDF.");
    }
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };

  const isDataModified =
    dashboardData !== baselineData || dateFilterMode !== "all";

  const isCritical = dashboardData.overview.taxaCancelamento > 50;
  const criticalAlerts = dashboardData.alerts.filter((a) => a.severity === "critical").length;

  return (
    <div className="min-h-screen bg-[#fafbfe] text-slate-800 flex flex-col font-sans antialiased">
      {isCritical && (
        <div className="bg-gradient-to-r from-red-600 to-rose-600 text-white text-xs py-2 px-4 text-center font-semibold flex items-center justify-center gap-2">
          <AlertOctagon className="w-4 h-4 animate-bounce flex-shrink-0" />
          <span>
            {dashboardData.overview.taxaCancelamento.toFixed(0)}% cancelados · Perda: R${" "}
            {dashboardData.overview.perdaEstimada.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </span>
        </div>
      )}

      <div className="flex-1 w-full max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 bg-slate-900 text-white rounded-md">
                Crystal v3
              </span>
              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 rounded border border-emerald-100">
                <Activity className="w-3 h-3 animate-pulse" />
                Health: {dashboardData.healthScore.overall}/100
              </span>
              {criticalAlerts > 0 && (
                <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 rounded border border-rose-100">
                  {criticalAlerts} alertas críticos
                </span>
              )}
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Inteligência Operacional VTEX
            </h1>
            <p className="text-slate-500 text-sm">
              {dashboardData.reportId} · {dashboardData.reportDate}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
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
              className="flex items-center gap-2 p-2 px-3 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              Importar
            </button>
            <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
            {isDataModified && (
              <button
                onClick={handleResetData}
                className="flex items-center gap-2 p-2 px-3 bg-slate-100 text-slate-600 text-xs font-semibold rounded-xl cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Limpar
              </button>
            )}
            <button
              onClick={handleExportReport}
              className="flex items-center gap-2 p-2 px-3 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Exportar
            </button>
          </div>
        </header>

        {successMessage && (
          <div className="bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800 p-3 rounded-xl text-xs flex gap-2 items-center">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            {successMessage}
          </div>
        )}
        {errorMessage && (
          <div className="bg-rose-50 border-l-4 border-rose-500 text-rose-800 p-3 rounded-xl text-xs flex gap-2 items-center">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {errorMessage}
          </div>
        )}

        <div className="flex border-b border-slate-200 bg-white p-1.5 rounded-2xl border border-slate-100 shadow-xs overflow-x-auto">
          <nav className="flex gap-1 min-w-max">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`p-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                }`}
              >
                {tab.icon}
                {tab.label}
                {tab.id === "alertas" && dashboardData.alerts.length > 0 && (
                  <span className="ml-1 bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                    {dashboardData.alerts.length}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        <main className="min-h-[450px]">
          {activeTab === "resumo" && (
            <ExecutiveSummaryTab
              data={dashboardData}
              onNavigate={(tab) => setActiveTab(tab as DashboardTabId)}
            />
          )}
          {activeTab === "clientes" && <ClustersTab data={dashboardData} />}
          {activeTab === "relacionamento" && <RelationshipTab data={dashboardData} />}
          {activeTab === "estoque" && <InventoryTab data={dashboardData} />}
          {activeTab === "alertas" && <AlertsTab data={dashboardData} />}
          {activeTab === "riscos" && <RisksTab data={dashboardData} />}
          {activeTab === "oportunidades" && <OpportunitiesTab data={dashboardData} />}
          {activeTab === "mentor" && <MentorChat data={dashboardData} />}
        </main>
      </div>

      {activeTab !== "mentor" && (
        <button
          onClick={() => setActiveTab("mentor")}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-2xl shadow-xl px-5 py-3.5 cursor-pointer"
        >
          <Sparkles className="w-5 h-5 animate-pulse" />
          Mentor IA
        </button>
      )}
    </div>
  );
}
