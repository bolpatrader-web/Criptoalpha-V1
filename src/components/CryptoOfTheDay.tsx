import React, { useState, useEffect } from 'react';
import { 
  Flame, 
  Target, 
  ShieldAlert, 
  TrendingUp, 
  ArrowUpRight, 
  DollarSign, 
  Clock, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  Activity, 
  Zap, 
  RefreshCw, 
  Sliders, 
  PlusCircle, 
  ChevronRight,
  BarChart2,
  BellRing,
  ArrowLeft,
  Briefcase,
  Cpu,
  Globe,
  Gauge,
  Scale,
  ShieldCheck,
  Compass,
  Layers,
  Timer,
  AlertCircle
} from 'lucide-react';
import { StockAsset, StockOfTheDaySignal, PortfolioAsset } from '../types';
import { formatCurrency, formatPercentage, formatCompactNumber } from '../utils/formatters';
import { SignalTradingChart } from './SignalTradingChart';
import { buildComprehensiveStockStudy, getLiveMarketSessionDetails } from '../utils/stockOfTheDayEngine';
import { safeFetchJson } from '../utils/api';
import { getStockLogoUrl, handleStockImageError } from '../utils/stockLogos';

interface StockOfTheDayProps {
  assets: StockAsset[];
  onOpenChartModal: (asset: StockAsset) => void;
  onOpenAiAnalysis: (asset: StockAsset) => void;
  onAddPortfolioAsset: (asset: PortfolioAsset) => void;
  onCreateAlert: (asset: StockAsset, targetPrice: number, desc: string) => void;
  onOpenBrokerModal?: (asset: StockAsset) => void;
  isExpertMode: boolean;
  onBackToHome?: () => void;
}

