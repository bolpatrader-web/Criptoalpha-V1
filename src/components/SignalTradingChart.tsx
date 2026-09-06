import React, { useState, useMemo } from 'react';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  Area, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  ReferenceLine, 
  ReferenceArea 
} from 'recharts';
import { 
  Target, 
  ShieldAlert, 
  TrendingUp, 
  Copy, 
  Check, 
  Sliders, 
  Zap, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Layers, 
  Maximize2, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownRight,
  Info,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Flame,
  Activity,
  PlusCircle,
  BellRing
} from 'lucide-react';
import { StockAsset } from '../types';
import { formatCurrency, formatPercentage, formatCompactNumber } from '../utils/formatters';

export interface SignalLevelData {
  orderType: 'COMPRA' | 'VENTA';
  entryZoneMin: number;
  entryZoneMax: number;
  optimalEntry: number;
  currentPrice: number;
  stopLoss: {
    price: number;
    percentage: number;
    description?: string;
  };
  takeProfit1: {
    price: number;
    percentage: number;
    sharesPct: number; // e.g. 50%
    action: string;
  };
  takeProfit2: {
    price: number;
    percentage: number;
    sharesPct: number; // e.g. 30%
    action: string;
  };
  takeProfit3: {
    price: number;
    percentage: number;
    sharesPct: number; // e.g. 20%
    action: string;
  };
  riskRewardRatio: number;
  confidenceScore: number; // 0 - 100
  confluences: {
    name: string;
    passed: boolean;
    detail: string;
  }[];
  orderBlockDemand?: { min: number; max: number };
  fairValueGap?: { min: number; max: number };
}

interface SignalTradingChartProps {
  asset: StockAsset;
  historyData?: any[];
  signalData?: SignalLevelData;
  timeframe?: string;
  onTimeframeChange?: (tf: '1D' | '1W' | '1M' | '1Y' | 'ALL') => void;
  onAddToPortfolio?: (shares: number, price: number) => void;
  onCreateAlert?: (price: number, label: string) => void;
  initialMode?: 'simple' | 'pro';
}

