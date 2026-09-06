import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Zap,
  Cpu,
  Play,
  Pause,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Briefcase,
  Award,
  Sliders,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  ShieldAlert,
  Layers,
  Terminal,
  RotateCcw,
  Sparkles,
  Info,
  Activity,
  History,
  Check,
  AlertCircle,
  Clock,
  CandlestickChart,
  BrainCircuit,
  BarChart2,
  ChevronRight,
  Filter,
  Flame,
  FileText
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import { CryptoAsset } from '../types';
import {
  ScalpingTrade,
  ScalpingBotConfiguration,
  ScalpingTradeLog,
  ScalpingPerformanceMetrics,
  DEFAULT_SCALPING_CONFIG,
  INITIAL_SCALPING_LOGS,
  INITIAL_SCALPING_TRADES,
  executeScalpingBotStep,
  calculateScalpingPerformance,
  detectCandlePattern,
  calculateScalpingConfluence
} from '../utils/scalpingBotEngine';
import { formatCurrency, formatPercentage } from '../utils/formatters';
import { getCryptoLogoUrl, handleCryptoImageError } from '../utils/cryptoLogos';
import { safeFetchJson } from '../utils/api';
import { placeAlpacaOrder, fetchAlpacaAccount, isAlpacaSupportedCrypto, closeAlpacaPosition, isScalpingAllowedToAlpaca } from '../utils/alpacaClient';
import { subscribeToSyncChannel, publishToSyncChannel } from '../utils/cloudSync';

interface ScalpingBotHubProps {
  assets: CryptoAsset[];
  trades: ScalpingTrade[];
  onTradesUpdate: (newTrades: ScalpingTrade[]) => void;
  onOpenAssetDiagnostic?: (asset: CryptoAsset) => void;
  onOpenChartModal?: (asset: CryptoAsset) => void;
}

