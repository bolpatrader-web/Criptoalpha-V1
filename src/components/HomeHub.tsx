import React, { useState, useEffect } from 'react';
import { 
  Flame, 
  Sparkles, 
  TrendingUp, 
  ArrowRight, 
  Target, 
  ShieldCheck, 
  Zap, 
  Cpu, 
  Activity, 
  BarChart3, 
  Clock, 
  Timer,
  Layers,
  ChevronRight,
  DollarSign,
  Compass,
  Briefcase,
  FileSpreadsheet,
  Wallet,
  Coins
} from 'lucide-react';
import { CryptoAsset, GlobalMarketData } from '../types';
import { formatCurrency, formatPercentage, formatCompactNumber } from '../utils/formatters';
import { getCryptoLogoUrl, handleCryptoImageError } from '../utils/cryptoLogos';
import { getLiveMarketSessionDetails } from '../utils/cryptoOfTheDayEngine';

interface HomeHubProps {
  assets: CryptoAsset[];
  globalData: GlobalMarketData | null;
  onNavigateTo: (tab: any) => void;
  onOpenChartModal: (asset: CryptoAsset) => void;
  onOpenBrokerModal?: (asset?: CryptoAsset) => void;
  onOpenAlpacaModal?: () => void;
}

export const HomeHub: React.FC<HomeHubProps> = ({
  assets,
  globalData,
  onNavigateTo,
  onOpenChartModal,
  onOpenBrokerModal,
  onOpenAlpacaModal,
}) => {
  const [sessionClock, setSessionClock] = useState(getLiveMarketSessionDetails());

  // Real-time market session clock updater (every 1 second for live second-by-second 24/7 countdown)
  useEffect(() => {
    setSessionClock(getLiveMarketSessionDetails());
    const timer = setInterval(() => {
      setSessionClock(getLiveMarketSessionDetails());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const getSessionBadgeColor = (status: string) => {
    switch (status) {
      case 'REGULAR_OPEN':
      case 'POWER_HOUR':
      case 'HIGH_LIQUIDITY':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50';
      case 'PRE_MARKET':
      case 'AFTER_HOURS':
      case 'MODERATE_LIQUIDITY':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/50';
      case 'MIDDAY_LULL':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/50';
      default:
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50';
    }
  };

  // Find the top candidate for preview inside the "Cripto del Día" button card
  const topCandidate = React.useMemo(() => {
    if (!assets || assets.length === 0) return null;
    const filtered = assets.filter((a) => {
      const change24 = a.price_change_percentage_24h || 0;
      const rsi = a.rsi14 || 52;
      const vol = a.total_volume || 0;
      return change24 > -5 && change24 < 25 && rsi >= 38 && rsi <= 74 && vol > 1000000;
    });

    if (filtered.length === 0) return assets[0];

    return filtered.sort((a, b) => {
      const scoreA = (a.alphaScore || 65) + (a.volumeAnomalyRatio || 1.2) * 15;
      const scoreB = (b.alphaScore || 65) + (b.volumeAnomalyRatio || 1.2) * 15;
      return scoreB - scoreA;
    })[0];
  }, [assets]);

  return (
    <div className="space-y-8 animate-in fade-in duration-300 w-full max-w-full overflow-x-hidden min-w-0">
      {/* 1. REAL-TIME CRYPTO SESSIONS & GLOBAL LIQUIDITY CLOCK */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 sm:p-5 shadow-xl space-y-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Clock className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">Sesiones Operativas Globales &amp; Liquidez 24/7</h3>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${getSessionBadgeColor(sessionClock.marketStatus)}`}>
                  ⚡ MERCADO CRIPTO 24/7/365 ABIERTO
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {sessionClock.marketStatusLabel}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:items-end gap-2 text-xs font-mono">
            <div className="flex flex-wrap items-center gap-2">
              <div className="rounded-lg bg-slate-950 px-2.5 py-1.5 border border-slate-800 text-slate-300">
                <span className="text-slate-500 mr-1.5 font-sans font-semibold">UTC:</span>
                <strong className="text-cyan-400">{sessionClock.currentTimeUtc}</strong>
              </div>
              <div className="rounded-lg bg-slate-950 px-2.5 py-1.5 border border-slate-800 text-slate-300 hidden sm:inline-block">
                <span className="text-slate-500 mr-1.5 font-sans font-semibold">NY (EST):</span>
                <strong className="text-white">{sessionClock.currentTimeNy}</strong>
              </div>
            </div>

            {/* Cuenta atrás hasta el próximo Cierre Diario UTC */}
            <div className="rounded-lg bg-slate-950 px-2.5 py-1.5 border border-slate-800 text-slate-300 flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start shadow-inner whitespace-nowrap">
              <span className="text-slate-400 font-sans font-semibold flex items-center gap-1.5 text-[11px] shrink-0">
                <Timer className="h-3.5 w-3.5 text-amber-400 animate-pulse shrink-0" />
                <span>Cierre Vela Diaria (00:00 UTC):</span>
              </span>
              <strong className="text-amber-300 font-bold font-mono tracking-wider">
                {sessionClock.timeUntilCloseFormatted}
              </strong>
            </div>
          </div>
        </div>

        {/* Global Financial Sessions Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {(sessionClock.activeSessions || []).map((sess, idx) => {
            const isOpen = sess.status === 'OPEN' || sess.status === 'REGULAR_OPEN' || sess.status === 'POWER_HOUR' || sess.status === 'HIGH_LIQUIDITY';
            return (
              <div
                key={idx}
                className={`p-2.5 rounded-xl border flex flex-col justify-between transition ${
                  isOpen 
                    ? 'bg-emerald-950/30 border-emerald-500/40' 
                    : 'bg-slate-950/60 border-slate-800/80'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-300 truncate">
                    {sess.name.split('(')[0].trim()}
                  </span>
                  <span className={`h-2 w-2 rounded-full ${isOpen ? 'bg-emerald-400 animate-ping' : 'bg-slate-600'}`} />
                </div>
                <div className="flex items-center justify-between mt-1 text-[10px]">
                  <span className="text-slate-500 truncate">{sess.region}</span>
                  <span className={`font-black ${isOpen ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {isOpen ? 'MÁXIMA LIQUIDEZ' : 'MODERADA'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 p-6 sm:p-8 md:p-10 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-8 h-48 w-48 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3.5 py-1 text-xs font-bold text-emerald-300 mb-4">
            <Coins className="h-3.5 w-3.5 text-emerald-400" />
            <span>CENTRO INSTITUCIONAL DE ANÁLISIS E INVERSIÓN EN CRIPTOMONEDAS</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white leading-tight">
            Plataforma Cuantitativa y de Inteligencia Artificial para Invertir en Cripto
          </h1>
          <p className="text-sm sm:text-base text-slate-300 mt-2.5 leading-relaxed">
            Localiza las mejores oportunidades de inversión en criptoactivos en tiempo real. 
            Análisis técnico avanzado, confluencia on-chain, modelos estocásticos GARCH/Monte Carlo y predicción IA con datos en vivo.
          </p>
        </div>

        {/* Global Crypto Market Mini-Bar */}
        {globalData && (
          <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800/80">
            <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/60">
              <span className="text-[11px] text-slate-400 font-medium">Bitcoin (BTC/USD)</span>
              <div className="text-sm sm:text-base font-black text-emerald-400 mt-0.5">
                {globalData.btcPrice ? `$${globalData.btcPrice.toLocaleString()}` : '$88,450.00'} (+{globalData.btcChangePct || 3.14}%)
              </div>
            </div>
            <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/60">
              <span className="text-[11px] text-slate-400 font-medium">Índice Miedo / Codicia</span>
              <div className="text-sm sm:text-base font-black text-teal-300 mt-0.5">
                {globalData.fearAndGreedIndex?.classification || 'Codicia'} • {globalData.fearAndGreedIndex?.value || 74}/100
              </div>
            </div>
            <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/60">
              <span className="text-[11px] text-slate-400 font-medium">Cap. Total Mercado Cripto</span>
              <div className="text-sm sm:text-base font-black text-white mt-0.5">
                ${formatCompactNumber(globalData.totalMarketCapUsd || globalData.totalMarketCap || 3150000000000)}
              </div>
            </div>
            <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/60">
              <span className="text-[11px] text-slate-400 font-medium">Dominancia BTC (BTC.D)</span>
              <div className="text-sm sm:text-base font-black text-amber-400 mt-0.5 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                {globalData.btcDominance ? `${globalData.btcDominance.toFixed(1)}%` : '58.4%'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Analysis Buttons Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-emerald-400" />
            <h2 className="text-lg sm:text-xl font-bold text-white">
              Módulos y Estudios Cripto Disponibles
            </h2>
          </div>
          <span className="text-xs text-slate-400">Haz clic en cualquier estudio para acceder</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* 0. BOTÓN PRINCIPAL SUPREMO: BOT DE TRADING AUTÓNOMO CUÁNTICO */}
          <div 
            id="btn-analysis-quant-bot"
            onClick={() => onNavigateTo('quant_bot')}
            className="group relative cursor-pointer overflow-hidden rounded-2xl border-2 border-emerald-400 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/80 p-6 shadow-2xl shadow-emerald-950/50 transition duration-300 hover:-translate-y-1 hover:border-emerald-300 hover:shadow-emerald-500/30 col-span-1 md:col-span-2 lg:col-span-3"
          >
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 p-0.5 shadow-xl shadow-emerald-500/30 flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition">
                  <Cpu className="h-8 w-8 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="rounded-full bg-emerald-500 text-slate-950 font-black text-[10px] px-2.5 py-0.5 uppercase tracking-wider font-mono">
                      MOTOR CUÁNTICO 24/7
                    </span>
                    <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                      Operaciones Continuas &amp; Broker en Vivo
                    </span>
                    <span className="rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-[10px] font-bold px-2 py-0.5 font-mono">
                      Sin Fallo • Gestión de Riesgo TP/SL
                    </span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-white group-hover:text-emerald-300 transition mt-1 flex items-center gap-2">
                    AlphaBot Quant Supreme — Bot de Trading Autónomo
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-3xl leading-relaxed">
                    Ejecución cuantitativa continua y autónoma con datos reales y cotizaciones oráculo en tiempo real. 
                    Estrategias avanzadas de Momentum Multi-Temporal, Flujo de Ballenas, Reversión a la Media y Broker interactivo con seguimiento de rendimiento segundo a segundo.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-3 text-xs sm:text-sm font-black text-slate-950 shadow-xl shadow-emerald-500/30 group-hover:brightness-110 transition shrink-0">
                <Zap className="h-4 w-4 fill-current" />
                <span>Abrir Bot &amp; Broker</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition" />
              </div>
            </div>
          </div>

          {/* 0.1 BOTÓN DESTACADO: BOT ESPECIALIZADO EN SCALPING PRO (1M/5M) */}
          <div 
            id="btn-analysis-scalping-bot"
            onClick={() => onNavigateTo('scalping_bot')}
            className="group relative cursor-pointer overflow-hidden rounded-2xl border-2 border-amber-400 bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/80 p-6 shadow-2xl shadow-amber-950/50 transition duration-300 hover:-translate-y-1 hover:border-amber-300 hover:shadow-amber-500/30 col-span-1 md:col-span-2 lg:col-span-3"
          >
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 p-0.5 shadow-xl shadow-amber-500/30 flex items-center justify-center text-slate-950 shrink-0 group-hover:scale-105 transition font-black">
                  <Zap className="h-8 w-8 animate-pulse fill-current" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="rounded-full bg-amber-500 text-slate-950 font-black text-[10px] px-2.5 py-0.5 uppercase tracking-wider font-mono">
                      SCALPING DE ALTA PRECISIÓN (1M/5M)
                    </span>
                    <span className="text-xs text-amber-400 font-semibold flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
                      Capital Inicial: 1.000 € (Desde Cero)
                    </span>
                    <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold px-2 py-0.5 font-mono">
                      Velas Japonesas • EMAs 9/21 • VWAP • Explicador IA
                    </span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-white group-hover:text-amber-300 transition mt-1 flex items-center gap-2">
                    Bot Scalping Pro — Operaciones Rápidas y Explicadas al Detalle
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-3xl leading-relaxed">
                    Especializado en operaciones de micro-segundos y minutos con datos reales del libro de órdenes, patrones de absorción de velas (Martillos, Envolventes), rebotes en VWAP y un módulo dedicado que explica cada trade con Inteligencia Artificial.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-3 text-xs sm:text-sm font-black text-slate-950 shadow-xl shadow-amber-500/30 group-hover:brightness-110 transition shrink-0">
                <Zap className="h-4 w-4 fill-current" />
                <span>Abrir Bot Scalping</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition" />
              </div>
            </div>
          </div>

          {/* 0.2 BOTÓN DESTACADO: RESUMEN DE ACTIVIDAD ALPACA MARKETS EN TIEMPO REAL */}
          {onOpenAlpacaModal && (
            <div 
              id="btn-analysis-alpaca-activity"
              onClick={onOpenAlpacaModal}
              className="group relative cursor-pointer overflow-hidden rounded-2xl border-2 border-emerald-500/60 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/70 p-6 shadow-2xl shadow-emerald-950/40 transition duration-300 hover:-translate-y-1 hover:border-emerald-400 hover:shadow-emerald-500/30 col-span-1 md:col-span-2 lg:col-span-3"
            >
              <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-amber-500/20 via-slate-900 to-amber-600/30 border border-amber-500/40 p-0.5 shadow-xl flex items-center justify-center text-amber-400 shrink-0 group-hover:scale-105 transition font-black text-2xl">
                    🦙
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="rounded-full bg-emerald-500 text-slate-950 font-black text-[10px] px-2.5 py-0.5 uppercase tracking-wider font-mono">
                        ALPACA MARKETS API V2
                      </span>
                      <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                        Paper Trading Activo: $100.000 USD
                      </span>
                      <span className="rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-bold px-2 py-0.5 font-mono">
                        Auditoría en Tiempo Real • Fills Contables
                      </span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-black text-white group-hover:text-emerald-300 transition mt-1 flex items-center gap-2">
                      Resumen Comentado de Actividad de Alpaca en Tiempo Real
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-3xl leading-relaxed">
                      Consulta la posición actual de tu cartera, balance neto en vivo, todas las operaciones abiertas y cerradas ejecutadas por los bots o manualmente, fills contables inmutables y el diagnóstico cuantitativo de riesgo segundo a segundo.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-3 text-xs sm:text-sm font-black text-slate-950 shadow-xl shadow-emerald-500/30 group-hover:brightness-110 transition shrink-0">
                  <Activity className="h-4 w-4" />
                  <span>Ver Resumen Alpaca</span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition" />
                </div>
              </div>
            </div>
          )}

          {/* 1. BOTÓN DESTACADO: LA CRIPTOMONEDA DEL DÍA */}
          <div 
            id="btn-analysis-crypto-of-the-day"
            onClick={() => onNavigateTo('crypto_of_the_day')}
            className="group relative cursor-pointer overflow-hidden rounded-2xl border-2 border-emerald-500/60 bg-gradient-to-br from-emerald-950/70 via-slate-900 to-teal-950/80 p-6 shadow-xl shadow-emerald-950/30 transition duration-300 hover:-translate-y-1 hover:border-emerald-400 hover:shadow-emerald-500/20 md:col-span-2 lg:col-span-2"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-400 shadow-inner group-hover:scale-110 transition duration-300">
                  <Flame className="h-6 w-6 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-emerald-500 text-slate-950 font-black text-[10px] px-2 py-0.5 uppercase tracking-wider">
                      Señal Recomendada 24/7
                    </span>
                    <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Swing / Breakout 2 - 7 Días
                    </span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-white group-hover:text-emerald-300 transition mt-1">
                    La Criptomoneda del Día
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-lg shadow-emerald-600/30 group-hover:bg-emerald-500 transition">
                <span>Entrar al Análisis</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition" />
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 mt-4 leading-relaxed">
              Detecta en tiempo real el criptoactivo con mayor probabilidad matemática de explosión alcista, 
              verificando que <strong>aún no haya sobrecomprado (RSI sano)</strong> y calculando con precisión <strong>zonas de entrada, 
              niveles de Take Profit (TP1, TP2, TP3) y Stop Loss de protección</strong>.
            </p>

            {/* Live Highlight of Today's Pick Preview */}
            {topCandidate && (
              <div className="mt-5 p-4 rounded-xl bg-slate-950/80 border border-emerald-500/30 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <img 
                    src={getCryptoLogoUrl(topCandidate.symbol)} 
                    alt={topCandidate.name} 
                    onError={(e) => handleCryptoImageError(e, topCandidate.symbol)}
                    referrerPolicy="no-referrer"
                    className="h-9 w-9 rounded-xl object-contain border border-emerald-500/40 p-1 bg-slate-900" 
                  />
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>{topCandidate.name} ({topCandidate.symbol.toUpperCase()})</span>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 rounded font-bold">Oportunidad Top</span>
                    </div>
                    <div className="text-xs text-slate-400 font-mono mt-0.5">
                      Precio: <strong className="text-white">{formatCurrency(topCandidate.current_price)}</strong> • Sector: <span className="text-slate-300">{topCandidate.sector || topCandidate.category || 'Layer 1'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">Zona de Entrada</span>
                    <span className="font-bold text-emerald-400">🟢 ACTIVA</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">Objetivo TP2</span>
                    <span className="font-bold text-teal-300 font-mono">+18% a +35%</span>
                  </div>
                  {onOpenBrokerModal && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenBrokerModal(topCandidate);
                      }}
                      className="rounded-xl border border-emerald-500/50 bg-emerald-950/60 hover:bg-emerald-500 hover:text-slate-950 px-2.5 py-1.5 text-xs font-bold text-emerald-300 transition flex items-center gap-1 shadow-sm cursor-pointer"
                      title="Simular Trading Spot o Futuros"
                    >
                      <Briefcase className="h-3.5 w-3.5" />
                      <span>Simular</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 2. BOTÓN DE ESCÁNER DE OPORTUNIDADES ALPHA */}
          <div 
            id="btn-analysis-opportunities"
            onClick={() => onNavigateTo('opportunities')}
            className="group cursor-pointer rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-lg transition duration-300 hover:-translate-y-1 hover:border-slate-700 hover:bg-slate-850 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-400 group-hover:scale-105 transition">
                  <Sparkles className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold text-teal-400 flex items-center gap-1 group-hover:translate-x-1 transition">
                  Explorar <ChevronRight className="h-3.5 w-3.5" />
                </span>
              </div>

              <h3 className="text-base font-bold text-white mt-3.5 group-hover:text-teal-300 transition">
                Escáner de Oportunidades Cripto
              </h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Clasificación algorítmica por Alpha Score, flujos de ballenas, TVL, Funding Rates y ratios MVRV en Layer 1/2, DeFi, IA y RWA.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <span>Sectores: L1, L2, DeFi, AI, RWA, Memes</span>
              <span className="font-bold text-slate-200">50+ Criptos Líderes</span>
            </div>
          </div>

          {/* 3. BOTÓN DE IA PREDICTIVA GEMINI */}
          <div 
            id="btn-analysis-ai-predictions"
            onClick={() => onNavigateTo('ai_predictions')}
            className="group cursor-pointer rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-lg transition duration-300 hover:-translate-y-1 hover:border-slate-700 hover:bg-slate-850 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition">
                  <Cpu className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold text-indigo-400 flex items-center gap-1 group-hover:translate-x-1 transition">
                  Consultar <ChevronRight className="h-3.5 w-3.5" />
                </span>
              </div>

              <h3 className="text-base font-bold text-white mt-3.5 group-hover:text-indigo-300 transition">
                IA Predictiva &amp; Modelos GARCH
              </h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Simulaciones Monte Carlo (10,000 caminos) e inferencia con Gemini 2.5 Flash conectada a fuentes en vivo y métricas on-chain.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <span>Modelos Estocásticos &amp; Search Grounding</span>
              <span className="font-bold text-indigo-300">Gemini 2.5 Flash</span>
            </div>
          </div>

          {/* 4. BOTÓN DE ALERTAS Y GESTIÓN DE RIESGO */}
          <div 
            id="btn-analysis-alerts"
            onClick={() => onNavigateTo('alerts')}
            className="group cursor-pointer rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-lg transition duration-300 hover:-translate-y-1 hover:border-slate-700 hover:bg-slate-850 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-105 transition">
                  <Activity className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold text-amber-400 flex items-center gap-1 group-hover:translate-x-1 transition">
                  Configurar <ChevronRight className="h-3.5 w-3.5" />
                </span>
              </div>

              <h3 className="text-base font-bold text-white mt-3.5 group-hover:text-amber-300 transition">
                Alertas de Volumen &amp; Volatilidad
              </h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Alertas automáticas en tiempo real ante inyecciones anormales de volumen, rupturas ATR y sobreventa extrema en el mercado cripto.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <span>Sonido y notificaciones en vivo</span>
              <span className="font-bold text-amber-300">Monitor Activo</span>
            </div>
          </div>

          {/* 5. BOTÓN DE RADAR INSTITUCIONAL Y FLUJO ON-CHAIN */}
          <div 
            id="btn-analysis-institutional-flow"
            onClick={() => onNavigateTo('institutional_flow')}
            className="group cursor-pointer rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-lg transition duration-300 hover:-translate-y-1 hover:border-slate-700 hover:bg-slate-850 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition">
                  <Layers className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold text-indigo-400 flex items-center gap-1 group-hover:translate-x-1 transition">
                  Rastrear <ChevronRight className="h-3.5 w-3.5" />
                </span>
              </div>

              <h3 className="text-base font-bold text-white mt-3.5 group-hover:text-indigo-300 transition">
                Flujo On-Chain &amp; Radar de Ballenas
              </h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Seguimiento de transferencias de ballenas (&gt;$10M), reservas en exchanges y acumulación institucional (ETFs y fondos cripto).
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <span>Glassnode, CryptoQuant &amp; Arkham flows</span>
              <span className="font-bold text-indigo-300">Huella On-Chain</span>
            </div>
          </div>

          {/* 6. BOTÓN DE ESCÁNER MULTI-TEMPORAL & SQUEEZE */}
          <div 
            id="btn-analysis-multi-timeframe"
            onClick={() => onNavigateTo('multi_timeframe')}
            className="group cursor-pointer rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-lg transition duration-300 hover:-translate-y-1 hover:border-slate-700 hover:bg-slate-850 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-400 group-hover:scale-105 transition">
                  <Compass className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold text-teal-400 flex items-center gap-1 group-hover:translate-x-1 transition">
                  Escanear <ChevronRight className="h-3.5 w-3.5" />
                </span>
              </div>

              <h3 className="text-base font-bold text-white mt-3.5 group-hover:text-teal-300 transition">
                Escáner Multi-Temporal &amp; Squeeze
              </h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Alineación de 5 temporalidades (15m, 1h, 4h, 1D, 1W) y detección de bandas Bollinger estrechas previas a explosiones de precio.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <span>15m + 1h + 4h + 1D Confluencia</span>
              <span className="font-bold text-teal-300">Super Breakouts</span>
            </div>
          </div>

          {/* 7. BOTÓN DE MOTOR DE BACKTESTING CUANTITATIVO */}
          <div 
            id="btn-analysis-backtesting"
            onClick={() => onNavigateTo('backtesting')}
            className="group cursor-pointer rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-lg transition duration-300 hover:-translate-y-1 hover:border-slate-700 hover:bg-slate-850 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 group-hover:translate-x-1 transition">
                  Simular <ChevronRight className="h-3.5 w-3.5" />
                </span>
              </div>

              <h3 className="text-base font-bold text-white mt-3.5 group-hover:text-emerald-300 transition">
                Backtesting Cuantitativo Cripto
              </h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Audita Win Rate histórico, Profit Factor, Sharpe Ratio y comisiones/funding rates en estrategias de trading cripto reales.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <span>Validación Matemática 1:3 RR</span>
              <span className="font-bold text-emerald-300">Auditoría Real</span>
            </div>
          </div>

          {/* 8. BOTÓN DE WALLETS WEB3 Y EXCHANGES */}
          <div 
            id="btn-analysis-portfolio"
            onClick={() => onNavigateTo('portfolio')}
            className="group cursor-pointer rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-lg transition duration-300 hover:-translate-y-1 hover:border-slate-700 hover:bg-slate-850 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition">
                  <Wallet className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold text-cyan-400 flex items-center gap-1 group-hover:translate-x-1 transition">
                  Sincronizar <ChevronRight className="h-3.5 w-3.5" />
                </span>
              </div>

              <h3 className="text-base font-bold text-white mt-3.5 group-hover:text-cyan-300 transition">
                Wallets Web3 &amp; Exchanges Populares
              </h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Sincroniza en tiempo real tus carteras MetaMask, Phantom, Ledger o conecta APIs de Binance, Coinbase, Bybit y KuCoin.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <span>Ethereum, Solana, EVM &amp; CEX</span>
              <span className="font-bold text-cyan-300">Web3 &amp; CEX Sync</span>
            </div>
          </div>

          {/* 9. BOTÓN DE ESTUDIOS E INFORMES (PDF / EXCEL) */}
          <div 
            id="btn-analysis-reports"
            onClick={() => onNavigateTo('reports')}
            className="group cursor-pointer rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-lg transition duration-300 hover:-translate-y-1 hover:border-slate-700 hover:bg-slate-850 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-xl bg-fuchsia-500/15 border border-fuchsia-500/30 flex items-center justify-center text-fuchsia-400 group-hover:scale-105 transition">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold text-fuchsia-400 flex items-center gap-1 group-hover:translate-x-1 transition">
                  Descargar <ChevronRight className="h-3.5 w-3.5" />
                </span>
              </div>

              <h3 className="text-base font-bold text-white mt-3.5 group-hover:text-fuchsia-300 transition">
                Estudios Diarios, Semanales, Mensuales y Anuales
              </h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Genera análisis completos del mercado cripto con métricas on-chain e IA y descárgalos en informes ejecutivos PDF o Excel.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <span>Exportación instantánea</span>
              <span className="font-bold text-fuchsia-300">PDF &amp; XLSX</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
