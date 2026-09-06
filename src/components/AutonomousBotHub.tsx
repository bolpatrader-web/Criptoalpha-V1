import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Cpu,
  Zap,
  Play,
  Pause,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Briefcase,
  Sliders,
  Award,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  ShieldAlert,
  Layers,
  Terminal,
  FileSpreadsheet,
  RotateCcw,
  Sparkles,
  Info,
  Activity,
  History,
  Check,
  AlertCircle
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
import {
  CryptoAsset,
  SimulatedTrade,
  BotConfiguration,
  BotTradeLog,
  BotStrategyType
} from '../types';
import {
  DEFAULT_BOT_CONFIG,
  INITIAL_BOT_LOGS,
  calculateBotPerformance,
  executeBotQuantStep
} from '../utils/quantBotEngine';
import { formatCurrency } from '../utils/formatters';
import { getCryptoLogoUrl, handleCryptoImageError } from '../utils/cryptoLogos';
import { placeAlpacaOrder, isAlpacaSupportedCrypto, closeAlpacaPosition, isQuantAllowedToAlpaca } from '../utils/alpacaClient';
import { subscribeToSyncChannel, publishToSyncChannel } from '../utils/cloudSync';

interface AutonomousBotHubProps {
  assets: CryptoAsset[];
  trades: SimulatedTrade[];
  onTradesUpdate: (newTrades: SimulatedTrade[]) => void;
  onOpenAssetDiagnostic?: (asset: CryptoAsset) => void;
  onOpenChartModal?: (asset: CryptoAsset) => void;
}