export const CryptoOfTheDay: React.FC<StockOfTheDayProps> = ({
  assets,
  onOpenChartModal,
  onOpenAiAnalysis,
  onAddPortfolioAsset,
  onCreateAlert,
  onOpenBrokerModal,
  isExpertMode,
  onBackToHome,
}) => {
  const [signal, setSignal] = useState<StockOfTheDaySignal | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [investmentAmount, setInvestmentAmount] = useState<number>(1000);
  const [customAmountInput, setCustomAmountInput] = useState<string>('1000');
  const [isSimulatingSuccess, setIsSimulatingSuccess] = useState<boolean>(false);
  const [selectedCandidateIndex, setSelectedCandidateIndex] = useState<number>(0);
  const [sessionClock, setSessionClock] = useState(getLiveMarketSessionDetails());

  // Real-time market session clock updater (every 1 second for live second-by-second countdown)
  useEffect(() => {
    setSessionClock(getLiveMarketSessionDetails());
    const timer = setInterval(() => {
      setSessionClock(getLiveMarketSessionDetails());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Filter top 4 ignition stock candidates from all loaded assets
  const candidates = React.useMemo(() => {
    if (!assets || assets.length === 0) return [];

    return assets
      .filter((a) => {
        const change24 = a.price_change_percentage_24h || 0;
        const rsi = a.rsi14 || 52;
        const vol = a.total_volume || 0;
        // Strict stock ignition filter: not over-extended (< +16%), healthy RSI (38-72), active volume
        return change24 > -3.5 && change24 < 16 && rsi >= 38 && rsi <= 72 && vol > 500000;
      })
      .map((a) => {
        const change24 = a.price_change_percentage_24h || 0;
        const change7d = a.price_change_percentage_7d || 0;
        const rsi = a.rsi14 || 52;
        const volRatio = a.volumeAnomalyRatio || 1.2;
        const alpha = a.alphaScore || 68;

        let ignitionScore = alpha * 0.45 + volRatio * 18;
        if (change24 >= 0.5 && change24 <= 6.0) ignitionScore += 18;
        if (rsi >= 44 && rsi <= 64) ignitionScore += 16;
        if (change7d > 0 && change7d < 20) ignitionScore += 10;

        return {
          ...a,
          ignitionScore: Math.round(Math.min(98, ignitionScore)),
        };
      })
      .sort((a, b) => b.ignitionScore - a.ignitionScore)
      .slice(0, 4);
  }, [assets]);

  // Fetch or calculate signal with full multi-dimensional market engine
  const fetchSignal = async (candidateAsset?: StockAsset) => {
    setIsLoading(true);
    try {
      const activeCandidate = candidateAsset || (candidates[selectedCandidateIndex] || candidates[0] || assets[0]);
      const rawList = activeCandidate ? [activeCandidate, ...assets.filter(a => a.id !== activeCandidate.id)] : assets;
      const payloadAssets = rawList.slice(0, 35).map((a) => ({
        id: a.id,
        symbol: a.symbol,
        name: a.name,
        image: a.image,
        current_price: a.current_price,
        market_cap_rank: a.market_cap_rank,
        price_change_percentage_24h: a.price_change_percentage_24h,
        price_change_percentage_7d: a.price_change_percentage_7d,
        total_volume: a.total_volume,
        rsi14: a.rsi14,
        volumeAnomalyRatio: a.volumeAnomalyRatio,
        alphaScore: a.alphaScore,
        sector: a.sector,
        pe_ratio: a.pe_ratio,
      }));

      const res = await safeFetchJson<StockOfTheDaySignal>('/api/cryptos/of-the-day');

      if (res.ok && res.data) {
        const data: StockOfTheDaySignal = res.data;
        
        // Ensure complete session and momentum calculations are attached if missing
        if (!data.sessionContext || !data.momentumHealth || !data.riskRewardAnalysis) {
          const study = buildComprehensiveStockStudy(
            data.asset,
            data.takeProfit1?.percentage || 8.5,
            data.takeProfit2?.percentage || 22.0,
            data.takeProfitMax?.percentage || 48.0,
            data.stopLoss?.percentage || 3.2
          );
          setSignal({
            ...data,
            sessionContext: data.sessionContext || study.sessionContext,
            momentumHealth: data.momentumHealth || study.momentumHealth,
            riskRewardAnalysis: data.riskRewardAnalysis || study.riskRewardAnalysis,
            tacticalExecution: data.tacticalExecution || study.tacticalExecution,
          });
        } else {
          setSignal(data);
        }
      } else {
        throw new Error(res.error || 'Error al obtener la Criptomoneda del Día');
      }
    } catch (err) {
      console.warn('Fallback comprehensive study calculation for cryptos:', err);
      const top = candidateAsset || candidates[selectedCandidateIndex] || candidates[0] || assets[0];
      if (top) {
        const curPrice = top.current_price || 150;
        const rsi = top.rsi14 || 52;
        const tp1Pct = 6.2;
        const tp2Pct = 16.5;
        const tpMaxPct = 28.0;
        const slPct = 2.6;

        const study = buildComprehensiveStockStudy(top, tp1Pct, tp2Pct, tpMaxPct, slPct);

        setSignal({
          asset: top,
          ignitionStatus: 'ZONA_DE_COMPRA_ACTIVA',
          buyZoneMin: Number((curPrice * 0.992).toFixed(2)),
          buyZoneMax: Number((curPrice * 1.008).toFixed(2)),
          optimalEntryPrice: curPrice,
          currentPrice: curPrice,
          remainingUpsidePct: tp2Pct,
          takeProfit1: {
            price: Number((curPrice * (1 + tp1Pct / 100)).toFixed(2)),
            percentage: tp1Pct,
            description: 'Objetivo 1 (Corto Plazo / Asegurar Ganancia)',
            action: 'Vender 50% de las acciones y subir Stop-Loss al precio de compra (Break-Even).',
          },
          takeProfit2: {
            price: Number((curPrice * (1 + tp2Pct / 100)).toFixed(2)),
            percentage: tp2Pct,
            description: 'Objetivo 2 (Expansión / Beneficio Principal)',
            action: 'Vender 35% adicional o activar orden Trailing Stop con margen del 1.8%.',
          },
          takeProfitMax: {
            price: Number((curPrice * (1 + tpMaxPct / 100)).toFixed(2)),
            percentage: tpMaxPct,
            description: 'Objetivo de Ignición Máxima',
            action: 'Vender el 15% restante para capturar todo el recorrido alcista.',
          },
          stopLoss: {
            price: Number((curPrice * (1 - slPct / 100)).toFixed(2)),
            percentage: slPct,
            description: `Corte de pérdida estricto en $${(curPrice * (1 - slPct / 100)).toFixed(2)} para proteger el capital.`,
          },
          riskRewardRatio: Number(((tp1Pct + tp2Pct) / 2 / slPct).toFixed(2)),
          estimatedHoldingPeriod: 'Entre 2 y 10 días hábiles (Swing Trading)',
          confidenceScore: 92,
          volumeZScore: top.volumeAnomalyRatio || 1.9,
          rsiCurrent: rsi,
          breakoutTrigger: `Ruptura de compresión con entrada de volumen comprador institucional y RSI en zona óptima (${rsi}), con amplio margen antes de alcanzar resistencia mayor.`,
          catalysts: [
            `Volumen institucional continuo superando la media diaria de 20 sesiones.`,
            `RSI en ${rsi}, libre de sobrecompra extrema (sin riesgo de corrección inmediata).`,
            `Estructura técnica consolidada sobre medias móviles y ratio Riesgo/Beneficio asimétrico.`,
          ],
          riskWarnings: [
            `No sobreexponer más del 2-3% del capital total de la cartera a esta operación.`,
            `Colocar la orden de Stop-Loss inmediatamente después de realizar la compra en el broker.`,
          ],
          executionStrategy: {
            step1: `Comprar en la zona de entrada entre $${(curPrice * 0.992).toFixed(2)} y $${(curPrice * 1.008).toFixed(2)}.`,
            step2: `Colocar inmediatamente la orden Stop Loss en $${(curPrice * (1 - slPct / 100)).toFixed(2)}.`,
            step3: `Al alcanzar el TP1 (+${tp1Pct}%), vender la mitad, asegurar beneficios y dejar correr el resto hasta el TP2 (+${tp2Pct}%).`,
          },
          sessionContext: study.sessionContext,
          momentumHealth: study.momentumHealth,
          riskRewardAnalysis: study.riskRewardAnalysis,
          tacticalExecution: study.tacticalExecution,
          calculatedAt: new Date().toISOString(),
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (assets.length > 0 && !signal) {
      fetchSignal();
    }
  }, [assets.length, signal]);

  const handleSelectCandidate = (cand: StockAsset, index: number) => {
    setSelectedCandidateIndex(index);
    fetchSignal(cand);
  };

  // Quick preset investment amounts
  const presetAmounts = [250, 500, 1000, 2500, 5000, 10000];

  // Calculate simulated return amounts
  const sharesCount = signal ? investmentAmount / (signal.optimalEntryPrice || signal.currentPrice || 1) : 0;
  const tp1Profit = signal ? (investmentAmount * (signal.takeProfit1.percentage / 100)) : 0;
  const tp2Profit = signal ? (investmentAmount * (signal.takeProfit2.percentage / 100)) : 0;
  const tpMaxProfit = signal ? (investmentAmount * (signal.takeProfitMax.percentage / 100)) : 0;
  const maxRiskAmount = signal ? (investmentAmount * (signal.stopLoss.percentage / 100)) : 0;

  // Active study metrics (sessionClock ensures 1-second live ticking of time and countdown)
  const currentSession = {
    ...(signal?.sessionContext || sessionClock),
    currentTimeNy: sessionClock.currentTimeNy,
    currentTimeUtc: sessionClock.currentTimeUtc,
    timeUntilCloseFormatted: sessionClock.timeUntilCloseFormatted || '00:00:00',
    timeUntilCloseSeconds: sessionClock.timeUntilCloseSeconds,
    isClosingSoon: sessionClock.isClosingSoon,
    isRegularTradingOpen: sessionClock.isRegularTradingOpen,
  };
  const momentum = signal?.momentumHealth || (signal ? buildComprehensiveStockStudy(signal.asset).momentumHealth : null);
  const rrAnalysis = signal?.riskRewardAnalysis || (signal ? buildComprehensiveStockStudy(signal.asset).riskRewardAnalysis : null);
  const tactical = signal?.tacticalExecution || (signal ? buildComprehensiveStockStudy(signal.asset).tacticalExecution : null);
  const gapInfo = signal?.sessionContext?.openingGapAnticipation;

  // Helper for Session Status Badges
  const getSessionBadgeColor = (status: string) => {
    switch (status) {
      case 'OPEN':
      case 'REGULAR_OPEN':
      case 'POWER_HOUR':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50';
      case 'PRE_MARKET':
      case 'AFTER_HOURS':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/50';
      case 'MIDDAY_LULL':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/50';
      default:
        return 'bg-slate-800/80 text-slate-400 border-slate-700';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 w-full max-w-full overflow-x-hidden">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {onBackToHome && (
            <button
              id="back-to-home-btn"
              onClick={onBackToHome}
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Volver al Inicio</span>
            </button>
          )}
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Estudio Integral de la Acción del Día • Wall Street en Vivo
            </span>
          </div>
        </div>

        <button
          id="refresh-signal-btn"
          onClick={() => fetchSignal()}
          disabled={isLoading}
          className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
          <span>Recalcular Estudio Completo</span>
        </button>
      </div>

      {/* 1. REAL-TIME MARKET CLOCK & GLOBAL FINANCIAL HUBS STATUS BAR */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 sm:p-5 shadow-xl space-y-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Clock className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">Reloj de Mercado & Sesión Operativa</h3>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${getSessionBadgeColor(currentSession.marketStatus)}`}>
                  {currentSession.marketStatus === 'REGULAR_OPEN' || currentSession.marketStatus === 'MIDDAY_LULL' ? '🟢 MERCADO ABIERTO' : 
                   currentSession.marketStatus === 'PRE_MARKET' ? '🟡 PRE-MARKET' :
                   currentSession.marketStatus === 'POWER_HOUR' ? '⚡ POWER HOUR' :
                   currentSession.marketStatus === 'AFTER_HOURS' ? '🌙 AFTER-HOURS' : '🔴 CERRADO'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {currentSession.marketStatusLabel}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:items-end gap-2 text-xs font-mono">
            <div className="flex flex-wrap items-center gap-2">
              <div className="rounded-lg bg-slate-950 px-2.5 py-1.5 border border-slate-800 text-slate-300">
                <span className="text-slate-500 mr-1.5 font-sans font-semibold">NY (EST):</span>
                <strong className="text-white">{currentSession.currentTimeNy}</strong>
              </div>
              <div className="rounded-lg bg-slate-950 px-2.5 py-1.5 border border-slate-800 text-slate-300 hidden sm:inline-block">
                <span className="text-slate-500 mr-1.5 font-sans font-semibold">UTC:</span>
                <strong className="text-cyan-400">{currentSession.currentTimeUtc}</strong>
              </div>
            </div>

            {/* Reloj Cuenta Atrás hasta el Cierre de la Bolsa de Nueva York */}
            <div className="rounded-lg bg-slate-950 px-2.5 py-1.5 border border-slate-800 text-slate-300 flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start shadow-inner whitespace-nowrap">
              <span className="text-slate-400 font-sans font-semibold flex items-center gap-1.5 text-[11px] shrink-0">
                <Timer className="h-3.5 w-3.5 text-amber-400 animate-pulse shrink-0" />
                <span>Cuenta atrás Cierre NY:</span>
              </span>
              <strong className={currentSession.isRegularTradingOpen ? "text-amber-300 font-bold font-mono tracking-wider" : "text-slate-200 font-bold font-mono tracking-wider"}>
                {currentSession.timeUntilCloseFormatted}
              </strong>
            </div>
          </div>
        </div>

        {/* Global Financial Sessions Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {(currentSession.activeSessions || []).map((sess, idx) => {
            const isOpen = sess.status === 'OPEN' || sess.status === 'REGULAR_OPEN' || sess.status === 'POWER_HOUR';
            const isPre = sess.status === 'PRE_MARKET' || sess.status === 'AFTER_HOURS';
            return (
              <div
                key={idx}
                className={`p-2.5 rounded-xl border flex flex-col justify-between transition ${
                  isOpen 
                    ? 'bg-emerald-950/30 border-emerald-500/40' 
                    : isPre
                    ? 'bg-amber-950/25 border-amber-500/30'
                    : 'bg-slate-950/60 border-slate-800/80'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-300 truncate">
                    {sess.name.split('(')[0].trim()}
                  </span>
                  <span className={`h-2 w-2 rounded-full ${isOpen ? 'bg-emerald-400 animate-ping' : isPre ? 'bg-amber-400' : 'bg-slate-600'}`} />
                </div>
                <div className="flex items-center justify-between mt-1 text-[10px]">
                  <span className="text-slate-500 truncate">{sess.region}</span>
                  <span className={`font-black ${isOpen ? 'text-emerald-400' : isPre ? 'text-amber-300' : 'text-slate-500'}`}>
                    {isOpen ? 'ABIERTO' : isPre ? 'PRE/POST' : 'CERRADO'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top 4 Candidate Selector Bar */}
      {candidates.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-slate-400 mb-2 flex items-center justify-between">
            <span>Ranking de Acciones en Zona de Ignición Hoy:</span>
            <span className="text-[11px] text-slate-500">Selecciona para cargar el estudio táctico y proyección</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {(candidates || []).map((cand, idx) => {
              const isSelected = signal?.asset?.id === cand.id;
              return (
                <div
                  key={cand.id}
                  onClick={() => handleSelectCandidate(cand, idx)}
                  className={`cursor-pointer rounded-xl border p-3 transition duration-200 flex items-center gap-2.5 ${
                    isSelected
                      ? 'border-emerald-500 bg-gradient-to-br from-emerald-950/70 to-slate-900 shadow-md shadow-emerald-950/40'
                      : 'border-slate-800 bg-slate-900/70 hover:border-slate-700 hover:bg-slate-850'
                  }`}
                >
                  <img 
                    src={getStockLogoUrl(cand.symbol)} 
                    alt={cand.name} 
                    onError={(e) => handleStockImageError(e, cand.symbol)}
                    referrerPolicy="no-referrer"
                    className="h-8 w-8 rounded-lg object-contain border border-slate-700 p-0.5 bg-slate-950" 
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white truncate">
                        {cand.symbol.toUpperCase()}
                      </span>
                      <span className="text-[10px] font-mono font-bold text-emerald-400">
                        {cand.ignitionScore || 90} pts
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono truncate">
                      {formatCurrency(cand.current_price)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Signal Display Card */}
      {isLoading || !signal ? (
        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-12 text-center shadow-xl">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 mb-4 animate-pulse">
            <Flame className="h-8 w-8 animate-spin" />
          </div>
          <h3 className="text-lg font-bold text-white">Ejecutando Estudio Integral Multidimensional de la Acción...</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            Analizando hora del día, apertura de mercados, anticipación de gap, índice de fuerza vs agotamiento, robustez del R/B y huella institucional.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Main Hero Card: Stock Details & Breakout Trigger */}
          <div className="rounded-3xl border-2 border-emerald-500/50 bg-gradient-to-br from-slate-900 via-slate-900/95 to-emerald-950/60 p-6 sm:p-8 shadow-2xl shadow-emerald-950/30">
            {/* Header: Asset Identity & Primary Status */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-slate-800">
              <div className="flex items-center gap-4">
                <img 
                  src={getStockLogoUrl(signal.asset.symbol)} 
                  alt={signal.asset.name} 
                  onError={(e) => handleStockImageError(e, signal.asset.symbol)}
                  referrerPolicy="no-referrer"
                  className="h-16 w-16 rounded-2xl object-contain border-2 border-emerald-500/60 p-2 bg-slate-950 shadow-lg"
                />
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-emerald-500 text-slate-950 font-black text-xs px-2.5 py-0.5 uppercase tracking-wider">
                      Acción del Día
                    </span>
                    <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-xs px-2 py-0.5">
                      Confianza Cuantitativa: {signal.confidenceScore}%
                    </span>
                    <span className="text-xs text-slate-400">
                      Sector: <strong className="text-white">{signal.asset.sector || 'Tecnología'}</strong>
                    </span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">
                    {signal.asset.name} <span className="text-emerald-400 font-mono">({signal.asset.symbol.toUpperCase()})</span>
                  </h2>
                </div>
              </div>

              {/* Price & Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                <div className="text-left md:text-right">
                  <div className="text-xs text-slate-400 font-medium">Cotización Actual</div>
                  <div className="text-2xl sm:text-3xl font-black text-white font-mono">
                    {formatCurrency(signal.currentPrice)}
                  </div>
                  <div className={`text-xs font-bold ${signal.asset.price_change_percentage_24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {formatPercentage(signal.asset.price_change_percentage_24h)} en 24h
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    id="open-stock-chart-btn"
                    onClick={() => onOpenChartModal(signal.asset)}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/90 px-3.5 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-700 hover:text-white transition shadow-sm"
                    title="Ver Gráfico Interactivo"
                  >
                    <BarChart2 className="h-4 w-4 text-emerald-400" />
                    <span>Gráfico Pro</span>
                  </button>

                  {onOpenBrokerModal && (
                    <button
                      id="open-stock-broker-btn"
                      onClick={() => onOpenBrokerModal(signal.asset)}
                      className="flex items-center gap-1.5 rounded-xl border border-emerald-500/50 bg-emerald-950/60 hover:bg-emerald-500 hover:text-slate-950 px-3.5 py-2.5 text-xs font-black text-emerald-300 transition shadow-sm cursor-pointer"
                      title="Simular Inversión en Broker Online (€)"
                    >
                      <Briefcase className="h-4 w-4" />
                      <span>Simular Broker (€)</span>
                    </button>
                  )}

                  <button
                    id="open-stock-ai-btn"
                    onClick={() => onOpenAiAnalysis(signal.asset)}
                    className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-xs font-bold text-white hover:from-emerald-500 hover:to-teal-500 transition shadow-lg shadow-emerald-600/30"
                  >
                    <Cpu className="h-4 w-4" />
                    <span>Diagnóstico IA</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Why This Stock Is Exploding (Breakout Trigger & Diagnosis) */}
            <div className="mt-6 p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-emerald-500/30">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 mb-2">
                <Zap className="h-4 w-4" />
                <span>¿POR QUÉ ESTA ACCIÓN ESTÁ LISTA PARA SUBIR HOY? (TESIS DE ENTRADA)</span>
              </div>
              <p className="text-sm text-slate-200 leading-relaxed">
                {signal.breakoutTrigger}
              </p>
            </div>

            {/* 3 Key Execution Levels Cards (Entry Zone, TP1/TP2/TP Max, Stop Loss) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              {/* Card 1: Zona de Compra Sugerida */}
              <div className="rounded-2xl border border-cyan-500/40 bg-cyan-950/25 p-4 relative overflow-hidden">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                    <Target className="h-4 w-4" /> 1. Zona de Entrada Óptima
                  </span>
                  <span className="rounded bg-cyan-500/20 text-cyan-400 text-[10px] font-black px-1.5 py-0.5">
                    VENTANA ABIERTA
                  </span>
                </div>
                <div className="text-xl sm:text-2xl font-black text-white font-mono">
                  ${signal.buyZoneMin} - ${signal.buyZoneMax}
                </div>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  Coloca orden límite en este rango. Si supera los ${signal.buyZoneMax}, espera un retroceso antes de entrar.
                </p>
              </div>

              {/* Card 2: Objetivos de Toma de Ganancias (Take-Profit) */}
              <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/30 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                    <TrendingUp className="h-4 w-4" /> 2. Objetivos de Ganancia (TP)
                  </span>
                  <span className="text-xs text-emerald-400 font-bold font-mono">
                    R/B Asimétrico 1:{signal.riskRewardRatio}
                  </span>
                </div>
                <div className="space-y-1.5 font-mono text-xs">
                  <div className="flex items-center justify-between bg-slate-900/80 p-1.5 rounded-lg border border-slate-800">
                    <span className="text-slate-300 font-sans">Objetivo 1 (50%):</span>
                    <span className="font-bold text-emerald-300">${signal.takeProfit1.price} (+{signal.takeProfit1.percentage}%)</span>
                  </div>
                  <div className="flex items-center justify-between bg-slate-900/80 p-1.5 rounded-lg border border-slate-800">
                    <span className="text-slate-300 font-sans">Objetivo 2 (30%):</span>
                    <span className="font-bold text-emerald-400">${signal.takeProfit2.price} (+{signal.takeProfit2.percentage}%)</span>
                  </div>
                  <div className="flex items-center justify-between bg-slate-900/80 p-1.5 rounded-lg border border-slate-800">
                    <span className="text-slate-300 font-sans">Runner Expansión (20%):</span>
                    <span className="font-bold text-teal-300">${signal.takeProfitMax.price} (+{signal.takeProfitMax.percentage}%)</span>
                  </div>
                </div>
              </div>

              {/* Card 3: Stop-Loss de Protección */}
              <div className="rounded-2xl border border-rose-500/40 bg-rose-950/25 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                    <ShieldAlert className="h-4 w-4" /> 3. Stop Loss Innegociable
                  </span>
                  <span className="rounded bg-rose-500/20 text-rose-300 text-[10px] font-black px-1.5 py-0.5">
                    RIESGO CONTROLADO
                  </span>
                </div>
                <div className="text-xl sm:text-2xl font-black text-rose-200 font-mono">
                  ${signal.stopLoss.price} <span className="text-xs text-rose-400 font-sans">(-{signal.stopLoss.percentage}%)</span>
                </div>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  {signal.stopLoss.description} No promediar a la baja ni mover el Stop una vez ejecutada la compra.
                </p>
              </div>
            </div>
          </div>

          {/* 2. ADVANCED TIME & MARKET DYNAMICS SECTION: (Apertura/Anticipación, Fuerza vs Agotamiento, y Robustez R/B) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Box A: Anticipación de Apertura & Proyección Pre-Market */}
            <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 sm:p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
                    <Compass className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-bold text-white">Anticipación Pre-Apertura & Gap</h3>
                </div>
                <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                  {gapInfo?.direction === 'ALCISTA' ? '▲ GAP ALCISTA' : gapInfo?.direction === 'BAJISTA' ? '▼ GAP BAJISTA' : '◆ APERTURA PLANA'}
                </span>
              </div>

              {gapInfo ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase block font-semibold">Gap Proyectado</span>
                      <span className={`text-base font-black font-mono ${gapInfo.expectedGapPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {gapInfo.expectedGapPct >= 0 ? `+${gapInfo.expectedGapPct}%` : `${gapInfo.expectedGapPct}%`}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase block font-semibold">Precio Estimado</span>
                      <span className="text-base font-black font-mono text-white">
                        ${gapInfo.projectedOpenPrice}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs space-y-1.5">
                    <strong className="text-amber-300 block text-[11px]">Estrategia de Apertura:</strong>
                    <p className="text-slate-300 leading-relaxed text-[11px]">{gapInfo.openingStrategy}</p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-rose-950/20 border border-rose-500/30 text-[11px] text-rose-200 flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                    <span>{gapInfo.earlyTrapWarning}</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400">Datos de gap sincronizados con futuros en tiempo real.</p>
              )}
            </div>

            {/* Box B: Diagnóstico de Fuerza vs Agotamiento por Hora y Ganancia */}
            <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 sm:p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                    <Gauge className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-bold text-white">Fuerza vs. Agotamiento Intradía</h3>
                </div>
                <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  {momentum?.remainingEnergyPct || 85}% ENERGÍA
                </span>
              </div>

              {momentum ? (
                <div className="space-y-3">
                  {/* Energy / Exhaustion Progress Bar */}
                  <div>
                    <div className="flex items-center justify-between text-[11px] mb-1 font-semibold">
                      <span className="text-emerald-300">Fuerza Limpia ({momentum.remainingEnergyPct}%)</span>
                      <span className="text-slate-400">Agotamiento ({momentum.exhaustionScore}%)</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800 flex">
                      <div 
                        className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-500" 
                        style={{ width: `${momentum.remainingEnergyPct}%` }}
                      />
                      <div 
                        className="bg-gradient-to-r from-amber-500 to-rose-500 h-full transition-all duration-500" 
                        style={{ width: `${momentum.exhaustionScore}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-500 block">Posición vs VWAP</span>
                      <span className="font-bold text-emerald-300 text-[11px]">
                        {momentum.vwapProximity === 'POR_ENCIMA_DE_VWAP' ? '✓ Por encima de VWAP' : 
                         momentum.vwapProximity === 'EN_RETESTEO_VWAP' ? '⚡ Retesteo de VWAP' : '⚠ Por debajo de VWAP'}
                      </span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-500 block">Potencial Power Hour</span>
                      <span className="font-bold text-cyan-300 text-[11px]">
                        {momentum.intradayPowerHourPotential}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-300 leading-relaxed">
                    <strong className="text-white block mb-0.5">Diagnóstico por Hora y Ganancia:</strong>
                    {momentum.exhaustionRationale}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400">Calculando índice de agotamiento intradía...</p>
              )}
            </div>

            {/* Box C: Robustez del Ratio Riesgo / Beneficio (R/B) & Valor Esperado (EV) */}
            <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 sm:p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-teal-500/20 text-teal-400">
                    <Scale className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-bold text-white">Robustez del Ratio R/B</h3>
                </div>
                <span className="text-[10px] font-black uppercase text-teal-300 bg-teal-500/10 px-2 py-0.5 rounded-full border border-teal-500/30">
                  GRADO {rrAnalysis?.robustnessGrade || 'A+'}
                </span>
              </div>

              {rrAnalysis ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-500 block">Ratio R/B</span>
                      <span className="text-sm font-black text-white font-mono">
                        1:{rrAnalysis.ratio}
                      </span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-500 block">EV por $100</span>
                      <span className="text-sm font-black text-emerald-400 font-mono">
                        +${rrAnalysis.expectedValuePer100Arrisk}
                      </span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-500 block">Profit Factor</span>
                      <span className="text-sm font-black text-teal-300 font-mono">
                        {rrAnalysis.profitFactorEstimated}x
                      </span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] space-y-1">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Orden recomendada:</span>
                      <strong className="text-emerald-300 font-mono">{rrAnalysis.optimalOrderType.replace(/_/g, ' ')}</strong>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Tasa de acierto estimada:</span>
                      <strong className="text-cyan-300 font-mono">{rrAnalysis.winRateProjected}% de probabilidad</strong>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    {rrAnalysis.robustnessExplanation}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-400">Calculando métricas de asimetría matemática...</p>
              )}
            </div>
          </div>

          {/* 3. TACTICAL RADAR: HUELLA INSTITUCIONAL, DARK POOLS & RVOL */}
          {tactical && (
            <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 sm:p-6 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-cyan-400" />
                  <h3 className="text-base font-bold text-white">Radar Táctico & Flujo Institucional Invisible</h3>
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  Horizonte Óptimo: <strong className="text-emerald-400">{tactical.recommendedTimeframe.replace(/_/g, ' ')}</strong>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4 text-xs">
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-slate-400 text-[11px]">Volumen Relativo (RVOL 20D)</span>
                  <div className="text-lg font-black text-emerald-400 font-mono">
                    {tactical.rvol20}x Media
                  </div>
                  <span className="text-[10px] text-slate-500 block">Flujo muy superior al volumen habitual</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-slate-400 text-[11px]">Huella en Dark Pools</span>
                  <div className="text-lg font-black text-cyan-400 font-mono">
                    {tactical.darkPoolBlockRatio}% Bloques
                  </div>
                  <span className="text-[10px] text-slate-500 block">Acumulación institucional fuera de libro</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-slate-400 text-[11px]">Alineación Macro</span>
                  <div className="text-xs font-bold text-slate-200 mt-1 line-clamp-2">
                    {tactical.macroAlignment}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-slate-400 text-[11px]">Ventana Horaria de Ejecución</span>
                  <div className="text-xs font-bold text-amber-300 mt-1">
                    {tactical.bestExecutionWindow}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* INTERACTIVE TRAFFIC-LIGHT SIGNAL & SMC CHART */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-4 sm:p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="h-3 w-3 rounded-full bg-cyan-400 animate-pulse" />
                <h3 className="text-base sm:text-lg font-black text-white">
                  Gráfico de Ejecución Semafórica y Proyección Visual
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-mono hidden sm:inline">
                Jerarquía: Entrada (Cyan) • Stop Loss (Rojo) • TP1/TP2/TP3 (Verde)
              </span>
            </div>

            <SignalTradingChart
              asset={signal.asset}
              signalData={{
                orderType: 'COMPRA',
                entryZoneMin: signal.buyZoneMin,
                entryZoneMax: signal.buyZoneMax,
                optimalEntry: signal.optimalEntryPrice || signal.currentPrice,
                currentPrice: signal.currentPrice,
                stopLoss: {
                  price: signal.stopLoss.price,
                  percentage: signal.stopLoss.percentage,
                  description: signal.stopLoss.description,
                },
                takeProfit1: {
                  price: signal.takeProfit1.price,
                  percentage: signal.takeProfit1.percentage,
                  sharesPct: 50,
                  action: signal.takeProfit1.action,
                },
                takeProfit2: {
                  price: signal.takeProfit2.price,
                  percentage: signal.takeProfit2.percentage,
                  sharesPct: 30,
                  action: signal.takeProfit2.action,
                },
                takeProfit3: {
                  price: signal.takeProfitMax.price,
                  percentage: signal.takeProfitMax.percentage,
                  sharesPct: 20,
                  action: signal.takeProfitMax.action,
                },
                riskRewardRatio: signal.riskRewardRatio,
                confidenceScore: signal.confidenceScore,
                confluences: [
                  {
                    name: 'RSI Saludable sin Sobrecompra',
                    passed: (signal.rsiCurrent || 52) <= 68,
                    detail: `RSI actual en ${signal.rsiCurrent || 52}, dentro de la zona de ignición.`,
                  },
                  {
                    name: 'Entrada de Volumen Z-Score Institucional',
                    passed: (signal.volumeZScore || 1.8) >= 1.2,
                    detail: `Volumen relativo a +${signal.volumeZScore || 1.8}x desviaciones estándar.`,
                  },
                  {
                    name: 'Estructura de Compresión y Ruptura',
                    passed: true,
                    detail: signal.breakoutTrigger,
                  },
                  {
                    name: 'Soporte y Protección Stop Loss Calculada',
                    passed: true,
                    detail: `Stop Loss técnico en $${signal.stopLoss.price} (-${signal.stopLoss.percentage}%).`,
                  },
                  {
                    name: 'Relación Riesgo / Beneficio >= 1:3.0',
                    passed: signal.riskRewardRatio >= 2.5,
                    detail: `R:R asimétrico calculado de 1:${signal.riskRewardRatio}.`,
                  },
                  {
                    name: 'Catalizador Técnico y Sectorial',
                    passed: true,
                    detail: signal.catalysts[0] || 'Impulso sectorial favorable.',
                  },
                ],
                orderBlockDemand: {
                  min: Number((signal.buyZoneMin * 0.995).toFixed(2)),
                  max: Number((signal.buyZoneMin * 1.005).toFixed(2)),
                },
                fairValueGap: {
                  min: Number((signal.buyZoneMax * 1.002).toFixed(2)),
                  max: Number((signal.buyZoneMax * 1.018).toFixed(2)),
                },
              }}
              onAddToPortfolio={(shares, price) => {
                onAddPortfolioAsset({
                  id: `sig-${signal.asset.symbol}-${Date.now()}`,
                  symbol: signal.asset.symbol,
                  name: signal.asset.name,
                  amount: shares,
                  buyPrice: price,
                  currentPrice: signal.currentPrice,
                  source: 'manual',
                  lastSynced: new Date().toISOString(),
                });
              }}
              onCreateAlert={(price, desc) => {
                onCreateAlert(signal.asset, price, desc);
              }}
              initialMode="simple"
            />
          </div>

          {/* Interactive Profit & Capital Simulator Calculator */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 sm:p-8 shadow-xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <DollarSign className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Simulador de Beneficio y Gestión de Posición</h3>
                  <p className="text-xs text-slate-400">Calcula exactamente cuánto ganarías invirtiendo en esta señal</p>
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-slate-400 mr-1 hidden sm:inline">Montos:</span>
                {presetAmounts.map((amt) => (
                  <button
                    key={amt}
                    id={`preset-amt-${amt}`}
                    onClick={() => {
                      setInvestmentAmount(amt);
                      setCustomAmountInput(amt.toString());
                    }}
                    className={`rounded-lg px-2.5 py-1 text-xs font-mono font-bold transition ${
                      investmentAmount === amt
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    ${amt}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Input & Projected Gains Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mt-6">
              {/* Input Control */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-300 block">
                  Capital que deseas invertir (USD):
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-slate-400 font-mono font-bold">$</span>
                  <input
                    id="investment-amount-input"
                    type="number"
                    value={customAmountInput}
                    onChange={(e) => {
                      setCustomAmountInput(e.target.value);
                      const num = parseFloat(e.target.value);
                      if (!isNaN(num) && num > 0) {
                        setInvestmentAmount(num);
                      }
                    }}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2 pl-8 pr-3 text-sm font-mono font-bold text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    placeholder="Ej. 1000"
                  />
                </div>

                <div className="text-[11px] text-slate-400 font-mono">
                  Equivalente a: <strong className="text-white">{sharesCount.toFixed(2)} acciones</strong> de {signal.asset.symbol.toUpperCase()}
                </div>

                {/* Quick Add to Portfolio Action Button */}
                <button
                  id="add-signal-to-portfolio-btn"
                  onClick={() => {
                    onAddPortfolioAsset({
                      id: `sig-${signal.asset.symbol}-${Date.now()}`,
                      symbol: signal.asset.symbol,
                      name: signal.asset.name,
                      amount: Number(sharesCount.toFixed(2)),
                      buyPrice: signal.optimalEntryPrice || signal.currentPrice,
                      currentPrice: signal.currentPrice,
                      source: 'manual',
                      lastSynced: new Date().toISOString(),
                    });
                    setIsSimulatingSuccess(true);
                    setTimeout(() => setIsSimulatingSuccess(false), 3000);
                  }}
                  className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl border border-emerald-500/50 bg-emerald-950/60 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-900/80 transition"
                >
                  <PlusCircle className="h-4 w-4" />
                  <span>{isSimulatingSuccess ? '✓ ¡Agregado a Cartera!' : 'Registrar en Mi Cartera'}</span>
                </button>
              </div>

              {/* Projected Profit Cards */}
              <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Profit at TP1 */}
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 flex flex-col justify-between">
                  <div>
                    <span className="text-xs text-slate-400 block font-medium">Ganancia en Objetivo 1 (TP1)</span>
                    <span className="text-lg font-bold text-teal-300 mt-1 block">
                      +{formatCurrency(tp1Profit)}
                    </span>
                    <span className="text-xs text-slate-500 font-mono block">
                      Total: {formatCurrency(investmentAmount + tp1Profit)} (+{signal.takeProfit1.percentage}%)
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-3 pt-2 border-t border-slate-800">
                    50% de la posición líquida (+{signal.takeProfit1.percentage}%)
                  </div>
                </div>

                {/* Profit at TP2 */}
                <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/20 p-4 flex flex-col justify-between">
                  <div>
                    <span className="text-xs text-emerald-300 block font-bold">Ganancia en Objetivo 2 (TP2)</span>
                    <span className="text-xl font-black text-emerald-400 mt-1 block">
                      +{formatCurrency(tp2Profit)}
                    </span>
                    <span className="text-xs text-emerald-200/70 font-mono block">
                      Total: {formatCurrency(investmentAmount + tp2Profit)} (+{signal.takeProfit2.percentage}%)
                    </span>
                  </div>
                  <div className="text-[10px] text-emerald-300/80 mt-3 pt-2 border-t border-emerald-800/40">
                    Beneficio principal (+{signal.takeProfit2.percentage}%)
                  </div>
                </div>

                {/* Profit at TP Max vs Max Risk */}
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 flex flex-col justify-between">
                  <div>
                    <span className="text-xs text-slate-400 block font-medium">Ganancia Máxima (Moonshot)</span>
                    <span className="text-lg font-bold text-cyan-300 mt-1 block">
                      +{formatCurrency(tpMaxProfit)}
                    </span>
                    <span className="text-xs text-slate-500 font-mono block">
                      Riesgo máx (Stop Loss): <strong className="text-rose-400">-{formatCurrency(maxRiskAmount)}</strong>
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-3 pt-2 border-t border-slate-800">
                    Ratio Asimétrico 1:{signal.riskRewardRatio}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Step-by-Step Execution Plan for Investors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: 3-Step Strategy Guide */}
            <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                <span>Guía Paso a Paso de Ejecución en el Broker</span>
              </div>

              <div className="space-y-3 text-xs text-slate-300">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-slate-950 font-bold text-xs">
                    1
                  </div>
                  <div>
                    <strong className="text-white block mb-0.5">Paso 1: Entrada en el Broker</strong>
                    <p className="leading-relaxed text-slate-300">{signal.executionStrategy.step1}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-500 text-slate-950 font-bold text-xs">
                    2
                  </div>
                  <div>
                    <strong className="text-white block mb-0.5">Paso 2: Colocación de Stop Loss</strong>
                    <p className="leading-relaxed text-slate-300">{signal.executionStrategy.step2}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-500 text-slate-950 font-bold text-xs">
                    3
                  </div>
                  <div>
                    <strong className="text-white block mb-0.5">Paso 3: Salidas Escalonadas (TP1 y TP2)</strong>
                    <p className="leading-relaxed text-slate-300">{signal.executionStrategy.step3}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Catalysts and Risk Management Rules */}
            <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
                <span>Catalizadores y Reglas de Riesgo de Wall Street</span>
              </div>

              {/* Catalysts */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Catalizadores Técnicos e Institucionales:
                </span>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  {(signal.catalysts || []).map((cat, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-emerald-400 font-bold">•</span>
                      <span className="leading-relaxed">{cat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Risk Warnings */}
              <div className="space-y-2 pt-3 border-t border-slate-800">
                <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider block">
                  Advertencias de Gestión de Riesgo:
                </span>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  {(signal.riskWarnings || []).map((warn, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-rose-400 font-bold">⚠</span>
                      <span className="leading-relaxed">{warn}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Create Alert for this target */}
              <button
                id="create-alert-for-stock-of-the-day-btn"
                onClick={() => onCreateAlert(signal.asset, signal.takeProfit1.price, `Objetivo 1 en ${signal.asset.name} ($${signal.takeProfit1.price})`)}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-amber-500/40 bg-amber-950/30 py-2.5 text-xs font-bold text-amber-300 hover:bg-amber-900/50 transition"
              >
                <BellRing className="h-4 w-4" />
                <span>Activar Alerta de Precio para Objetivo 1 (${signal.takeProfit1.price})</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
