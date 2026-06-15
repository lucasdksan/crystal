"use client";

import React from "react";
import { Calendar, Loader2 } from "lucide-react";
import { getDefaultEndDate, getDefaultStartDate } from "@/frontend/lib/vtex-dates";

export type DateFilterMode = "all" | "custom";

interface DateRangeFilterProps {
  mode: DateFilterMode;
  startDate: string;
  endDate: string;
  isLoading: boolean;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onApplyCustomRange: () => void;
  onResetToFullBatch: () => void;
  onQuickRange: (days: number) => void;
}

const QUICK_RANGES = [7, 30, 60, 90] as const;

const dateInputClass =
  "text-xs font-medium text-slate-700 bg-transparent border-0 p-0 focus:outline-none focus:ring-0 disabled:opacity-50 cursor-pointer min-w-0 w-[7.5rem]";

export function DateRangeFilter({
  mode,
  startDate,
  endDate,
  isLoading,
  onStartDateChange,
  onEndDateChange,
  onApplyCustomRange,
  onResetToFullBatch,
  onQuickRange,
}: DateRangeFilterProps) {
  const today = getDefaultEndDate();
  const minDate = "2020-01-01";

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      role="group"
      aria-label="Filtro de período VTEX"
    >
      <div
        className={`flex items-center gap-1.5 p-1 pl-2 bg-white border rounded-xl transition-all ${
          mode === "custom"
            ? "border-indigo-200 ring-1 ring-indigo-100/80 shadow-xs"
            : "border-slate-200 shadow-xs"
        }`}
      >
        <span
          className="flex-shrink-0"
          title="Usa o filtro oficial da API VTEX: f_creationDate. Pedidos dos últimos 2 anos."
        >
          <Calendar className="w-4 h-4 text-slate-400" aria-hidden />
        </span>

        <label className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-slate-50 border border-slate-100">
          <span className="text-[10px] font-semibold text-slate-400 select-none">De</span>
          <input
            type="date"
            value={startDate || getDefaultStartDate(30)}
            min={minDate}
            max={endDate || today}
            onChange={(e) => onStartDateChange(e.target.value)}
            disabled={isLoading}
            className={dateInputClass}
            aria-label="Data inicial"
          />
        </label>

        <span className="text-slate-300 text-xs select-none" aria-hidden>
          →
        </span>

        <label className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-slate-50 border border-slate-100">
          <span className="text-[10px] font-semibold text-slate-400 select-none">Até</span>
          <input
            type="date"
            value={endDate || today}
            min={startDate || minDate}
            max={today}
            onChange={(e) => onEndDateChange(e.target.value)}
            disabled={isLoading}
            className={dateInputClass}
            aria-label="Data final"
          />
        </label>

        <button
          type="button"
          onClick={onApplyCustomRange}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          title="Busca pedidos na VTEX com f_creationDate no intervalo selecionado"
        >
          {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
          Aplicar
        </button>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onResetToFullBatch}
          disabled={isLoading}
          className={`px-2.5 py-1.5 text-xs font-semibold rounded-xl border transition-colors cursor-pointer disabled:opacity-50 ${
            mode === "all"
              ? "bg-slate-900 text-white border-slate-900"
              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
          }`}
        >
          Lote
        </button>
        {QUICK_RANGES.map((days) => (
          <button
            key={days}
            type="button"
            onClick={() => onQuickRange(days)}
            disabled={isLoading}
            className="px-2.5 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
          >
            {days}d
          </button>
        ))}
      </div>
    </div>
  );
}