export const AutonomousBotHub: React.FC<AutonomousBotHubProps> = ({
  assets,
  trades,
  onTradesUpdate,
  onOpenAssetDiagnostic,
}) => {
  // 1. Bot Configuration State (persisted in localStorage)
  const [config, setConfig] = useState<BotConfiguration>(() => {
    try {
      const saved = localStorage.getItem('crypto_alpha_bot_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_BOT_CONFIG, ...parsed, capitalAllocatedEur: parsed.capitalAllocatedEur || 1000 };
      }
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_BOT_CONFIG;
  });

  // 2. Telemetry Logs State (persisted in localStorage)
  const [logs, setLogs] = useState<BotTradeLog[]>(() => {
    try {
      const saved = localStorage.getItem('crypto_alpha_bot_logs');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return INITIAL_BOT_LOGS;
  });

  // 3. Active Sub-View / Tab inside Bot Hub
  const [activeView, setActiveView] = useState<'broker_dashboard' | 'active_positions' | 'closed_positions' | 'execution_terminal' | 'strategy_studio'>('active_positions');

  // 4. Manual Order Ticket State within Broker
  const [manualAssetId, setManualAssetId] = useState<string>(assets.length > 0 ? assets[0].id : 'solana');
  const [manualAmountEur, setManualAmountEur] = useState<number>(100);
  const [manualOrderType, setManualOrderType] = useState<'BUY' | 'SELL'>('BUY');
  const [manualOrderSuccess, setManualOrderSuccess] = useState<boolean>(false);

  // 5. Timer & Execution Countdown
  const [countdownSeconds, setCountdownSeconds] = useState<number>(config.executionIntervalSeconds);
  const [isExecutingTick, setIsExecutingTick] = useState<boolean>(false);
  const [lastActionMessage, setLastActionMessage] = useState<string>('Motor algorítmico listo. Capital inicial: 1.000 € | Asignación: 50 € / 100 €.');
  const [logFilter, setLogFilter] = useState<'ALL' | 'ORDERS' | 'TAKE_PROFIT' | 'SCANS'>('ALL');
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);
  const [alpacaExecution, setAlpacaExecution] = useState<boolean>(true);
  const alpacaExecutionRef = useRef<boolean>(true);
  alpacaExecutionRef.current = alpacaExecution;

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
  const [isQuantAlpacaRoutingAllowed, setIsQuantAlpacaRoutingAllowed] = useState<boolean>(() => isQuantAllowedToAlpaca());

  useEffect(() => {
    const handleRoutingChange = () => {
      setIsQuantAlpacaRoutingAllowed(isQuantAllowedToAlpaca());
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

  // Keep references for latest state in interval ticks
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

  // Sincronización en tiempo real de la configuración del Bot en la nube (Firestore)
  useEffect(() => {
    const unsub = subscribeToSyncChannel<Partial<BotConfiguration>>('quant_bot_config', (remoteConfig) => {
      if (remoteConfig && typeof remoteConfig === 'object') {
        setConfig((prev) => ({ ...prev, ...remoteConfig }));
      }
    });
    return () => unsub();
  }, []);

  // Save config changes
  const isInitialMountConfig = useRef(true);
  useEffect(() => {
    try {
      localStorage.setItem('crypto_alpha_bot_config', JSON.stringify(config));
      if (isInitialMountConfig.current) {
        isInitialMountConfig.current = false;
        return;
      }
      publishToSyncChannel('quant_bot_config', config);
    } catch (e) {
      console.error(e);
    }
  }, [config]);

  // Save logs
  useEffect(() => {
    try {
      localStorage.setItem('crypto_alpha_bot_logs', JSON.stringify(logs.slice(0, 100)));
    } catch (e) {
      console.error(e);
    }
  }, [logs]);

  // Performance calculations
  const performance = useMemo(() => {
    return calculateBotPerformance(trades, assets, config);
  }, [trades, assets, config]);

  const openTrades = useMemo(() => trades.filter((t) => t.status === 'OPEN'), [trades]);
  const closedTrades = useMemo(() => trades.filter((t) => t.status === 'CLOSED'), [trades]);

  // Closed trades stats
  const closedStats = useMemo(() => {
    let totalRealized = 0;
    let winCount = 0;
    let lossCount = 0;
    let tpCount = 0;
    let slCount = 0;
    let manualCount = 0;

    closedTrades.forEach((t) => {
      const pnl = t.realizedPnlEur || 0;
      totalRealized += pnl;
      if (pnl > 0) winCount++;
      if (pnl < 0) lossCount++;
      if (t.closeReason === 'take_profit') tpCount++;
      else if (t.closeReason === 'stop_loss') slCount++;
      else manualCount++;
    });

    const total = closedTrades.length;
    const winRate = total > 0 ? (winCount / total) * 100 : 0;
    const avgProfit = total > 0 ? totalRealized / total : 0;

    return {
      totalRealized,
      winCount,
      lossCount,
      tpCount,
      slCount,
      manualCount,
      winRate,
      avgProfit,
    };
  }, [closedTrades]);

  // Manual Trigger Execution Function
  const triggerBotExecutionStep = React.useCallback(() => {
    const curAssets = assetsRef.current;
    const curTrades = tradesRef.current;
    const curConfig = configRef.current;
    const curLogs = logsRef.current;

    if (!curAssets || curAssets.length === 0) return;
    setIsExecutingTick(true);

    try {
      const result = executeBotQuantStep(curAssets, curTrades, curConfig, curLogs);
      
      if (result.newLogs.length > 0) {
        setLogs((prev) => [...result.newLogs, ...prev].slice(0, 200));
      }

      if (result.actionTaken === 'TRADE_OPENED' || result.actionTaken === 'TRADE_CLOSED') {
        onTradesUpdateRef.current(result.updatedTrades);

        // Place live paper order in Alpaca Markets if enabled
        if (result.actionTaken === 'TRADE_OPENED' && alpacaExecutionRef.current && result.updatedTrades.length > 0) {
          const openedTrade = result.updatedTrades[0];
          if (openedTrade) {
            const alpacaSym = `${openedTrade.symbol.toUpperCase()}/USD`;
            if (!isAlpacaSupportedCrypto(openedTrade.symbol)) {
              const localLog: BotTradeLog = {
                id: `local-sim-${Date.now()}`,
                timestamp: new Date().toISOString(),
                type: 'SCAN',
                symbol: openedTrade.symbol.toUpperCase(),
                price: openedTrade.entryPriceEur || 0,
                message: `ℹ️ [Simulación Local] ${openedTrade.symbol.toUpperCase()} operado en motor local (${openedTrade.investedEur || 100} €). Par no listado en Alpaca Crypto.`,
                strategy: 'Simulación Local',
              };
              setLogs((prev) => [localLog, ...prev]);
            } else if (!isQuantAllowedToAlpaca()) {
              // Bot desactivado en el menú de Alpaca
              const blockedLog: BotTradeLog = {
                id: `alpaca-blocked-${Date.now()}`,
                timestamp: new Date().toISOString(),
                type: 'SCAN',
                symbol: alpacaSym,
                price: openedTrade.entryPriceEur || 0,
                message: `🛡️ [Enrutamiento Alpaca] Orden para ${alpacaSym} omitida: AlphaBot Quant está desactivado en el menú de Alpaca. Operación registrada solo en simulación local.`,
                strategy: 'Enrutamiento Alpaca (Quant Off)',
              };
              setLogs((prev) => [blockedLog, ...prev]);
            } else {
              placeAlpacaOrder({
                symbol: alpacaSym,
                side: openedTrade.type.toLowerCase() as 'buy' | 'sell',
                notional: openedTrade.investedEur || 100,
                clientOrderId: `criptoalpha_quant_${openedTrade.id}_${Date.now()}`,
                source: 'quant',
              }).then((alpacaRes) => {
                if (alpacaRes.success && alpacaRes.order) {
                  const alpacaLog: BotTradeLog = {
                    id: `alpaca-order-${Date.now()}`,
                    timestamp: new Date().toISOString(),
                    type: 'ORDER_BUY',
                    symbol: alpacaSym,
                    price: openedTrade.entryPriceEur || 0,
                    message: `🦙 [Alpaca Paper #${alpacaRes.order.id.slice(0, 6)}] Orden exclusiva ejecutada por AlphaBot Quant ($${openedTrade.investedEur || 100} USD).`,
                    strategy: 'Alpaca Paper (AlphaBot Quant)',
                  };
                  setLogs((prev) => [alpacaLog, ...prev]);
                } else if (alpacaRes.unsupported) {
                  const localLog: BotTradeLog = {
                    id: `local-sim-${Date.now()}`,
                    timestamp: new Date().toISOString(),
                    type: 'SCAN',
                    symbol: openedTrade.symbol.toUpperCase(),
                    price: openedTrade.entryPriceEur || 0,
                    message: `ℹ️ [Simulación Local] ${openedTrade.symbol.toUpperCase()} operado localmente (no disponible en Alpaca).`,
                    strategy: 'Simulación Local',
                  };
                  setLogs((prev) => [localLog, ...prev]);
                }
              }).catch((err) => console.log('[Alpaca Bot] Error:', err));
            }
          }
        } else if (result.actionTaken === 'TRADE_CLOSED' && alpacaExecutionRef.current) {
          // Detect closed trades to liquidate on Alpaca
          const previousOpen = curTrades.filter(t => t.status === 'OPEN');
          const currentClosed = result.updatedTrades.filter(t => t.status === 'CLOSED');
          const newlyClosed = currentClosed.filter(c => previousOpen.some(p => p.id === c.id));
          
          for (const closedTrade of newlyClosed) {
            if (isAlpacaSupportedCrypto(closedTrade.symbol)) {
              closeAlpacaPosition(`${closedTrade.symbol.toUpperCase()}/USD`).then(res => {
                if (res.success) {
                  const closeLog: BotTradeLog = {
                    id: `alpaca-close-${Date.now()}`,
                    timestamp: new Date().toISOString(),
                    type: 'TAKE_PROFIT',
                    symbol: `${closedTrade.symbol.toUpperCase()}/USD`,
                    price: closedTrade.exitPriceEur || 0,
                    message: `🦙 [Alpaca Paper] Posición ${closedTrade.symbol.toUpperCase()} liquidada en Alpaca por Take Profit/Stop Loss del Bot.`,
                    strategy: 'Alpaca Paper (AlphaBot Quant)',
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
      console.error('Error in bot execution step:', err);
    } finally {
      setIsExecutingTick(false);
      setCountdownSeconds(curConfig.executionIntervalSeconds);
    }
  }, []);

  // Background Autonomous Bot Loop (Countdown & Interval)
  useEffect(() => {
    if (!config.isActive) return;

    let timer = config.executionIntervalSeconds;
    const interval = setInterval(() => {
      timer -= 1;
      if (timer <= 0) {
        timer = config.executionIntervalSeconds;
        setCountdownSeconds(config.executionIntervalSeconds);
        // Execute bot outside the setState updater cycle
        triggerBotExecutionStep();
      } else {
        setCountdownSeconds(timer);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [config.isActive, config.executionIntervalSeconds, triggerBotExecutionStep]);

  // Toggle Bot Power
  const handleToggleBot = () => {
    const newStatus = !config.isActive;
    setConfig((prev) => ({ ...prev, isActive: newStatus }));
    
    const log: BotTradeLog = {
      id: `power-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'SIGNAL_ALERT',
      symbol: 'BOT_SYSTEM',
      price: 0,
      message: newStatus 
        ? '🟢 BOT AUTÓNOMO INICIADO: Operaciones continuas 24/7 con selección de 50 € / 100 € según riesgo.' 
        : '⏸️ BOT AUTÓNOMO PAUSADO: Monitoreo en espera por comando del operador.',
      strategy: config.strategy,
    };
    setLogs((prev) => [log, ...prev]);
  };

  // Reset Bot to 0 from scratch with 1,000 € capital
  const handleResetToZero = () => {
    onTradesUpdate([]);
    try {
      localStorage.removeItem('crypto_alpha_simulated_trades');
      localStorage.removeItem('stock_alpha_simulated_trades');
      localStorage.removeItem('crypto_alpha_bot_logs');
    } catch (e) {
      console.error(e);
    }

    const resetConfig: BotConfiguration = {
      ...DEFAULT_BOT_CONFIG,
      capitalAllocatedEur: 1000,
      tradeSizeLowEur: 50,
      tradeSizeHighEur: 100,
      tradeSizeEur: 100,
      isActive: true,
    };
    setConfig(resetConfig);

    const initLog: BotTradeLog = {
      id: `log-reset-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'SCAN',
      symbol: 'SISTEMA QUANT',
      price: 0,
      message: '🔄 BOT REINICIADO DESDE 0: Capital inicial de 1.000 € establecido. Asignación dinámica activa (50 € / 100 €). Escaneando mercado...',
      strategy: resetConfig.strategy,
    };
    setLogs([initLog]);
    setShowResetConfirm(false);
    setLastActionMessage('Bot reiniciado desde 0. Capital disponible: 1.000,00 €. Iniciando escaneo...');
  };

  // Close Specific Trade
  const handleClosePosition = (tradeId: string) => {
    const matched = trades.find((t) => t.id === tradeId);
    if (!matched) return;

    const asset = assets.find((a) => a.symbol.toUpperCase() === matched.symbol.toUpperCase());
    const curPrice = asset?.current_price || matched.entryPriceEur;
    const invested = matched.investedEur || matched.investedAmountEur || (matched.shares * matched.entryPriceEur);
    
    const pnlPct = matched.type === 'BUY'
      ? ((curPrice - matched.entryPriceEur) / matched.entryPriceEur) * 100
      : ((matched.entryPriceEur - curPrice) / matched.entryPriceEur) * 100;
    
    const pnlEur = invested * (pnlPct / 100);

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
        };
      }
      return t;
    });

    onTradesUpdate(updated);

    if (alpacaExecutionRef.current && isAlpacaSupportedCrypto(matched.symbol)) {
      closeAlpacaPosition(`${matched.symbol.toUpperCase()}/USD`).catch(() => {});
    }

    const log: BotTradeLog = {
      id: `manual-close-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'TAKE_PROFIT',
      symbol: matched.symbol.toUpperCase(),
      price: curPrice,
      message: `✋ CIERRE MANUAL: Posición en ${matched.symbol.toUpperCase()} liquidada por el operador. P&L: ${pnlEur >= 0 ? '+' : ''}${pnlEur.toFixed(2)} € (${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(2)}%)`,
      strategy: 'MANUAL_OVERRIDE',
    };
    setLogs((prev) => [log, ...prev]);
  };

  // Manual Broker Order Submission
  const handleManualOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const asset = assets.find((a) => a.id === manualAssetId) || assets[0];
    if (!asset || manualAmountEur <= 0) return;

    const entryPrice = asset.current_price;
    const shares = Number((manualAmountEur / entryPrice).toFixed(entryPrice < 1 ? 4 : 6));
    const tpPrice = Number((entryPrice * (1 + config.takeProfitPct / 100)).toFixed(entryPrice < 1 ? 6 : 2));
    const slPrice = Number((entryPrice * (1 - config.stopLossPct / 100)).toFixed(entryPrice < 1 ? 6 : 2));

    const convictionTier = manualAmountEur >= 100 ? 'ALTA_CONVICCION_100' : 'RIESGO_CONTROLADO_50';
    const convictionLabel = manualAmountEur >= 100 ? '💎 Alta Convicción (100 €)' : '🛡️ Riesgo Controlado (50 €)';

    const newTrade: SimulatedTrade = {
      id: `manual-trade-${Date.now()}-${asset.symbol.toLowerCase()}`,
      assetId: asset.id,
      symbol: asset.symbol.toLowerCase(),
      name: asset.name,
      image: asset.image,
      sector: asset.sector || 'Cripto',
      type: manualOrderType,
      investedEur: manualAmountEur,
      investedAmountEur: manualAmountEur,
      entryPriceEur: entryPrice,
      entryPriceUsd: entryPrice,
      shares,
      openedAt: new Date().toISOString(),
      status: 'OPEN',
      takeProfitPct: config.takeProfitPct,
      takeProfitPrice: tpPrice,
      takeProfitEur: manualAmountEur * (config.takeProfitPct / 100),
      stopLossPct: config.stopLossPct,
      stopLossPrice: slPrice,
      stopLossEur: manualAmountEur * (config.stopLossPct / 100),
      strategyTag: 'Broker Manual (Operador)',
      convictionTier,
      convictionLabel,
      convictionRationale: `Orden manual ingresada por el operador con asignación de ${manualAmountEur} €`,
    };

    onTradesUpdate([newTrade, ...trades]);

    const log: BotTradeLog = {
      id: `log-manual-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: manualOrderType === 'BUY' ? 'ORDER_BUY' : 'ORDER_SELL',
      symbol: asset.symbol.toUpperCase(),
      price: entryPrice,
      message: `📥 ORDEN MANUAL EN BROKER: ${manualOrderType} de ${shares} ${asset.symbol.toUpperCase()} a ${entryPrice} € (Inversión: ${manualAmountEur} €)`,
      strategy: 'MANUAL_EXECUTION',
    };
    setLogs((prev) => [log, ...prev]);

    setManualOrderSuccess(true);
    setTimeout(() => setManualOrderSuccess(false), 2500);
  };

  // Strategy descriptions map
  const strategyDetails: Record<BotStrategyType, { title: string; desc: string; icon: any; color: string }> = {
    QUANT_ALPHA_AI: {
      title: 'Quant Alpha AI Multi-Factor',
      desc: 'Combina Alpha Scores (>75 pts), RSI en acumulación, volumen Z-Score y métricas on-chain.',
      icon: Sparkles,
      color: 'from-emerald-500 to-teal-500',
    },
    WHALE_FLOW_MOMENTUM: {
      title: 'Flujo Institucional & Ballenas',
      desc: 'Detecta acumulación neta fuera de exchanges ($15M+) y compras en soporte.',
      icon: Activity,
      color: 'from-indigo-500 to-purple-500',
    },
    MULTI_TIMEFRAME_MOMENTUM: {
      title: 'Escáner Multi-Temporal Squeeze',
      desc: 'Ejecuta en confluencia de compresión de volatilidad y expansión alcista.',
      icon: TrendingUp,
      color: 'from-cyan-500 to-blue-500',
    },
    RSI_MEAN_REVERSION: {
      title: 'Reversión a la Media en Sobreventa',
      desc: 'Identifica rebotes estadísticos en activos con RSI < 40 y volumen de absorción.',
      icon: Target,
      color: 'from-amber-500 to-orange-500',
    },
    GRID_TRADING_DCA: {
      title: 'Grid DCA Inteligente',
      desc: 'Malla de compras escalonadas en soportes dinámicos minimizando precio medio.',
      icon: Layers,
      color: 'from-teal-500 to-emerald-500',
    },
    BREAKOUT_VOLATILITY: {
      title: 'Ruptura de Rango & Volatilidad',
      desc: 'Captura movimientos explosivos con ruptura de máximos y volumen creciente.',
      icon: Zap,
      color: 'from-fuchsia-500 to-pink-500',
    },
  };

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    if (logFilter === 'ORDERS') return logs.filter((l) => l.type === 'ORDER_BUY' || l.type === 'ORDER_SELL');
    if (logFilter === 'TAKE_PROFIT') return logs.filter((l) => l.type === 'TAKE_PROFIT' || l.type === 'STOP_LOSS');
    if (logFilter === 'SCANS') return logs.filter((l) => l.type === 'SCAN' || l.type === 'SIGNAL_ALERT');
    return logs;
  }, [logs, logFilter]);

  // Export logs to CSV
  const handleExportLogsCsv = () => {
    const headers = ['Timestamp', 'Tipo', 'Simbolo', 'Precio', 'Estrategia', 'Mensaje'];
    const rows = logs.map((l) => [
      `"${l.timestamp}"`,
      `"${l.type}"`,
      `"${l.symbol}"`,
      l.price,
      `"${l.strategy}"`,
      `"${l.message.replace(/"/g, '""')}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `AlphaBot_Logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. TOP HERO & AUTONOMOUS BOT COMMAND CENTER */}
      <div className="rounded-3xl border border-emerald-500/40 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 sm:p-6 shadow-2xl shadow-emerald-950/30 text-white relative overflow-hidden">
        {/* Glow ambient background element */}
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
                    AlphaBot Quant Supreme V3
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
                  Trading multi-factor: Asigna <strong className="text-emerald-400">100 €</strong> (alta convicción) y <strong className="text-cyan-400">50 €</strong> (riesgo controlado) · TP: <strong className="text-emerald-300">+{config.takeProfitPct}%</strong> | SL: <strong className="text-rose-300">-{config.stopLossPct}%</strong>
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
                  title="Reiniciar el bot desde 0 con 1.000 € de capital inicial"
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
                id="toggle-bot-power-btn"
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
                id="force-bot-execution-btn"
                onClick={() => triggerBotExecutionStep()}
                disabled={isExecutingTick}
                className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-bold text-slate-200 transition cursor-pointer disabled:opacity-50"
                title="Forzar análisis de mercado y ejecución inmediata"
              >
                <Zap className="h-3.5 w-3.5 text-amber-400" />
                <span>Escanear Ahora</span>
              </button>

              {/* SERVER 24/7 ALWAYS-ON DAEMON TOGGLE */}
              <button
                id="toggle-bot-server-daemon-btn"
                onClick={handleToggleServerDaemon}
                disabled={isTogglingServerDaemon}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                  serverDaemonActive
                    ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300 shadow-lg shadow-emerald-950/40'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                } ${isTogglingServerDaemon ? 'opacity-60 cursor-wait' : ''}`}
                title="Activar/pausar ejecución ininterrumpida en el servidor Node.js (opera 24/7 aunque cierres el navegador)"
              >
                <Cpu className={`h-3.5 w-3.5 ${serverDaemonActive ? 'text-emerald-400 animate-pulse' : 'text-slate-400'}`} />
                <span className="hidden sm:inline">Servidor 24/7:</span>
                <span className={`font-mono text-[11px] font-black ${serverDaemonActive ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {serverDaemonActive ? 'ALWAYS-ON' : 'OFF'}
                </span>
                {serverDaemonActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />}
              </button>

              {/* ALPACA PAPER TRADING MIRROR TOGGLE */}
              <button
                id="toggle-bot-alpaca-btn"
                onClick={() => setAlpacaExecution(!alpacaExecution)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                  alpacaExecution
                    ? 'bg-amber-500/20 border-amber-500/60 text-amber-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
                title="Sincronizar y ejecutar órdenes en vivo en Alpaca Paper Trading ($100k USD)"
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
            <span>Estrategia: <strong className="text-teal-300">{strategyDetails[config.strategy]?.title || config.strategy}</strong></span>
          </div>
        </div>
      </div>

      {/* 2. REAL-TIME BROKER PERFORMANCE METRICS (KPIs) */}
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
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-3.5 space-y-1 shadow-sm cursor-pointer hover:border-emerald-500 transition" onClick={() => setActiveView('closed_positions')}>
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
          id="bot-view-positions-btn"
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
          id="bot-view-closed-btn"
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
          id="bot-view-broker-btn"
          onClick={() => setActiveView('broker_dashboard')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap cursor-pointer ${
            activeView === 'broker_dashboard'
              ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Briefcase className="h-4 w-4" />
          <span>📊 Broker &amp; Curva de Capital</span>
        </button>

        <button
          id="bot-view-terminal-btn"
          onClick={() => setActiveView('execution_terminal')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap cursor-pointer ${
            activeView === 'execution_terminal'
              ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Terminal className="h-4 w-4" />
          <span>🖥️ Logs &amp; Telemetría ({logs.length})</span>
        </button>

        <button
          id="bot-view-strategy-btn"
          onClick={() => setActiveView('strategy_studio')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap cursor-pointer ${
            activeView === 'strategy_studio'
              ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Sliders className="h-4 w-4" />
          <span>⚙️ Reglas de Riesgo (50€ / 100€)</span>
        </button>
      </div>

      {/* 4. TAB 1: LIVE ACTIVE POSITIONS MATRIX (SUPER VISUAL & SIMPLE) */}
      {activeView === 'active_positions' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <Activity className="h-5 w-5 text-emerald-400" />
                Operaciones en Vivo del Bot ({openTrades.length})
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Visualización clara y sencilla de cada trade ejecutado de forma autónoma con importes inteligentes de 50 € o 100 €.
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono">
              <div className="bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl">
                <span className="text-slate-400">P&amp;L Flotante Total:</span>{' '}
                <strong className={`font-black ${performance.unrealizedPnlEur >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {performance.unrealizedPnlEur >= 0 ? '+' : ''}{performance.unrealizedPnlEur.toFixed(2)} €
                </strong>
              </div>
            </div>
          </div>

          {openTrades.length === 0 ? (
            <div className="p-12 text-center rounded-3xl border border-dashed border-slate-800 bg-slate-900/60 space-y-3">
              <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
                <Cpu className="h-8 w-8 animate-pulse" />
              </div>
              <div>
                <h4 className="text-lg font-black text-white">Sin operaciones abiertas actualmente</h4>
                <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-md mx-auto leading-relaxed">
                  El bot está escaneando los oráculos de mercado. En cuanto detecte un setup cuantitativo, abrirá automáticamente una posición de <strong className="text-emerald-400">100 €</strong> (alta convicción) o <strong className="text-cyan-400">50 €</strong> (riesgo controlado).
                </p>
              </div>
              <button
                onClick={() => triggerBotExecutionStep()}
                className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 px-5 py-2.5 text-xs sm:text-sm font-black text-slate-950 transition inline-flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20"
              >
                <Zap className="h-4 w-4 fill-current" />
                <span>Forzar Escaneo y Abrir Oportunidad Ahora</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {openTrades.map((trade) => {
                const asset = assets.find(
                  (a) => a.symbol.toUpperCase() === trade.symbol.toUpperCase() || a.id.toLowerCase() === trade.assetId?.toLowerCase()
                );
                const curPrice = asset?.current_price || trade.entryPriceEur;
                const entryPrice = trade.entryPriceEur || trade.entryPriceUsd;
                const invested = trade.investedEur || trade.investedAmountEur || (trade.shares * entryPrice);

                const pnlPct = trade.type === 'BUY'
                  ? ((curPrice - entryPrice) / entryPrice) * 100
                  : ((entryPrice - curPrice) / entryPrice) * 100;
                const pnlEur = invested * (pnlPct / 100);

                const tpPct = trade.takeProfitPct || config.takeProfitPct;
                const slPct = trade.stopLossPct || config.stopLossPct;
                const tpPrice = trade.takeProfitPrice || (entryPrice * (1 + tpPct / 100));
                const slPrice = trade.stopLossPrice || (entryPrice * (1 - slPct / 100));

                const isProfitable = pnlEur >= 0;
                const is100Eur = invested >= 90;

                // Progress to Take Profit (0 to 100%)
                const tpProgress = Math.min(100, Math.max(0, (pnlPct / tpPct) * 100));

                return (
                  <div
                    key={trade.id}
                    className={`rounded-2xl border-2 p-4 sm:p-5 transition space-y-3.5 relative overflow-hidden ${
                      isProfitable
                        ? 'border-emerald-500/50 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/30 shadow-xl shadow-emerald-950/30'
                        : 'border-rose-500/50 bg-gradient-to-br from-slate-900 via-slate-900 to-rose-950/30 shadow-xl shadow-rose-950/30'
                    }`}
                  >
                    {/* Header Strip */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={getCryptoLogoUrl(trade.symbol)}
                          alt={trade.name}
                          onError={(e) => handleCryptoImageError(e, trade.symbol)}
                          referrerPolicy="no-referrer"
                          className="h-11 w-11 rounded-xl object-contain border border-slate-700 bg-slate-950 p-1 shadow-md shrink-0"
                        />
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-lg font-black text-white font-mono">{trade.symbol.toUpperCase()}</span>
                            <span className="text-xs text-slate-300 font-semibold">{trade.name}</span>
                            <span className="rounded bg-emerald-500/20 border border-emerald-500/50 px-2 py-0.5 text-[10px] font-black text-emerald-300 uppercase font-mono">
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
                        <strong className="text-emerald-300">Decisión del Bot:</strong> {trade.convictionRationale || trade.strategyTag || 'Entrada algorítmica por confluencia cuantitativa multi-temporal.'}
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
                      <div className="h-2.5 w-full rounded-full bg-slate-950 border border-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 transition-all duration-300"
                          style={{ width: `${tpProgress}%` }}
                        />
                      </div>
                    </div>

                    {/* Actions: Close Position / Diagnostics */}
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

      {/* 5. TAB 2: SUBAPARTADO DEDICADO DE OPERACIONES CERRADAS */}
      {activeView === 'closed_positions' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Closed Trades Summary Card */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                  <History className="h-5 w-5 text-emerald-400" />
                  Subapartado de Operaciones Cerradas ({closedTrades.length})
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
                  Registro histórico de todas las operaciones liquidadas por Take Profit, Stop Loss o Cierre Manual.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportLogsCsv}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 px-3.5 py-2 text-xs font-bold text-slate-200 transition cursor-pointer"
                >
                  <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
                  <span>Exportar Historial</span>
                </button>
              </div>
            </div>

            {/* Closed Metrics KPI Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 font-sans block">Ganancia Realizada Total</span>
                <strong className={`text-lg font-black ${closedStats.totalRealized >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {closedStats.totalRealized >= 0 ? '+' : ''}{closedStats.totalRealized.toFixed(2)} €
                </strong>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 font-sans block">Efectividad (Win Rate)</span>
                <strong className="text-lg font-black text-amber-300">
                  {closedTrades.length > 0 ? `${closedStats.winRate.toFixed(1)}%` : '0%'}
                </strong>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 font-sans block">Take Profit / Stop Loss</span>
                <strong className="text-lg font-black text-teal-300">
                  {closedStats.tpCount} TP 🎯 / {closedStats.slCount} SL 🛑
                </strong>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 font-sans block">Beneficio Medio / Trade</span>
                <strong className={`text-lg font-black ${closedStats.avgProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {closedStats.avgProfit >= 0 ? '+' : ''}{closedStats.avgProfit.toFixed(2)} €
                </strong>
              </div>
            </div>
          </div>

          {/* Closed Trades List */}
          {closedTrades.length === 0 ? (
            <div className="p-12 text-center rounded-3xl border border-dashed border-slate-800 bg-slate-900/60 space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-400 mx-auto">
                <History className="h-6 w-6" />
              </div>
              <h4 className="text-base font-bold text-white">No hay operaciones cerradas aún</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Las operaciones abiertas se registrarán automáticamente aquí cuando alcancen el Take Profit (+7.5%), Stop Loss (-2.8%) o sean cerradas manualmente.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {closedTrades.map((trade) => {
                const invested = trade.investedEur || trade.investedAmountEur || 100;
                const pnlEur = trade.realizedPnlEur !== undefined ? trade.realizedPnlEur : 0;
                const pnlPct = trade.realizedPnlPct !== undefined ? trade.realizedPnlPct : 0;
                const isProfitable = pnlEur >= 0;

                let reasonBadge = (
                  <span className="rounded-full bg-slate-800 text-slate-300 border border-slate-700 px-2.5 py-0.5 text-[10px] font-bold">
                    Cierre Manual
                  </span>
                );

                if (trade.closeReason === 'take_profit') {
                  reasonBadge = (
                    <span className="rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 px-2.5 py-0.5 text-[10px] font-black flex items-center gap-1">
                      <Target className="h-3 w-3" /> TAKE PROFIT (+{trade.takeProfitPct || 7.5}%)
                    </span>
                  );
                } else if (trade.closeReason === 'stop_loss') {
                  reasonBadge = (
                    <span className="rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/50 px-2.5 py-0.5 text-[10px] font-black flex items-center gap-1">
                      <ShieldAlert className="h-3 w-3" /> STOP LOSS (-{trade.stopLossPct || 2.8}%)
                    </span>
                  );
                }

                return (
                  <div
                    key={trade.id}
                    className={`rounded-2xl border p-4 sm:p-5 transition bg-slate-900/90 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                      isProfitable ? 'border-emerald-500/30' : 'border-rose-500/30'
                    }`}
                  >
                    {/* Left: Asset Info & Reason */}
                    <div className="flex items-center gap-3.5">
                      <img
                        src={getCryptoLogoUrl(trade.symbol)}
                        alt={trade.name}
                        onError={(e) => handleCryptoImageError(e, trade.symbol)}
                        referrerPolicy="no-referrer"
                        className="h-10 w-10 rounded-xl object-contain border border-slate-700 bg-slate-950 p-1 shadow-md shrink-0"
                      />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-base font-black text-white font-mono">{trade.symbol.toUpperCase()}</span>
                          <span className="text-xs text-slate-300">{trade.name}</span>
                          {reasonBadge}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                          <span>Inversión: <strong className="text-white">{invested.toFixed(2)} €</strong></span>
                          <span>•</span>
                          <span>Entrada: <strong className="text-slate-300">{formatCurrency(trade.entryPriceEur)}</strong></span>
                          {trade.exitPriceEur && (
                            <>
                              <span>•</span>
                              <span>Salida: <strong className="text-slate-300">{formatCurrency(trade.exitPriceEur)}</strong></span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Profit/Loss Results & Date */}
                    <div className="flex items-center justify-between md:justify-end gap-6 text-right pt-2 md:pt-0 border-t md:border-t-0 border-slate-800">
                      <div className="text-left md:text-right text-[11px] text-slate-400 font-mono">
                        <div>Apertura: {new Date(trade.openedAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                        {trade.closedAt && (
                          <div>Cierre: {new Date(trade.closedAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                        )}
                      </div>

                      <div className="text-right">
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
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 6. TAB 3: BROKER TERMINAL & EQUITY CURVE */}
      {activeView === 'broker_dashboard' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-200">
          {/* Left 2 Cols: Real-Time Equity Curve Chart vs Benchmark */}
          <div className="lg:col-span-2 rounded-3xl border border-slate-800 bg-slate-900/90 p-4 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-emerald-400" />
                  Curva de Crecimiento del Capital (Equity Curve)
                </h3>
                <p className="text-xs text-slate-400">
                  Evolución del balance en Euros (€) partiendo de 1.000 € iniciales
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                  Balance: {performance.currentBalanceEur.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                </span>
              </div>
            </div>

            {/* Equity Curve Chart */}
            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={performance.equityCurve} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="btcGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                  <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    domain={['auto', 'auto']}
                    tickFormatter={(val) => `${val.toLocaleString()}€`}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem' }}
                    labelStyle={{ color: '#e2e8f0', fontWeight: 'bold' }}
                    formatter={(val: any, name: string) => [
                      `${Number(val).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €`,
                      name === 'equityEur' ? 'Cartera AlphaBot' : 'Benchmark BTC',
                    ]}
                  />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    wrapperStyle={{ paddingBottom: '10px', fontSize: '11px' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="equityEur"
                    name="AlphaBot Quant"
                    stroke="#10b981"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#equityGradient)"
                  />
                  <Area
                    type="monotone"
                    dataKey="benchmarkBtcEur"
                    name="Benchmark BTC"
                    stroke="#6366f1"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    fillOpacity={1}
                    fill="url(#btcGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Quick Strategy Performance Diagnostic Chips */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800/80 text-xs font-mono">
              <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-[10px] text-slate-400 font-sans">Mejor Trade</div>
                <div className="text-emerald-400 font-black mt-0.5">+{performance.bestTradePnlPct}%</div>
              </div>
              <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-[10px] text-slate-400 font-sans">Peor Trade</div>
                <div className="text-rose-400 font-black mt-0.5">-{Math.abs(performance.worstTradePnlPct)}%</div>
              </div>
              <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-[10px] text-slate-400 font-sans">Duración Media</div>
                <div className="text-slate-200 font-black mt-0.5">{performance.avgTradeDurationMinutes} min</div>
              </div>
              <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-[10px] text-slate-400 font-sans">Máximo Drawdown</div>
                <div className="text-amber-400 font-black mt-0.5">{performance.maxDrawdownPct}%</div>
              </div>
            </div>
          </div>

          {/* Right Col: Interactive Online Broker Order Ticket (Spot / Futures) */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-4 sm:p-6 space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <Zap className="h-5 w-5 text-emerald-400" />
                Terminal Broker en Directo
              </h3>
              <p className="text-xs text-slate-400">
                Ejecución manual opcional integrada con la misma gestión de riesgo
              </p>
            </div>

            <form onSubmit={handleManualOrderSubmit} className="space-y-3.5">
              {/* Asset Selection */}
              <div>
                <label className="text-[11px] font-bold uppercase text-slate-400 block mb-1">
                  Criptomoneda a Operar
                </label>
                <select
                  value={manualAssetId}
                  onChange={(e) => setManualAssetId(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs sm:text-sm font-black text-white focus:border-emerald-500 focus:outline-none cursor-pointer"
                >
                  {assets.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.symbol.toUpperCase()} — {a.name} ({formatCurrency(a.current_price)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Order Direction */}
              <div>
                <label className="text-[11px] font-bold uppercase text-slate-400 block mb-1">
                  Tipo de Posición
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setManualOrderType('BUY')}
                    className={`py-2 px-3 rounded-xl border text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${
                      manualOrderType === 'BUY'
                        ? 'border-emerald-500 bg-emerald-950/70 text-emerald-300 shadow-md'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                    }`}
                  >
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                    <span>COMPRA / LONG</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setManualOrderType('SELL')}
                    className={`py-2 px-3 rounded-xl border text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${
                      manualOrderType === 'SELL'
                        ? 'border-rose-500 bg-rose-950/70 text-rose-300 shadow-md'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                    }`}
                  >
                    <TrendingDown className="h-3.5 w-3.5 text-rose-400" />
                    <span>VENTA / SHORT</span>
                  </button>
                </div>
              </div>

              {/* Capital in Euros */}
              <div>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <label className="font-bold uppercase text-slate-400">Capital a Invertir (€)</label>
                  <span className="text-slate-500">Disponible: {performance.availableCashEur.toFixed(2)} €</span>
                </div>
                <div className="relative">
                  <div className="absolute left-3 top-2 text-emerald-400 font-bold font-mono">€</div>
                  <input
                    type="number"
                    min="10"
                    max="1000"
                    step="10"
                    value={manualAmountEur}
                    onChange={(e) => setManualAmountEur(Math.max(10, Number(e.target.value)))}
                    className="w-full rounded-xl border border-emerald-500/40 bg-slate-950 py-2 pl-8 pr-3 text-sm font-mono font-bold text-white focus:border-emerald-400 focus:outline-none"
                    placeholder="100"
                    required
                  />
                </div>

                {/* Preset Chips (50 € and 100 €) */}
                <div className="flex items-center gap-1.5 mt-1.5">
                  {[50, 100, 200, 500].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setManualAmountEur(amt)}
                      className={`rounded px-2.5 py-1 text-[10px] font-mono font-bold transition cursor-pointer ${
                        manualAmountEur === amt
                          ? 'bg-emerald-500 text-slate-950 font-black'
                          : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      {amt} €
                    </button>
                  ))}
                </div>
              </div>

              {/* Automated Protection Preview */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1 text-xs font-mono">
                <div className="flex items-center justify-between text-emerald-400">
                  <span>Take Profit (+{config.takeProfitPct}%):</span>
                  <strong>+{(manualAmountEur * (config.takeProfitPct / 100)).toFixed(2)} €</strong>
                </div>
                <div className="flex items-center justify-between text-rose-400">
                  <span>Stop Loss (-{config.stopLossPct}%):</span>
                  <strong>-{(manualAmountEur * (config.stopLossPct / 100)).toFixed(2)} €</strong>
                </div>
              </div>

              {/* Submit Execution Button */}
              <button
                type="submit"
                className={`w-full py-3 rounded-xl text-xs sm:text-sm font-black transition flex items-center justify-center gap-2 shadow-lg cursor-pointer ${
                  manualOrderSuccess
                    ? 'bg-emerald-500 text-slate-950 animate-pulse'
                    : manualOrderType === 'BUY'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-500 text-slate-950 hover:brightness-110 shadow-emerald-500/20'
                    : 'bg-gradient-to-r from-rose-600 to-amber-600 text-white hover:brightness-110 shadow-rose-500/20'
                }`}
              >
                {manualOrderSuccess ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>¡Orden Ejecutada con Éxito!</span>
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4" />
                    <span>Ejecutar Orden {manualOrderType} ({manualAmountEur} €)</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 7. TAB 4: TELEMETRY & EXECUTION TERMINAL */}
      {activeView === 'execution_terminal' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-4 rounded-2xl">
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <Terminal className="h-5 w-5 text-emerald-400" />
                Terminal Algorítmica &amp; Registro de Decisiones
              </h3>
              <p className="text-xs text-slate-400">
                Registro cronológico detallado de cada orden de 50 € y 100 €, escaneo y cierre por Take Profit / Stop Loss
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Filter Chips */}
              <div className="flex items-center rounded-xl bg-slate-950 p-1 border border-slate-800 text-[11px] font-bold">
                {(['ALL', 'ORDERS', 'TAKE_PROFIT', 'SCANS'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setLogFilter(filter)}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                      logFilter === filter ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {filter === 'ALL' ? 'Todos' : filter === 'ORDERS' ? 'Órdenes' : filter === 'TAKE_PROFIT' ? 'Cierres/TP' : 'Escaneos'}
                  </button>
                ))}
              </div>

              {/* Export CSV Button */}
              <button
                onClick={handleExportLogsCsv}
                className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-bold text-slate-200 transition cursor-pointer"
                title="Descargar historial de logs en CSV"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
                <span>Exportar CSV</span>
              </button>
            </div>
          </div>

          {/* Monospaced Log Stream Container */}
          <div className="rounded-3xl border border-slate-800 bg-slate-950 p-4 sm:p-5 font-mono text-xs max-h-[500px] overflow-y-auto space-y-2 shadow-inner">
            {filteredLogs.length === 0 ? (
              <div className="py-12 text-center text-slate-500">
                No hay registros que coincidan con el filtro seleccionado.
              </div>
            ) : (
              filteredLogs.map((log) => {
                let badgeColor = 'text-slate-400 bg-slate-900 border-slate-800';
                if (log.type === 'ORDER_BUY') badgeColor = 'text-emerald-300 bg-emerald-950/80 border-emerald-500/50 font-bold';
                if (log.type === 'ORDER_SELL') badgeColor = 'text-rose-300 bg-rose-950/80 border-rose-500/50 font-bold';
                if (log.type === 'TAKE_PROFIT') badgeColor = 'text-amber-300 bg-amber-950/80 border-amber-500/50 font-black';
                if (log.type === 'STOP_LOSS') badgeColor = 'text-rose-400 bg-rose-950/80 border-rose-500/50 font-black';
                if (log.type === 'SIGNAL_ALERT') badgeColor = 'text-teal-300 bg-teal-950/80 border-teal-500/50';

                return (
                  <div
                    key={log.id}
                    className="p-2.5 rounded-xl border border-slate-900 bg-slate-900/60 hover:bg-slate-900 transition flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div className="flex items-start sm:items-center gap-2.5 flex-1 min-w-0">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wider shrink-0 ${badgeColor}`}>
                        {log.type}
                      </span>
                      <span className="text-slate-200 text-xs break-words">
                        {log.message}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[10px] text-slate-500 shrink-0">
                      {log.price > 0 && <span className="text-slate-300 font-bold">{formatCurrency(log.price)}</span>}
                      <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 8. TAB 5: QUANT STRATEGY STUDIO & DYNAMIC SIZING RULES */}
      {activeView === 'strategy_studio' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-200">
          {/* Left 2 Cols: Strategy Selection & Sizing Setup */}
          <div className="lg:col-span-2 rounded-3xl border border-slate-800 bg-slate-900/90 p-4 sm:p-6 space-y-6">
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <Sliders className="h-5 w-5 text-emerald-400" />
                Reglas de Asignación Inteligente (50 € / 100 €)
              </h3>
              <p className="text-xs text-slate-400">
                El bot analiza el riesgo y convicción de cada oportunidad para elegir automáticamente entre 50 € y 100 €.
              </p>
            </div>

            {/* Visual Sizing Explanation Card */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl border border-emerald-500/50 bg-emerald-950/20 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-black text-sm">
                    100€
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-emerald-300">Alta Convicción Cuántica</h4>
                    <span className="text-[10px] text-emerald-400/80">Alpha Score &gt;= 82 pts o Flujo Ballenas</span>
                  </div>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Cuando la señal tiene alineación multi-temporal sólida, volumen institucional anormal y acumulación on-chain, el bot invierte exactamente <strong className="text-emerald-300">100 €</strong>.
                </p>
              </div>

              <div className="p-4 rounded-2xl border border-cyan-500/50 bg-cyan-950/20 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-cyan-500/20 flex items-center justify-center text-cyan-400 font-black text-sm">
                    50€
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-cyan-300">Riesgo Controlado / Moderado</h4>
                    <span className="text-[10px] text-cyan-400/80">Alpha Score 75–81 pts o Alta Beta</span>
                  </div>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  En oportunidades tácticas de mayor volatilidad o menor convicción relativa, el bot limita la exposición invirtiendo exactamente <strong className="text-cyan-300">50 €</strong>.
                </p>
              </div>
            </div>

            {/* Strategy Selection */}
            <div className="space-y-3 pt-2">
              <h4 className="text-sm font-black text-white uppercase tracking-wider">
                Estrategia Cuántica Activa
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(Object.keys(strategyDetails) as BotStrategyType[]).map((stratKey) => {
                  const strat = strategyDetails[stratKey];
                  const isSelected = config.strategy === stratKey;
                  const IconComponent = strat.icon;

                  return (
                    <div
                      key={stratKey}
                      onClick={() => setConfig((prev) => ({ ...prev, strategy: stratKey }))}
                      className={`p-3.5 rounded-2xl border transition cursor-pointer space-y-1.5 ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-950/40 shadow-lg shadow-emerald-950/30'
                          : 'border-slate-800 bg-slate-950/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded-lg bg-gradient-to-br ${strat.color} text-white`}>
                            <IconComponent className="h-4 w-4" />
                          </div>
                          <h4 className="text-xs sm:text-sm font-bold text-white">{strat.title}</h4>
                        </div>
                        {isSelected && (
                          <span className="rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black px-2 py-0.5">
                            ACTIVA
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        {strat.desc}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Risk Management Sliders */}
            <div className="space-y-4 pt-4 border-t border-slate-800">
              <h4 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                Parámetros de Salida y Protección
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Take Profit % */}
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-emerald-400 font-bold">Take Profit (+{config.takeProfitPct}%)</span>
                    <span className="text-slate-400 font-sans">Cierre en ganancia</span>
                  </div>
                  <input
                    type="range"
                    min="3.0"
                    max="20.0"
                    step="0.5"
                    value={config.takeProfitPct}
                    onChange={(e) => setConfig((prev) => ({ ...prev, takeProfitPct: Number(e.target.value) }))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                </div>

                {/* Stop Loss % */}
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-rose-400 font-bold">Stop Loss (-{config.stopLossPct}%)</span>
                    <span className="text-slate-400 font-sans">Límite de pérdida</span>
                  </div>
                  <input
                    type="range"
                    min="1.5"
                    max="8.0"
                    step="0.1"
                    value={config.stopLossPct}
                    onChange={(e) => setConfig((prev) => ({ ...prev, stopLossPct: Number(e.target.value) }))}
                    className="w-full accent-rose-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Col: Capital & Reset Studio */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-4 sm:p-6 space-y-4">
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-emerald-400" />
                Capital del Bot
              </h3>
              <p className="text-xs text-slate-400">
                Fondos asignados para la operativa continua
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-bold">Capital Inicial Asignado:</span>
                <span className="text-base font-black text-white font-mono">{config.capitalAllocatedEur} €</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-bold">Importes por Operación:</span>
                <span className="text-emerald-400 font-bold font-mono">50 € y 100 €</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-bold">Máximo Posiciones Abiertas:</span>
                <span className="text-white font-bold font-mono">{config.maxOpenPositions} simultáneas</span>
              </div>
            </div>

            {/* Reset Bot to 0 Action */}
            <div className="pt-2">
              <button
                onClick={() => setShowResetConfirm(true)}
                className="w-full py-3 rounded-xl border border-rose-500/50 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 hover:text-white text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer shadow-lg"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Reiniciar Bot a 0 (1.000 € Capital)</span>
              </button>
            </div>

            {/* Universe list info */}
            <div className="p-3 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 space-y-1 text-[11px] text-emerald-200">
              <div className="flex items-center gap-1 font-bold text-emerald-400">
                <Info className="h-3.5 w-3.5" />
                <span>Criptomonedas Monitoreadas</span>
              </div>
              <p className="text-[10px] text-slate-300 leading-relaxed">
                El bot evalúa continuamente 12 activos principales incluyendo BTC, ETH, SOL, SUI, TAO, RENDER, AAVE, LINK y UNI con cotizaciones en tiempo real.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
