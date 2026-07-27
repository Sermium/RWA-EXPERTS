// src/components/PriceChart.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, LineSeries, CandlestickSeries } from 'lightweight-charts';

interface PriceChartProps {
  symbol: string;
  type: 'crypto' | 'security';
  tokenAddress?: string;
  currentPrice?: number | string;
  height?: number;
}

interface KlineData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

function generateFlatHistory(price: number | string, days: number = 7): KlineData[] {
  const priceNum = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(priceNum) || priceNum <= 0) return [];
  
  const now = Math.floor(Date.now() / 1000);
  const hourInSeconds = 3600;
  const dataPoints: KlineData[] = [];
  
  for (let i = days * 24; i >= 0; i--) {
    dataPoints.push({
      time: now - (i * hourInSeconds),
      open: priceNum,
      high: priceNum,
      low: priceNum,
      close: priceNum,
      volume: 0,
    });
  }
  
  return dataPoints;
}

export default function PriceChart({ symbol, type, tokenAddress, currentPrice, height = 300 }: PriceChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const [intervalState, setIntervalState] = useState('1h');
  const [chartType, setChartType] = useState<'candle' | 'line'>('line');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSimulated, setIsSimulated] = useState(false);

  const intervals = [
    { value: '1m', label: '1m' },
    { value: '5m', label: '5m' },
    { value: '15m', label: '15m' },
    { value: '1h', label: '1H' },
    { value: '4h', label: '4H' },
    { value: '1d', label: '1D' },
  ];

  useEffect(() => {
    if (!chartContainerRef.current) return;

    if (chartRef.current) {
      try { chartRef.current.remove(); } catch (e) { /* ignore */ }
      chartRef.current = null;
    }

    let isMounted = true;

    async function fetchAndRender() {
      setLoading(true);
      setError(null);
      setIsSimulated(false);

      try {
        let klines: KlineData[] = [];

        if (type === 'crypto') {
          const res = await fetch(`/api/exchange/mexc/klines?symbol=${symbol}&interval=${intervalState}&limit=100`);
          const data = await res.json();
          if (data.error) throw new Error(data.error);
          klines = data.klines || [];
        } else {
          try {
            const res = await fetch(`/api/exchange/security/pricehistory?tokenAddress=${tokenAddress}&interval=${intervalState}&limit=100`);
            const data = await res.json();
            if (data.klines && data.klines.length > 0) {
              klines = data.klines;
            }
          } catch (e) {
            // Will use simulated data
          }

          if (klines.length === 0 && currentPrice) {
            const priceNum = typeof currentPrice === 'string' ? parseFloat(currentPrice) : currentPrice;
            if (priceNum > 0) {
              klines = generateFlatHistory(priceNum);
              setIsSimulated(true);
            }
          }
        }

        if (!isMounted) return;

        if (klines.length === 0) {
          setError('No price data available');
          setLoading(false);
          return;
        }

        const sortedKlines = [...klines].sort((a, b) => a.time - b.time);
        const seenTimes = new Set<number>();
        const dedupedKlines = sortedKlines.filter((k) => {
          if (seenTimes.has(k.time)) return false;
          seenTimes.add(k.time);
          return true;
        });

        if (!chartContainerRef.current || !isMounted) return;

        const chart = createChart(chartContainerRef.current, {
          layout: {
            background: { type: ColorType.Solid, color: '#0d0d1a' },
            textColor: '#9ca3af',
          },
          grid: {
            vertLines: { color: '#1f2937' },
            horzLines: { color: '#1f2937' },
          },
          width: chartContainerRef.current.clientWidth,
          height: height,
          timeScale: {
            borderColor: '#374151',
            timeVisible: true,
            secondsVisible: false,
          },
          rightPriceScale: {
            borderColor: '#374151',
          },
        });

        chartRef.current = chart;

        const useCandles = chartType === 'candle' && !isSimulated;

        if (useCandles) {
          // v5 API: use addSeries with CandlestickSeries
          const series = chart.addSeries(CandlestickSeries, {
            upColor: '#22c55e',
            downColor: '#ef4444',
            borderUpColor: '#22c55e',
            borderDownColor: '#ef4444',
            wickUpColor: '#22c55e',
            wickDownColor: '#ef4444',
          });
          
          const candleData = dedupedKlines.map((k) => ({
            time: k.time as any,
            open: Number(k.open),
            high: Number(k.high),
            low: Number(k.low),
            close: Number(k.close),
          }));
          
          series.setData(candleData);
        } else {
          // v5 API: use addSeries with LineSeries
          const series = chart.addSeries(LineSeries, {
            color: type === 'crypto' ? '#3b82f6' : '#a855f7',
            lineWidth: 2,
          });
          
          const lineData = dedupedKlines.map((k) => ({
            time: k.time as any,
            value: Number(k.close),
          }));
          
          series.setData(lineData);
        }

        chart.timeScale().fitContent();
        setLoading(false);
      } catch (err) {
        console.error('Chart data error:', err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load chart');
          setLoading(false);
        }
      }
    }

    fetchAndRender();

    function handleResize() {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    }

    window.addEventListener('resize', handleResize);
    const refreshTimer = setInterval(function() {
      if (isMounted) fetchAndRender();
    }, 30000);

    return function() {
      isMounted = false;
      window.removeEventListener('resize', handleResize);
      clearInterval(refreshTimer);
      if (chartRef.current) {
        try { chartRef.current.remove(); } catch (e) { /* ignore */ }
        chartRef.current = null;
      }
    };
  }, [symbol, tokenAddress, type, intervalState, chartType, height, currentPrice]);

  return (
    <div className="bg-[#1a1a2e] rounded-xl border border-border overflow-hidden">
      <div className="flex items-center justify-between p-2 border-b border-border">
        <div className="flex items-center gap-1">
          {intervals.map((int) => (
            <button
              key={int.value}
              onClick={() => setIntervalState(int.value)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                intervalState === int.value
                  ? type === 'crypto'
                    ? 'bg-gold-600 text-ink'
                    : 'bg-gold-600 text-ink'
                  : 'text-ink-muted hover:text-ink hover:bg-white/5'
              }`}
            >
              {int.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {isSimulated && (
            <span className="px-2 py-0.5 text-[10px] bg-warning/20 text-warning rounded">
              Simulated
            </span>
          )}
          <div className="flex items-center gap-1">
            <button
              onClick={() => { if (!isSimulated) setChartType('candle'); }}
              disabled={isSimulated}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                chartType === 'candle' && !isSimulated
                  ? 'bg-surface-overlay text-ink'
                  : 'text-ink-muted hover:text-ink disabled:opacity-50'
              }`}
            >
              Candles
            </button>
            <button
              onClick={() => setChartType('line')}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                chartType === 'line' ? 'bg-surface-overlay text-ink' : 'text-ink-muted hover:text-ink'
              }`}
            >
              Line
            </button>
          </div>
        </div>
      </div>
      <div className="relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0d0d1a]/80 z-10">
            <div className="text-ink-muted text-sm">Loading chart...</div>
          </div>
        )}
        {error && !loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0d0d1a]/80 z-10">
            <div className="text-ink-faint text-sm">{error}</div>
          </div>
        )}
        <div ref={chartContainerRef} style={{ height: height }} />
      </div>
    </div>
  );
}
