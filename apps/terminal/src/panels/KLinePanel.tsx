import React, { useEffect, useMemo, useRef } from "react";
import { createChart, type IChartApi, type ISeriesApi, type UTCTimestamp } from "lightweight-charts";
import type { LxResponseMeta } from "../../common/ipc/dto";
import { TokenDialog } from "../components/TokenDialog";
import { useCandles, useQuote } from "../hooks/finance";
import { FinanceError } from "../services/finance";
import { useCountdown } from "../utils/useCountdown";

const PANEL_STYLE: React.CSSProperties = {
  borderRadius: 16,
  background: "rgba(15, 23, 42, 0.85)",
  border: "1px solid rgba(148, 163, 184, 0.2)",
  padding: 24,
  display: "flex",
  flexDirection: "column",
  gap: 16,
  color: "#e2e8f0",
  boxShadow: "0 24px 60px rgba(15, 23, 42, 0.45)",
  minHeight: 420,
};

const BADGE_STYLE: React.CSSProperties = {
  fontSize: 12,
  background: "rgba(148, 163, 184, 0.12)",
  color: "#cbd5f5",
  padding: "4px 8px",
  borderRadius: 999,
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
};

const SymbolConfig = {
  symbol: "600036",
  market: "CN" as const,
  timeframe: "1d" as const,
};

const formatNumber = (value: number, fraction = 2) =>
  new Intl.NumberFormat("zh-CN", {
    minimumFractionDigits: fraction,
    maximumFractionDigits: fraction,
  }).format(value);

const useDebugState = () => {
  if (!import.meta.env.DEV) return null;
  const params = new URLSearchParams(window.location.search);
  return params.get("lxState");
};

type MetaBadgesProps = {
  meta?: LxResponseMeta;
  ttlCountdown: number;
};

const MetaBadges: React.FC<MetaBadgesProps> = ({ meta, ttlCountdown }) => {
  if (!meta) return null;
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <span style={BADGE_STYLE}>缓存: {meta.cacheHit ? "命中" : "MISS"}</span>
      <span style={BADGE_STYLE}>来源: {meta.source}</span>
      <span style={BADGE_STYLE}>
        TTL: {meta.ttl > 0 ? `${Math.max(ttlCountdown, 0)}s` : "即时"}
      </span>
    </div>
  );
};

const LoadingState = () => (
  <div
    style={{
      display: "flex",
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      color: "#94a3b8",
    }}
  >
    正在加载 K 线数据…
  </div>
);

const EmptyState = () => (
  <div
    style={{
      display: "flex",
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      color: "#94a3b8",
    }}
  >
    暂无 K 线数据。
  </div>
);

const ErrorState = ({
  error,
  onRetry,
  countdown,
}: {
  error: FinanceError;
  onRetry: () => void;
  countdown: number;
}) => {
  if (error.category === "401") {
    return <TokenDialog onRefresh={onRetry} />;
  }

  const commonStyle: React.CSSProperties = {
    border: "1px solid rgba(248, 113, 113, 0.4)",
    background: "rgba(127, 29, 29, 0.35)",
    color: "#fecaca",
    padding: 16,
    borderRadius: 12,
    display: "flex",
    flexDirection: "column",
    gap: 12,
  };

  if (error.category === "429") {
    return (
      <div style={commonStyle}>
        <strong>触发频率限制</strong>
        <span style={{ fontSize: 14 }}>
          服务端提示稍后再试。请等待 {Math.max(countdown, 0)}s 后重新请求。
        </span>
        <button
          onClick={onRetry}
          disabled={countdown > 0}
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid rgba(248, 250, 252, 0.2)",
            background: countdown > 0 ? "rgba(30, 41, 59, 0.5)" : "rgba(15, 23, 42, 0.6)",
            color: countdown > 0 ? "#94a3b8" : "#f8fafc",
            cursor: countdown > 0 ? "not-allowed" : "pointer",
          }}
        >
          {countdown > 0 ? `等待 ${countdown}s` : "重新尝试"}
        </button>
      </div>
    );
  }

  const showRetryButton = ["NETWORK", "TIMEOUT", "UNKNOWN"].includes(error.category);

  return (
    <div style={commonStyle}>
      <strong>获取数据失败</strong>
      <span style={{ fontSize: 14 }}>
        {error.message}（错误码: {error.code || error.category}）
      </span>
      {showRetryButton && (
        <button
          onClick={onRetry}
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid rgba(248, 250, 252, 0.2)",
            background: "rgba(15, 23, 42, 0.6)",
            color: "#f8fafc",
            cursor: "pointer",
          }}
        >
          重试
        </button>
      )}
    </div>
  );
};

