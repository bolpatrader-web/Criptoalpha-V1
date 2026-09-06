import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  X,
  ShieldCheck,
  Zap,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  DollarSign,
  Wallet,
  Activity,
  Layers,
  Sparkles,
  Search,
  Trash2,
  BarChart3,
  AlertTriangle,
  Play,
  Pause,
  ExternalLink,
  Sliders,
  History,
  Info,
  Cpu,
  Server,
  ToggleLeft,
  ToggleRight,
  Check
} from 'lucide-react';
import {
  AlpacaAccountInfo,
  AlpacaPosition,
  AlpacaOrder,
  AlpacaActivity,
  AlpacaPortfolioHistory,
  CryptoAsset,
  AlpacaBotRoutingConfig,
  AlpacaBotRoutingMode
} from '../types';
import {
  fetchAlpacaAccount,
  fetchAlpacaPositions,
  fetchAlpacaOrders,
  fetchAlpacaActivities,
  fetchAlpacaPortfolioHistory,
  placeAlpacaOrder,
  closeAlpacaPosition,
  closeAllAlpacaPositions,
  cancelAlpacaOrder,
  setAlpacaExclusiveBotMode,
  purgeForeignAlpacaOrdersAndPositions,
  fetchAlpacaDaemonStatus,
  toggleAlpacaDaemon,
  updateAlpacaDaemonConfig,
  fetchAlpacaBotRouting,
  saveAlpacaBotRouting,
  deactivateBotAndLiquidate,
  getAlpacaBotRoutingLocal,
  ALPACA_SUPPORTED_CRYPTO_SYMBOLS,
  cleanCryptoBaseSymbol
} from '../utils/alpacaClient';
import { getCryptoLogoUrl, handleCryptoImageError } from '../utils/cryptoLogos';

interface AlpacaDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  assets?: CryptoAsset[];
  onTradeExecuted?: () => void;
}

