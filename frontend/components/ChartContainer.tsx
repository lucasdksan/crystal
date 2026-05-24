"use client";

import React, { useEffect, useState } from "react";
import { ResponsiveContainer } from "recharts";

interface ChartContainerProps {
  children: React.ReactElement;
  className?: string;
  height: number;
}

export function ChartContainer({
  children,
  className = "",
  height,
}: ChartContainerProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className={`w-full min-w-0 ${className}`}
        style={{ height }}
        aria-hidden
      />
    );
  }

  return (
    <div className={`w-full min-w-0 ${className}`} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        {children}
      </ResponsiveContainer>
    </div>
  );
}