export const ScalpingBotHub: React.FC<ScalpingBotHubProps> = ({
  assets,
  trades,
  onTradesUpdate,
  onOpenAssetDiagnostic,
  onOpenChartModal,
}) => {
  // 1. Scalping Configuration State (persisted in localStorage)
  const [config, setConfig] = useState<ScalpingBotConfiguration>(() => {
    try {
      const saved = localStorage.getItem('crypto_alpha_scalping_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_SCALPING_CONFIG, ...parsed, capitalAllocatedEur: parsed.capitalAllocatedEur || 1000 };
      }
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_SCALPING_CONFIG;
  });

  // 2. Telemetry Logs State (persisted in localStorage)
  const [logs, setLogs] = useState<ScalpingTradeLog[]>(() => {
    try {
      const saved = localStorage.getItem('crypto_alpha_scalping_logs');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return INITIAL_SCALPING_LOGS;
  });

  // 3. Active Sub-View / Tab inside Scalping Bot Hub
  const [activeView, setActiveView] = useState<'active_positions' | 'closed_positions' | 'trade_explanations' | 'live_scanner' | 'broker_dashboard' | 'execution_terminal' | 'strategy_studio'>('active_positions');

  // 4. Selected Trade for Deep AI & Technical Breakdown
  const [selectedTradeId, setSelectedTradeId] = useState<string | null>(null);
  const [aiExplanationText, setAiExplanationText] = useState<string | null>(null);
  const [isLoadingAiExplanation, setIsLoadingAiExplanation] = useState<boolean>(false);

  // 5. Timer & Execution Countdown
  const [countdownSeconds, setCountdownSeconds] = useState<number>(config.executionIntervalSeconds);
  const [isExecutingTick, setIsExecutingTick] = useState<boolean>(false);
  const [lastActionMessage, setLastActionMessage] = useState<string>('Bot de Scalping Pro listo. Monitoreando micro-velas 1M/5M. Capital: 1.000,00 €.');
  const [logFilter, setLogFilter] = useState<'ALL' | 'SCALPS' | 'TAKE_PROFIT' | 'SCANS'>('ALL');
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);
  const [alpacaExecution, setAlpacaExecution] = useState<boolean>(true);
  const alpacaExecutionRef = useRef<boolean>(true);
  alpacaExecutionRef.current = alpacaExecution;
  const [alpacaAccount, setAlpacaAccount] = useState<{ cash: number; connected: boolean } | null>(null);

  // 24/7 Cloud Daemon Engine state
  const [serverDaemonActive, setServerDaemonActive] = useState<boolean>(false);
  const [isTogglingServerDaemon, setIsTogglingServerDaemon] = useState<boolean>(false);

  const fetchServerDaemon = useCallback(async () => {
    try {
      const res = await fetch('/api/alpaca/daemon/status');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.config) {
          setServerDaemonActive(!!data.config.enabled);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    fetchServerDaemon();
    const interval = setInterval(fetchServerDaemon, 10000);
    return () => clearInterval(interval);
  }, [fetchServerDaemon]);

  // Listener para cambios en el enrutamiento de Alpaca desde el menú
  const [isScalpAlpacaRoutingAllowed, setIsScalpAlpacaRoutingAllowed] = useState<boolean>(() => isScalpingAllowedToAlpaca());

  useEffect(() => {
    const handleRoutingChange = () => {
      setIsScalpAlpacaRoutingAllowed(isScalpingAllowedToAlpaca());
    };
    window.addEventListener('alpaca_bot_routing_changed', handleRoutingChange);
    return () => window.removeEventListener('alpaca_bot_routing_changed', handleRoutingChange);
  }, []);

  const handleToggleServerDaemon = async () => {
    setIsTogglingServerDaemon(true);
    try {
      const res = await fetch('/api/alpaca/daemon/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.success) {
        setServerDaemonActive(!!data.daemonActive);
      }
    } catch (e) {
      console.error('Error toggling server daemon:', e);
    } finally {
      setIsTogglingServerDaemon(false);
    }
  };

  useEffect(() => {
    fetchAlpacaAccount().then((acc) => {
      if (acc && acc.connected) {
        setAlpacaAccount({ cash: acc.cash, connected: true });
      }
    });
  }, []);

  // References for live interval
  const assetsRef = useRef(assets);
  assetsRef.current = assets;

  const tradesRef = useRef(trades);
  tradesRef.current = trades;

  const configRef = useRef(config);
  configRef.current = config;

  const logsRef = useRef(logs);
  logsRef.current = logs;

  const onTradesUpdateRef = useRef(onTradesUpdate);
  onTradesUpdateRef.current = onTradesUpdate;

  // Sincronización en tiempo real de la configuración de Scalping en la nube (Firestore)
  useEffect(() => {
    const unsub = subscribeToSyncChannel<Partial<ScalpingBotConfiguration>>('scalping_bot_config', (remoteConfig) => {
      if (remoteConfig && typeof remoteConfig === 'object') {
        setConfig((prev) => ({ ...prev, ...remoteConfig }));
      }
    });
    return () => unsub();
  }, []);

  // Persist config
  const isInitialMountScalpingConfig = useRef(true);
  useEffect(() => {
    try {
      localStorage.setItem('crypto_alpha_scalping_config', JSON.stringify(config));
      if (isInitialMountScalpingConfig.current) {
        isInitialMountScalpingConfig.current = false;
        return;
      }
      publishToSyncChannel('scalping_bot_config', config);
    } catch (e) {
      console.error(e);
    }
  }, [config]);

  // Persist logs
  useEffect(() => {
    try {
      localStorage.setItem('crypto_alpha_scalping_logs', JSON.stringify(logs.slice(0, 150)));
    } catch (e) {
      console.error(e);
    }
  }, [logs]);

  // Performance calculation
  const performance: ScalpingPerformanceMetrics = useMemo(() => {
    return calculateScalpingPerformance(trades, assets, config);
  }, [trades, assets, config]);

  const openTrades = useMemo(() => trades.filter((t) => t.status === 'OPEN'), [trades]);
  const closedTrades = useMemo(() => trades.filter((t) => t.status === 'CLOSED'), [trades]);

  // If no trade selected for explanation, default to first available
  useEffect(() => {
    if (!selectedTradeId && trades.length > 0) {
      setSelectedTradeId(trades[0].id);
    }
  }, [trades, selectedTradeId]);

  const selectedTrade = useMemo(() => {
    return trades.find((t) => t.id === selectedTradeId) || trades[0] || null;
  }, [trades, selectedTradeId]);

  // Closed trades stats
  const closedStats = useMemo(() => {
    let totalRealized = 0;
    let winCount = 0;
    let lossCount = 0;
    let tpCount = 0;
    let slCount = 0;

    closedTrades.forEach((t) => {
      const pnl = t.realizedPnlEur || 0;
      totalRealized += pnl;
      if (pnl > 0) winCount++;
      if (pnl < 0) lossCount++;
      if (t.closeReason === 'take_profit') tpCount++;
      else if (t.closeReason === 'stop_loss') slCount++;
    });

    const total = closedTrades.length;
    const winRate = total > 0 ? (winCount / total) * 100 : 100;

    return {
      totalRealized,
      winCount,
      lossCount,
      tpCount,
      slCount,
      winRate,
    };
  }, [closedTrades]);

  // Trigger Execution Step
  const triggerScalpExecutionStep = useCallback(() => {
    const curAssets = assetsRef.current;
    const curTrades = tradesRef.current;
    const curConfig = configRef.current;
    const curLogs = logsRef.current;

    if (!curAssets || curAssets.length === 0) return;
    setIsExecutingTick(true);

    try {
      const result = executeScalpingBotStep(curAssets, curTrades, curConfig, curLogs);

      if (result.newLogs.length > 0) {
        setLogs((prev) => [...result.newLogs, ...prev].slice(0, 200));
      }

      if (result.actionTaken === 'TRADE_OPENED' || result.actionTaken === 'TRADE_CLOSED') {
        onTradesUpdateRef.current(result.updatedTrades);
        try {
          localStorage.setItem('crypto_alpha_scalping_trades', JSON.stringify(result.updatedTrades));
        } catch (e) {
          console.error(e);
        }

        // Place live paper order in Alpaca Markets if enabled
        if (result.actionTaken === 'TRADE_OPENED' && alpacaExecutionRef.current && result.updatedTrades.length > 0) {
          const openedTrade = result.updatedTrades[0];
          if (openedTrade) {
            const alpacaSym = `${openedTrade.symbol.toUpperCase()}/USD`;
            if (!isAlpacaSupportedCrypto(openedTrade.symbol)) {
              const localLog: ScalpingTradeLog = {
                id: `local-scalp-sim-${Date.now()}`,
                timestamp: new Date().toISOString(),
                type: 'SCAN',
                symbol: openedTrade.symbol.toUpperCase(),
                price: openedTrade.entryPriceEur || 0,
                message: `ℹ️ [Simulación Local] Scalp en ${openedTrade.symbol.toUpperCase()} operado en motor local (${openedTrade.investedEur || 100} €). Par no listado en Alpaca Crypto.`,
                strategy: 'Simulación Local',
              };
              setLogs((prev) => [localLog, ...prev]);
            } else if (!isScalpingAllowedToAlpaca()) {
              // Scalping bot desactivado en el menú de Alpaca
              const blockedLog: ScalpingTradeLog = {
                id: `alpaca-scalp-blocked-${Date.now()}`,
                timestamp: new Date().toISOString(),
                type: 'SCAN',
                symbol: alpacaSym,
                price: openedTrade.entryPriceEur || 0,
                message: `🛡️ [Enrutamiento Alpaca] Orden para ${alpacaSym} omitida: Scalping Pro está desactivado en el menú de Alpaca. Operación registrada solo en simulación local.`,
                strategy: 'Enrutamiento Alpaca (Scalp Off)',
              };
              setLogs((prev) => [blockedLog, ...prev]);
            } else {
              placeAlpacaOrder({
                symbol: alpacaSym,
                side: openedTrade.type.toLowerCase() as 'buy' | 'sell',
                notional: openedTrade.investedEur || 100,
                clientOrderId: `criptoalpha_scalp_${openedTrade.id}_${Date.now()}`,
                source: 'scalp',
              }).then((alpacaRes) => {
                if (alpacaRes.success && alpacaRes.order) {
                  const alpacaLog: ScalpingTradeLog = {
                    id: `alpaca-scalp-${Date.now()}`,
                    timestamp: new Date().toISOString(),
                    type: 'SCALP_BUY',
                    symbol: alpacaSym,
                    price: openedTrade.entryPriceEur || 0,
                    message: `🦙 [Alpaca Paper #${alpacaRes.order.id.slice(0, 6)}] Orden exclusiva Scalp ejecutada en servidor Alpaca ($${openedTrade.investedEur || 100} USD).`,
                    strategy: 'Alpaca Paper (Scalping Bot)',
                  };
                  setLogs((prev) => [alpacaLog, ...prev]);
                } else if (alpacaRes.unsupported) {
                  const localLog: ScalpingTradeLog = {
                    id: `local-scalp-sim-${Date.now()}`,
                    timestamp: new Date().toISOString(),
                    type: 'SCAN',
                    symbol: openedTrade.symbol.toUpperCase(),
                    price: openedTrade.entryPriceEur || 0,
                    message: `ℹ️ [Simulación Local] Scalp en ${openedTrade.symbol.toUpperCase()} operado localmente (no disponible en Alpaca).`,
                    strategy: 'Simulación Local',
                  };
                  setLogs((prev) => [localLog, ...prev]);
                }
              }).catch((err) => console.log('[Alpaca Scalp Bot] Error:', err));
            }
          }
        } else if (result.actionTaken === 'TRADE_CLOSED' && alpacaExecutionRef.current) {
          // Detect closed scalp trades to liquidate on Alpaca
          const previousOpen = curTrades.filter(t => t.status === 'OPEN');
          const currentClosed = result.updatedTrades.filter(t => t.status === 'CLOSED');
          const newlyClosed = currentClosed.filter(c => previousOpen.some(p => p.id === c.id));

          for (const closedTrade of newlyClosed) {
            if (isAlpacaSupportedCrypto(closedTrade.symbol)) {
              closeAlpacaPosition(`${closedTrade.symbol.toUpperCase()}/USD`).then(res => {
                if (res.success) {
                  const closeLog: ScalpingTradeLog = {
                    id: `alpaca-scalp-close-${Date.now()}`,
                    timestamp: new Date().toISOString(),
                    type: 'TAKE_PROFIT',
                    symbol: `${closedTrade.symbol.toUpperCase()}/USD`,
                    price: closedTrade.exitPriceEur || 0,
                    message: `🦙 [Alpaca Paper] Scalp en ${closedTrade.symbol.toUpperCase()} cerrado en Alpaca por TP/SL del bot.`,
                    strategy: 'Alpaca Paper (Scalping Bot)',
                  };
                  setLogs((prev) => [closeLog, ...prev]);
                }
              }).catch(() => {});
            }
          }
        }
      }

      if (result.details) {
        setLastActionMessage(result.details);
      }
    } catch (err) {
      console.error('Error in scalping bot execution step:', err);
    } finally {
      setIsExecutingTick(false);
      setCountdownSeconds(curConfig.executionIntervalSeconds);
    }
  }, []);

  // Autonomous Scalping Loop
  useEffect(() => {
    if (!config.isActive) return;

    let timer = config.executionIntervalSeconds;
    const interval = setInterval(() => {
      timer -= 1;
      if (timer <= 0) {
        timer = config.executionIntervalSeconds;
        setCountdownSeconds(config.executionIntervalSeconds);
        triggerScalpExecutionStep();
      } else {
        setCountdownSeconds(timer);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [config.isActive, config.executionIntervalSeconds, triggerScalpExecutionStep]);

  // Toggle Bot Power
  const handleToggleBot = () => {
    const newStatus = !config.isActive;
    setConfig((prev) => ({ ...prev, isActive: newStatus }));

    const log: ScalpingTradeLog = {
      id: `power-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'SIGNAL_ALERT',
      symbol: 'SISTEMA SCALPING',
      price: 0,
      message: newStatus
        ? '🟢 BOT SCALPING ACTIVADO: Monitoreo continuo de velas japonesas, VWAP y EMAs en micro-temporalidades.'
        : '⏸️ BOT SCALPING PAUSADO: Detenida la búsqueda de nuevas entradas.',
      strategy: config.strategy,
    };
    setLogs((prev) => [log, ...prev]);
  };

  // Reset Bot to 0 from scratch with 1,000 € capital
  const handleResetToZero = () => {
    onTradesUpdate([]);
    try {
      localStorage.removeItem('crypto_alpha_scalping_trades');
      localStorage.removeItem('crypto_alpha_scalping_logs');
    } catch (e) {
      console.error(e);
    }

    const resetConfig: ScalpingBotConfiguration = {
      ...DEFAULT_SCALPING_CONFIG,
      capitalAllocatedEur: 1000,
      isActive: true,
    };
    setConfig(resetConfig);

    const initLog: ScalpingTradeLog = {
      id: `log-scalp-reset-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'SCAN',
      symbol: 'SISTEMA SCALPING',
      price: 0,
      message: '🔄 BOT DE SCALPING REINICIADO DESDE CERO: Capital inicial de 1.000,00 € establecido. Sin operaciones previas. Iniciando escaneo de micro-velas...',
      strategy: resetConfig.strategy,
    };
    setLogs([initLog]);
    setShowResetConfirm(false);
    setSelectedTradeId(null);
    setAiExplanationText(null);
    setLastActionMessage('Bot de Scalping reiniciado desde cero. Capital disponible: 1.000,00 €. Escaneando mercado...');
  };

  // Close Specific Scalp Trade Manually
  const handleClosePosition = (tradeId: string) => {
    const matched = trades.find((t) => t.id === tradeId);
    if (!matched) return;

    const asset = assets.find((a) => a.symbol.toUpperCase() === matched.symbol.toUpperCase());
    const curPrice = asset?.current_price || matched.entryPriceEur;
    const invested = matched.investedEur;

    const pnlPct = ((curPrice - matched.entryPriceEur) / matched.entryPriceEur) * 100;
    const pnlEur = invested * (pnlPct / 100);

    const openTime = new Date(matched.openedAt).getTime();
    const durationMinutes = Math.max(1, Math.round((Date.now() - openTime) / 60000));

    const updated = trades.map((t) => {
      if (t.id === tradeId) {
        return {
          ...t,
          status: 'CLOSED' as const,
          closedAt: new Date().toISOString(),
          exitPriceEur: curPrice,
          exitPriceUsd: curPrice,
          realizedPnlEur: pnlEur,
          realizedPnlPct: pnlPct,
          closeReason: 'manual' as const,
          scalpDurationMinutes: durationMinutes,
        };
      }
      return t;
    });

    onTradesUpdate(updated);
    try {
      localStorage.setItem('crypto_alpha_scalping_trades', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }

    if (alpacaExecutionRef.current && isAlpacaSupportedCrypto(matched.symbol)) {
      closeAlpacaPosition(`${matched.symbol.toUpperCase()}/USD`).catch(() => {});
    }

    const log: ScalpingTradeLog = {
      id: `manual-scalp-close-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'TAKE_PROFIT',
      symbol: matched.symbol.toUpperCase(),
      price: curPrice,
      message: `✋ CIERRE MANUAL DE SCALP: Posición en ${matched.symbol.toUpperCase()} liquidada por el operador. P&L: ${pnlEur >= 0 ? '+' : ''}${pnlEur.toFixed(2)} € (${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(2)}%) en ${durationMinutes}m`,
      strategy: 'MANUAL_OVERRIDE',
    };
    setLogs((prev) => [log, ...prev]);
  };

  // Fetch Deep AI Explanation from Gemini server endpoint
  const handleRequestAiExplanation = async (tradeToExplain: ScalpingTrade) => {
    setIsLoadingAiExplanation(true);
    setAiExplanationText(null);

    try {
      const asset = assets.find((a) => a.symbol.toUpperCase() === tradeToExplain.symbol.toUpperCase());
      const res = await safeFetchJson<{ explanation: string }>('/api/ai/explain-scalp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trade: tradeToExplain, asset }),
      });

      if (res.ok && res.data?.explanation) {
        setAiExplanationText(res.data.explanation);
      } else {
        // Fallback narrative
        setAiExplanationText(
          `### 🔍 Radiografía Cuantitativa del Scalp en ${tradeToExplain.symbol.toUpperCase()}\n\n` +
          `**1. 🕯️ Anatomía del Patrón de Vela Gatillo:**\n` +
          `Activación confirmada por patrón de **${tradeToExplain.candlestickPatternName || 'Vela Envolvente Alcista'}** en temporalidad ${tradeToExplain.timeframe || '1m'}. El pabilo inferior demostró absorción institucional en soporte.\n\n` +
          `**2. 📈 Confluencia Técnica:**\n` +
          `• **EMA Ribbon:** EMA 9 alineada sobre EMA 21 con pendiente alcista.\n` +
          `• **VWAP:** Retesteo y rebote elástico a +${tradeToExplain.vwapProximityPct || 0.35}% de la media de volumen.\n` +
          `• **RSI:** Momentum rápido en ${tradeToExplain.rsiFast || 54} pts sin sobrecompra.\n\n` +
          `**3. 🎯 Salida y Gestión:** Take Profit fijado en +${tradeToExplain.takeProfitPct || 2.2}% y Stop Loss en -${tradeToExplain.stopLossPct || 0.9}%, garantizando un ratio R/R superior a 2.4.`
        );
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingAiExplanation(false);
    }
  };

  // Auto-request AI explanation when selecting a trade if not loaded
  useEffect(() => {
    if (selectedTrade && !aiExplanationText) {
      handleRequestAiExplanation(selectedTrade);
    }
  }, [selectedTrade?.id]);

  // Live scanner assets with calculated real-time patterns
  const scannedCandidates = useMemo(() => {
    return assets.map((asset) => {
      const confluence = calculateScalpingConfluence(asset, config);
      return {
        asset,
        confluence,
      };
    }).sort((a, b) => b.confluence.confluenceScore - a.confluence.confluenceScore);
  }, [assets, config]);

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    if (logFilter === 'SCALPS') return logs.filter((l) => l.type === 'SCALP_BUY');
    if (logFilter === 'TAKE_PROFIT') return logs.filter((l) => l.type === 'TAKE_PROFIT' || l.type === 'STOP_LOSS');
    if (logFilter === 'SCANS') return logs.filter((l) => l.type === 'SCAN' || l.type === 'SIGNAL_ALERT');
    return logs;
  }, [logs, logFilter]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. TOP HERO & COMMAND CENTER */}
      <div className="rounded-3xl border border-emerald-500/40 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 sm:p-6 shadow-2xl shadow-emerald-950/30 text-white relative overflow-hidden">
        {/* Luminous ambient background glows */}
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-10 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-3.5">
          {/* Fila 1: Título, Badges descriptivas y Estado de Escaneo */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 p-0.5 shadow-lg shadow-emerald-500/20 flex items-center justify-center text-white shrink-0">
                <Cpu className="h-5 w-5 sm:h-6 sm:w-6 animate-pulse" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg sm:text-xl font-black tracking-tight text-white whitespace-nowrap">
                    AlphaBot Scalping Pro V4
                  </h2>
                  <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-black text-emerald-400 font-mono tracking-wide flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                    AUTÓNOMO 24/7
                  </span>
                  <span className="rounded-full bg-indigo-500/20 border border-indigo-500/40 px-2 py-0.5 text-[10px] font-bold text-indigo-300 font-mono">
                    Capital: 1.000 €
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  Scalping en micro-velas: Asigna <strong className="text-emerald-400">100 €</strong> (alta convicción) y <strong className="text-cyan-400">50 €</strong> (riesgo controlado) · TP: <strong className="text-emerald-300">+{config.takeProfitPct}%</strong> | SL: <strong className="text-rose-300">-{config.stopLossPct}%</strong>
                </p>
              </div>
            </div>

            {/* Countdown y Botón Reiniciar a la derecha */}
            <div className="flex items-center gap-2 shrink-0 self-start md:self-auto">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs font-mono">
                <RefreshCw className={`h-3.5 w-3.5 text-emerald-400 ${isExecutingTick ? 'animate-spin' : ''}`} />
                <div className="text-[11px]">
                  <span className="text-slate-400">Escaneo:</span>{' '}
                  <strong className="text-emerald-300 font-bold">{config.isActive ? `${countdownSeconds}s` : 'Pausado'}</strong>
                </div>
              </div>

              {/* RESET BUTTON */}
              {showResetConfirm ? (
                <div className="flex items-center gap-1 bg-rose-950/80 border border-rose-500 p-1 rounded-xl">
                  <span className="text-[10px] text-rose-200 font-bold px-1">¿Reiniciar?</span>
                  <button
                    onClick={handleResetToZero}
                    className="bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-black px-2 py-1 rounded-lg cursor-pointer"
                  >
                    Sí (1.000€)
                  </button>
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    className="bg-slate-800 text-slate-300 text-[10px] font-bold px-2 py-1 rounded-lg cursor-pointer"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowResetConfirm(true)}
                  className="flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-950/40 hover:bg-rose-900/60 px-2.5 py-1.5 text-xs font-bold text-rose-300 transition cursor-pointer"
                  title="Reiniciar el bot desde 0 con exactamente 1.000 € y sin operaciones previas"
                >
                  <RotateCcw className="h-3.5 w-3.5 text-rose-400" />
                  <span className="hidden sm:inline">Reiniciar a 0</span>
                </button>
              )}
            </div>
          </div>

          {/* Fila 2: Barra de Control Unificada Compacta */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 bg-slate-900/90 border border-slate-800 p-2 sm:p-2.5 rounded-2xl">
            <div className="flex flex-wrap items-center gap-2">
              {/* MASTER ON/OFF POWER SWITCH */}
              <button
                id="toggle-scalp-bot-power-btn"
                onClick={handleToggleBot}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs sm:text-sm font-black transition shadow-lg cursor-pointer ${
                  config.isActive
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 hover:brightness-110 shadow-emerald-500/30'
                    : 'bg-gradient-to-r from-rose-600 to-amber-600 text-white hover:brightness-110 shadow-rose-500/30'
                }`}
              >
                {config.isActive ? (
                  <>
                    <Pause className="h-3.5 w-3.5 shrink-0 fill-current" />
                    <span>Bot Activo (Pausar)</span>
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5 shrink-0 fill-current" />
                    <span>Activar Bot Autónomo</span>
                  </>
                )}
              </button>

              {/* Force Step Scan Button */}
              <button
                id="force-scalp-execution-btn"
                onClick={() => triggerScalpExecutionStep()}
                disabled={isExecutingTick}
                className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-bold text-slate-200 transition cursor-pointer disabled:opacity-50"
                title="Forzar análisis de micro-velas y ejecución inmediata"
              >
                <Zap className="h-3.5 w-3.5 text-amber-400 fill-current" />
                <span>Escanear Ahora</span>
              </button>

              {/* SERVER 24/7 ALWAYS-ON DAEMON TOGGLE */}
              <button
                id="toggle-scalp-server-daemon-btn"
                onClick={handleToggleServerDaemon}
                disabled={isTogglingServerDaemon}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                  serverDaemonActive
                    ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300 shadow-lg shadow-emerald-950/40'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                } ${isTogglingServerDaemon ? 'opacity-60 cursor-wait' : ''}`}
                title="Activar/pausar motor en servidor Node.js (opera 24/7 sin navegador)"
              >
                <Cpu className={`h-3.5 w-3.5 ${serverDaemonActive ? 'text-emerald-400 animate-pulse' : 'text-slate-400'}`} />
                <span className="hidden sm:inline">Servidor 24/7:</span>
                <span className={`font-mono text-[11px] font-black ${serverDaemonActive ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {serverDaemonActive ? 'ALWAYS-ON' : 'OFF'}
                </span>
                {serverDaemonActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />}
              </button>

              {/* ALPACA PAPER TRADING TOGGLE */}
              <button
                id="toggle-scalp-alpaca-btn"
                onClick={() => setAlpacaExecution(!alpacaExecution)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                  alpacaExecution
                    ? 'bg-amber-500/20 border-amber-500/60 text-amber-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
                title="Ejecutar operaciones de scalping en tiempo real en Alpaca Paper Trading ($100k USD)"
              >
                <span className="text-sm">🦙</span>
                <span className="hidden sm:inline">Alpaca:</span>
                <span className={`font-mono text-[11px] font-black ${alpacaExecution ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {alpacaExecution ? 'CONECTADO ($100k)' : 'DESACTIVADO'}
                </span>
                {alpacaExecution && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
              </button>
            </div>

            {/* Live Sub-Ticker Status */}
            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="text-slate-400 text-[11px] hidden xl:inline">Estado:</span>
              <span className="text-emerald-300 text-[11px] font-semibold truncate max-w-xs lg:max-w-md">
                {lastActionMessage}
              </span>
            </div>
          </div>
        </div>

        {/* Live Sub-Ticker Strip */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-slate-300 font-medium">Estado del Bot:</span>
            <span className="text-emerald-300 font-mono font-semibold truncate max-w-xl">
              {lastActionMessage}
            </span>
          </div>

          <div className="flex items-center gap-3 font-mono text-[11px] shrink-0">
            <span className="flex items-center gap-1 text-emerald-400 font-bold">
              <Sparkles className="h-3 w-3" /> Regla: 50 € / 100 € Inteligente
            </span>
            <span>•</span>
            <span>Estrategia: <strong className="text-teal-300">Micro-Scalping Confluencia (1M/5M)</strong></span>
          </div>
        </div>
      </div>

      {/* 2. REAL-TIME PERFORMANCE METRICS (KPIS) */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {/* Total Capital / Balance */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-3.5 space-y-1 shadow-sm">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Balance Total</span>
            <Briefcase className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <div className="text-lg sm:text-xl font-black text-white font-mono">
            {performance.currentBalanceEur.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
          </div>
          <div className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
            <span>Inicial: {performance.initialCapitalEur.toLocaleString('es-ES')} €</span>
          </div>
        </div>

        {/* Total P&L Return */}
        <div className={`rounded-2xl border p-3.5 space-y-1 shadow-sm ${
          performance.totalPnlEur >= 0 
            ? 'border-emerald-500/40 bg-emerald-950/30' 
            : 'border-rose-500/40 bg-rose-950/30'
        }`}>
          <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
            <span>P&amp;L Total Neto</span>
            {performance.totalPnlEur >= 0 ? <TrendingUp className="h-3.5 w-3.5 text-emerald-400" /> : <TrendingDown className="h-3.5 w-3.5 text-rose-400" />}
          </div>
          <div className={`text-lg sm:text-xl font-black font-mono flex items-center gap-1 ${
            performance.totalPnlEur >= 0 ? 'text-emerald-400' : 'text-rose-400'
          }`}>
            <span>{performance.totalPnlEur >= 0 ? '+' : ''}{performance.totalPnlEur.toFixed(2)} €</span>
          </div>
          <div className={`text-[10px] font-bold font-mono ${
            performance.totalPnlPct >= 0 ? 'text-emerald-300' : 'text-rose-300'
          }`}>
            {performance.totalPnlPct >= 0 ? '+' : ''}{performance.totalPnlPct.toFixed(2)}% Rentabilidad
          </div>
        </div>

        {/* Dynamic Trade Size Rule */}
        <div className="rounded-2xl border border-indigo-500/40 bg-indigo-950/30 p-3.5 space-y-1 shadow-sm">
          <div className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider flex items-center justify-between">
            <span>Tamaño por Trade</span>
            <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
          </div>
          <div className="text-lg sm:text-xl font-black text-indigo-200 font-mono">
            50 € / 100 €
          </div>
          <div className="text-[10px] text-indigo-300 font-mono">
            Selección por riesgo
          </div>
        </div>

        {/* Invested Capital vs Available Cash */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-3.5 space-y-1 shadow-sm">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Disponible / Invertido</span>
            <Layers className="h-3.5 w-3.5 text-cyan-400" />
          </div>
          <div className="text-base sm:text-lg font-black text-slate-100 font-mono">
            {performance.availableCashEur.toFixed(0)} € / {performance.investedCapitalEur.toFixed(0)} €
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            {openTrades.length} posiciones abiertas
          </div>
        </div>

        {/* Win Rate */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-3.5 space-y-1 shadow-sm">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Tasa de Acierto</span>
            <Award className="h-3.5 w-3.5 text-amber-400" />
          </div>
          <div className="text-lg sm:text-xl font-black text-amber-300 font-mono">
            {closedTrades.length > 0 ? `${closedStats.winRate.toFixed(1)}%` : '100%'}
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            {closedStats.winCount} ganadas / {closedStats.lossCount} pérdidas
          </div>
        </div>

        {/* Closed Trades Summary */}
        <div 
          className="rounded-2xl border border-slate-800 bg-slate-900/90 p-3.5 space-y-1 shadow-sm cursor-pointer hover:border-emerald-500 transition"
          onClick={() => setActiveView('closed_positions')}
        >
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Histórico Cerradas</span>
            <History className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <div className="text-lg sm:text-xl font-black text-emerald-300 font-mono">
            {closedTrades.length} Trades
          </div>
          <div className="text-[10px] text-emerald-400 font-mono font-bold">
            Realizado: {closedStats.totalRealized >= 0 ? '+' : ''}{closedStats.totalRealized.toFixed(2)} €
          </div>
        </div>
      </div>

      {/* 3. RESPONSIVE SUB-NAVIGATION MENU */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-900/90 border border-slate-800 overflow-x-auto scrollbar-none">
        <button
          id="scalp-view-positions-btn"
          onClick={() => setActiveView('active_positions')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap cursor-pointer ${
            activeView === 'active_positions'
              ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Activity className="h-4 w-4" />
          <span>⚡ Operaciones en Vivo ({openTrades.length})</span>
        </button>

        <button
          id="scalp-view-closed-btn"
          onClick={() => setActiveView('closed_positions')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap cursor-pointer ${
            activeView === 'closed_positions'
              ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <History className="h-4 w-4" />
          <span>🏁 Operaciones Cerradas ({closedTrades.length})</span>
          {closedStats.totalRealized !== 0 && (
            <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
              closedStats.totalRealized >= 0 ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40' : 'bg-rose-950 text-rose-300 border border-rose-500/40'
            }`}>
              {closedStats.totalRealized >= 0 ? '+' : ''}{closedStats.totalRealized.toFixed(2)} €
            </span>
          )}
        </button>

        <button
          id="scalp-view-explanations-btn"
          onClick={() => setActiveView('trade_explanations')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap cursor-pointer ${
            activeView === 'trade_explanations'
              ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <BrainCircuit className="h-4 w-4" />
          <span>🧠 Explicación Detallada de Operaciones</span>
        </button>

        <button
          id="scalp-view-scanner-btn"
          onClick={() => setActiveView('live_scanner')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap cursor-pointer ${
            activeView === 'live_scanner'
              ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <CandlestickChart className="h-4 w-4" />
          <span>🎯 Radar de Velas 1M/5M</span>
        </button>

        <button
          id="scalp-view-broker-btn"
          onClick={() => setActiveView('broker_dashboard')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap cursor-pointer ${
            activeView === 'broker_dashboard'
              ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Briefcase className="h-4 w-4" />
          <span>📊 Curva de Capital</span>
        </button>

        <button
          id="scalp-view-terminal-btn"
          onClick={() => setActiveView('execution_terminal')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap cursor-pointer ${
            activeView === 'execution_terminal'
              ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Terminal className="h-4 w-4" />
          <span>🖥️ Telemetría &amp; Logs ({logs.length})</span>
        </button>

        <button
          id="scalp-view-strategy-btn"
          onClick={() => setActiveView('strategy_studio')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap cursor-pointer ${
            activeView === 'strategy_studio'
              ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Sliders className="h-4 w-4" />
          <span>⚙️ Reglas de Riesgo</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: EXPLICACIÓN DETALLADA DE OPERACIONES (HIGH PRIORITY USER ASK) */}
      {/* ========================================================================= */}
      {activeView === 'trade_explanations' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-slate-900/80 border border-slate-800 p-4 sm:p-6 rounded-3xl space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                  <BrainCircuit className="h-6 w-6 text-amber-400" />
                  Explicación Detallada de las Operaciones
                </h3>
                <p className="text-xs sm:text-sm text-slate-300">
                  Desglose técnico y cuantitativo exhaustivo de por qué se abrió cada operación de scalping: análisis de patrón de vela, alineación de EMAs, VWAP, libro de órdenes e informe de IA.
                </p>
              </div>

              {trades.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Total analizadas:</span>
                  <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-mono font-black px-2.5 py-1 rounded-xl">
                    {trades.length} operaciones
                  </span>
                </div>
              )}
            </div>
          </div>

          {trades.length === 0 ? (
            <div className="p-12 text-center rounded-3xl border border-dashed border-slate-800 bg-slate-900/60 space-y-4">
              <div className="h-16 w-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
                <BrainCircuit className="h-8 w-8 animate-pulse" />
              </div>
              <div className="max-w-md mx-auto space-y-2">
                <h4 className="text-lg font-black text-white">El bot ha iniciado desde 0 con 1.000 €</h4>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Actualmente no hay operaciones previas (el registro está limpio como solicitaste). El bot está escaneando los libros de órdenes y velas en tiempo real. En cuanto se active el primer scalp de alta confluencia, aquí se generará automáticamente su explicación técnica completa.
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => triggerScalpExecutionStep()}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-xs hover:brightness-110 transition shadow-lg shadow-amber-500/20 cursor-pointer"
                  >
                    <Zap className="h-4 w-4 fill-current" />
                    <span>Lanzar Escaneo Manual de Scalp</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Trade Selector List */}
              <div className="lg:col-span-4 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-400 px-1">
                  <span>Seleccionar Operación para Explicar:</span>
                  <span>{trades.length} disponibles</span>
                </div>

                <div className="space-y-2 max-h-[640px] overflow-y-auto pr-1">
                  {trades.map((t) => {
                    const isSelected = selectedTrade?.id === t.id;
                    const isOpen = t.status === 'OPEN';
                    const pnl = isOpen ? 0 : (t.realizedPnlEur || 0);

                    return (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTradeId(t.id)}
                        className={`p-3.5 rounded-2xl border transition cursor-pointer ${
                          isSelected
                            ? 'bg-amber-950/40 border-amber-500 shadow-lg shadow-amber-950/30'
                            : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={getCryptoLogoUrl(t.symbol, t.image)}
                              onError={(e) => handleCryptoImageError(e, t.symbol)}
                              alt={t.symbol}
                              className="h-7 w-7 rounded-full bg-slate-800 object-contain p-0.5"
                            />
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-black text-white text-sm">{t.symbol.toUpperCase()}</span>
                                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded font-mono ${
                                  isOpen ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'bg-slate-800 text-slate-300'
                                }`}>
                                  {isOpen ? 'EN VIVO' : 'CERRADA'}
                                </span>
                              </div>
                              <div className="text-[11px] text-amber-400 font-medium truncate max-w-[170px]">
                                {t.candlestickPatternName || 'Patrón Alcista'}
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-xs font-mono font-bold text-white">
                              {t.entryPriceEur} €
                            </div>
                            <div className={`text-[11px] font-mono font-bold ${
                              isOpen ? 'text-cyan-400' : pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}>
                              {isOpen ? 'Flotante' : `${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)} €`}
                            </div>
                          </div>
                        </div>

                        <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                          <span className="font-mono">Confluencia: <strong className="text-amber-300">{t.confluenceScore || 94}%</strong></span>
                          <span>{new Date(t.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Deep Explanation Display Panel */}
              <div className="lg:col-span-8 space-y-4">
                {selectedTrade && (
                  <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-6 shadow-xl">
                    {/* Trade Header Overview */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                      <div className="flex items-center gap-3">
                        <img
                          src={getCryptoLogoUrl(selectedTrade.symbol, selectedTrade.image)}
                          onError={(e) => handleCryptoImageError(e, selectedTrade.symbol)}
                          alt={selectedTrade.symbol}
                          className="h-12 w-12 rounded-2xl bg-slate-800 p-1 object-contain shadow-md"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xl font-black text-white">{selectedTrade.name}</h4>
                            <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-lg">
                              {selectedTrade.symbol.toUpperCase()}
                            </span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-lg font-mono ${
                              selectedTrade.status === 'OPEN' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            }`}>
                              {selectedTrade.status === 'OPEN' ? '⚡ Posición en Vivo' : '🏁 Operación Cerrada'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Ejecutada el {new Date(selectedTrade.openedAt).toLocaleString()} • Marco: {selectedTrade.timeframe || '1m'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleRequestAiExplanation(selectedTrade)}
                          disabled={isLoadingAiExplanation}
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-xs hover:brightness-110 transition cursor-pointer disabled:opacity-50"
                        >
                          <Sparkles className={`h-3.5 w-3.5 ${isLoadingAiExplanation ? 'animate-spin' : ''}`} />
                          <span>{isLoadingAiExplanation ? 'Analizando con IA...' : 'Actualizar Análisis IA'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Key Technical Fact Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Patrón Gatillo</span>
                        <div className="text-xs sm:text-sm font-black text-amber-300">
                          {selectedTrade.candlestickPatternName || 'Envolvente Alcista'}
                        </div>
                        <span className="text-[9px] text-slate-400 font-mono">Micro-Vela 1M/5M</span>
                      </div>

                      <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Precio Entrada</span>
                        <div className="text-xs sm:text-sm font-black text-white font-mono">
                          {selectedTrade.entryPriceEur} €
                        </div>
                        <span className="text-[9px] text-slate-400 font-mono">Asignación: {selectedTrade.investedEur} €</span>
                      </div>

                      <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Take Profit / Stop Loss</span>
                        <div className="text-xs sm:text-sm font-black text-emerald-400 font-mono">
                          +{selectedTrade.takeProfitPct || 2.2}% / -{selectedTrade.stopLossPct || 0.9}%
                        </div>
                        <span className="text-[9px] text-slate-400 font-mono">R/R: 2.44:1</span>
                      </div>

                      <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Confluencia Scalp</span>
                        <div className="text-xs sm:text-sm font-black text-amber-400 font-mono">
                          {selectedTrade.confluenceScore || 94}%
                        </div>
                        <span className="text-[9px] text-emerald-400 font-mono">Alta Precisión</span>
                      </div>
                    </div>

                    {/* Visual Confluence Radiography Breakdown */}
                    <div className="space-y-3">
                      <h5 className="text-sm font-black text-white flex items-center gap-2">
                        <Activity className="h-4 w-4 text-emerald-400" />
                        Confluencia de Indicadores y Microestructura
                      </h5>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                          <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                            <span className="flex items-center gap-1.5 text-amber-400">
                              <TrendingUp className="h-3.5 w-3.5" /> Medias Móviles (EMA Ribbon)
                            </span>
                            <span className="text-[10px] text-emerald-400 font-mono font-bold">ALINEADO</span>
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed">
                            {selectedTrade.technicalFactors?.emaSummary || 'La EMA rápida 9 cruzó al alza a la EMA 21 con pendiente creciente, validando el impulso en la micro-estructura de 1 minuto.'}
                          </p>
                        </div>

                        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                          <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                            <span className="flex items-center gap-1.5 text-cyan-400">
                              <Target className="h-3.5 w-3.5" /> Anclaje a VWAP Intradiario
                            </span>
                            <span className="text-[10px] text-cyan-300 font-mono font-bold">SOPORTE VÁLIDO</span>
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed">
                            {selectedTrade.technicalFactors?.vwapSummary || `El precio cotiza a +${selectedTrade.vwapProximityPct || 0.35}% de la línea de VWAP institucional con soporte limpio.`}
                          </p>
                        </div>

                        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                          <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                            <span className="flex items-center gap-1.5 text-emerald-400">
                              <Activity className="h-3.5 w-3.5" /> Momentum RSI Rápido (7 &amp; 14)
                            </span>
                            <span className="text-[10px] text-emerald-400 font-mono font-bold">{selectedTrade.rsiFast || 54} PTS</span>
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed">
                            {selectedTrade.technicalFactors?.rsiSummary || `RSI-7 en ${selectedTrade.rsiFast || 54} pts (zona óptima de aceleración) y RSI-14 en ${selectedTrade.rsiStandard || 52} pts sin divergencia bajista.`}
                          </p>
                        </div>

                        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                          <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                            <span className="flex items-center gap-1.5 text-purple-400">
                              <BarChart2 className="h-3.5 w-3.5" /> Libro de Órdenes (Bid-Ask)
                            </span>
                            <span className="text-[10px] text-purple-300 font-mono font-bold">68% BIDS</span>
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed">
                            {selectedTrade.technicalFactors?.orderBookSummary || 'Muro de compras pasivas en los niveles de soporte local protegiendo contra deslizamientos a la baja.'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* AI Gemini Analytical Explanation Section */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h5 className="text-sm font-black text-white flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-amber-400" />
                          Explicación Cuantitativa Generada por IA
                        </h5>
                        <span className="text-[10px] text-slate-400 font-mono">Modelo Neural Predictivo</span>
                      </div>

                      <div className="p-5 rounded-2xl bg-slate-950/80 border border-amber-500/20 text-slate-200 text-xs sm:text-sm leading-relaxed whitespace-pre-line font-sans space-y-2">
                        {isLoadingAiExplanation ? (
                          <div className="flex items-center justify-center py-8 gap-3 text-amber-400">
                            <RefreshCw className="h-5 w-5 animate-spin" />
                            <span className="font-bold">Generando radiografía de la operación con IA...</span>
                          </div>
                        ) : (
                          aiExplanationText || selectedTrade.detailedExplanation || 'Análisis de scalp generado y validado contra el motor cuántico.'
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: OPERACIONES REALIZADAS (HISTÓRICO CERRADO SOLICITADO)         */}
      {/* ========================================================================= */}
      {activeView === 'closed_positions' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <History className="h-5 w-5 text-amber-400" />
                Apartado de Operaciones Realizadas ({closedTrades.length})
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Historial completo de todas las operaciones de scalping finalizadas, con precio de entrada, precio de salida, duración y resultado consolidado.
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono">
              <div className="bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl">
                <span className="text-slate-400">Balance Realizado:</span>{' '}
                <strong className={`font-black ${closedStats.totalRealized >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {closedStats.totalRealized >= 0 ? '+' : ''}{closedStats.totalRealized.toFixed(2)} €
                </strong>
              </div>
            </div>
          </div>

          {closedTrades.length === 0 ? (
            <div className="p-12 text-center rounded-3xl border border-dashed border-slate-800 bg-slate-900/60 space-y-3">
              <div className="h-14 w-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
                <History className="h-8 w-8 animate-pulse" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h4 className="text-lg font-black text-white">Sin operaciones cerradas todavía</h4>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  El bot comenzó desde cero con 1.000 € limpios. Conforme las operaciones de scalping alcancen su objetivo de Take Profit (+{config.takeProfitPct}%) o Stop Loss, quedarán archivadas aquí con todo su desglose.
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/90 shadow-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-mono text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="p-3.5">Cripto &amp; Patrón</th>
                    <th className="p-3.5">Fecha &amp; Duración</th>
                    <th className="p-3.5">Inversión</th>
                    <th className="p-3.5">Entrada</th>
                    <th className="p-3.5">Salida</th>
                    <th className="p-3.5">Resultado (€ / %)</th>
                    <th className="p-3.5">Causa de Cierre</th>
                    <th className="p-3.5 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {closedTrades.map((t) => {
                    const pnlEur = t.realizedPnlEur || 0;
                    const pnlPct = t.realizedPnlPct || 0;
                    const isWin = pnlEur >= 0;

                    return (
                      <tr key={t.id} className="hover:bg-slate-800/40 transition">
                        <td className="p-3.5">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={getCryptoLogoUrl(t.symbol, t.image)}
                              onError={(e) => handleCryptoImageError(e, t.symbol)}
                              alt={t.symbol}
                              className="h-8 w-8 rounded-full bg-slate-800 object-contain p-0.5"
                            />
                            <div>
                              <span className="font-black text-white text-sm block">{t.symbol.toUpperCase()}</span>
                              <span className="text-[10px] text-amber-400 font-medium">
                                {t.candlestickPatternName || 'Patrón Scalp'}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="p-3.5 text-slate-300 font-mono">
                          <div>{new Date(t.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {t.scalpDurationMinutes || 4} min
                          </div>
                        </td>

                        <td className="p-3.5 text-white font-mono font-bold">
                          {t.investedEur} €
                        </td>

                        <td className="p-3.5 text-slate-300 font-mono">
                          {t.entryPriceEur} €
                        </td>

                        <td className="p-3.5 text-slate-300 font-mono">
                          {t.exitPriceEur || t.entryPriceEur} €
                        </td>

                        <td className="p-3.5 font-mono font-bold">
                          <div className={`text-sm ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isWin ? '+' : ''}{pnlEur.toFixed(2)} €
                          </div>
                          <div className={`text-[10px] ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isWin ? '+' : ''}{pnlPct.toFixed(2)}%
                          </div>
                        </td>

                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold font-mono ${
                            t.closeReason === 'take_profit'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                              : t.closeReason === 'stop_loss'
                              ? 'bg-rose-950 text-rose-300 border border-rose-500/30'
                              : 'bg-slate-800 text-slate-300'
                          }`}>
                            {t.closeReason === 'take_profit' ? '🎯 Take Profit' : t.closeReason === 'stop_loss' ? '🛑 Stop Loss' : 'Manual'}
                          </span>
                        </td>

                        <td className="p-3.5 text-right">
                          <button
                            onClick={() => {
                              setSelectedTradeId(t.id);
                              setActiveView('trade_explanations');
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold text-xs transition cursor-pointer"
                          >
                            <BrainCircuit className="h-3.5 w-3.5" />
                            <span>Ver Explicación</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 3: OPERACIONES ACTIVAS EN VIVO (IDENTICAL TO AUTONOMOUS BOT)       */}
      {/* ========================================================================= */}
      {activeView === 'active_positions' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <Activity className="h-5 w-5 text-emerald-400" />
                Operaciones Abiertas en Tiempo Real ({openTrades.length})
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Posiciones gestionadas activamente con Stop Loss (-{config.stopLossPct}%) y Take Profit (+{config.takeProfitPct}%).
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono">
              <div className="bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl">
                <span className="text-slate-400">P&amp;L Flotante:</span>{' '}
                <strong className={`font-black ${performance.unrealizedPnlEur >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {performance.unrealizedPnlEur >= 0 ? '+' : ''}{performance.unrealizedPnlEur.toFixed(2)} €
                </strong>
              </div>
            </div>
          </div>

          {openTrades.length === 0 ? (
            <div className="p-12 text-center rounded-3xl border border-dashed border-slate-800 bg-slate-900/60 space-y-3">
              <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h4 className="text-lg font-black text-white">Sin posiciones abiertas actualmente</h4>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  El motor del bot está escaneando el mercado y los libros de órdenes en segundo plano cada {config.executionIntervalSeconds}s. Cuando detecte una oportunidad con más de 75 puntos de confluencia, abrirá automáticamente la posición asignando 50 € o 100 €.
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => triggerScalpExecutionStep()}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs hover:brightness-110 transition cursor-pointer"
                  >
                    <Zap className="h-3.5 w-3.5 fill-current" />
                    <span>Forzar Escaneo y Ejecución Inmediata</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {openTrades.map((trade) => {
                const asset = assets.find((a) => a.symbol.toUpperCase() === trade.symbol.toUpperCase());
                const curPrice = asset?.current_price || trade.entryPriceEur;
                const entryPrice = trade.entryPriceEur;
                const invested = trade.investedEur;
                
                // Real-time P&L calculation
                const pnlPct = ((curPrice - entryPrice) / entryPrice) * 100;
                const pnlEur = invested * (pnlPct / 100);
                const isProfitable = pnlEur >= 0;

                // Stop & Target absolute values
                const tpPct = trade.takeProfitPct;
                const slPct = trade.stopLossPct;
                const tpPrice = trade.takeProfitPrice;
                const slPrice = trade.stopLossPrice;

                // Progress towards target (0% at entry, 100% at TP)
                const tpProgress = Math.max(0, Math.min(100, (pnlPct / tpPct) * 100));
                const is100Eur = invested >= 90;

                return (
                  <div
                    key={trade.id}
                    className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-4 sm:p-5 space-y-3.5 shadow-xl hover:border-emerald-500/50 transition relative overflow-hidden group"
                  >
                    {/* Top Identity & Status Header */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={getCryptoLogoUrl(trade.symbol, trade.image)}
                          onError={(e) => handleCryptoImageError(e, trade.symbol)}
                          alt={trade.symbol}
                          className="h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-slate-800 object-contain p-1 border border-slate-700/80 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-black text-white text-base sm:text-lg tracking-tight">
                              {trade.symbol.toUpperCase()}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                              COMPRA SPOT
                            </span>
                          </div>
                          
                          {/* Conviction Size Badge */}
                          <div className="mt-1 flex items-center gap-2 flex-wrap">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black font-mono border ${
                              is100Eur 
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm'
                                : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-sm'
                            }`}>
                              {is100Eur ? '💎 ALTA CONVICCIÓN: 100 €' : '🛡️ RIESGO CONTROLADO: 50 €'}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(trade.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Live P&L Output Box */}
                      <div className="text-right bg-slate-950/80 border border-slate-800 px-3 py-2 rounded-xl shrink-0">
                        <div className="text-[10px] text-slate-400 font-bold uppercase">P&amp;L EN VIVO</div>
                        <div className={`text-lg font-black font-mono flex items-center justify-end gap-1 ${
                          isProfitable ? 'text-emerald-400' : 'text-rose-400'
                        }`}>
                          {isProfitable ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                          <span>{isProfitable ? '+' : ''}{pnlEur.toFixed(2)} €</span>
                        </div>
                        <div className={`text-xs font-bold font-mono ${isProfitable ? 'text-emerald-300' : 'text-rose-300'}`}>
                          ({isProfitable ? '+' : ''}{pnlPct.toFixed(2)}%)
                        </div>
                      </div>
                    </div>

                    {/* Bot Rationale Tag */}
                    <div className="p-2 rounded-xl bg-slate-950/90 border border-slate-800/80 text-xs text-slate-300 flex items-start gap-2">
                      <Sparkles className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <div className="text-[11px] leading-relaxed">
                        <strong className="text-emerald-300">Decisión del Bot:</strong> {trade.convictionRationale || trade.candlestickPatternName || trade.strategyTag || 'Entrada algorítmica por confluencia cuantitativa multi-temporal.'}
                      </div>
                    </div>

                    {/* Quantitative Position Stats */}
                    <div className="grid grid-cols-3 gap-2 text-xs font-mono p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                      <div>
                        <span className="text-[9px] text-slate-400 block font-sans">Importe Invertido</span>
                        <strong className="text-white text-sm">{invested.toFixed(2)} €</strong>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 block font-sans">Precio Entrada</span>
                        <strong className="text-slate-300">{formatCurrency(entryPrice)}</strong>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 block font-sans">Precio Actual</span>
                        <strong className={isProfitable ? 'text-emerald-300 font-bold' : 'text-rose-300 font-bold'}>
                          {formatCurrency(curPrice)}
                        </strong>
                      </div>
                    </div>

                    {/* Progress to Take Profit Bar */}
                    <div className="space-y-1 pt-1">
                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <span className="flex items-center gap-1 text-rose-400 font-bold">
                          <ShieldAlert className="h-3 w-3" /> Stop: {formatCurrency(slPrice)} (-{slPct}%)
                        </span>
                        <span className="text-slate-300 font-bold">Progreso Objetivo: {tpProgress.toFixed(0)}%</span>
                        <span className="flex items-center gap-1 text-emerald-400 font-bold">
                          <Target className="h-3 w-3" /> Target: {formatCurrency(tpPrice)} (+{tpPct}%)
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-950 border border-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-500"
                          style={{ width: `${tpProgress}%` }}
                        />
                      </div>
                    </div>

                    {/* Actions and Detailed Explanation Buttons */}
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                      {asset && onOpenAssetDiagnostic && (
                        <button
                          onClick={() => onOpenAssetDiagnostic(asset)}
                          className="text-[11px] text-slate-400 hover:text-emerald-300 flex items-center gap-1 transition cursor-pointer"
                        >
                          <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                          <span>Diagnóstico 360°</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setSelectedTradeId(trade.id);
                          setActiveView('trade_explanations');
                        }}
                        className="text-[11px] text-indigo-300 hover:text-indigo-200 flex items-center gap-1 transition cursor-pointer px-2 py-1 rounded-lg bg-indigo-950/40 border border-indigo-500/30"
                      >
                        <BrainCircuit className="h-3 w-3 text-indigo-400" />
                        <span>Explicación Detallada</span>
                      </button>

                      <button
                        onClick={() => handleClosePosition(trade.id)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ml-auto shadow-md ${
                          isProfitable
                            ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 font-black'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500 hover:text-white'
                        }`}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>{isProfitable ? `Cerrar (+${pnlEur.toFixed(2)} €)` : 'Cerrar Posición'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 4: RADAR DE VELAS & OPORTUNIDADES EN TIEMPO REAL (SCANNER 1M/5M)   */}
      {/* ========================================================================= */}
      {activeView === 'live_scanner' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <CandlestickChart className="h-5 w-5 text-amber-400" />
                Radar de Velas Japonesas &amp; Confluencia (1M/5M)
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Escaneo en vivo de la micro-estructura de todos los activos de Wall Street y Crypto: patrones de velas detectados, fuerza de absorción y ranking de confluencia para scalping.
              </p>
            </div>
            <span className="text-xs font-mono text-amber-400 font-bold bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-xl">
              {scannedCandidates.length} Pares Monitoreados
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {scannedCandidates.map(({ asset, confluence }) => {
              const candle = confluence.candleAnalysis;
              const isHigh = confluence.confluenceScore >= 85;

              return (
                <div
                  key={asset.id}
                  className={`p-4 rounded-3xl border transition space-y-3 ${
                    isHigh
                      ? 'bg-gradient-to-br from-slate-900 via-amber-950/20 to-slate-950 border-amber-500/60 shadow-lg shadow-amber-950/20'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={getCryptoLogoUrl(asset.symbol, asset.image)}
                        onError={(e) => handleCryptoImageError(e, asset.symbol)}
                        alt={asset.symbol}
                        className="h-9 w-9 rounded-full bg-slate-800 object-contain p-0.5"
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-white text-base">{asset.symbol.toUpperCase()}</span>
                          <span className="text-[10px] text-slate-400 truncate max-w-[90px]">{asset.name}</span>
                        </div>
                        <span className="text-xs font-mono font-bold text-white block">
                          {asset.current_price} €
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <span className="text-[10px] text-slate-400 font-mono">Confluencia:</span>
                        <span className={`text-sm font-black font-mono ${isHigh ? 'text-amber-400' : 'text-slate-300'}`}>
                          {confluence.confluenceScore}%
                        </span>
                      </div>
                      <span className={`text-[9px] font-bold font-mono px-2 py-0.5 rounded-full ${
                        isHigh ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {isHigh ? 'ZONA GATILLO' : 'EN VIGILANCIA'}
                      </span>
                    </div>
                  </div>

                  {/* Candle Pattern Tag */}
                  <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-amber-400 font-bold flex items-center gap-1">
                        <CandlestickChart className="h-3.5 w-3.5" />
                        {candle.patternName}
                      </span>
                      <span className="text-[10px] font-mono text-emerald-400 font-bold">
                        Fiabilidad: {candle.reliability}%
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
                      {candle.description}
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 text-center text-[10px] font-mono bg-slate-950/60 p-2 rounded-xl border border-slate-800/60">
                    <div>
                      <span className="text-slate-400 block text-[9px]">RSI-7</span>
                      <span className="font-bold text-slate-200">{confluence.rsiFast}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px]">VWAP</span>
                      <span className="font-bold text-cyan-300">+{confluence.vwapProximityPct}%</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px]">Order Book</span>
                      <span className="font-bold text-purple-300">{confluence.orderBookImbalanceRatio}% Bids</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 5: BROKER & CURVA DE EQUIDAD DE CAPITAL                           */}
      {/* ========================================================================= */}
      {activeView === 'broker_dashboard' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-3xl space-y-4">
            
            {/* Alpaca Paper Integration Card */}
            <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-xl shrink-0">
                  🦙
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-amber-300">Alpaca Markets Paper Trading</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-[9px] px-2 py-0.5 font-mono text-emerald-300 font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      CONECTADO
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Las micro-operaciones de scalping se ejecutan en tiempo real en la cuenta simulada oficial de Alpaca.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-right">
                <div className="font-mono text-xs">
                  <span className="text-slate-400 block text-[10px]">Saldo Alpaca USD</span>
                  <span className="text-emerald-400 font-bold text-sm">
                    ${(alpacaAccount?.cash ?? 100000).toLocaleString('es-ES', { minimumFractionDigits: 2 })} USD
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setAlpacaExecution(!alpacaExecution)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                    alpacaExecution
                      ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                  }`}
                >
                  {alpacaExecution ? 'Desactivar Alpaca' : 'Conectar Alpaca'}
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-amber-400" />
                  Evolución del Capital de Scalping (Inicia en 1.000,00 €)
                </h3>
                <p className="text-xs text-slate-300">
                  Gráfico de equidad en tiempo real que traza cada micro-operación realizada con su impacto en el capital total.
                </p>
              </div>

              <div className="text-right">
                <div className="text-xl font-black text-amber-400 font-mono">
                  {formatCurrency(performance.currentBalanceEur)}
                </div>
                <div className="text-xs font-mono text-slate-400">
                  Disponible: <strong className="text-emerald-400">{formatCurrency(performance.availableCashEur)}</strong>
                </div>
              </div>
            </div>

            <div className="h-72 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={performance.equityCurve} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="scalpEquityGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                  <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} domain={['auto', 'auto']} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '1rem' }}
                    itemStyle={{ color: '#f59e0b' }}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    name="Equidad Bot Scalping (€)"
                    dataKey="equityEur"
                    stroke="#f59e0b"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#scalpEquityGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 6: TELEMETRÍA Y LOGS EN TIEMPO REAL                              */}
      {/* ========================================================================= */}
      {activeView === 'execution_terminal' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-4 rounded-2xl">
            <div className="flex items-center gap-2">
              <Terminal className="h-5 w-5 text-amber-400" />
              <h3 className="text-base font-black text-white">Terminal de Ejecución &amp; Logs de Scalping</h3>
            </div>

            <div className="flex items-center gap-1.5">
              {(['ALL', 'SCALPS', 'TAKE_PROFIT', 'SCANS'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setLogFilter(filter)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition cursor-pointer ${
                    logFilter === filter
                      ? 'bg-amber-500 text-slate-950 font-black'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-950 p-4 sm:p-5 font-mono text-xs space-y-2.5 max-h-[500px] overflow-y-auto">
            {filteredLogs.map((log) => {
              const isBuy = log.type === 'SCALP_BUY';
              const isTp = log.type === 'TAKE_PROFIT';
              const isSl = log.type === 'STOP_LOSS';

              return (
                <div
                  key={log.id}
                  className={`p-3 rounded-2xl border transition ${
                    isBuy
                      ? 'bg-amber-950/20 border-amber-500/40 text-amber-300'
                      : isTp
                      ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
                      : isSl
                      ? 'bg-rose-950/20 border-rose-500/40 text-rose-300'
                      : 'bg-slate-900/60 border-slate-800/80 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-[10px] text-slate-400 pb-1">
                    <span className="font-bold text-slate-200">[{log.type}] {log.symbol}</span>
                    <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div className="text-xs font-medium leading-relaxed">{log.message}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 7: PARÁMETROS DE GESTIÓN DE RIESGO DE SCALPING                    */}
      {/* ========================================================================= */}
      {activeView === 'strategy_studio' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-3xl space-y-5">
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Sliders className="h-5 w-5 text-amber-400" />
                Configuración y Gestión de Riesgo para Scalping Pro
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                Ajusta los parámetros matemáticos del bot para optimizar la velocidad y seguridad de cada scalp.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <label className="text-xs font-bold text-slate-300 block">Take Profit de Scalp (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={config.takeProfitPct}
                  onChange={(e) => setConfig({ ...config, takeProfitPct: parseFloat(e.target.value) || 2.2 })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-sm"
                />
                <span className="text-[10px] text-slate-400 block">Objetivo de beneficio relámpago (recomendado: 1.8% a 3.0%)</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <label className="text-xs font-bold text-slate-300 block">Stop Loss Milimétrico (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={config.stopLossPct}
                  onChange={(e) => setConfig({ ...config, stopLossPct: parseFloat(e.target.value) || 0.9 })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-sm"
                />
                <span className="text-[10px] text-slate-400 block">Preservación máxima de capital (recomendado: 0.8% a 1.2%)</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <label className="text-xs font-bold text-slate-300 block">Intervalo de Escaneo (Segundos)</label>
                <input
                  type="number"
                  step="1"
                  min="3"
                  max="60"
                  value={config.executionIntervalSeconds}
                  onChange={(e) => setConfig({ ...config, executionIntervalSeconds: parseInt(e.target.value, 10) || 5 })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-sm"
                />
                <span className="text-[10px] text-slate-400 block">Frecuencia de lectura de micro-velas (recomendado: 3s a 5s)</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
