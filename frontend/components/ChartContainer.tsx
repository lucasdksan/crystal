"use client";

import React, { useEffect, useRef, useState } from "react";
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const measure = () => {
      const { width, height: measuredHeight } = element.getBoundingClientRect();
      const nextWidth = Math.floor(width);
      const nextHeight = Math.floor(measuredHeight);

      if (nextWidth > 0 && nextHeight > 0) {
        setDimensions((prev) =>
          prev?.width === nextWidth && prev?.height === nextHeight
            ? prev
            : { width: nextWidth, height: nextHeight },
        );
      }
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(element);

    return () => observer.disconnect();
  }, [height]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full min-w-0 shrink-0 ${className}`}
      style={{ height }}
    >
      {dimensions ? (
        <ResponsiveContainer
          width={dimensions.width}
          height={dimensions.height}
          minWidth={0}
          minHeight={0}
        >
          {children}
        </ResponsiveContainer>
      ) : null}
    </div>
  );
}
