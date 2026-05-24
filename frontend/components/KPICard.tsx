"use client";

import React from "react";
import { motion } from "motion/react";

interface KPICardProps {
  id: string;
  title: string;
  value: string | number;
  icon: React.ReactNode;
  badge?: string;
  badgeType?: "success" | "warning" | "error" | "info";
  description: string;
}

const getValueSizeClass = (val: string | number) => {
  const len = String(val).length;
  if (len <= 10) return "text-3xl";
  if (len <= 16) return "text-2xl";
  return "text-xl";
};

export function KPICard({
  id,
  title,
  value,
  icon,
  badge,
  badgeType = "info",
  description,
}: KPICardProps) {
  const getBadgeClass = () => {
    switch (badgeType) {
      case "success":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "warning":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "error":
        return "bg-rose-50 text-rose-700 border-rose-200";
      default:
        return "bg-blue-50 text-blue-700 border-blue-200";
    }
  };

  return (
    <motion.div
      id={id}
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between min-h-[140px]"
    >
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-bl-full -z-10" />

      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-slate-500 font-sans text-sm font-medium tracking-wide">
            {title}
          </span>
          <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-600 border border-slate-100">
            {icon}
          </div>
        </div>

        <div className="flex items-baseline gap-2 flex-wrap">
          <span className={`${getValueSizeClass(value)} font-sans font-bold text-slate-900 tracking-tight leading-tight wrap-break-word min-w-0`}>
            {value}
          </span>
          {badge && (
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${getBadgeClass()}`}
            >
              {badge}
            </span>
          )}
        </div>
      </div>

      <p className="text-xs text-slate-400 font-sans mt-3 border-t border-slate-50 pt-2 flex items-center gap-1.5">
        {description}
      </p>
    </motion.div>
  );
}
