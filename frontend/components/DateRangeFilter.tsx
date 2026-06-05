"use client";

import React from "react";
import { Calendar, Loader2 } from "lucide-react";
import {
  formatCalendarDatePtBr,
  getDefaultEndDate,
  getDefaultStartDate,
} from "@/frontend/lib/vtex-dates";

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
      className="w-full bg-white border border-slate-200 rounded-xl shadow-xs p-4"
      role="group"
      aria-label="Filtro de período VTEX"
    >
      <div className="flex flex-col lg:flex-row lg:items-end gap-4">
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500 lg:pb-2 lg:min-w-[140px]">
          <Calendar className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
          Período dos pedidos (VTEX)
        </div>

        <div className="flex flex-wrap items-end gap-3 flex-1">
          <label className="flex flex-col gap-1 text-[10px] font-semibold text-slate-500 min-w-[130px]">
            De
            <input
              type="date"
              value={startDate || getDefaultStartDate(30)}
              min={minDate}
              max={endDate || today}
              onChange={(e) => onStartDateChange(e.target.value)}
              disabled={isLoading}
              className="text-xs font-medium text-slate-800 border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:opacity-50 cursor-pointer w-full"
              aria-label="Data inicial"
            />
          </label>

          <label className="flex flex-col gap-1 text-[10px] font-semibold text-slate-500 min-w-[130px]">
            Até
            <input
              type="date"
              value={endDate || today}
              min={startDate || minDate}
              max={today}
              onChange={(e) => onEndDateChange(e.target.value)}
              disabled={isLoading}
              className="text-xs font-medium text-slate-800 border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:opacity-50 cursor-pointer w-full"
              aria-label="Data final"
            />
          </label>

          <button
            type="button"
            onClick={onApplyCustomRange}
            disabled={isLoading}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer min-h-[34px]"
          >
            {isLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : null}
            Aplicar
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5 lg:pb-0.5">
          <button
            type="button"
            onClick={onResetToFullBatch}
            disabled={isLoading}
            className={`px-2.5 py-1.5 text-[10px] font-semibold rounded-md border transition-colors cursor-pointer disabled:opacity-50 ${
              mode === "all"
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
            }`}
          >
            Lote completo
          </button>
          {([7, 30, 60, 90] as const).map((days) => (
            <button
              key={days}
              type="button"
              onClick={() => onQuickRange(days)}
              disabled={isLoading}
              className="px-2.5 py-1.5 text-[10px] font-semibold rounded-md border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
            >
              {days}d
            </button>
          ))}
        </div>
      </div>

      {mode === "custom" && startDate && endDate && (
        <p className="text-[10px] text-slate-500 font-medium mt-3 pt-3 border-t border-slate-100">
          Filtro ativo: {formatCalendarDatePtBr(startDate)} até{" "}
          {formatCalendarDatePtBr(endDate)}
        </p>
      )}

      <p className="text-[9px] text-slate-400 leading-snug mt-2">
        Usa o filtro oficial da API VTEX:{" "}
        <code className="text-slate-500">f_creationDate</code>
      </p>
    </div>
  );
}