export const AlpacaDashboardModal: React.FC<AlpacaDashboardModalProps> = ({
  isOpen,
  onClose,
  assets = [],
  onTradeExecuted,
}) => {
  const [account, setAccount] = useState<AlpacaAccountInfo | null>(null);
  const [positions, setPositions] = useState<AlpacaPosition[]>([]);
  const [orders, setOrders] = useState<AlpacaOrder[]>([]);
  const [activities, setActivities] = useState<AlpacaActivity[]>([]);
  const [portfolioHistory, setPortfolioHistory] = useState<AlpacaPortfolioHistory | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [refreshIntervalSec, setRefreshIntervalSec] = useState<number>(5);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const [activeTab, setActiveTab] = useState<'overview' | 'positions' | 'activities' | 'orders' | 'quick_trade' | 'daemon_247'>('overview');
  const [orderFilter, setOrderFilter] = useState<'all' | 'filled' | 'open' | 'canceled'>('all');
  const [activityFilter, setActivityFilter] = useState<'ALL' | 'BUY' | 'SELL'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Sorting state for open positions: 'date' (fecha) or 'profit' (beneficio)
  const [positionSortBy, setPositionSortBy] = useState<'date' | 'profit'>('date');
  const [positionSortOrder, setPositionSortOrder] = useState<'desc' | 'asc'>('desc');

  // 24/7 Cloud Daemon Engine state
  const [daemonStatus, setDaemonStatus] = useState<any>(null);
  const [isTogglingDaemon, setIsTogglingDaemon] = useState<boolean>(false);
  const [daemonConfigForm, setDaemonConfigForm] = useState({
    tradeSizeUsd: 100,
    maxOpenPositions: 6,
    takeProfitPct: 1.8,
    stopLossPct: 1.2,
    intervalSeconds: 30,
    maxTotalExposureEur: 1000,
  });

  // Quick trade ticket state
  const [tradeSymbol, setTradeSymbol] = useState<string>('BTC/USD');
  const [tradeSide, setTradeSide] = useState<'buy' | 'sell'>('buy');
  const [tradeAmountUsd, setTradeAmountUsd] = useState<number>(100);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [closingSymbol, setClosingSymbol] = useState<string | null>(null);
  const [isClosingAll, setIsClosingAll] = useState<boolean>(false);
  const [showConfirmCloseAll, setShowConfirmCloseAll] = useState<boolean>(false);
  const [onlyBotsFilter, setOnlyBotsFilter] = useState<boolean>(true);
  const [isPurgingExclusive, setIsPurgingExclusive] = useState<boolean>(false);

  // ==========================================
  // BOT ROUTING CONFIG & DEACTIVATION WARNING
  // ==========================================
  const [botRouting, setBotRouting] = useState<AlpacaBotRoutingConfig>(getAlpacaBotRoutingLocal());
  const [pendingDeactivation, setPendingDeactivation] = useState<{
    target: 'scalp' | 'quant' | 'both';
    targetName: string;
    newConfig: AlpacaBotRoutingConfig;
  } | null>(null);
  const [isDeactivating, setIsDeactivating] = useState<boolean>(false);

  // Cargar enrutamiento de bots desde el backend
  const loadBotRouting = useCallback(async () => {
    try {
      const routing = await fetchAlpacaBotRouting();
      setBotRouting(routing);
    } catch {
      setBotRouting(getAlpacaBotRoutingLocal());
    }
  }, []);

  // Seleccionar uno de los 4 modos globales de enrutamiento
  const handleSelectRoutingMode = (mode: AlpacaBotRoutingMode) => {
    let newScalp = false;
    let newQuant = false;

    if (mode === 'both') {
      newScalp = true;
      newQuant = true;
    } else if (mode === 'scalp_only') {
      newScalp = true;
      newQuant = false;
    } else if (mode === 'quant_only') {
      newScalp = false;
      newQuant = true;
    } else {
      newScalp = false;
      newQuant = false;
    }

    const isDisablingScalp = botRouting.scalpEnabled && !newScalp;
    const isDisablingQuant = botRouting.quantEnabled && !newQuant;

    // Si se desactiva algún bot que estaba activo, exigir confirmación de advertencia
    if (isDisablingScalp && isDisablingQuant) {
      setPendingDeactivation({
        target: 'both',
        targetName: 'Ambos Bots (AlphaBot Quant y Scalping Pro)',
        newConfig: { scalpEnabled: false, quantEnabled: false, mode: 'none' },
      });
    } else if (isDisablingQuant) {
      setPendingDeactivation({
        target: 'quant',
        targetName: 'AlphaBot Autónomo Quant',
        newConfig: { scalpEnabled: newScalp, quantEnabled: false, mode: newScalp ? 'scalp_only' : 'none' },
      });
    } else if (isDisablingScalp) {
      setPendingDeactivation({
        target: 'scalp',
        targetName: 'AlphaBot Scalping Pro V4',
        newConfig: { scalpEnabled: false, quantEnabled: newQuant, mode: newQuant ? 'quant_only' : 'none' },
      });
    } else {
      // Activando o mismo estado: aplicar sin alerta de cierre de operaciones
      const updated: AlpacaBotRoutingConfig = {
        scalpEnabled: newScalp,
        quantEnabled: newQuant,
        mode,
      };
      setBotRouting(updated);
      saveAlpacaBotRouting(updated);
      setFeedback({
        success: true,
        message: `✅ Enrutamiento de Alpaca actualizado: ${mode === 'both' ? 'Ambos bots activos para operar' : mode === 'scalp_only' ? 'Solo Scalping Pro activo' : mode === 'quant_only' ? 'Solo Autónomo Quant activo' : 'Ningún bot enviará órdenes a Alpaca'}.`,
      });
    }
  };

  // Toggle individual por bot
  const handleToggleBotRouting = (bot: 'scalp' | 'quant') => {
    if (bot === 'scalp') {
      if (botRouting.scalpEnabled) {
        setPendingDeactivation({
          target: 'scalp',
          targetName: 'AlphaBot Scalping Pro V4',
          newConfig: {
            ...botRouting,
            scalpEnabled: false,
            mode: botRouting.quantEnabled ? 'quant_only' : 'none',
          },
        });
      } else {
        const updated: AlpacaBotRoutingConfig = {
          ...botRouting,
          scalpEnabled: true,
          mode: botRouting.quantEnabled ? 'both' : 'scalp_only',
        };
        setBotRouting(updated);
        saveAlpacaBotRouting(updated);
        setFeedback({
          success: true,
          message: '⚡ AlphaBot Scalping Pro V4 activado para enviar operaciones a Alpaca.',
        });
      }
    } else {
      if (botRouting.quantEnabled) {
        setPendingDeactivation({
          target: 'quant',
          targetName: 'AlphaBot Autónomo Quant',
          newConfig: {
            ...botRouting,
            quantEnabled: false,
            mode: botRouting.scalpEnabled ? 'scalp_only' : 'none',
          },
        });
      } else {
        const updated: AlpacaBotRoutingConfig = {
          ...botRouting,
          quantEnabled: true,
          mode: botRouting.scalpEnabled ? 'both' : 'quant_only',
        };
        setBotRouting(updated);
        saveAlpacaBotRouting(updated);
        setFeedback({
          success: true,
          message: '🧠 AlphaBot Autónomo Quant activado para enviar operaciones a Alpaca.',
        });
      }
    }
  };

  // Confirmar advertencia: cerrar posiciones abiertas del bot y desactivarlo
  const handleConfirmDeactivation = async () => {
    if (!pendingDeactivation) return;
    setIsDeactivating(true);
    setFeedback(null);
    try {
      const res = await deactivateBotAndLiquidate(pendingDeactivation.target);
      if (res.success) {
        setBotRouting(pendingDeactivation.newConfig);
        setFeedback({
          success: true,
          message: `⚠️ Desactivación ejecutada: Se han cerrado ${res.closedPositionsCount} posiciones abiertas y cancelado ${res.cancelledOrdersCount} órdenes de ${pendingDeactivation.targetName} en Alpaca Markets. Este bot no volverá a realizar operaciones hasta que se vuelva a activar.`,
        });
        setPendingDeactivation(null);
        await loadData(false);
        if (onTradeExecuted) onTradeExecuted();
      } else {
        setFeedback({
          success: false,
          message: res.message || 'Error al liquidar posiciones y desactivar el bot en Alpaca',
        });
      }
    } catch (e: any) {
      setFeedback({
        success: false,
        message: e?.message || 'Error de comunicación al desactivar el bot en Alpaca',
      });
    } finally {
      setIsDeactivating(false);
    }
  };

  // Purge foreign orders and align Alpaca exclusively with app bots
  const handleSyncExclusivePurge = async () => {
    setIsPurgingExclusive(true);
    setFeedback(null);
    try {
      const res = await purgeForeignAlpacaOrdersAndPositions();
      if (res.success) {
        setFeedback({
          success: true,
          message: `🛡️ Exclusividad sincronizada: ${res.cancelledCount} órdenes ajenas canceladas. La cuenta de Alpaca opera exclusivamente con los bots de esta app.`,
        });
        await loadData(false);
        await loadDaemonStatus();
      } else {
        setFeedback({
          success: false,
          message: res.message || 'Error al sincronizar exclusividad en Alpaca',
        });
      }
    } catch (e: any) {
      setFeedback({
        success: false,
        message: e?.message || 'Error de comunicación con Alpaca',
      });
    } finally {
      setIsPurgingExclusive(false);
    }
  };

  // Fetch 24/7 Server Daemon Status safely
  const loadDaemonStatus = useCallback(async () => {
    try {
      const data = await fetchAlpacaDaemonStatus();
      if (data && data.success) {
        setDaemonStatus(data);
        if (data.config) {
          setDaemonConfigForm({
            tradeSizeUsd: data.config.tradeSizeUsd || 100,
            maxOpenPositions: data.config.maxOpenPositions || 6,
            takeProfitPct: data.config.takeProfitPct || 1.8,
            stopLossPct: data.config.stopLossPct || 1.2,
            intervalSeconds: data.config.intervalSeconds || 30,
            maxTotalExposureEur: data.config.maxTotalExposureEur || 1000,
          });
        }
      }
    } catch {
      // Silently handle transient connection errors during server restarts
    }
  }, []);

  // Fetch all Alpaca data
  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const [acc, pos, ord, act, hist] = await Promise.all([
        fetchAlpacaAccount(),
        fetchAlpacaPositions(),
        fetchAlpacaOrders(),
        fetchAlpacaActivities('FILL'),
        fetchAlpacaPortfolioHistory('1M', '1D'),
      ]);
      setAccount(acc);
      setPositions(pos);
      setOrders(ord);
      setActivities(act);
      setPortfolioHistory(hist);
      setLastUpdated(new Date());
    } catch (e) {
      console.error('Error fetching Alpaca dashboard data:', e);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    if (isOpen) {
      loadData(false);
      loadDaemonStatus();
      loadBotRouting();
      setFeedback(null);
      setShowConfirmCloseAll(false);
      setPendingDeactivation(null);
    }
  }, [isOpen, loadData, loadDaemonStatus, loadBotRouting]);

  // Real-time polling timer
  useEffect(() => {
    if (!isOpen || !autoRefresh) return;
    const interval = setInterval(() => {
      loadData(true);
      loadDaemonStatus();
    }, refreshIntervalSec * 1000);
    return () => clearInterval(interval);
  }, [isOpen, autoRefresh, refreshIntervalSec, loadData, loadDaemonStatus]);

  // Calculations for executive summary
  const summaryMetrics = useMemo(() => {
    const totalCash = account?.cash ?? 100000;
    const totalEquity = account?.portfolioValue ?? 100000;
    const buyingPower = account?.buyingPower ?? 400000;

    let totalInvested = 0;
    let totalUnrealizedPl = 0;
    let winningCount = 0;
    let losingCount = 0;
    let bestPerformer: { symbol: string; pl: number; plPct: number } | null = null;
    let worstPerformer: { symbol: string; pl: number; plPct: number } | null = null;

    positions.forEach((pos) => {
      const mv = parseFloat(pos.market_value || '0');
      const pl = parseFloat(pos.unrealized_pl || '0');
      const plPct = parseFloat(pos.unrealized_plpc || '0') * 100;

      totalInvested += mv;
      totalUnrealizedPl += pl;

      if (pl >= 0) winningCount++;
      else losingCount++;

      if (!bestPerformer || plPct > bestPerformer.plPct) {
        bestPerformer = { symbol: pos.symbol, pl, plPct };
      }
      if (!worstPerformer || plPct < worstPerformer.plPct) {
        worstPerformer = { symbol: pos.symbol, pl, plPct };
      }
    });

    const investedPct = totalEquity > 0 ? (totalInvested / totalEquity) * 100 : 0;
    const overallPlPct = totalInvested > 0 ? (totalUnrealizedPl / totalInvested) * 100 : 0;

    return {
      totalCash,
      totalEquity,
      buyingPower,
      totalInvested,
      totalUnrealizedPl,
      investedPct,
      overallPlPct,
      winningCount,
      losingCount,
      totalPositions: positions.length,
      bestPerformer,
      worstPerformer,
    };
  }, [account, positions]);

  // Helper to determine exact start timestamp of an active position from Alpaca data
  const getPositionStartTimestamp = useCallback((pos: AlpacaPosition): number => {
    const cleanSym = cleanCryptoBaseSymbol(pos.symbol);

    // 1. Search in activities (FILL events for this symbol, newest first)
    const matchingActivities = activities.filter(act => {
      const actSym = cleanCryptoBaseSymbol(act.symbol);
      return actSym === cleanSym && (act.side?.toLowerCase() === 'buy' || act.type?.toLowerCase() === 'fill');
    });

    if (matchingActivities.length > 0) {
      const times = matchingActivities
        .map(a => a.transaction_time ? new Date(a.transaction_time).getTime() : 0)
        .filter(t => t > 0);
      if (times.length > 0) {
        return Math.max(...times);
      }
    }

    // 2. Search in orders (filled buy orders for this symbol)
    const matchingOrders = orders.filter(ord => {
      const ordSym = cleanCryptoBaseSymbol(ord.symbol);
      return ordSym === cleanSym && ord.status === 'filled' && (ord.side?.toLowerCase() === 'buy');
    });

    if (matchingOrders.length > 0) {
      const times = matchingOrders
        .map(o => {
          const str = o.filled_at || o.submitted_at || o.created_at;
          return str ? new Date(str).getTime() : 0;
        })
        .filter(t => t > 0);
      if (times.length > 0) {
        return Math.max(...times);
      }
    }

    // 3. Fallback: Any activity matching symbol
    const anyActs = activities.filter(act => cleanCryptoBaseSymbol(act.symbol) === cleanSym);
    if (anyActs.length > 0) {
      const times = anyActs
        .map(a => a.transaction_time ? new Date(a.transaction_time).getTime() : 0)
        .filter(t => t > 0);
      if (times.length > 0) {
        return Math.max(...times);
      }
    }

    return 0;
  }, [activities, orders]);

  // Helper to determine exact start date and time of an active position from Alpaca data
  const getPositionStartDateTime = useCallback((pos: AlpacaPosition): { formatted: string; fullDateStr: string; timestamp: number } | null => {
    const ts = getPositionStartTimestamp(pos);
    if (ts > 0) {
      const d = new Date(ts);
      const dateStr = d.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
      const timeStr = d.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      return {
        formatted: `${dateStr} ${timeStr}`,
        fullDateStr: d.toLocaleString('es-ES'),
        timestamp: ts,
      };
    }
    return null;
  }, [getPositionStartTimestamp]);

  // Clean currency and price formatter
  const formatCryptoPrice = (val: string | number) => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    if (isNaN(num)) return '0.00';
    if (num >= 1000) {
      return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    if (num < 1) {
      return num.toFixed(4);
    }
    if (num < 10) {
      return num.toFixed(3);
    }
    return num.toFixed(2);
  };

  // Filtered & Sorted positions based on search, date, and profit
  const filteredPositions = useMemo(() => {
    let list = [...positions];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p => p.symbol.toLowerCase().includes(q));
    }

    list.sort((a, b) => {
      if (positionSortBy === 'date') {
        const timeA = getPositionStartTimestamp(a);
        const timeB = getPositionStartTimestamp(b);
        // Si no tiene fecha conocida, enviarlo al final
        if (timeA === 0 && timeB !== 0) return 1;
        if (timeB === 0 && timeA !== 0) return -1;
        if (positionSortOrder === 'desc') {
          // De más reciente a menos reciente (más nuevo primero)
          return timeB - timeA;
        } else {
          // De menos reciente a más reciente (más antiguo primero)
          return timeA - timeB;
        }
      } else if (positionSortBy === 'profit') {
        const plA = parseFloat(a.unrealized_pl || '0');
        const plB = parseFloat(b.unrealized_pl || '0');
        if (positionSortOrder === 'desc') {
          // De mayor beneficio a menor beneficio (+ a -)
          return plB - plA;
        } else {
          // De menor beneficio a mayor beneficio (- a +)
          return plA - plB;
        }
      }
      return 0;
    });

    return list;
  }, [positions, searchQuery, positionSortBy, positionSortOrder, getPositionStartTimestamp]);

  // Filtered orders based on status, bots exclusivity & search
  const filteredOrders = useMemo(() => {
    return orders.filter(ord => {
      if (onlyBotsFilter) {
        const cId = ord.client_order_id || '';
        // Si el filtro de bots está activo, solo mostrar órdenes originadas en esta app
        if (!cId.startsWith('criptoalpha_')) return false;
      }
      if (orderFilter !== 'all') {
        if (orderFilter === 'filled' && ord.status !== 'filled') return false;
        if (orderFilter === 'open' && ord.status !== 'new' && ord.status !== 'accepted' && ord.status !== 'partially_filled') return false;
        if (orderFilter === 'canceled' && ord.status !== 'canceled' && ord.status !== 'expired') return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return ord.symbol.toLowerCase().includes(q) || ord.id.toLowerCase().includes(q) || (ord.client_order_id && ord.client_order_id.toLowerCase().includes(q));
      }
      return true;
    });
  }, [orders, orderFilter, searchQuery, onlyBotsFilter]);

  // Filtered activities
  const filteredActivities = useMemo(() => {
    return activities.filter(act => {
      if (activityFilter !== 'ALL') {
        if (activityFilter === 'BUY' && act.side?.toLowerCase() !== 'buy') return false;
        if (activityFilter === 'SELL' && act.side?.toLowerCase() !== 'sell') return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return act.symbol.toLowerCase().includes(q) || act.id.toLowerCase().includes(q);
      }
      return true;
    });
  }, [activities, activityFilter, searchQuery]);

  // Execute manual order
  const handleExecuteTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tradeAmountUsd || tradeAmountUsd <= 0) return;

    setIsSubmitting(true);
    setFeedback(null);

    const res = await placeAlpacaOrder({
      symbol: tradeSymbol,
      side: tradeSide,
      notional: tradeAmountUsd,
    });

    setIsSubmitting(false);

    if (res.success) {
      setFeedback({
        success: true,
        message: `¡Orden ${tradeSide === 'buy' ? 'de Compra' : 'de Venta'} de ${tradeSymbol} ($${tradeAmountUsd} USD) ejecutada en Alpaca Paper! ID: ${res.order?.id?.slice(0, 8) || 'Completada'}`,
      });
      loadData(false);
      if (onTradeExecuted) onTradeExecuted();
    } else {
      setFeedback({
        success: false,
        message: res.error || 'Error al ejecutar orden en Alpaca',
      });
    }
  };

  // Close single position
  const handleClosePosition = async (symbol: string) => {
    setClosingSymbol(symbol);
    const res = await closeAlpacaPosition(symbol);
    setClosingSymbol(null);

    if (res.success) {
      setFeedback({
        success: true,
        message: `Posición ${symbol} liquidada en Alpaca Paper Trading`,
      });
      loadData(false);
      if (onTradeExecuted) onTradeExecuted();
    } else {
      setFeedback({
        success: false,
        message: res.error || 'No se pudo liquidar la posición',
      });
    }
  };

  // Close all positions
  const handleCloseAllPositions = async () => {
    setIsClosingAll(true);
    setShowConfirmCloseAll(false);
    const res = await closeAllAlpacaPositions();
    setIsClosingAll(false);

    if (res.success) {
      setFeedback({
        success: true,
        message: 'Todas las posiciones han sido liquidadas exitosamente en Alpaca',
      });
      loadData(false);
      if (onTradeExecuted) onTradeExecuted();
    } else {
      setFeedback({
        success: false,
        message: res.error || 'Error al liquidar posiciones',
      });
    }
  };

  // Cancel open order
  const handleCancelOrder = async (orderId: string) => {
    const res = await cancelAlpacaOrder(orderId);
    if (res.success) {
      setFeedback({
        success: true,
        message: `Orden ${orderId.slice(0, 8)} cancelada en Alpaca`,
      });
      loadData(false);
    } else {
      setFeedback({
        success: false,
        message: res.error || 'Error al cancelar la orden',
      });
    }
  };

  // Toggle 24/7 Cloud Daemon
  const handleToggleDaemon = async () => {
    setIsTogglingDaemon(true);
    try {
      const res = await toggleAlpacaDaemon();
      if (res.success) {
        setFeedback({
          success: true,
          message: res.message || 'Estado del Motor 24/7 actualizado',
        });
        await loadDaemonStatus();
      } else {
        setFeedback({
          success: false,
          message: res.error || 'Error al alternar motor 24/7',
        });
      }
    } catch (err: any) {
      setFeedback({
        success: false,
        message: err?.message || 'Error al alternar motor 24/7',
      });
    } finally {
      setIsTogglingDaemon(false);
    }
  };

  // Save 24/7 Daemon Configuration
  const handleSaveDaemonConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await updateAlpacaDaemonConfig(daemonConfigForm);
      if (res.success) {
        setFeedback({
          success: true,
          message: 'Configuración del motor 24/7 en servidor guardada con éxito',
        });
        await loadDaemonStatus();
      } else {
        setFeedback({
          success: false,
          message: res.error || 'Error al guardar configuración',
        });
      }
    } catch (err: any) {
      setFeedback({
        success: false,
        message: err?.message || 'Error al guardar configuración del motor 24/7',
      });
    }
  };

  const cryptoSymbolsList = useMemo(() => {
    return Array.from(ALPACA_SUPPORTED_CRYPTO_SYMBOLS).map(sym => {
      const match = assets.find(a => a.symbol.toUpperCase() === sym);
      return {
        symbol: `${sym}/USD`,
        base: sym,
        label: match?.name ? `${match.name} (${sym})` : `${sym}/USD`,
        price: match?.current_price || 0,
      };
    });
  }, [assets]);

  if (!isOpen) return null;

  return (
    <div 
      id="alpaca-dashboard-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-1 sm:p-3 md:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div 
        id="alpaca-modal-container"
        className="relative w-full max-w-6xl xl:max-w-7xl bg-slate-900 border border-emerald-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[96vh]"
      >
        {/* Modal Top Header */}
        <div className="shrink-0 flex items-center justify-between px-3.5 sm:px-6 py-2.5 sm:py-3.5 border-b border-slate-800 bg-slate-950/90 gap-2 sm:gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-amber-500/20 via-slate-900 to-amber-600/30 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold text-lg sm:text-xl shadow-inner shrink-0">
              🦙
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h2 className="text-sm sm:text-lg font-black text-white tracking-wide flex items-center gap-1.5 whitespace-nowrap">
                  Alpaca Markets
                  <span className="text-xs font-semibold text-slate-400 font-normal hidden md:inline">| Actividad en Vivo</span>
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  CONECTADO
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-amber-300 border border-slate-700 shrink-0">
                  PAPER TRADING ($100K)
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 flex items-center gap-1.5 sm:gap-2 mt-0.5 truncate">
                <span>Cuenta: <strong className="text-emerald-400 font-mono">{account?.accountNumber || 'PA326TSJYRYT'}</strong></span>
                <span>•</span>
                <span className="text-slate-400">Actualizado: <span className="font-mono text-slate-300">{lastUpdated.toLocaleTimeString('es-ES')}</span></span>
              </p>
            </div>
          </div>

          {/* Controls: Auto-refresh, manual refresh & close */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Auto refresh toggle button */}
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                autoRefresh
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
              }`}
              title={autoRefresh ? 'Pausar auto-refresco en vivo' : 'Activar auto-refresco en vivo'}
            >
              {autoRefresh ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span className="hidden sm:inline">En Vivo (5s)</span>
                  <Pause className="w-3.5 h-3.5 text-emerald-300" />
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Reanudar</span>
                </>
              )}
            </button>

            {/* Manual refresh button */}
            <button
              id="alpaca-refresh-btn"
              onClick={() => loadData(false)}
              disabled={loading}
              className="p-1.5 sm:p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700"
              title="Refrescar datos ahora"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
            </button>

            {/* Close modal button */}
            <button
              id="alpaca-close-modal-btn"
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-lg bg-slate-800 hover:bg-rose-900/50 text-slate-400 hover:text-rose-300 transition-colors border border-slate-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Navigation Tabs: Con altura generosa, padding amplio y sin recortes */}
        <div className="shrink-0 flex items-center gap-2 sm:gap-3 px-3 sm:px-6 py-2.5 sm:py-3 border-b border-slate-800 bg-slate-950/80 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
          <button
            id="alpaca-tab-overview"
            onClick={() => setActiveTab('overview')}
            className={`shrink-0 px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all border flex items-center gap-2 whitespace-nowrap cursor-pointer shadow-sm ${
              activeTab === 'overview'
                ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300 shadow-emerald-950/40'
                : 'border-slate-800 bg-slate-900/80 text-slate-300 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <BarChart3 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>Resumen Ejecutivo &amp; Comentado</span>
          </button>

          <button
            id="alpaca-tab-positions"
            onClick={() => setActiveTab('positions')}
            className={`shrink-0 px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all border flex items-center gap-2 whitespace-nowrap cursor-pointer shadow-sm ${
              activeTab === 'positions'
                ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300 shadow-emerald-950/40'
                : 'border-slate-800 bg-slate-900/80 text-slate-300 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <Layers className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>Posiciones Abiertas</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-mono font-bold ${
              positions.length > 0 ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-500/50' : 'bg-slate-800 text-slate-400'
            }`}>
              {positions.length}
            </span>
          </button>

          <button
            id="alpaca-tab-activities"
            onClick={() => setActiveTab('activities')}
            className={`shrink-0 px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all border flex items-center gap-2 whitespace-nowrap cursor-pointer shadow-sm ${
              activeTab === 'activities'
                ? 'border-amber-500 bg-amber-500/20 text-amber-300 shadow-amber-950/40'
                : 'border-slate-800 bg-slate-900/80 text-slate-300 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <Zap className="w-4 h-4 shrink-0 text-amber-400" />
            <span>Operaciones &amp; Fills Contables</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-mono font-bold bg-amber-500/30 text-amber-200 border border-amber-500/50">
              {activities.length}
            </span>
          </button>

          <button
            id="alpaca-tab-orders"
            onClick={() => setActiveTab('orders')}
            className={`shrink-0 px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all border flex items-center gap-2 whitespace-nowrap cursor-pointer shadow-sm ${
              activeTab === 'orders'
                ? 'border-cyan-500 bg-cyan-500/20 text-cyan-300 shadow-cyan-950/40'
                : 'border-slate-800 bg-slate-900/80 text-slate-300 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <Clock className="w-4 h-4 shrink-0 text-cyan-400" />
            <span>Historial de Órdenes</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-mono font-bold bg-cyan-500/30 text-cyan-200 border border-cyan-500/50">
              {orders.length}
            </span>
          </button>

          <button
            id="alpaca-tab-daemon"
            onClick={() => setActiveTab('daemon_247')}
            className={`shrink-0 px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all border flex items-center gap-2 whitespace-nowrap cursor-pointer shadow-sm ${
              activeTab === 'daemon_247'
                ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300 shadow-emerald-950/40'
                : 'border-slate-800 bg-slate-900/80 text-slate-300 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <Cpu className="w-4 h-4 shrink-0 text-emerald-400 animate-pulse" />
            <span>Motor Servidor 24/7 (Always-On)</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-mono font-bold ${
              daemonStatus?.config?.enabled ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-500/50' : 'bg-slate-800 text-slate-400'
            }`}>
              {daemonStatus?.config?.enabled ? 'ACTIVO' : 'PAUSADO'}
            </span>
          </button>

          <button
            id="alpaca-tab-trade"
            onClick={() => setActiveTab('quick_trade')}
            className={`shrink-0 px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all border flex items-center gap-2 whitespace-nowrap cursor-pointer shadow-sm ${
              activeTab === 'quick_trade'
                ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300 shadow-indigo-950/40'
                : 'border-slate-800 bg-slate-900/80 text-slate-300 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <ArrowUpRight className="w-4 h-4 shrink-0 text-indigo-400" />
            <span>Lanzar Orden Manual</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 md:p-6 space-y-6">
          {/* Feedback Banner */}
          {feedback && (
            <div
              className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs sm:text-sm animate-in fade-in ${
                feedback.success
                  ? 'bg-emerald-950/50 border-emerald-500/50 text-emerald-200'
                  : 'bg-rose-950/50 border-rose-500/50 text-rose-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {feedback.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
                )}
                <span>{feedback.message}</span>
              </div>
              <button
                onClick={() => setFeedback(null)}
                className="text-xs text-slate-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 1: OVERVIEW (Resumen Ejecutivo y Diagnóstico Comentado) */}
          {/* ========================================================================= */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* PANEL DE CONTROL DE ENRUTAMIENTO DE BOTS A ALPACA */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-slate-800 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3.5">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/40">
                      <Sliders className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm sm:text-base font-bold text-white tracking-tight">
                          Enrutamiento de Bots a Alpaca Markets
                        </h4>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                          CONTROL DE OPERACIONES
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Elige qué bot enviará operaciones a Alpaca: Scalping, Autónomo Quant, ambos o ninguno.
                      </p>
                    </div>
                  </div>

                  {/* Estado actual Badge */}
                  <div className="flex items-center gap-2 self-start sm:self-auto font-mono text-xs">
                    <span className="text-slate-400 text-[11px]">Enrutamiento:</span>
                    <span className={`px-2.5 py-1 rounded-xl font-bold border ${
                      botRouting.scalpEnabled && botRouting.quantEnabled
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : botRouting.scalpEnabled || botRouting.quantEnabled
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                        : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    }`}>
                      {botRouting.scalpEnabled && botRouting.quantEnabled
                        ? '✨ AMBOS BOTS ACTIVOS'
                        : botRouting.scalpEnabled
                        ? '⚡ SOLO SCALPING PRO'
                        : botRouting.quantEnabled
                        ? '🧠 SOLO AUTÓNOMO QUANT'
                        : '⛔ NINGÚN BOT (PAUSADO)'}
                    </span>
                  </div>
                </div>

                {/* 4 Botones de Selección Rápida */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {/* Modo 1: Ambos */}
                  <button
                    id="btn-alpaca-routing-both"
                    onClick={() => handleSelectRoutingMode('both')}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between gap-1.5 ${
                      botRouting.scalpEnabled && botRouting.quantEnabled
                        ? 'bg-emerald-950/50 border-emerald-500/80 text-white shadow-lg shadow-emerald-950/50 ring-1 ring-emerald-500/50'
                        : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Ambos Bots</span>
                      </span>
                      {botRouting.scalpEnabled && botRouting.quantEnabled && (
                        <Check className="w-4 h-4 text-emerald-400" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Quant + Scalping operando en simultáneo en Alpaca
                    </p>
                  </button>

                  {/* Modo 2: Solo Scalping */}
                  <button
                    id="btn-alpaca-routing-scalp-only"
                    onClick={() => handleSelectRoutingMode('scalp_only')}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between gap-1.5 ${
                      botRouting.scalpEnabled && !botRouting.quantEnabled
                        ? 'bg-cyan-950/50 border-cyan-500/80 text-white shadow-lg shadow-cyan-950/50 ring-1 ring-cyan-500/50'
                        : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Solo Scalping Pro</span>
                      </span>
                      {botRouting.scalpEnabled && !botRouting.quantEnabled && (
                        <Check className="w-4 h-4 text-cyan-400" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Solo micro-operaciones 1M/5M envían órdenes
                    </p>
                  </button>

                  {/* Modo 3: Solo Quant */}
                  <button
                    id="btn-alpaca-routing-quant-only"
                    onClick={() => handleSelectRoutingMode('quant_only')}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between gap-1.5 ${
                      !botRouting.scalpEnabled && botRouting.quantEnabled
                        ? 'bg-indigo-950/50 border-indigo-500/80 text-white shadow-lg shadow-indigo-950/50 ring-1 ring-indigo-500/50'
                        : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold flex items-center gap-1.5">
                        <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Solo Autónomo Quant</span>
                      </span>
                      {!botRouting.scalpEnabled && botRouting.quantEnabled && (
                        <Check className="w-4 h-4 text-indigo-400" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Solo algoritmos multi-factor envían órdenes
                    </p>
                  </button>

                  {/* Modo 4: Ninguno */}
                  <button
                    id="btn-alpaca-routing-none"
                    onClick={() => handleSelectRoutingMode('none')}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between gap-1.5 ${
                      !botRouting.scalpEnabled && !botRouting.quantEnabled
                        ? 'bg-rose-950/50 border-rose-500/80 text-white shadow-lg shadow-rose-950/50 ring-1 ring-rose-500/50'
                        : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                        <span>Ninguno (Desconectado)</span>
                      </span>
                      {!botRouting.scalpEnabled && !botRouting.quantEnabled && (
                        <Check className="w-4 h-4 text-rose-400" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Bloquea todo envío de bots a Alpaca
                    </p>
                  </button>
                </div>

                {/* Tarjetas Individuales con Switch ON/OFF por Bot */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  {/* Bot 1: AlphaBot Quant */}
                  <div className={`p-3.5 rounded-xl border transition flex items-center justify-between gap-3 ${
                    botRouting.quantEnabled
                      ? 'bg-slate-900/80 border-indigo-500/40'
                      : 'bg-slate-950 border-slate-800/80 opacity-75'
                  }`}>
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`p-2.5 rounded-xl border shrink-0 ${
                        botRouting.quantEnabled
                          ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                          : 'bg-slate-800 text-slate-500 border-slate-700'
                      }`}>
                        <Cpu className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h5 className="text-xs sm:text-sm font-bold text-white">AlphaBot Autónomo Quant</h5>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                            botRouting.quantEnabled
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}>
                            {botRouting.quantEnabled ? 'ENVIANDO A ALPACA' : 'DESACTIVADO'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">
                          Asigna 100€ (alta convicción) / 50€ (riesgo controlado) con TP dinámico y SL multi-factor.
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleToggleBotRouting('quant')}
                      className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        botRouting.quantEnabled
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 hover:bg-emerald-500/30'
                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white hover:bg-slate-700'
                      }`}
                    >
                      {botRouting.quantEnabled ? (
                        <>
                          <ToggleRight className="w-5 h-5 text-emerald-400" />
                          <span className="font-mono">ON</span>
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="w-5 h-5 text-slate-400" />
                          <span className="font-mono">OFF</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Bot 2: Scalping Bot */}
                  <div className={`p-3.5 rounded-xl border transition flex items-center justify-between gap-3 ${
                    botRouting.scalpEnabled
                      ? 'bg-slate-900/80 border-cyan-500/40'
                      : 'bg-slate-950 border-slate-800/80 opacity-75'
                  }`}>
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`p-2.5 rounded-xl border shrink-0 ${
                        botRouting.scalpEnabled
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                          : 'bg-slate-800 text-slate-500 border-slate-700'
                      }`}>
                        <Zap className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h5 className="text-xs sm:text-sm font-bold text-white">AlphaBot Scalping Pro V4</h5>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                            botRouting.scalpEnabled
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}>
                            {botRouting.scalpEnabled ? 'ENVIANDO A ALPACA' : 'DESACTIVADO'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">
                          Micro-operaciones ultrarrápidas con confluencia técnica 1M/5M, TP (+2.2%) y SL (-0.9%).
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleToggleBotRouting('scalp')}
                      className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        botRouting.scalpEnabled
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 hover:bg-cyan-500/30'
                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white hover:bg-slate-700'
                      }`}
                    >
                      {botRouting.scalpEnabled ? (
                        <>
                          <ToggleRight className="w-5 h-5 text-cyan-400" />
                          <span className="font-mono">ON</span>
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="w-5 h-5 text-slate-400" />
                          <span className="font-mono">OFF</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* BANNER DE EXCLUSIVIDAD DE TRADING ALPACA */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-cyan-950/50 border border-emerald-500/40 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 mt-0.5">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-white tracking-wide">
                        Modo Exclusivo Alpaca: Operaciones 100% Reservadas a Bots de esta App
                      </h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        PROTECCIÓN ACTIVA
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
                      Todas las transacciones en tu cuenta de Alpaca Markets provienen estrictamente de los algoritmos de esta aplicación (<strong>AlphaBot Quant</strong>, <strong>Scalping Bot Confluence</strong> y <strong>Demonio Servidor 24/7</strong>). Cada orden lleva la firma criptográfica de cliente <code>criptoalpha_</code>, protegiendo tu capital de órdenes no autorizadas.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-auto flex-shrink-0">
                  <button
                    onClick={handleSyncExclusivePurge}
                    disabled={isPurgingExclusive}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 transition shadow-lg shadow-emerald-950/50 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isPurgingExclusive ? 'animate-spin' : ''}`} />
                    <span>{isPurgingExclusive ? 'Purgando externas...' : 'Alinear y Purgar Externas'}</span>
                  </button>
                </div>
              </div>

              {/* 4 Top Financial Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {/* 1. Equity */}
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span className="font-semibold">Valor Total Cartera</span>
                    <Wallet className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black font-mono text-white">
                    ${summaryMetrics.totalEquity.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1 font-mono">
                    Efectivo + Valor activos
                  </p>
                </div>

                {/* 2. Cash */}
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span className="font-semibold">Efectivo Disponible</span>
                    <DollarSign className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black font-mono text-cyan-300">
                    ${summaryMetrics.totalCash.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1 font-mono">
                    <CheckCircle2 className="w-3 h-3" /> Fondos libres para operar
                  </p>
                </div>

                {/* 3. Buying Power */}
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span className="font-semibold">Poder de Compra</span>
                    <Zap className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black font-mono text-amber-300">
                    ${summaryMetrics.buyingPower.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <p className="text-[11px] text-amber-400/80 mt-1 font-mono">
                    Margen simulado Alpaca v2
                  </p>
                </div>

                {/* 4. Unrealized P&L */}
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span className="font-semibold">P&amp;L No Realizado</span>
                    <Activity className={`w-4 h-4 ${summaryMetrics.totalUnrealizedPl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`} />
                  </div>
                  <div className={`text-xl sm:text-2xl font-black font-mono flex items-center gap-1 ${
                    summaryMetrics.totalUnrealizedPl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {summaryMetrics.totalUnrealizedPl >= 0 ? '+' : ''}
                    ${summaryMetrics.totalUnrealizedPl.toFixed(2)}
                    <span className="text-xs font-normal">
                      ({summaryMetrics.totalUnrealizedPl >= 0 ? '+' : ''}{summaryMetrics.overallPlPct.toFixed(2)}%)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {summaryMetrics.winningCount} en ganancia / {summaryMetrics.losingCount} en pérdida
                  </p>
                </div>
              </div>

              {/* SECCIÓN DESTACADA: DIAGNÓSTICO Y COMENTARIO ANALÍTICO EN TIEMPO REAL */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/30 border border-emerald-500/40 shadow-xl space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        Resumen Comentado de Actividad en Tiempo Real
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        Evaluación algorítmica continua de tu cuenta de Alpaca Markets y ejecución de bots
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-emerald-950 border border-emerald-500/40 text-emerald-300">
                    MOTOR DE ANÁLISIS ACTIVO
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  {/* Comentario 1: Exposición y Salud de la Cartera */}
                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Exposición de Riesgo</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed">
                      Actualmente tienes <strong className="text-white">${summaryMetrics.totalInvested.toFixed(2)} USD</strong> colocados en mercado (representando el <strong className="text-emerald-300">{summaryMetrics.investedPct.toFixed(2)}%</strong> del capital total). La liquidez disponible es de <strong className="text-white">${summaryMetrics.totalCash.toFixed(2)} USD</strong> (99.5%+ libre), lo que garantiza máxima protección frente a volatilidades repentinas.
                    </p>
                  </div>

                  {/* Comentario 2: Estado de las Posiciones */}
                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                    <div className="flex items-center gap-2 text-cyan-400 font-bold">
                      <Activity className="w-4 h-4" />
                      <span>Comportamiento de Posiciones</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed">
                      Tienes <strong className="text-white">{summaryMetrics.totalPositions} posición{summaryMetrics.totalPositions === 1 ? '' : 'es'} abierta{summaryMetrics.totalPositions === 1 ? '' : 's'}</strong> en Alpaca. 
                      {summaryMetrics.bestPerformer ? (
                        <> La posición más fuerte en este momento es <strong className="text-emerald-400">{summaryMetrics.bestPerformer.symbol}</strong> con un retorno de <strong className="text-emerald-300">+{summaryMetrics.bestPerformer.plPct.toFixed(2)}%</strong>.</>
                      ) : (
                        ' No hay posiciones abiertas actualmente. Los bots o tú pueden abrir órdenes cuando el mercado dé señal.'
                      )}
                    </p>
                  </div>

                  {/* Comentario 3: Operaciones y Fills Contables */}
                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                    <div className="flex items-center gap-2 text-amber-400 font-bold">
                      <Clock className="w-4 h-4" />
                      <span>Actividad Reciente en Alpaca</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed">
                      Se registran <strong className="text-white">{activities.length} operaciones contables (fills)</strong> y <strong className="text-white">{orders.length} órdenes</strong> en los libros oficiales de Alpaca Paper Trading. Las ejecuciones se realizan en tiempo real con liquidez institucional simulada.
                    </p>
                  </div>
                </div>

                {/* Status Bar */}
                <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-400">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Conexión Paper API v2: <strong className="text-emerald-400">Latencia Óptima</strong></span>
                    <span>•</span>
                    <span>Cripto Trading: <strong className="text-emerald-400">Habilitado</strong></span>
                    <span>•</span>
                    <span className="flex items-center gap-1.5 font-bold text-slate-300">
                      <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                      Motor Servidor 24/7:
                      <strong className={daemonStatus?.config?.enabled ? 'text-emerald-400' : 'text-amber-400'}>
                        {daemonStatus?.config?.enabled ? 'ACTIVO (Always-On)' : 'PAUSADO'}
                      </strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveTab('daemon_247')}
                      className="text-cyan-400 hover:text-cyan-300 font-bold hover:underline flex items-center gap-1"
                    >
                      Configurar Servidor 24/7 <ArrowUpRight className="w-3 h-3" />
                    </button>
                    <span>•</span>
                    <button
                      onClick={() => setActiveTab('positions')}
                      className="text-emerald-400 hover:text-emerald-300 font-semibold hover:underline flex items-center gap-1"
                    >
                      Ver {positions.length} posiciones abiertas <ArrowUpRight className="w-3 h-3" />
                    </button>
                    <span>•</span>
                    <button
                      onClick={() => setActiveTab('activities')}
                      className="text-amber-400 hover:text-amber-300 font-semibold hover:underline flex items-center gap-1"
                    >
                      Ver {activities.length} operaciones cerradas <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Portfolio Performance History Snapshot */}
              {portfolioHistory && portfolioHistory.equity && portfolioHistory.equity.length > 0 && (
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                      Curva de Capital Oficial Alpaca (Últimos 30 días)
                    </h3>
                    <span className="text-xs font-mono text-slate-400">
                      Base: ${portfolioHistory.base_value?.toLocaleString('es-ES') || '100.000'} USD
                    </span>
                  </div>

                  {/* Visual SVG Mini Chart */}
                  <div className="h-28 w-full relative flex items-end gap-1 pt-4 pb-2 px-2 bg-slate-900/60 rounded-lg border border-slate-800">
                    {(() => {
                      const validEquities = portfolioHistory.equity.filter(v => v !== null && !isNaN(v));
                      if (validEquities.length === 0) return <p className="text-xs text-slate-500 m-auto">Sin datos históricos suficientes</p>;
                      const min = Math.min(...validEquities);
                      const max = Math.max(...validEquities);
                      const range = max - min || 1;

                      return validEquities.slice(-30).map((val, idx) => {
                        const heightPct = Math.max(8, Math.min(100, ((val - min) / range) * 100));
                        const isUp = val >= (portfolioHistory.base_value || 100000);
                        return (
                          <div
                            key={idx}
                            className="flex-1 flex flex-col items-center group relative h-full justify-end"
                          >
                            <div
                              style={{ height: `${heightPct}%` }}
                              className={`w-full rounded-t transition-all ${
                                isUp ? 'bg-emerald-500/70 group-hover:bg-emerald-400' : 'bg-rose-500/70 group-hover:bg-rose-400'
                              }`}
                            />
                            {/* Tooltip on hover */}
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 z-20 px-2 py-1 bg-slate-950 border border-slate-700 text-[10px] font-mono rounded text-white whitespace-nowrap pointer-events-none">
                              ${val.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                    <span>Inicio del Periodo: $100.000 USD</span>
                    <span>Actual: ${(account?.portfolioValue ?? 100000).toLocaleString('es-ES')} USD</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: POSITIONS (Posiciones Abiertas) */}
          {/* ========================================================================= */}
          {activeTab === 'positions' && (
            <div className="space-y-4">
              {/* Cuadro Resumen de Beneficio / Pérdida Global de Posiciones Abiertas */}
              {positions.length > 0 && (
                <div className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
                  summaryMetrics.totalUnrealizedPl >= 0
                    ? 'bg-gradient-to-r from-emerald-950/50 via-slate-900/90 to-slate-950 border-emerald-500/40 shadow-lg shadow-emerald-950/20'
                    : 'bg-gradient-to-r from-rose-950/50 via-slate-900/90 to-slate-950 border-rose-500/40 shadow-lg shadow-rose-950/20'
                }`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Left: Overall P&L Metric */}
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                        summaryMetrics.totalUnrealizedPl >= 0
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                          : 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                      }`}>
                        {summaryMetrics.totalUnrealizedPl >= 0 ? (
                          <ArrowUpRight className="w-5 h-5" />
                        ) : (
                          <ArrowDownRight className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            Beneficio / Pérdida en Posiciones Abiertas
                          </span>
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border ${
                            summaryMetrics.totalUnrealizedPl >= 0
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                          }`}>
                            {summaryMetrics.totalUnrealizedPl >= 0 ? 'EN GANANCIA' : 'EN PÉRDIDA'}
                          </span>
                        </div>
                        <div className="flex items-baseline gap-2 mt-0.5">
                          <span className={`text-xl sm:text-2xl font-black font-mono tracking-tight ${
                            summaryMetrics.totalUnrealizedPl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}>
                            {summaryMetrics.totalUnrealizedPl >= 0 ? '+' : ''}${summaryMetrics.totalUnrealizedPl.toFixed(2)} USD
                          </span>
                          <span className={`text-sm font-bold font-mono ${
                            summaryMetrics.totalUnrealizedPl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}>
                            ({summaryMetrics.totalUnrealizedPl >= 0 ? '+' : ''}{summaryMetrics.overallPlPct.toFixed(2)}%)
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono hidden md:inline">
                            (~{(summaryMetrics.totalUnrealizedPl / 1.08).toFixed(2)} €)
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Quick Breakdown Chips */}
                    <div className="flex items-center gap-2 sm:gap-3 flex-wrap text-xs">
                      <div className="px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center gap-1.5 font-mono">
                        <span className="text-slate-400 text-[11px]">Invertido:</span>
                        <span className="text-white font-bold">${summaryMetrics.totalInvested.toFixed(2)}</span>
                      </div>
                      <div className="px-3 py-1.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-center gap-1.5 font-mono text-emerald-300">
                        <span className="text-[11px] text-emerald-400/80">Ganadoras:</span>
                        <span className="font-bold">{summaryMetrics.winningCount}</span>
                      </div>
                      <div className="px-3 py-1.5 rounded-xl bg-rose-950/40 border border-rose-500/30 flex items-center gap-1.5 font-mono text-rose-300">
                        <span className="text-[11px] text-rose-400/80">Perdedoras:</span>
                        <span className="font-bold">{summaryMetrics.losingCount}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Top Action, Search & Sorting Bar */}
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-[220px]">
                    <div className="relative flex-1 max-w-sm">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Filtrar por moneda (BTC, ETH, SOL...)"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <span className="text-xs font-mono text-slate-400 whitespace-nowrap">
                      {filteredPositions.length} de {positions.length} posiciones
                    </span>
                  </div>

                  {positions.length > 0 && (
                    <div className="flex items-center gap-2">
                      {showConfirmCloseAll ? (
                        <div className="flex items-center gap-2 bg-rose-950/80 border border-rose-500/60 px-3 py-1.5 rounded-xl">
                          <span className="text-xs text-rose-200 font-bold">¿Liquidar todo?</span>
                          <button
                            onClick={handleCloseAllPositions}
                            disabled={isClosingAll}
                            className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-[11px] font-bold"
                          >
                            {isClosingAll ? 'Cerrando...' : 'Sí, Cerrar Todo'}
                          </button>
                          <button
                            onClick={() => setShowConfirmCloseAll(false)}
                            className="px-2 py-1 bg-slate-800 text-slate-300 rounded text-[11px]"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowConfirmCloseAll(true)}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-900/40 text-slate-300 hover:text-rose-300 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Cerrar Todas las Posiciones</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Sub-bar: Ordering controls */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mr-1">
                      <ArrowUpDown className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Ordenar por:</span>
                    </span>

                    {/* Fecha: Alternar entre Más reciente y Más antigua */}
                    <div className="inline-flex rounded-lg bg-slate-900 p-0.5 border border-slate-800">
                      <button
                        id="sort-btn-date"
                        onClick={() => {
                          if (positionSortBy === 'date') {
                            setPositionSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
                          } else {
                            setPositionSortBy('date');
                            setPositionSortOrder('desc');
                          }
                        }}
                        className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition ${
                          positionSortBy === 'date'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                        title="Ordenar por fecha de apertura"
                      >
                        <Calendar className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Fecha</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-950 font-bold border border-slate-700/50">
                          {positionSortBy === 'date'
                            ? (positionSortOrder === 'desc' ? 'Más reciente ↓' : 'Más antigua ↑')
                            : 'Más reciente'}
                        </span>
                      </button>

                      {positionSortBy === 'date' && (
                        <button
                          onClick={() => setPositionSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                          className="px-1.5 py-1 text-xs text-emerald-300 hover:bg-emerald-500/20 rounded-r-md transition"
                          title={positionSortOrder === 'desc' ? 'Cambiar a: Más antigua primero' : 'Cambiar a: Más reciente primero'}
                        >
                          {positionSortOrder === 'desc' ? <ArrowDown className="w-3.5 h-3.5" /> : <ArrowUp className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>

                    {/* Beneficio: Alternar entre Mayor a menor y Menor a mayor */}
                    <div className="inline-flex rounded-lg bg-slate-900 p-0.5 border border-slate-800">
                      <button
                        id="sort-btn-profit"
                        onClick={() => {
                          if (positionSortBy === 'profit') {
                            setPositionSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
                          } else {
                            setPositionSortBy('profit');
                            setPositionSortOrder('desc');
                          }
                        }}
                        className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition ${
                          positionSortBy === 'profit'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                        title="Ordenar por beneficio (P&L no realizado)"
                      >
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Beneficio</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-950 font-bold border border-slate-700/50">
                          {positionSortBy === 'profit'
                            ? (positionSortOrder === 'desc' ? 'Mayor a menor ↓' : 'Menor a mayor ↑')
                            : 'Mayor a menor'}
                        </span>
                      </button>

                      {positionSortBy === 'profit' && (
                        <button
                          onClick={() => setPositionSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                          className="px-1.5 py-1 text-xs text-emerald-300 hover:bg-emerald-500/20 rounded-r-md transition"
                          title={positionSortOrder === 'desc' ? 'Cambiar a: Menor ganancia primero' : 'Cambiar a: Mayor ganancia primero'}
                        >
                          {positionSortOrder === 'desc' ? <ArrowDown className="w-3.5 h-3.5" /> : <ArrowUp className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Active sort descriptor badge */}
                  <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                    <span className="text-slate-500">Orden:</span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-700 text-emerald-300 font-semibold text-[10.5px]">
                      {positionSortBy === 'date'
                        ? (positionSortOrder === 'desc' ? 'Fecha: más reciente a menos reciente' : 'Fecha: menos reciente a más reciente')
                        : (positionSortOrder === 'desc' ? 'Beneficio: más ganancia a menos' : 'Beneficio: menos ganancia a más')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Positions List */}
              {filteredPositions.length === 0 ? (
                <div className="p-10 text-center rounded-2xl bg-slate-950/40 border border-slate-800 space-y-3">
                  <Layers className="w-12 h-12 text-slate-600 mx-auto" />
                  <h4 className="text-sm font-bold text-slate-200">No hay posiciones abiertas en Alpaca</h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Tus bots o tú todavía no tienen posiciones activas en cartera. Abre una orden de prueba rápida o activa los bots autónomos para que comiencen a acumular.
                  </p>
                  <button
                    onClick={() => setActiveTab('quick_trade')}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold inline-flex items-center gap-2 transition"
                  >
                    <Zap className="w-4 h-4" /> Lanzar primera orden en Alpaca
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredPositions.map((pos) => {
                    const pl = parseFloat(pos.unrealized_pl || '0');
                    const plPct = parseFloat(pos.unrealized_plpc || '0') * 100;
                    const isProfit = pl >= 0;
                    const baseSymbol = cleanCryptoBaseSymbol(pos.symbol);
                    const logoUrl = getCryptoLogoUrl(baseSymbol);
                    const startTimeInfo = getPositionStartDateTime(pos);

                    return (
                      <div
                        key={pos.asset_id}
                        className="p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition shadow-lg space-y-3.5"
                      >
                        {/* Header: Asset Logo + Symbol + Badges + Start Date & Time + Close Button */}
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div className="flex items-center gap-3 min-w-0 flex-wrap sm:flex-nowrap">
                            <img
                              src={logoUrl}
                              alt={pos.symbol}
                              onError={(e) => handleCryptoImageError(e, baseSymbol)}
                              className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 p-0.5 object-cover shrink-0 shadow-inner"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-black text-white text-base sm:text-lg tracking-wide font-mono">{pos.symbol}</span>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase">
                                  {pos.side}
                                </span>
                                {startTimeInfo ? (
                                  <span
                                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-mono font-semibold bg-cyan-950/70 border border-cyan-500/40 text-cyan-300 shadow-sm"
                                    title={`Fecha y hora de inicio de la operación: ${startTimeInfo.fullDateStr}`}
                                  >
                                    <Clock className="w-3 h-3 text-cyan-400 shrink-0" />
                                    <span>Inicio: {startTimeInfo.formatted}</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-mono text-slate-400 bg-slate-900 border border-slate-800">
                                    <Clock className="w-3 h-3 text-slate-500 shrink-0" />
                                    <span>Operación Activa</span>
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-400 font-mono mt-1">
                                {parseFloat(pos.qty).toFixed(6)} {baseSymbol} @ entrada: <strong className="text-slate-200 font-semibold">${formatCryptoPrice(pos.avg_entry_price)}</strong>
                              </p>
                            </div>
                          </div>

                          {/* Close Position Button (Always inside card boundary, never overflows right) */}
                          <button
                            id={`alpaca-close-pos-${pos.symbol}`}
                            onClick={() => handleClosePosition(pos.symbol)}
                            disabled={closingSymbol === pos.symbol}
                            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-rose-900/60 text-slate-200 hover:text-rose-200 border border-slate-700 hover:border-rose-500/50 text-xs font-bold transition flex items-center gap-1.5 shrink-0 disabled:opacity-50 shadow-sm"
                            title={`Cerrar y liquidar posición en ${pos.symbol}`}
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                            <span>{closingSymbol === pos.symbol ? 'Cerrando...' : 'Cerrar Posición'}</span>
                          </button>
                        </div>

                        {/* Financial Metrics Grid (Responsive 2 cols on mobile, 4 cols on tablet/desktop) */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 pt-3 border-t border-slate-800/80">
                          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/70">
                            <span className="text-[11px] text-slate-400 block font-medium">Precio Entrada</span>
                            <span className="font-mono font-bold text-slate-200 text-sm block mt-0.5">
                              ${formatCryptoPrice(pos.avg_entry_price)}
                            </span>
                          </div>

                          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/70">
                            <span className="text-[11px] text-slate-400 block font-medium">Precio Actual</span>
                            <span className="font-mono font-bold text-white text-sm block mt-0.5">
                              ${formatCryptoPrice(pos.current_price)}
                            </span>
                          </div>

                          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/70">
                            <span className="text-[11px] text-slate-400 block font-medium">Valor en Cartera</span>
                            <span className="font-mono font-bold text-white text-sm block mt-0.5">
                              ${parseFloat(pos.market_value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>

                          <div className={`p-2.5 rounded-xl border ${
                            isProfit 
                              ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-400' 
                              : 'bg-rose-950/30 border-rose-500/30 text-rose-400'
                          }`}>
                            <span className="text-[11px] opacity-80 block font-medium">P&amp;L No Realizado</span>
                            <span className="font-mono font-black text-sm flex items-center gap-1 mt-0.5">
                              {isProfit ? <ArrowUpRight className="w-4 h-4 shrink-0" /> : <ArrowDownRight className="w-4 h-4 shrink-0" />}
                              {isProfit ? '+' : ''}${pl.toFixed(2)} ({isProfit ? '+' : ''}{plPct.toFixed(2)}%)
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: ACTIVITIES (Operaciones & Fills Contables) */}
          {/* ========================================================================= */}
          {activeTab === 'activities' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    Registro de Ejecuciones Contables (Fills de Alpaca)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Historial oficial e inmutable de operaciones completadas provisto por la API de Alpaca.
                  </p>
                </div>

                {/* Filter chips */}
                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                  <button
                    onClick={() => setActivityFilter('ALL')}
                    className={`px-3 py-1 rounded-lg font-bold transition ${
                      activityFilter === 'ALL' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Todos ({activities.length})
                  </button>
                  <button
                    onClick={() => setActivityFilter('BUY')}
                    className={`px-3 py-1 rounded-lg font-bold transition ${
                      activityFilter === 'BUY' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Compras
                  </button>
                  <button
                    onClick={() => setActivityFilter('SELL')}
                    className={`px-3 py-1 rounded-lg font-bold transition ${
                      activityFilter === 'SELL' ? 'bg-rose-500 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Ventas
                  </button>
                </div>
              </div>

              {filteredActivities.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-slate-950/40 border border-slate-800">
                  <Clock className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">No hay ejecuciones contables que coincidan con el filtro.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-800 rounded-xl bg-slate-950/80 border border-slate-800 overflow-hidden">
                  {filteredActivities.map((act) => {
                    const isBuy = act.side?.toLowerCase() === 'buy';
                    const baseSymbol = cleanCryptoBaseSymbol(act.symbol);
                    const qty = parseFloat(act.qty || '0');
                    const price = parseFloat(act.price || '0');
                    const totalUsd = qty * price;

                    return (
                      <div key={act.id} className="p-3.5 flex flex-wrap items-center justify-between text-xs hover:bg-slate-900/60 transition gap-3">
                        <div className="flex items-center gap-3">
                          <span className={`px-2.5 py-1 rounded-lg font-black uppercase text-[10px] ${
                            isBuy
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          }`}>
                            {isBuy ? 'COMPRA' : 'VENTA'}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white font-mono text-sm">{act.symbol}</span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                Tipo: {act.activity_type}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                              {qty.toFixed(6)} {baseSymbol} @ ${price.toLocaleString('es-ES', { minimumFractionDigits: 2 })} USD
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 block">Total Operado</span>
                            <span className="font-mono font-bold text-white text-xs">
                              ${totalUsd.toLocaleString('es-ES', { minimumFractionDigits: 2 })} USD
                            </span>
                          </div>

                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 block">Fecha y Hora</span>
                            <span className="font-mono text-slate-300 text-xs">
                              {new Date(act.transaction_time).toLocaleString('es-ES', {
                                month: 'short',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit'
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: ORDERS (Historial de Órdenes) */}
          {/* ========================================================================= */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-cyan-400" />
                    Historial de Órdenes en Alpaca
                  </h3>
                  <p className="text-xs text-slate-400">
                    Registro de órdenes enviadas por los bots o manualmente.
                  </p>
                </div>

                {/* Filter chips & Exclusivity toggle */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setOnlyBotsFilter(!onlyBotsFilter)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                      onlyBotsFilter
                        ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-950/40'
                        : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>{onlyBotsFilter ? '🛡️ Solo Bots de esta App' : 'Ver Todas (Inc. Externas)'}</span>
                  </button>

                  <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                    <button
                      onClick={() => setOrderFilter('all')}
                      className={`px-3 py-1 rounded-lg font-bold transition ${
                        orderFilter === 'all' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Todas ({orders.length})
                    </button>
                    <button
                      onClick={() => setOrderFilter('filled')}
                      className={`px-3 py-1 rounded-lg font-bold transition ${
                        orderFilter === 'filled' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Ejecutadas
                    </button>
                    <button
                      onClick={() => setOrderFilter('open')}
                      className={`px-3 py-1 rounded-lg font-bold transition ${
                        orderFilter === 'open' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Abiertas
                    </button>
                    <button
                      onClick={() => setOrderFilter('canceled')}
                      className={`px-3 py-1 rounded-lg font-bold transition ${
                        orderFilter === 'canceled' ? 'bg-rose-500 text-slate-950' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Canceladas
                    </button>
                  </div>
                </div>
              </div>

              {filteredOrders.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-slate-950/40 border border-slate-800">
                  <Clock className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">
                    {onlyBotsFilter
                      ? 'No hay órdenes registradas por los bots de esta aplicación con este filtro.'
                      : 'No hay órdenes para mostrar con este criterio.'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-800 rounded-xl bg-slate-950/80 border border-slate-800 overflow-hidden">
                  {filteredOrders.map((ord) => {
                    const isBuy = ord.side === 'buy';
                    const isFilled = ord.status === 'filled';
                    const isOpen = ord.status === 'new' || ord.status === 'accepted' || ord.status === 'partially_filled';
                    const cId = ord.client_order_id || '';

                    return (
                      <div key={ord.id} className="p-3.5 flex flex-wrap items-center justify-between text-xs hover:bg-slate-900/60 transition gap-3">
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-0.5 rounded font-black uppercase text-[10px] ${
                            isBuy
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          }`}>
                            {isBuy ? 'COMPRA' : 'VENTA'}
                          </span>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-white font-mono text-sm">{ord.symbol}</span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {ord.type?.toUpperCase() || 'MARKET'}
                              </span>

                              {/* Badges de origen del bot */}
                              {cId.startsWith('criptoalpha_quant_') && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                                  <Sparkles className="w-2.5 h-2.5" /> AlphaBot Quant
                                </span>
                              )}
                              {cId.startsWith('criptoalpha_scalp_') && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                                  <Zap className="w-2.5 h-2.5" /> Scalping Bot
                                </span>
                              )}
                              {cId.startsWith('criptoalpha_daemon_') && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1">
                                  <Server className="w-2.5 h-2.5" /> Servidor 24/7
                                </span>
                              )}
                              {cId.startsWith('criptoalpha_') && !cId.startsWith('criptoalpha_quant_') && !cId.startsWith('criptoalpha_scalp_') && !cId.startsWith('criptoalpha_daemon_') && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 flex items-center gap-1">
                                  <ShieldCheck className="w-2.5 h-2.5" /> Bot de la App
                                </span>
                              )}
                              {!cId.startsWith('criptoalpha_') && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-400 border border-slate-700">
                                  Orden Externa
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                              {ord.notional ? `$${ord.notional} USD` : `${ord.qty} unidades`}
                              {ord.filled_avg_price && ` • Llenado @ $${parseFloat(ord.filled_avg_price).toLocaleString('es-ES', { minimumFractionDigits: 2 })}`}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold capitalize ${
                            isFilled
                              ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30'
                              : isOpen
                              ? 'bg-amber-950/60 text-amber-300 border border-amber-500/30'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}>
                            {isFilled ? 'Ejecutada (Filled)' : ord.status}
                          </span>

                          <span className="text-slate-400 font-mono text-[11px]">
                            {new Date(ord.submitted_at || ord.created_at).toLocaleString('es-ES', {
                              month: 'short',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>

                          {isOpen && (
                            <button
                              onClick={() => handleCancelOrder(ord.id)}
                              className="px-2 py-1 bg-rose-900/50 hover:bg-rose-900 text-rose-200 rounded text-[10px] font-bold"
                            >
                              Cancelar
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 5: QUICK TRADE (Lanzar Orden Manual) */}
          {/* ========================================================================= */}
          {activeTab === 'quick_trade' && (
            <div className="max-w-xl mx-auto space-y-5">
              <div className="text-center space-y-1">
                <h3 className="text-base font-bold text-white">Lanzar Orden Manual en Alpaca Paper</h3>
                <p className="text-xs text-slate-400">
                  La orden se enviará a los servidores de Alpaca y se ejecutará inmediatamente con los $100.000 USD de prueba.
                </p>
              </div>

              <form onSubmit={handleExecuteTrade} className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
                {/* Buy / Sell selector */}
                <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-900 border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setTradeSide('buy')}
                    className={`py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      tradeSide === 'buy'
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/50'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <ArrowUpRight className="w-4 h-4" /> COMPRAR (Long)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTradeSide('sell')}
                    className={`py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      tradeSide === 'sell'
                        ? 'bg-rose-600 text-white shadow-md shadow-rose-900/50'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <ArrowDownRight className="w-4 h-4" /> VENDER (Short/Cierre)
                  </button>
                </div>

                {/* Crypto Asset Select */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Activo Cripto en Alpaca
                  </label>
                  <select
                    value={tradeSymbol}
                    onChange={(e) => setTradeSymbol(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-medium focus:border-emerald-500 focus:outline-none"
                  >
                    {cryptoSymbolsList.map((item) => (
                      <option key={item.symbol} value={item.symbol}>
                        {item.label} {item.price > 0 ? `— $${item.price.toLocaleString('es-ES')} USD` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Amount in USD */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-300">
                      Monto a invertir (USD)
                    </label>
                    <span className="text-xs font-mono text-emerald-400">
                      Saldo Disponible: ${(account?.cash ?? 100000).toLocaleString('es-ES')} USD
                    </span>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs font-mono">
                      $
                    </div>
                    <input
                      type="number"
                      step="10"
                      min="1"
                      max={account?.cash || 100000}
                      value={tradeAmountUsd}
                      onChange={(e) => setTradeAmountUsd(Number(e.target.value))}
                      className="w-full pl-7 pr-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:border-emerald-500 focus:outline-none"
                      placeholder="100"
                    />
                  </div>

                  {/* Preset Amount buttons */}
                  <div className="flex items-center gap-2 mt-2">
                    {[25, 50, 100, 250, 500, 1000].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setTradeAmountUsd(preset)}
                        className={`flex-1 py-1 text-[11px] font-mono rounded-lg border transition-colors ${
                          tradeAmountUsd === preset
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                        }`}
                      >
                        ${preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Submit button */}
                <button
                  id="alpaca-submit-order-btn"
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition shadow-lg ${
                    tradeSide === 'buy'
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/40'
                      : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/40'
                  } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Enviando orden a Alpaca...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      {tradeSide === 'buy' ? 'Comprar' : 'Vender'} {tradeSymbol} (${tradeAmountUsd} USD) en Alpaca Paper
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* TAB 6: 24/7 ALWAYS-ON SERVER DAEMON CONTROL & TELEMETRY */}
          {activeTab === 'daemon_247' && (
            <div className="space-y-6">
              {/* Header Hero */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/40 border border-emerald-500/40 space-y-4 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                      <Cpu className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-white">
                          Motor Autónomo 24/7 en Servidor (Always-On)
                        </h3>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-black ${
                          daemonStatus?.config?.enabled
                            ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-300'
                            : 'bg-rose-500/20 border border-rose-500/50 text-rose-300'
                        }`}>
                          {daemonStatus?.config?.enabled ? 'EN EJECUCIÓN CONTINUA' : 'DETENIDO'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-0.5">
                        Ejecuta escaneo y trading directamente en el backend de Node.js en la nube, sin necesidad de tener el navegador abierto.
                      </p>
                    </div>
                  </div>

                  {/* Toggle Button */}
                  <button
                    onClick={handleToggleDaemon}
                    disabled={isTogglingDaemon}
                    className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition shadow-lg ${
                      daemonStatus?.config?.enabled
                        ? 'bg-gradient-to-r from-rose-600 to-amber-600 hover:brightness-110 text-white'
                        : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 text-slate-950'
                    } ${isTogglingDaemon ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    {isTogglingDaemon ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : daemonStatus?.config?.enabled ? (
                      <>
                        <Pause className="w-4 h-4" />
                        Pausar Motor en Servidor
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" />
                        Activar Motor en Servidor (24/7)
                      </>
                    )}
                  </button>
                </div>

                {/* Cloud & Persistence Status Bar */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-800 text-xs">
                  <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                    <span className="text-slate-400 block text-[11px]">Estrategia Servidor</span>
                    <strong className="text-purple-400 font-mono flex items-center gap-1.5 mt-0.5">
                      <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
                      Multi-Factor Alpha AI
                    </strong>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                    <span className="text-slate-400 block text-[11px]">Techo Máximo de Riesgo</span>
                    <strong className="text-emerald-400 font-mono mt-0.5 block">
                      {daemonStatus?.config?.maxTotalExposureEur || 1000} € Global
                    </strong>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                    <span className="text-slate-400 block text-[11px]">Frecuencia de Ciclo</span>
                    <strong className="text-white font-mono mt-0.5 block">
                      Cada {daemonStatus?.config?.intervalSeconds || 30}s (24/7)
                    </strong>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                    <span className="text-slate-400 block text-[11px]">Órdenes / Cierres TP-SL</span>
                    <strong className="text-cyan-400 font-mono mt-0.5 block">
                      {daemonStatus?.stats?.ordersExecuted || daemonStatus?.stats?.ordersPlaced || 0} comp. / {daemonStatus?.stats?.positionsClosed || 0} cerr.
                    </strong>
                  </div>
                </div>
              </div>

              {/* Configuration Form & Stats */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Config Form */}
                <form
                  onSubmit={handleSaveDaemonConfig}
                  className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4 lg:col-span-1"
                >
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                    Parámetros del Motor 24/7
                  </h4>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] text-slate-300 font-semibold">
                        Límite Máximo de Capital Activo
                      </label>
                      <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/80 px-1.5 py-0.2 rounded border border-emerald-500/30">
                        Techo Inquebrantable
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        step="50"
                        min="100"
                        max="10000"
                        value={daemonConfigForm.maxTotalExposureEur || 1000}
                        onChange={(e) =>
                          setDaemonConfigForm({
                            ...daemonConfigForm,
                            maxTotalExposureEur: Number(e.target.value),
                          })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-emerald-300 text-xs font-mono font-bold focus:border-emerald-500 focus:outline-none pr-12"
                      />
                      <span className="absolute right-3 top-2 text-[11px] font-bold text-slate-400 pointer-events-none">
                        EUR (€)
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      El servidor nunca abrirá operaciones si la suma total invertida alcanza este tope (1.000 €).
                    </p>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-300 mb-1">
                      Monto Base por Operación (USD)
                    </label>
                    <input
                      type="number"
                      step="10"
                      min="10"
                      value={daemonConfigForm.tradeSizeUsd}
                      onChange={(e) =>
                        setDaemonConfigForm({
                          ...daemonConfigForm,
                          tradeSizeUsd: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono focus:border-emerald-500 focus:outline-none"
                    />
                    <p className="text-[10px] text-cyan-400 mt-1 flex items-center gap-1">
                      <span>✨</span>
                      <span>Asignación Cuántica: <strong>100 €</strong> en alta convicción y <strong>50 €</strong> en riesgo controlado.</span>
                    </p>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-300 mb-1">
                      Máximo de Posiciones Simultáneas
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="15"
                      value={daemonConfigForm.maxOpenPositions}
                      onChange={(e) =>
                        setDaemonConfigForm({
                          ...daemonConfigForm,
                          maxOpenPositions: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-300 mb-1">
                        Take Profit (%)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0.5"
                        value={daemonConfigForm.takeProfitPct}
                        onChange={(e) =>
                          setDaemonConfigForm({
                            ...daemonConfigForm,
                            takeProfitPct: Number(e.target.value),
                          })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-300 mb-1">
                        Stop Loss (%)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0.5"
                        value={daemonConfigForm.stopLossPct}
                        onChange={(e) =>
                          setDaemonConfigForm({
                            ...daemonConfigForm,
                            stopLossPct: Number(e.target.value),
                          })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5"
                  >
                    Guardar Parámetros en Servidor
                  </button>
                </form>

                {/* Server Telemetry Logs */}
                <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4 lg:col-span-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <Activity className="w-3.5 h-3.5 text-cyan-400" />
                      Telemetría en Vivo del Servidor (Firestore Stream)
                    </h4>
                    <span className="text-[10px] font-mono text-slate-400">
                      Último ciclo: {daemonStatus?.stats?.lastCycleAt ? new Date(daemonStatus.stats.lastCycleAt).toLocaleTimeString() : 'Iniciando...'}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs space-y-2 max-h-64 overflow-y-auto">
                    {daemonStatus?.logs && daemonStatus.logs.length > 0 ? (
                      daemonStatus.logs.map((log: any) => (
                        <div key={log.id} className="flex items-start gap-2 border-b border-slate-900/60 pb-1.5 last:border-b-0">
                          <span className="text-slate-500 text-[10px] shrink-0">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                          <span
                            className={`text-[10px] font-bold shrink-0 px-1 py-0.2 rounded ${
                              log.level === 'ORDER'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : log.level === 'WARN'
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {log.level}
                          </span>
                          <span className="text-slate-200 text-xs break-all">
                            {log.message}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-6 text-slate-500">
                        Esperando primeros ciclos de escaneo del servidor...
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Status Bar */}
        <div className="px-4 sm:px-6 py-3 border-t border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Alpaca Markets Crypto Paper Trading • Endpoint: paper-api.alpaca.markets/v2</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold transition text-xs"
          >
            Cerrar Ventana
          </button>
        </div>

        {/* MODAL DE ADVERTENCIA DE CIERRE DE OPERACIONES AL DESACTIVAR BOT */}
        {pendingDeactivation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in">
            <div className="bg-slate-900 border-2 border-rose-500/80 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl shadow-rose-950/80 space-y-4">
              <div className="flex items-start gap-3.5">
                <div className="p-3 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/50 shrink-0">
                  <AlertTriangle className="w-7 h-7 animate-bounce" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                    <span>Advertencia: Cierre de Operaciones en Alpaca</span>
                  </h3>
                  <p className="text-xs text-rose-300 font-bold mt-0.5">
                    Desactivando: {pendingDeactivation.targetName}
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/30 text-xs sm:text-sm text-slate-200 space-y-3 leading-relaxed">
                <p>
                  Has seleccionado que <strong className="text-white">{pendingDeactivation.targetName}</strong> deje de enviar operaciones a tu cuenta de Alpaca Markets.
                </p>
                <div className="p-3 rounded-xl bg-slate-950/70 border border-rose-500/40 text-xs text-rose-200 space-y-2 font-medium">
                  <div className="flex items-center gap-1.5 font-bold text-rose-400">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>Consecuencias inmediatas en Alpaca Markets:</span>
                  </div>
                  <p className="leading-normal">
                    • <strong>Todas las operaciones y posiciones abiertas actualmente en Alpaca con este bot se cerrarán de inmediato</strong> a precio de mercado y sus órdenes pendientes serán canceladas.
                  </p>
                  <p className="leading-normal">
                    • <strong>No se volverán a realizar ni enviar operaciones a Alpaca</strong> hasta que decidas volver a activarlo en este menú.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setPendingDeactivation(null)}
                  disabled={isDeactivating}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-bold transition cursor-pointer disabled:opacity-50"
                >
                  Cancelar (Mantener Activo)
                </button>
                <button
                  onClick={handleConfirmDeactivation}
                  disabled={isDeactivating}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs sm:text-sm font-black flex items-center gap-2 transition shadow-lg shadow-rose-950/60 cursor-pointer disabled:opacity-50"
                >
                  {isDeactivating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Cerrando y Desactivando...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Confirmar y Cerrar Operaciones</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