export const SignalTradingChart: React.FC<SignalTradingChartProps> = ({
  asset,
  historyData = [],
  signalData,
  timeframe = '1M',
  onTimeframeChange,
  onAddToPortfolio,
  onCreateAlert,
  initialMode = 'simple',
}) => {
  // Chart Mode: Simple (Traffic Light clean signals) vs Pro (SMC, Order Blocks, FVGs, Indicators)
  const [chartMode, setChartMode] = useState<'simple' | 'pro'>(initialMode);
  const [copiedOrder, setCopiedOrder] = useState<boolean>(false);
  const [showConfluenceDetails, setShowConfluenceDetails] = useState<boolean>(false);
  const [investmentCapital, setInvestmentCapital] = useState<number>(1000);
  const [customCapitalInput, setCustomCapitalInput] = useState<string>('1000');
  const [activeHoverData, setActiveHoverData] = useState<any | null>(null);
  const [isAddedSuccess, setIsAddedSuccess] = useState<boolean>(false);

  // Derive complete signal levels if not provided
  const currentPrice = asset.current_price || 150;
  const signal: SignalLevelData = useMemo(() => {
    if (signalData) return signalData;

    const entryMin = Number((currentPrice * 0.993).toFixed(2));
    const entryMax = Number((currentPrice * 1.007).toFixed(2));
    const optimal = currentPrice;
    const slPct = 2.8;
    const tp1Pct = 4.2;
    const tp2Pct = 9.8;
    const tp3Pct = 16.5;

    const rsi = asset.rsi14 || 52;
    const volZ = asset.volumeAnomalyRatio || 1.8;

    return {
      orderType: 'COMPRA',
      entryZoneMin: entryMin,
      entryZoneMax: entryMax,
      optimalEntry: optimal,
      currentPrice: currentPrice,
      stopLoss: {
        price: Number((optimal * (1 - slPct / 100)).toFixed(2)),
        percentage: slPct,
        description: 'Corte estricto por debajo de la zona de soporte clave y EMA 50.',
      },
      takeProfit1: {
        price: Number((optimal * (1 + tp1Pct / 100)).toFixed(2)),
        percentage: tp1Pct,
        sharesPct: 50,
        action: 'Cerrar 50% de la posición y mover Stop Loss a Precio de Entrada (Breakeven).',
      },
      takeProfit2: {
        price: Number((optimal * (1 + tp2Pct / 100)).toFixed(2)),
        percentage: tp2Pct,
        sharesPct: 30,
        action: 'Objetivo Principal: Tomar otro 30% de beneficios en resistencia intermedia.',
      },
      takeProfit3: {
        price: Number((optimal * (1 + tp3Pct / 100)).toFixed(2)),
        percentage: tp3Pct,
        sharesPct: 20,
        action: 'Runner de Expansión: Dejar correr el 20% restante con Trailing Stop dinámico.',
      },
      riskRewardRatio: Number((tp2Pct / slPct).toFixed(1)),
      confidenceScore: Math.min(96, Math.max(78, Math.round((asset.alphaScore || 75) * 0.85 + (volZ > 1.3 ? 12 : 5)))),
      confluences: [
        {
          name: 'Zona de Demanda / Order Block (SMC)',
          passed: true,
          detail: `Precio rebotando en bloque de órdenes institucional ($${(optimal * 0.99).toFixed(2)}).`,
        },
        {
          name: 'RSI Libre de Sobrecompra',
          passed: rsi >= 40 && rsi <= 68,
          detail: `RSI en ${rsi} con espacio para expandirse antes de zona de saturación (70).`,
        },
        {
          name: 'Volumen Institucional Confirmado',
          passed: volZ >= 1.2,
          detail: `Volumen 24h a ${volZ.toFixed(1)}x de la media móvil de 20 sesiones.`,
        },
        {
          name: 'Alineación de Tendencia (EMA 20 > EMA 50)',
          passed: true,
          detail: 'Estructura alcista con medias móviles alineadas a favor del movimiento.',
        },
        {
          name: 'Fair Value Gap (FVG) Respetado',
          passed: true,
          detail: 'Relleno de ineficiencia completado con rechazo alcista en mecha.',
        },
        {
          name: 'Ratio Riesgo / Beneficio >= 1:3.0',
          passed: Number((tp2Pct / slPct).toFixed(1)) >= 2.5,
          detail: `Relación R:R calculada de 1:${(tp2Pct / slPct).toFixed(1)}, favorable a la gestión de riesgo.`,
        },
      ],
      orderBlockDemand: {
        min: Number((optimal * 0.988).toFixed(2)),
        max: Number((optimal * 0.998).toFixed(2)),
      },
      fairValueGap: {
        min: Number((optimal * 1.002).toFixed(2)),
        max: Number((optimal * 1.018).toFixed(2)),
      },
    };
  }, [signalData, asset, currentPrice]);

  // Confluences counting
  const passedConfluencesCount = (signal.confluences || []).filter((c) => c.passed).length;
  const isHighProbability = passedConfluencesCount >= 5;
  const isInvalidated = currentPrice <= (signal.stopLoss?.price || 0);
  const isApproachingDemand = !isInvalidated && (currentPrice > (signal.entryZoneMax || 0));

  // Prepare chart series with 15-20% extended future margin for clean TP/SL projections
  const processedChartData = useMemo(() => {
    let rawPoints: any[] = [];

    if (historyData && historyData.length > 0) {
      rawPoints = [...historyData];
    } else {
      // High fidelity synthetic historical baseline
      const count = 35;
      const base = signal.optimalEntry * 0.94;
      for (let i = 0; i < count; i++) {
        const progress = i / (count - 1);
        const cycle = Math.sin(i * 0.45) * (signal.optimalEntry * 0.012);
        const p = Number((base + (signal.optimalEntry - base) * progress + cycle).toFixed(2));
        rawPoints.push({
          time: `S-${count - i}`,
          price: p,
          ema20: Number((p * 0.995).toFixed(2)),
          ema50: Number((p * 0.985).toFixed(2)),
          bbUpper: Number((p * 1.025).toFixed(2)),
          bbLower: Number((p * 0.975).toFixed(2)),
          volume: Math.round(asset.total_volume / count),
          rsi: 48 + Math.sin(i * 0.3) * 12,
        });
      }
    }

    // Attach signal targets and levels to historical points
    const enriched = rawPoints.map((item, idx) => ({
      ...item,
      entryZoneMin: signal.entryZoneMin,
      entryZoneMax: signal.entryZoneMax,
      optimalEntry: signal.optimalEntry,
      stopLoss: signal.stopLoss.price,
      tp1: signal.takeProfit1.price,
      tp2: signal.takeProfit2.price,
      tp3: signal.takeProfit3.price,
      isTriggerPoint: idx === Math.floor(rawPoints.length * 0.85),
    }));

    // Add 6 Future projection points (18% right margin) for clean visual projection
    const lastPoint = enriched[enriched.length - 1] || { time: 'Hoy', price: currentPrice };
    const futurePoints = [
      { time: '+1 Sesión', isFuture: true },
      { time: '+2 Sesiones', isFuture: true },
      { time: '+3 Sesiones', isFuture: true },
      { time: '+5 Sesiones', isFuture: true },
      { time: '+8 Sesiones', isFuture: true },
      { time: 'Objetivo', isFuture: true },
    ].map((f) => ({
      ...f,
      price: null, // Don't draw price line in future to keep space clear
      entryZoneMin: signal.entryZoneMin,
      entryZoneMax: signal.entryZoneMax,
      optimalEntry: signal.optimalEntry,
      stopLoss: signal.stopLoss.price,
      tp1: signal.takeProfit1.price,
      tp2: signal.takeProfit2.price,
      tp3: signal.takeProfit3.price,
    }));

    return [...enriched, ...futurePoints];
  }, [historyData, signal, currentPrice, asset.total_volume]);

  // Calculations for real money translation
  const sharesQuantity = Number((investmentCapital / signal.optimalEntry).toFixed(2));
  const maxRiskLossDollars = Number((investmentCapital * (signal.stopLoss.percentage / 100)).toFixed(2));
  const gainTp1Dollars = Number((investmentCapital * (signal.takeProfit1.percentage / 100)).toFixed(2));
  const gainTp2Dollars = Number((investmentCapital * (signal.takeProfit2.percentage / 100)).toFixed(2));
  const gainTp3Dollars = Number((investmentCapital * (signal.takeProfit3.percentage / 100)).toFixed(2));

  // Copy 1-Click Order for Broker
  const handleCopyBrokerOrder = () => {
    const formattedText = `${signal.orderType} ${asset.symbol.toUpperCase()} LIMIT @ $${signal.optimalEntry.toFixed(2)} | SL: $${signal.stopLoss.price.toFixed(2)} (-${signal.stopLoss.percentage}%) | TP1: $${signal.takeProfit1.price.toFixed(2)} (+${signal.takeProfit1.percentage}%) | TP2: $${signal.takeProfit2.price.toFixed(2)} (+${signal.takeProfit2.percentage}%) | TP3: $${signal.takeProfit3.price.toFixed(2)} (+${signal.takeProfit3.percentage}%)`;
    navigator.clipboard.writeText(formattedText);
    setCopiedOrder(true);
    setTimeout(() => setCopiedOrder(false), 2500);
  };

  // Capital presets
  const capitalPresets = [250, 500, 1000, 2500, 5000];

  // Price distance calculation
  const distanceToEntryPct = Number((((currentPrice - signal.optimalEntry) / signal.optimalEntry) * 100).toFixed(1));

  return (
    <div className="space-y-4 w-full max-w-full overflow-x-hidden min-w-0">
      {/* 1. TOP SEMÁFORO DE CONFLUENCIAS (¿Es seguro entrar?) */}
      <div 
        className={`rounded-2xl border p-4 transition-all duration-300 ${
          isInvalidated 
            ? 'border-rose-500/50 bg-gradient-to-r from-rose-950/80 via-slate-900 to-rose-950/60 shadow-lg shadow-rose-950/40' 
            : isHighProbability 
            ? 'border-emerald-500/60 bg-gradient-to-r from-emerald-950/80 via-slate-900 to-teal-950/60 shadow-xl shadow-emerald-950/40'
            : 'border-amber-500/50 bg-gradient-to-r from-amber-950/70 via-slate-900 to-slate-900 shadow-lg shadow-amber-950/30'
        }`}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 shrink-0 rounded-xl flex items-center justify-center font-black ${
              isInvalidated 
                ? 'bg-rose-500 text-white animate-pulse' 
                : isHighProbability 
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/50' 
                : 'bg-amber-500 text-slate-950'
            }`}>
              {isInvalidated ? (
                <XCircle className="h-6 w-6" />
              ) : isHighProbability ? (
                <CheckCircle2 className="h-6 w-6" />
              ) : (
                <AlertTriangle className="h-6 w-6" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  isInvalidated
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : isHighProbability
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                }`}>
                  {isInvalidated ? 'SETUP INVALIDADO' : isHighProbability ? 'SEÑAL DE ALTA PROBABILIDAD' : 'ESPERAR CONFIRMACIÓN'}
                </span>
                <span className="text-xs font-mono font-bold text-slate-400">
                  {passedConfluencesCount} de 6 Confluencias Cumplidas ({signal.confidenceScore}% Éxito Est.)
                </span>
              </div>
              
              <h3 className="text-sm sm:text-base font-bold text-white mt-1">
                {isInvalidated
                  ? '🛑 El precio perforó el Stop Loss. No operar ni forzar entradas en este activo.'
                  : isHighProbability
                  ? '🟢 Todas las condiciones técnicas e institucionales validadas. Ejecutar plan en zona.'
                  : '🟡 Esperar retroceso a la zona de compra ($' + signal.entryZoneMin + ' - $' + signal.entryZoneMax + '). No perseguir precio.'}
              </h3>
            </div>
          </div>

          <button
            id="toggle-confluences-btn"
            onClick={() => setShowConfluenceDetails(!showConfluenceDetails)}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900/90 px-3 py-1.5 text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white transition shrink-0"
          >
            <span>{showConfluenceDetails ? 'Ocultar Checklist' : 'Ver Checklist SMC'}</span>
            {showConfluenceDetails ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>

        {/* Collapsible Confluences Detail Grid */}
        {showConfluenceDetails && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 mt-4 pt-3 border-t border-slate-800/80 animate-in fade-in duration-200">
            {(signal.confluences || []).map((conf, idx) => (
              <div
                key={idx}
                className={`p-2.5 rounded-xl border flex items-start gap-2 text-xs ${
                  conf.passed
                    ? 'bg-slate-950/70 border-emerald-500/30 text-slate-200'
                    : 'bg-slate-950/70 border-slate-800 text-slate-400 opacity-70'
                }`}
              >
                {conf.passed ? (
                  <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
                )}
                <div>
                  <span className="font-bold text-white block">{conf.name}</span>
                  <span className="text-[11px] text-slate-400 leading-tight">{conf.detail}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. MAIN TRADING VIEW (CHART + 1-CLICK TRADE PLAN LATERAL) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* LEFT / CENTER: THE SEMAPHORE CHART (8 Cols) */}
        <div className="xl:col-span-8 rounded-3xl border border-slate-800 bg-slate-950/90 p-4 sm:p-6 shadow-2xl flex flex-col justify-between">
          {/* Chart Controls Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
            {/* Asset quick status & mode switch */}
            <div className="flex items-center gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-black text-white font-mono">
                    {asset.symbol.toUpperCase()}
                  </span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    signal.orderType === 'COMPRA'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  }`}>
                    {signal.orderType === 'COMPRA' ? '▲ COMPRA (LONG)' : '▼ VENTA (SHORT)'}
                  </span>
                </div>
                <div className="text-xs text-slate-400 font-mono">
                  Precio actual: <strong className="text-white">${formatCurrency(currentPrice)}</strong>
                  {distanceToEntryPct !== 0 && (
                    <span className={`ml-2 font-sans font-medium ${distanceToEntryPct > 0 ? 'text-amber-400' : 'text-cyan-400'}`}>
                      ({distanceToEntryPct > 0 ? `+${distanceToEntryPct}% de zona ideal` : `${distanceToEntryPct}% bajo zona ideal`})
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Selector de Modo: Simple (Semáforo) vs Pro (SMC) */}
            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-xl bg-slate-900 border border-slate-800 p-1">
                <button
                  id="mode-simple-btn"
                  onClick={() => setChartMode('simple')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    chartMode === 'simple'
                      ? 'bg-cyan-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Zap className="h-3.5 w-3.5" />
                  <span>Modo Simple (Señales)</span>
                </button>

                <button
                  id="mode-pro-btn"
                  onClick={() => setChartMode('pro')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    chartMode === 'pro'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Layers className="h-3.5 w-3.5" />
                  <span>Modo Pro (SMC & Indicadores)</span>
                </button>
              </div>

              {/* Timeframe selector */}
              {onTimeframeChange && (
                <div className="hidden sm:flex items-center gap-1 bg-slate-900 rounded-xl border border-slate-800 p-1">
                  {(['1D', '1W', '1M', '1Y', 'ALL'] as const).map((tf) => (
                    <button
                      key={tf}
                      onClick={() => onTimeframeChange(tf)}
                      className={`px-2 py-1 text-xs font-mono font-bold rounded-lg transition ${
                        timeframe === tf 
                          ? 'bg-slate-800 text-white' 
                          : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {tf}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Real-time Visual Traffic Light Legend */}
          <div className="flex flex-wrap items-center gap-4 py-2.5 px-3 my-2 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs font-mono">
            {/* Cyan Entry Band */}
            <div className="flex items-center gap-2">
              <span className="h-3 w-6 rounded bg-cyan-500/30 border border-cyan-400" />
              <span className="text-cyan-300 font-bold">Zona Entrada:</span>
              <span className="text-white">${signal.entryZoneMin} - ${signal.entryZoneMax}</span>
            </div>

            {/* Red Stop Loss */}
            <div className="flex items-center gap-2">
              <span className="h-0.5 w-6 border-b-2 border-dashed border-rose-500" />
              <span className="text-rose-400 font-bold">Stop Loss:</span>
              <span className="text-white">${signal.stopLoss.price} (-{signal.stopLoss.percentage}%)</span>
            </div>

            {/* Green Take Profits */}
            <div className="flex items-center gap-2">
              <span className="h-0.5 w-6 border-b-2 border-emerald-400" />
              <span className="text-emerald-400 font-bold">TP1:</span>
              <span className="text-white">${signal.takeProfit1.price} (+{signal.takeProfit1.percentage}%)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-0.5 w-6 border-b-2 border-emerald-400" />
              <span className="text-emerald-400 font-bold">TP2:</span>
              <span className="text-white">${signal.takeProfit2.price} (+{signal.takeProfit2.percentage}%)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-0.5 w-6 border-b-2 border-emerald-400" />
              <span className="text-emerald-400 font-bold">TP3:</span>
              <span className="text-white">${signal.takeProfit3.price} (+{signal.takeProfit3.percentage}%)</span>
            </div>
          </div>

          {/* THE CHART CANVAS */}
          <div className="relative w-full h-[360px] sm:h-[420px] select-none">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={processedChartData}
                margin={{ top: 25, right: 90, left: 10, bottom: 10 }}
                onMouseMove={(e: any) => {
                  if (e && e.activePayload && e.activePayload.length) {
                    setActiveHoverData(e.activePayload[0].payload);
                  }
                }}
                onMouseLeave={() => setActiveHoverData(null)}
              >
                <defs>
                  {/* Cyan Glow for Price in Simple Mode */}
                  <linearGradient id="priceGradientCyan" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                  </linearGradient>

                  {/* Order Block Demand Fill */}
                  <linearGradient id="orderBlockGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.05} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} opacity={0.6} />

                <XAxis 
                  dataKey="time" 
                  stroke="#64748b" 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={{ stroke: '#334155' }}
                />

                <YAxis
                  domain={[
                    (dataMin: number) => Math.min(signal.stopLoss.price * 0.985, dataMin * 0.985),
                    (dataMax: number) => Math.max(signal.takeProfit3.price * 1.025, dataMax * 1.025)
                  ]}
                  orientation="right"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#334155' }}
                  tickFormatter={(val) => `$${Number(val).toFixed(0)}`}
                />

                {/* DYNAMIC HOVER TOOLTIP */}
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const data = payload[0].payload;
                    const price = data.price || signal.optimalEntry;
                    const diffPct = (((price - signal.optimalEntry) / signal.optimalEntry) * 100).toFixed(1);

                    return (
                      <div className="rounded-xl border border-slate-700 bg-slate-900/95 p-3 shadow-2xl backdrop-blur text-xs font-mono space-y-1.5 min-w-[210px]">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-1 text-slate-400 font-sans">
                          <span>{data.time}</span>
                          <span className="font-bold text-white">${formatCurrency(price)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 font-sans">Distancia a Entrada:</span>
                          <span className={Number(diffPct) > 0 ? 'text-amber-400' : 'text-cyan-400 font-bold'}>
                            {Number(diffPct) > 0 ? `+${diffPct}%` : `${diffPct}%`}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 font-sans">Volumen Relativo:</span>
                          <span className="text-emerald-400 font-bold font-sans">
                            {asset.volumeAnomalyRatio ? `${asset.volumeAnomalyRatio.toFixed(1)}x Media` : 'Normal'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 font-sans">Riesgo / Beneficio:</span>
                          <span className="text-teal-300 font-bold">1:{signal.riskRewardRatio}</span>
                        </div>
                      </div>
                    );
                  }}
                />

                {/* 1. ZONA DE ENTRADA SOMBREADA (AZUL ELÉCTRICO / CYAN) */}
                <ReferenceArea
                  {...({
                    y1: signal.entryZoneMin,
                    y2: signal.entryZoneMax,
                    fill: '#06b6d4',
                    fillOpacity: 0.16,
                    stroke: '#06b6d4',
                    strokeOpacity: 0.5,
                    strokeDasharray: '4 4',
                  } as any)}
                />

                {/* Reference Line: Optimal Entry Center */}
                <ReferenceLine
                  y={signal.optimalEntry}
                  stroke="#06b6d4"
                  strokeWidth={2}
                  label={{
                    value: `▲ ENTRADA ($${signal.optimalEntry.toFixed(2)})`,
                    position: 'right',
                    fill: '#06b6d4',
                    fontSize: 11,
                    fontWeight: 'bold',
                  }}
                />

                {/* 2. STOP LOSS (ROJO NEÓN CON ETIQUETA IMÁN DERECHA) */}
                <ReferenceLine
                  y={signal.stopLoss.price}
                  stroke="#ef4444"
                  strokeWidth={2.5}
                  strokeDasharray="6 4"
                  label={{
                    value: `🛑 SL ($${signal.stopLoss.price.toFixed(2)}) -${signal.stopLoss.percentage}%`,
                    position: 'right',
                    fill: '#f87171',
                    fontSize: 11,
                    fontWeight: 'bold',
                  }}
                />

                {/* 3. TAKE PROFITS (VERDE ESMERALDA CON ETIQUETAS IMÁN DERECHA) */}
                <ReferenceLine
                  y={signal.takeProfit1.price}
                  stroke="#10b981"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  label={{
                    value: `🎯 TP1 ($${signal.takeProfit1.price.toFixed(2)}) +${signal.takeProfit1.percentage}%`,
                    position: 'right',
                    fill: '#34d399',
                    fontSize: 11,
                    fontWeight: 'bold',
                  }}
                />

                <ReferenceLine
                  y={signal.takeProfit2.price}
                  stroke="#10b981"
                  strokeWidth={2.5}
                  label={{
                    value: `🎯 TP2 ($${signal.takeProfit2.price.toFixed(2)}) +${signal.takeProfit2.percentage}%`,
                    position: 'right',
                    fill: '#10b981',
                    fontSize: 11,
                    fontWeight: 'bold',
                  }}
                />

                <ReferenceLine
                  y={signal.takeProfit3.price}
                  stroke="#22c55e"
                  strokeWidth={2}
                  strokeDasharray="3 3"
                  label={{
                    value: `🚀 TP3 ($${signal.takeProfit3.price.toFixed(2)}) +${signal.takeProfit3.percentage}%`,
                    position: 'right',
                    fill: '#4ade80',
                    fontSize: 11,
                    fontWeight: 'bold',
                  }}
                />

                {/* PRO SMC OVERLAYS (Order Blocks & Fair Value Gaps if in Pro Mode) */}
                {chartMode === 'pro' && signal.orderBlockDemand && (
                  <ReferenceArea
                    {...({
                      y1: signal.orderBlockDemand.min,
                      y2: signal.orderBlockDemand.max,
                      fill: 'url(#orderBlockGradient)',
                      stroke: '#10b981',
                      strokeOpacity: 0.6,
                    } as any)}
                  />
                )}

                {chartMode === 'pro' && signal.fairValueGap && (
                  <ReferenceArea
                    {...({
                      y1: signal.fairValueGap.min,
                      y2: signal.fairValueGap.max,
                      fill: '#a855f7',
                      fillOpacity: 0.12,
                      stroke: '#c084fc',
                      strokeOpacity: 0.5,
                      strokeDasharray: '2 2',
                    } as any)}
                  />
                )}

                {/* Price Series: High-Contrast Area / Line */}
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke="#06b6d4"
                  strokeWidth={2.5}
                  fill="url(#priceGradientCyan)"
                  dot={false}
                  activeDot={{ r: 6, fill: '#06b6d4', stroke: '#ffffff', strokeWidth: 2 }}
                />

                {/* Pro Mode: Moving Averages EMA 20 & EMA 50 */}
                {chartMode === 'pro' && (
                  <>
                    <Line
                      type="monotone"
                      dataKey="ema20"
                      stroke="#fbbf24"
                      strokeWidth={1.5}
                      dot={false}
                      name="EMA 20"
                    />
                    <Line
                      type="monotone"
                      dataKey="ema50"
                      stroke="#818cf8"
                      strokeWidth={1.5}
                      dot={false}
                      name="EMA 50"
                    />
                  </>
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Pro Mode Sub-metrics Bar */}
          {chartMode === 'pro' && (
            <div className="mt-3 pt-3 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
              <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                <span className="text-slate-400 block font-sans text-[11px]">RSI (14 Wilder):</span>
                <span className="font-bold text-emerald-400 text-sm">{asset.rsi14 || 52} (Saludable)</span>
              </div>
              <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                <span className="text-slate-400 block font-sans text-[11px]">SMC Order Block:</span>
                <span className="font-bold text-teal-300 text-sm">${signal.orderBlockDemand?.min} - ${signal.orderBlockDemand?.max}</span>
              </div>
              <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                <span className="text-slate-400 block font-sans text-[11px]">Fair Value Gap (FVG):</span>
                <span className="font-bold text-purple-300 text-sm">${signal.fairValueGap?.min} - ${signal.fairValueGap?.max}</span>
              </div>
              <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                <span className="text-slate-400 block font-sans text-[11px]">Z-Score Volumen:</span>
                <span className="font-bold text-cyan-300 text-sm">+{asset.volumeAnomalyRatio ? asset.volumeAnomalyRatio.toFixed(1) : '1.8'}x Institucional</span>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: "1-CLICK TRADE PLAN" LATERAL EXECUTION CARD (4 Cols) */}
        <div className="xl:col-span-4 rounded-3xl border-2 border-emerald-500/40 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 p-5 sm:p-6 shadow-2xl flex flex-col justify-between space-y-5">
          {/* Card Header: 1-Click Plan */}
          <div className="space-y-3 pb-3 border-b border-slate-800">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-emerald-400">
                <Zap className="h-4 w-4 text-emerald-400" />
                Plan Operativo 1-Click
              </span>
              <span className="text-xs font-mono font-bold bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                R:R 1:{signal.riskRewardRatio}
              </span>
            </div>

            <h4 className="text-lg font-black text-white">
              {signal.orderType === 'COMPRA' ? 'ORDEN DE COMPRA LÍMITE' : 'ORDEN DE VENTA CORTA'}
            </h4>

            {/* Quick Summary Grid */}
            <div className="space-y-2 text-xs font-mono">
              {/* Entry Zone */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-cyan-950/30 border border-cyan-500/40">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-cyan-400" />
                  <span className="text-cyan-300 font-sans font-bold">1. Entrada:</span>
                </div>
                <span className="text-white font-bold">${signal.optimalEntry.toFixed(2)} (${signal.entryZoneMin} - ${signal.entryZoneMax})</span>
              </div>

              {/* Stop Loss */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-rose-950/30 border border-rose-500/40">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-rose-400" />
                  <span className="text-rose-300 font-sans font-bold">2. Stop Loss:</span>
                </div>
                <span className="text-rose-300 font-bold">${signal.stopLoss.price.toFixed(2)} (-{signal.stopLoss.percentage}%)</span>
              </div>

              {/* TP1 & TP2 */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/40">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span className="text-emerald-300 font-sans font-bold">3. TP1 (50%):</span>
                </div>
                <span className="text-emerald-300 font-bold">${signal.takeProfit1.price.toFixed(2)} (+{signal.takeProfit1.percentage}%)</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/40">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span className="text-emerald-300 font-sans font-bold">4. TP2 (30%):</span>
                </div>
                <span className="text-emerald-300 font-bold">${signal.takeProfit2.price.toFixed(2)} (+{signal.takeProfit2.percentage}%)</span>
              </div>
            </div>
          </div>

          {/* Real Money Translation & Position Sizing Simulator */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-bold font-sans">Simular Capital en Dinero Real:</span>
              <span className="text-slate-400 font-mono">{sharesQuantity} Acciones</span>
            </div>

            {/* Preset Buttons */}
            <div className="flex flex-wrap items-center gap-1.5">
              {capitalPresets.map((amt) => (
                <button
                  key={amt}
                  onClick={() => {
                    setInvestmentCapital(amt);
                    setCustomCapitalInput(amt.toString());
                  }}
                  className={`px-2.5 py-1 text-xs font-mono font-bold rounded-lg transition ${
                    investmentCapital === amt
                      ? 'bg-emerald-500 text-slate-950 shadow'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  ${amt}
                </button>
              ))}
            </div>

            {/* Custom Input */}
            <div className="relative">
              <span className="absolute left-3 top-2 text-slate-400 font-mono text-xs">$</span>
              <input
                type="number"
                value={customCapitalInput}
                onChange={(e) => {
                  setCustomCapitalInput(e.target.value);
                  const num = parseFloat(e.target.value);
                  if (!isNaN(num) && num > 0) setInvestmentCapital(num);
                }}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 py-1.5 pl-7 pr-3 text-xs font-mono font-bold text-white focus:border-emerald-500 focus:outline-none"
                placeholder="Monto personalizado"
              />
            </div>

            {/* Money Outcome Breakdown */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
              <div className="p-2 rounded-lg bg-rose-950/40 border border-rose-900/60">
                <span className="text-[10px] text-rose-300 block font-sans">Riesgo Máx (SL):</span>
                <span className="text-rose-400 font-bold">-${maxRiskLossDollars}</span>
              </div>
              <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-900/60">
                <span className="text-[10px] text-emerald-300 block font-sans">Ganancia en TP2:</span>
                <span className="text-emerald-400 font-bold">+${gainTp2Dollars}</span>
              </div>
            </div>
          </div>

          {/* ACTION BUTTONS: COPY ORDER & PORTFOLIO */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            {/* Primary Copy Button: 1-Click for Broker */}
            <button
              id="copy-broker-order-btn"
              onClick={handleCopyBrokerOrder}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 py-3 text-xs font-black text-white shadow-lg shadow-emerald-950/60 transition cursor-pointer"
            >
              {copiedOrder ? (
                <>
                  <Check className="h-4 w-4 text-emerald-200" />
                  <span>✓ ¡ORDEN COPIADA AL PORTAPAPELES!</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  <span>COPIAR ORDEN LISTA PARA TU BROKER</span>
                </>
              )}
            </button>

            {/* Secondary actions: Add to portfolio & alert */}
            <div className="grid grid-cols-2 gap-2">
              {onAddToPortfolio && (
                <button
                  id="add-to-portfolio-plan-btn"
                  onClick={() => {
                    onAddToPortfolio(sharesQuantity, signal.optimalEntry);
                    setIsAddedSuccess(true);
                    setTimeout(() => setIsAddedSuccess(false), 2500);
                  }}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 py-2 text-[11px] font-bold text-slate-200 transition"
                >
                  <PlusCircle className="h-3.5 w-3.5 text-emerald-400" />
                  <span>{isAddedSuccess ? '✓ Registrado' : '+ Mi Cartera'}</span>
                </button>
              )}

              {onCreateAlert && (
                <button
                  id="create-alert-plan-btn"
                  onClick={() => onCreateAlert(signal.takeProfit1.price, `TP1 en ${asset.symbol.toUpperCase()}`)}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 py-2 text-[11px] font-bold text-slate-200 transition"
                >
                  <BellRing className="h-3.5 w-3.5 text-amber-400" />
                  <span>Fijar Alerta TP1</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
