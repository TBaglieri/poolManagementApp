"use client";

/**
 * Lazy chart wrappers — Recharts is heavy (~200kB), so we split it out of the
 * initial bundle. Pages that show charts render instantly with a skeleton and
 * hydrate the chart after, keeping navigation to Dashboard/Reports fast.
 */
import dynamic from "next/dynamic";

function ChartSkeleton({ height = 220 }: { height?: number }) {
  return (
    <div className="skeleton w-full rounded-xl" style={{ height }} aria-hidden />
  );
}

export const TrendArea = dynamic(() => import("./charts").then((m) => m.TrendArea), {
  ssr: false, loading: () => <ChartSkeleton height={240} />,
});
export const MultiLine = dynamic(() => import("./charts").then((m) => m.MultiLine), {
  ssr: false, loading: () => <ChartSkeleton height={240} />,
});
export const SimpleBar = dynamic(() => import("./charts").then((m) => m.SimpleBar), {
  ssr: false, loading: () => <ChartSkeleton height={240} />,
});
export const DonutChart = dynamic(() => import("./charts").then((m) => m.DonutChart), {
  ssr: false, loading: () => <ChartSkeleton height={200} />,
});