export default function KLinePanel() {
  const debugState = useDebugState();
  const debugRateLimitCountdown = useCountdown(debugState === "429" ? 30 : 0, [debugState]);
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const chartApiRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  const candleParams = useMemo(
    () => ({ symbol: SymbolConfig.symbol, market: SymbolConfig.market, timeframe: SymbolConfig.timeframe }),
    []
  );

  const candlesQuery = useCandles(candleParams);
  const quoteQuery = useQuote({ symbol: SymbolConfig.symbol, market: SymbolConfig.market }, { staleTime: 10_000 });

  const candlesMeta = candlesQuery.data?.meta;
  const ttlCountdown = useCountdown(candlesMeta?.ttl ?? 0, [candlesMeta?.receivedAt, candlesMeta?.ttl]);

  const errorMeta = candlesQuery.error instanceof FinanceError ? candlesQuery.error.meta : undefined;
  const errorMetaTtl = errorMeta?.ttl ?? 0;
  const rateLimitCountdown = useCountdown(errorMetaTtl, [errorMeta?.receivedAt, errorMetaTtl]);

  useEffect(() => {
    if (!chartContainerRef.current) return;
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 320,
      layout: {
        background: { color: "rgba(15,23,42,0.2)" },
        textColor: "#cbd5f5",
      },
      grid: {
        vertLines: { color: "rgba(148, 163, 184, 0.2)" },
        horzLines: { color: "rgba(148, 163, 184, 0.15)" },
      },
      crosshair: {
        mode: 1,
      },
      rightPriceScale: {
        borderColor: "rgba(148, 163, 184, 0.2)",
      },
      timeScale: {
        borderColor: "rgba(148, 163, 184, 0.2)",
        timeVisible: true,
      },
    });

    const series = chart.addCandlestickSeries({
      upColor: "#34d399",
      downColor: "#f87171",
      borderDownColor: "#f87171",
      borderUpColor: "#34d399",
      wickDownColor: "#f87171",
      wickUpColor: "#34d399",
    });

    chartApiRef.current = chart;
    candleSeriesRef.current = series;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === chartContainerRef.current) {
          chart.applyOptions({ width: entry.contentRect.width });
        }
      }
    });
    observer.observe(chartContainerRef.current);

    return () => {
      observer.disconnect();
      chart.remove();
    };
  }, []);

  useEffect(() => {
    if (!candleSeriesRef.current || !candlesQuery.data?.data.points) return;
    const dataset = candlesQuery.data.data.points.map((point) => ({
      time: (point.t / 1000) as UTCTimestamp,
      open: point.o,
      high: point.h,
      low: point.l,
      close: point.c,
    }));
    candleSeriesRef.current.setData(dataset);
    chartApiRef.current?.timeScale().fitContent();
  }, [candlesQuery.data?.data.points]);

  const renderDebug = () => {
    if (!debugState) return null;
    if (debugState === "401") {
      return <TokenDialog onRefresh={() => candlesQuery.refetch()} />;
    }
    if (debugState === "429") {
      return (
        <ErrorState
          error={new FinanceError("429", "Too Many Requests", "429", {
            cacheHit: false,
            ttl: 30,
            source: "mock",
            receivedAt: Date.now(),
          })}
          onRetry={() => candlesQuery.refetch()}
          countdown={debugRateLimitCountdown}
        />
      );
    }
    if (debugState === "network") {
      return (
        <ErrorState
          error={new FinanceError("NETWORK", "网络连接失败", "NETWORK")}
          onRetry={() => candlesQuery.refetch()}
          countdown={0}
        />
      );
    }
    return null;
  };

  if (debugState) {
    return <div style={PANEL_STYLE}>{renderDebug()}</div>;
  }

  if (candlesQuery.isLoading) {
    return (
      <div style={PANEL_STYLE}>
        <LoadingState />
      </div>
    );
  }

  if (candlesQuery.isError && candlesQuery.error instanceof FinanceError) {
    return (
      <div style={PANEL_STYLE}>
        <ErrorState error={candlesQuery.error} onRetry={() => candlesQuery.refetch()} countdown={rateLimitCountdown} />
      </div>
    );
  }

  const points = candlesQuery.data?.data.points ?? [];

  return (
    <div style={PANEL_STYLE}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ fontSize: 12, color: "#94a3b8", letterSpacing: 1 }}>K-LINE</div>
          <div style={{ fontSize: 20, fontWeight: 600 }}>
            {SymbolConfig.symbol}.SH · 日线
          </div>
          {quoteQuery.data?.data ? (
            <div style={{ fontSize: 14, color: "#cbd5f5" }}>
              最新价 {formatNumber(quoteQuery.data.data.price)}
              {typeof quoteQuery.data.data.changePct === "number" && (
                <span
                  style={{
                    marginLeft: 8,
                    color: (quoteQuery.data.data.changePct ?? 0) >= 0 ? "#34d399" : "#f87171",
                  }}
                >
                  {(quoteQuery.data.data.changePct ?? 0) >= 0 ? "▲" : "▼"}
                  {formatNumber((quoteQuery.data.data.changePct ?? 0) * 100, 2)}%
                </span>
              )}
            </div>
          ) : quoteQuery.isError ? (
            <div style={{ fontSize: 13, color: "#facc15" }}>报价暂不可用</div>
          ) : (
            <div style={{ fontSize: 13, color: "#94a3b8" }}>正在同步报价…</div>
          )}
        </div>
        <MetaBadges meta={candlesMeta} ttlCountdown={ttlCountdown} />
      </div>
      <div
        ref={chartContainerRef}
        style={{
          position: "relative",
          minHeight: 320,
          borderRadius: 12,
          overflow: "hidden",
        }}
      />
      {points.length === 0 ? <EmptyState /> : null}
      <div style={{ fontSize: 12, color: "#64748b" }}>
        数据源：Lixinger · 更新时间 {candlesMeta?.receivedAt ? new Date(candlesMeta.receivedAt).toLocaleString() : "--"}
      </div>
    </div>
  );
}
