import React, { useState, useMemo } from 'react';
import { 
  X, 
  Briefcase, 
  TrendingUp, 
  TrendingDown, 
  CheckCircle2, 
  Clock, 
  Target, 
  ShieldAlert, 
  Trash2, 
  ArrowUpRight, 
  ArrowDownRight, 
  BarChart2, 
  RotateCcw, 
  Plus,
  Zap,
  Info,
  Sliders,
  Award,
  AlertCircle
} from 'lucide-react';
import { CryptoAsset, SimulatedTrade, AlpacaAccountInfo } from '../types';
import { formatCurrency, formatPercentage } from '../utils/formatters';
import { getCryptoLogoUrl, handleCryptoImageError } from '../utils/cryptoLogos';
import { 
  calculateTradeMetrics, 
  calculatePortfolioSummary, 
  calculateOrderProjections,
  CalculatedTradeMetrics 
} from '../utils/simulationBrokerEngine';
import { placeAlpacaOrder, fetchAlpacaAccount, isAlpacaSupportedCrypto } from '../utils/alpacaClient';

interface SimpleBrokerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedAsset: CryptoAsset | null;
  onSelectAsset?: (asset: CryptoAsset) => void;
  assets: CryptoAsset[];
  trades: SimulatedTrade[];
  onOpenTrade: (tradeData: {
    asset: CryptoAsset;
    amountEur: number;
    type: 'BUY' | 'SELL';
    takeProfitEur?: number;
    takeProfitPct?: number;
    takeProfitPrice?: number;
    stopLossEur?: number;
    stopLossPct?: number;
    stopLossPrice?: number;
    strategyTag?: string;
  }) => void;
  onCloseTrade: (tradeId: string) => void;
  onDeleteTrade: (tradeId: string) => void;
  onResetTrades?: () => void;
  onOpenChartModal?: (asset: CryptoAsset) => void;
}

export const SimpleBrokerModal: React.FC<SimpleBrokerModalProps> = ({
  isOpen,
  onClose,
  selectedAsset,
  onSelectAsset,
  assets,
  trades,
  onOpenTrade,
  onCloseTrade,
  onDeleteTrade,
  onResetTrades,
  onOpenChartModal,
}) => {
  // Modal internal active tab: 'new_order' | 'open_trades' | 'closed_history'
  const [activeTab, setActiveTab] = useState<'new_order' | 'open_trades' | 'closed_history'>('new_order');
  
  // Local asset for trading (fallback to first asset if none selected)
  const [currentAsset, setCurrentAsset] = useState<CryptoAsset | null>(selectedAsset || (assets.length > 0 ? assets[0] : null));

  // Investment amount in Euros
  const [amountEur, setAmountEur] = useState<number>(500);
  const [orderType, setOrderType] = useState<'BUY' | 'SELL'>('BUY');
  const [enableTargets, setEnableTargets] = useState<boolean>(true);
  
  // Configurable TP / SL settings
  const [tpPct, setTpPct] = useState<number>(12.5);
  const [slPct, setSlPct] = useState<number>(4.0);
  
  const [tradeConfirmedSuccess, setTradeConfirmedSuccess] = useState<boolean>(false);

  // Alpaca Paper Trading Integration State
  const [executionVenue, setExecutionVenue] = useState<'alpaca' | 'simulated'>('alpaca');
  const [alpacaAccount, setAlpacaAccount] = useState<AlpacaAccountInfo | null>(null);
  const [alpacaFeedback, setAlpacaFeedback] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      fetchAlpacaAccount().then((acc) => {
        if (acc && acc.connected) setAlpacaAccount(acc);
      });
    }
  }, [isOpen]);

  // Sync current asset if prop changes
  React.useEffect(() => {
    if (selectedAsset) {
      setCurrentAsset(selectedAsset);
      setActiveTab('new_order');
      setTradeConfirmedSuccess(false);
    }
  }, [selectedAsset]);

  // Preset investment buttons in Euros
  const presetAmounts = [100, 250, 500, 1000, 2500, 5000];
  const presetTpPcts = [5.0, 8.0, 10.0, 15.0, 20.0, 30.0, 50.0];
  const presetSlPcts = [2.0, 3.0, 4.0, 5.0, 6.0, 8.0, 10.0];

  // Live order projections using mathematical engine
  const activePrice = currentAsset?.current_price || 100;
  const orderProjections = useMemo(() => {
    return calculateOrderProjections({
      entryPrice: activePrice,
      amountEur,
      orderType,
      tpPct: enableTargets ? tpPct : 0,
      slPct: enableTargets ? slPct : 0,
    });
  }, [activePrice, amountEur, orderType, enableTargets, tpPct, slPct]);

  // Open & Closed trades separation
  const openTrades = useMemo(() => trades.filter((t) => t.status === 'OPEN'), [trades]);
  const closedTrades = useMemo(() => trades.filter((t) => t.status === 'CLOSED'), [trades]);

  // Global Portfolio Summary with verified math
  const portfolioSummary = useMemo(() => {
    return calculatePortfolioSummary(trades, assets);
  }, [trades, assets]);

  // Metrics for all open trades
  const openTradeMetrics: CalculatedTradeMetrics[] = useMemo(() => {
    return openTrades.map((trade) => calculateTradeMetrics(trade, assets));
  }, [openTrades, assets]);

  // Handle trade submission
  const handleExecuteTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAsset || amountEur <= 0) return;

    let strategyTag = 'Broker Cripto Simulado';
    if (executionVenue === 'alpaca') {
      try {
        if (!isAlpacaSupportedCrypto(currentAsset.symbol)) {
          strategyTag = 'Simulación Local (no listado en Alpaca)';
          setAlpacaFeedback(`ℹ️ ${currentAsset.symbol.toUpperCase()} no cotiza en Alpaca Crypto. La orden se ejecutó en Simulación Local.`);
        } else {
          const symbolForAlpaca = `${currentAsset.symbol.toUpperCase()}/USD`;
          const alpacaRes = await placeAlpacaOrder({
            symbol: symbolForAlpaca,
            side: orderType.toLowerCase() as 'buy' | 'sell',
            notional: amountEur,
          });
          if (alpacaRes.success && alpacaRes.order) {
            strategyTag = `Alpaca Paper #${alpacaRes.order.id.slice(0, 6)}`;
            setAlpacaFeedback(`¡Orden enviada a Alpaca Paper Trading con éxito! ID: ${alpacaRes.order.id.slice(0, 8)}`);
            // Refresh alpaca balance
            fetchAlpacaAccount().then(acc => { if (acc.connected) setAlpacaAccount(acc); });
          } else if (alpacaRes.unsupported) {
            strategyTag = 'Simulación Local';
            setAlpacaFeedback(`ℹ️ ${currentAsset.symbol.toUpperCase()} no está disponible en Alpaca Crypto. Ejecutado en Simulación Local.`);
          }
        }
      } catch (err: any) {
        console.error('Alpaca execution error:', err);
      }
    }

    onOpenTrade({
      asset: currentAsset,
      amountEur: Number(amountEur),
      type: orderType,
      takeProfitEur: enableTargets ? orderProjections.estimatedProfitEur : undefined,
      takeProfitPct: enableTargets ? tpPct : undefined,
      takeProfitPrice: enableTargets ? orderProjections.tpPrice : undefined,
      stopLossEur: enableTargets ? orderProjections.estimatedRiskEur : undefined,
      stopLossPct: enableTargets ? slPct : undefined,
      stopLossPrice: enableTargets ? orderProjections.slPrice : undefined,
      strategyTag,
    });

    setTradeConfirmedSuccess(true);
    setTimeout(() => {
      setTradeConfirmedSuccess(false);
      setActiveTab('open_trades');
    }, 700);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in overflow-y-auto overflow-x-hidden">
      <div className="relative w-full max-w-4xl rounded-2xl sm:rounded-3xl border border-emerald-500/40 bg-slate-900 shadow-2xl shadow-emerald-950/40 text-slate-100 flex flex-col my-auto max-h-[94vh] overflow-hidden overflow-x-hidden">
        
        {/* COMPACT TOP HEADER */}
        <div className="px-3.5 py-2.5 sm:px-5 sm:py-3 border-b border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 p-0.5 shadow-md shadow-emerald-500/20 flex items-center justify-center text-white shrink-0">
              <Briefcase className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 className="text-sm sm:text-base font-black text-white tracking-tight truncate">
                  Broker Cripto Simulado
                </h2>
                <span className="text-emerald-400 font-mono text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/15 border border-emerald-500/30 shrink-0">
                  SIN RIESGO (€)
                </span>
                <span className="text-teal-300 font-mono text-[9px] font-semibold px-1.5 py-0.2 rounded-full bg-teal-500/10 border border-teal-500/20 hidden sm:inline-block">
                  Cálculo P&amp;L 100% Real
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block truncate">
                Simulación en tiempo real vinculada a cotizaciones oficiales de exchanges y oráculos On-Chain
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Live Portfolio Mini Badge */}
            {openTrades.length > 0 && (
              <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-mono font-bold ${
                portfolioSummary.totalPnlEur >= 0 
                  ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300' 
                  : 'bg-rose-950/70 border-rose-500/40 text-rose-300'
              }`}>
                {portfolioSummary.totalPnlEur >= 0 ? <TrendingUp className="h-3 w-3 text-emerald-400 shrink-0" /> : <TrendingDown className="h-3 w-3 text-rose-400 shrink-0" />}
                <span className="truncate">
                  {portfolioSummary.totalPnlEur >= 0 ? '+' : ''}{portfolioSummary.totalPnlEur.toFixed(2)} € ({portfolioSummary.totalPnlPct >= 0 ? '+' : ''}{portfolioSummary.totalPnlPct.toFixed(2)}%)
                </span>
              </div>
            )}

            <button
              onClick={onClose}
              className="rounded-lg border border-slate-700 bg-slate-800/90 p-1.5 text-slate-400 hover:bg-slate-700 hover:text-white transition cursor-pointer shrink-0"
              title="Cerrar Broker"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* COMPACT RESPONSIVE NAVIGATION MENU */}
        <div className="border-b border-slate-800 bg-slate-950 px-2 sm:px-4 py-1.5 shrink-0">
          <div className="grid grid-cols-3 gap-1 w-full max-w-full">
            <button
              onClick={() => setActiveTab('new_order')}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 px-2 text-xs font-bold transition truncate cursor-pointer ${
                activeTab === 'new_order'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'bg-slate-900/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <Zap className={`h-3.5 w-3.5 shrink-0 ${activeTab === 'new_order' ? 'text-slate-950' : 'text-emerald-400'}`} />
              <span className="truncate">Nueva Inversión</span>
            </button>

            <button
              onClick={() => setActiveTab('open_trades')}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 px-2 text-xs font-bold transition truncate relative cursor-pointer ${
                activeTab === 'open_trades'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'bg-slate-900/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <Briefcase className={`h-3.5 w-3.5 shrink-0 ${activeTab === 'open_trades' ? 'text-slate-950' : 'text-teal-400'}`} />
              <span className="truncate">Abiertas</span>
              <span className={`rounded-full text-[10px] font-black px-1.5 py-0.2 shrink-0 ${
                activeTab === 'open_trades' ? 'bg-slate-950 text-emerald-300' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              }`}>
                {openTrades.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('closed_history')}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 px-2 text-xs font-bold transition truncate cursor-pointer ${
                activeTab === 'closed_history'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'bg-slate-900/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <Clock className={`h-3.5 w-3.5 shrink-0 ${activeTab === 'closed_history' ? 'text-slate-950' : 'text-slate-400'}`} />
              <span className="truncate">Historial ({closedTrades.length})</span>
            </button>
          </div>
        </div>

        {/* MODAL MAIN BODY CONTENT */}
        <div className="flex-1 p-3 sm:p-5 overflow-y-auto overflow-x-hidden space-y-4 max-w-full">

          {/* TAB 1: NUEVA OPERACIÓN SIMULADA */}
          {activeTab === 'new_order' && (
            <div className="space-y-4 animate-in fade-in duration-200 max-w-full">

              {/* Execution Venue Selector */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-2.5 sm:p-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <div className="flex rounded-lg bg-slate-900 p-0.5 border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setExecutionVenue('alpaca')}
                      className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
                        executionVenue === 'alpaca'
                          ? 'bg-amber-500 text-slate-950 shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>🦙</span>
                      <span>Alpaca Paper Trading</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setExecutionVenue('simulated')}
                      className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
                        executionVenue === 'simulated'
                          ? 'bg-emerald-500 text-slate-950 shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>Simulación Local</span>
                    </button>
                  </div>
                </div>

                <div className="text-right text-xs">
                  {executionVenue === 'alpaca' ? (
                    <div className="flex items-center sm:justify-end gap-2 text-emerald-400 font-mono">
                      <span className="text-[11px] text-slate-400 font-sans">Saldo Alpaca Paper:</span>
                      <span className="font-bold">${(alpacaAccount?.cash ?? 100000).toLocaleString('es-ES', { minimumFractionDigits: 2 })} USD</span>
                    </div>
                  ) : (
                    <div className="flex items-center sm:justify-end gap-2 text-slate-300 font-mono">
                      <span className="text-[11px] text-slate-400 font-sans">Saldo Virtual:</span>
                      <span className="font-bold">10.000,00 € EUR</span>
                    </div>
                  )}
                </div>
              </div>

              {executionVenue === 'alpaca' && currentAsset && !isAlpacaSupportedCrypto(currentAsset.symbol) && (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-center gap-2">
                  <Info className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    <strong>{currentAsset.symbol.toUpperCase()}</strong> no cotiza en Alpaca Crypto. Las órdenes en este par se ejecutarán en <strong>Simulación Local</strong>.
                  </span>
                </div>
              )}

              {alpacaFeedback && (
                <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-xs text-emerald-300 flex items-center justify-between">
                  <span>{alpacaFeedback}</span>
                  <button onClick={() => setAlpacaFeedback(null)} className="text-slate-400 hover:text-white ml-2">✕</button>
                </div>
              )}
              
              {/* Asset Selector & Live Quote Card */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 max-w-full overflow-hidden">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {currentAsset && (
                    <img 
                      src={getCryptoLogoUrl(currentAsset.symbol)} 
                      alt={currentAsset.name} 
                      onError={(e) => handleCryptoImageError(e, currentAsset.symbol)}
                      referrerPolicy="no-referrer"
                      className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl border border-slate-700 bg-slate-900 object-contain p-1.5 shadow-md shrink-0" 
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 max-w-full">
                      <select
                        value={currentAsset?.id || ''}
                        onChange={(e) => {
                          const found = assets.find((a) => a.id === e.target.value);
                          if (found) {
                            setCurrentAsset(found);
                            if (onSelectAsset) onSelectAsset(found);
                          }
                        }}
                        className="w-full max-w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs sm:text-sm font-black text-white focus:border-emerald-500 focus:outline-none cursor-pointer truncate"
                      >
                        {assets.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.symbol.toUpperCase()} — {a.name} ({formatCurrency(a.current_price)})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5 truncate">
                      <span className="truncate">{currentAsset?.sector || 'Cripto'}</span>
                      <span>•</span>
                      <span className="text-emerald-400 font-bold shrink-0">Alpha Score: {currentAsset?.alphaScore || 85} pts</span>
                    </div>
                  </div>
                </div>

                {/* Price Display */}
                {currentAsset && (
                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/80 shrink-0">
                    <div className="text-left sm:text-right">
                      <div className="text-base sm:text-xl font-black text-white font-mono leading-tight">
                        {formatCurrency(currentAsset.current_price)}
                      </div>
                      <div className={`text-[11px] font-bold font-mono flex items-center sm:justify-end gap-1 ${
                        (currentAsset.price_change_percentage_24h || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {(currentAsset.price_change_percentage_24h || 0) >= 0 ? <ArrowUpRight className="h-3 w-3 shrink-0" /> : <ArrowDownRight className="h-3 w-3 shrink-0" />}
                        <span>{formatPercentage(currentAsset.price_change_percentage_24h || 0)}</span>
                      </div>
                    </div>

                    {onOpenChartModal && (
                      <button
                        onClick={() => onOpenChartModal(currentAsset)}
                        className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-bold text-slate-200 hover:bg-slate-700 transition shrink-0 cursor-pointer"
                        title="Ver Gráfico Técnico"
                      >
                        <BarChart2 className="h-3.5 w-3.5 inline mr-1 text-emerald-400" />
                        <span>Gráfico</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* SIMULATION ORDER FORM */}
              <form onSubmit={handleExecuteTrade} className="rounded-2xl border border-slate-800 bg-slate-900/90 p-3.5 sm:p-5 space-y-4 max-w-full">
                
                {/* 1. ORDER DIRECTION: COMPRA (LONG) O VENTA (SHORT) */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                    1. Sentido de la Operación:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setOrderType('BUY')}
                      className={`flex items-center justify-center gap-1.5 rounded-xl border p-2.5 text-xs sm:text-sm font-black transition cursor-pointer ${
                        orderType === 'BUY'
                          ? 'border-emerald-500 bg-emerald-950/70 text-emerald-300 shadow-md shadow-emerald-950/50'
                          : 'border-slate-800 bg-slate-950/80 text-slate-400 hover:border-slate-700 hover:text-white'
                      }`}
                    >
                      <TrendingUp className="h-4 w-4 text-emerald-400 shrink-0" />
                      <span className="truncate">COMPRA / LONG (Alcista 📈)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setOrderType('SELL')}
                      className={`flex items-center justify-center gap-1.5 rounded-xl border p-2.5 text-xs sm:text-sm font-black transition cursor-pointer ${
                        orderType === 'SELL'
                          ? 'border-rose-500 bg-rose-950/70 text-rose-300 shadow-md shadow-rose-950/50'
                          : 'border-slate-800 bg-slate-950/80 text-slate-400 hover:border-slate-700 hover:text-white'
                      }`}
                    >
                      <TrendingDown className="h-4 w-4 text-rose-400 shrink-0" />
                      <span className="truncate">VENTA / SHORT (Bajista 📉)</span>
                    </button>
                  </div>
                </div>

                {/* 2. CAPITAL IN EUROS (€) INPUT */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1">
                      <span className="text-emerald-400 font-black">2.</span> Capital a Invertir:
                    </label>
                    <span className="text-[11px] text-slate-400">Moneda: <strong>Euros (€)</strong></span>
                  </div>

                  {/* Main Amount Input */}
                  <div className="relative flex items-center max-w-full">
                    <div className="absolute left-3.5 flex items-center pointer-events-none text-emerald-400 text-lg font-bold font-mono">
                      €
                    </div>
                    <input
                      type="number"
                      min="10"
                      max="100000"
                      step="10"
                      value={amountEur}
                      onChange={(e) => setAmountEur(Math.max(0, Number(e.target.value)))}
                      className="w-full rounded-xl border border-emerald-500/50 bg-slate-950 py-2.5 pl-9 pr-3 text-lg sm:text-xl font-black text-white font-mono focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none shadow-inner"
                      placeholder="500"
                      required
                    />
                  </div>

                  {/* Quick Preset Buttons */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    {presetAmounts.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setAmountEur(preset)}
                        className={`rounded-lg border px-2.5 py-1 text-[11px] font-mono font-bold transition cursor-pointer ${
                          amountEur === preset
                            ? 'border-emerald-500 bg-emerald-500 text-slate-950 shadow-sm font-black'
                            : 'border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700 hover:text-white'
                        }`}
                      >
                        {preset.toLocaleString()} €
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. CONFIGURABLE TAKE PROFIT & STOP LOSS TARGETS */}
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 sm:p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="enable-targets-check"
                        checked={enableTargets}
                        onChange={(e) => setEnableTargets(e.target.checked)}
                        className="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500 h-4 w-4 cursor-pointer"
                      />
                      <label htmlFor="enable-targets-check" className="text-slate-200 text-xs font-bold cursor-pointer flex items-center gap-1.5">
                        <Sliders className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Configurar Objetivos (Take Profit / Stop Loss)</span>
                      </label>
                    </div>
                    {enableTargets && (
                      <span className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                        Ratio R/R: {orderProjections.riskRewardRatio.toFixed(2)} : 1
                      </span>
                    )}
                  </div>

                  {enableTargets && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      {/* Take Profit Setting */}
                      <div className="p-2.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-emerald-300 flex items-center gap-1">
                            <Target className="h-3.5 w-3.5 text-emerald-400" />
                            Take Profit (+{tpPct}%)
                          </span>
                          <span className="font-mono text-emerald-400 font-bold">
                            +{orderProjections.estimatedProfitEur.toFixed(2)} €
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="1"
                            max="500"
                            step="0.5"
                            value={tpPct}
                            onChange={(e) => setTpPct(Math.max(0.1, Number(e.target.value)))}
                            className="w-20 rounded-lg border border-emerald-500/40 bg-slate-900 px-2 py-1 text-xs font-mono font-bold text-white"
                          />
                          <span className="text-[11px] text-slate-400 font-mono">
                            Precio Obj: <strong className="text-emerald-300 font-mono">{formatCurrency(orderProjections.tpPrice)}</strong>
                          </span>
                        </div>

                        {/* Quick TP presets */}
                        <div className="flex flex-wrap gap-1">
                          {presetTpPcts.map((pct) => (
                            <button
                              key={pct}
                              type="button"
                              onClick={() => setTpPct(pct)}
                              className={`rounded px-1.5 py-0.5 text-[10px] font-mono font-bold transition cursor-pointer ${
                                tpPct === pct
                                  ? 'bg-emerald-500 text-slate-950'
                                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                              }`}
                            >
                              +{pct}%
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Stop Loss Setting */}
                      <div className="p-2.5 rounded-xl bg-rose-950/20 border border-rose-500/30 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-rose-300 flex items-center gap-1">
                            <ShieldAlert className="h-3.5 w-3.5 text-rose-400" />
                            Stop Loss (-{slPct}%)
                          </span>
                          <span className="font-mono text-rose-400 font-bold">
                            -{orderProjections.estimatedRiskEur.toFixed(2)} €
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0.5"
                            max="80"
                            step="0.5"
                            value={slPct}
                            onChange={(e) => setSlPct(Math.max(0.1, Number(e.target.value)))}
                            className="w-20 rounded-lg border border-rose-500/40 bg-slate-900 px-2 py-1 text-xs font-mono font-bold text-white"
                          />
                          <span className="text-[11px] text-slate-400 font-mono">
                            Precio Stop: <strong className="text-rose-300 font-mono">{formatCurrency(orderProjections.slPrice)}</strong>
                          </span>
                        </div>

                        {/* Quick SL presets */}
                        <div className="flex flex-wrap gap-1">
                          {presetSlPcts.map((pct) => (
                            <button
                              key={pct}
                              type="button"
                              onClick={() => setSlPct(pct)}
                              className={`rounded px-1.5 py-0.5 text-[10px] font-mono font-bold transition cursor-pointer ${
                                slPct === pct
                                  ? 'bg-rose-500 text-white'
                                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                              }`}
                            >
                              -{pct}%
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. LIVE ORDER BREAKDOWN & METRICS */}
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 sm:p-3.5 space-y-2.5 max-w-full">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between border-b border-slate-800/80 pb-1.5">
                    <span>Resumen Matemático de la Orden</span>
                    <span className="text-emerald-400 font-mono text-[10px]">Sin comisiones (0.00 €)</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <div className="text-[10px] text-slate-400 font-sans">Capital Invertido</div>
                      <div className="text-xs sm:text-sm font-black text-white mt-0.5">{amountEur.toLocaleString('es-ES')} €</div>
                    </div>

                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <div className="text-[10px] text-slate-400 font-sans">Precio Entrada</div>
                      <div className="text-xs sm:text-sm font-black text-slate-200 mt-0.5">
                        {formatCurrency(activePrice)}
                      </div>
                    </div>

                    <div className="p-2 rounded-lg bg-slate-900 border border-emerald-500/30">
                      <div className="text-[10px] text-emerald-400 font-sans">Tokens Asignados</div>
                      <div className="text-xs sm:text-sm font-black text-emerald-300 mt-0.5">{orderProjections.shares.toFixed(4)} {currentAsset?.symbol.toUpperCase()}</div>
                    </div>

                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <div className="text-[10px] text-slate-400 font-sans">Comisión Exchange</div>
                      <div className="text-xs sm:text-sm font-black text-teal-400 mt-0.5">0.00 € (Demo)</div>
                    </div>
                  </div>
                </div>

                {/* SUBMIT BUTTON */}
                <button
                  type="submit"
                  disabled={amountEur <= 0 || !currentAsset}
                  className={`w-full rounded-xl py-3 px-4 text-xs sm:text-sm font-black transition flex items-center justify-center gap-2 shadow-lg cursor-pointer max-w-full ${
                    tradeConfirmedSuccess
                      ? 'bg-emerald-500 text-slate-950 animate-pulse'
                      : orderType === 'BUY'
                      ? 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 text-slate-950 hover:brightness-110 shadow-emerald-500/25'
                      : 'bg-gradient-to-r from-rose-600 via-rose-500 to-amber-600 text-white hover:brightness-110 shadow-rose-500/25'
                  }`}
                >
                  {tradeConfirmedSuccess ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      <span>¡Operación Abierta con Éxito!</span>
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 shrink-0" />
                      <span className="truncate">
                        Invertir {amountEur.toLocaleString('es-ES')} € en {currentAsset?.symbol.toUpperCase()} ({orderType === 'BUY' ? 'COMPRA' : 'VENTA'})
                      </span>
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* TAB 2: OPERACIONES ABIERTAS & P&L EN VIVO */}
          {activeTab === 'open_trades' && (
            <div className="space-y-4 animate-in fade-in duration-200 max-w-full">
              
              {/* Global Portfolio KPI Banner */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 max-w-full">
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                  <div className="text-[11px] text-slate-400 font-sans">Capital Total Invertido</div>
                  <div className="text-base sm:text-lg font-black text-white font-mono mt-0.5 truncate">
                    {portfolioSummary.totalInvestedEur.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                  </div>
                  <div className="text-[10px] text-slate-500">{openTrades.length} posiciones abiertas</div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                  <div className="text-[11px] text-slate-400 font-sans">Valor Actual de Cartera</div>
                  <div className="text-base sm:text-lg font-black text-slate-100 font-mono mt-0.5 truncate">
                    {portfolioSummary.totalCurrentValueEur.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                  </div>
                  <div className="text-[10px] text-slate-500">Valor de liquidación</div>
                </div>

                <div className={`rounded-xl border p-3 col-span-2 sm:col-span-2 ${
                  portfolioSummary.totalPnlEur >= 0 
                    ? 'border-emerald-500/50 bg-emerald-950/40' 
                    : 'border-rose-500/50 bg-rose-950/40'
                }`}>
                  <div className="flex items-center justify-between text-xs font-sans">
                    <span className="text-slate-300 text-[11px] font-semibold">Beneficio / Pérdida Global (P&amp;L)</span>
                    <span className={`font-bold uppercase text-[9px] px-1.5 py-0.2 rounded-full ${
                      portfolioSummary.totalPnlEur >= 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                    }`}>
                      {portfolioSummary.totalPnlEur >= 0 ? 'Ganancias 🟢' : 'Pérdidas 🔴'}
                    </span>
                  </div>
                  <div className={`text-lg sm:text-xl font-black font-mono mt-0.5 flex items-center gap-1.5 flex-wrap ${
                    portfolioSummary.totalPnlEur >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {portfolioSummary.totalPnlEur >= 0 ? <TrendingUp className="h-5 w-5 shrink-0" /> : <TrendingDown className="h-5 w-5 shrink-0" />}
                    <span>
                      {portfolioSummary.totalPnlEur >= 0 ? '+' : ''}{portfolioSummary.totalPnlEur.toFixed(2)} €
                    </span>
                    <span className="text-xs font-bold">
                      ({portfolioSummary.totalPnlPct >= 0 ? '+' : ''}{portfolioSummary.totalPnlPct.toFixed(2)}%)
                    </span>
                  </div>
                </div>
              </div>

              {/* Open Positions List */}
              {openTradeMetrics.length === 0 ? (
                <div className="p-8 sm:p-12 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-950/60 space-y-3">
                  <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
                    <Briefcase className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-white">No tienes operaciones activas</h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      Abre una operación simulada para probar tus estrategias cripto sin arriesgar capital real con cotizaciones en directo.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('new_order')}
                    className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-xs font-bold text-white transition shadow-md shadow-emerald-600/20 inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Simular una Operación Ahora</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3 max-w-full">
                  <div className="flex items-center justify-between text-xs text-slate-400 px-0.5">
                    <span className="font-semibold">Posiciones activas ({openTradeMetrics.length})</span>
                    {onResetTrades && (
                      <button
                        onClick={() => {
                          if (window.confirm('¿Deseas reiniciar todas las operaciones del broker simulado?')) {
                            onResetTrades();
                          }
                        }}
                        className="text-[11px] text-slate-400 hover:text-rose-400 flex items-center gap-1 transition cursor-pointer"
                      >
                        <RotateCcw className="h-3 w-3" />
                        <span>Reiniciar todas</span>
                      </button>
                    )}
                  </div>

                  {openTradeMetrics.map((item) => {
                    const { trade, entryPrice, currentPrice, invested, shares, pnlEur, pnlPct, currentPositionValueEur, isProfitable, tpPrice, tpPct, tpReached, slPrice, slPct, slReached } = item;

                    return (
                      <div
                        key={trade.id}
                        className={`rounded-xl border p-3 sm:p-4 transition-all duration-200 space-y-2.5 max-w-full overflow-hidden ${
                          tpReached
                            ? 'border-emerald-400 bg-gradient-to-r from-slate-900 via-emerald-950/40 to-emerald-900/20 shadow-lg shadow-emerald-950/50'
                            : slReached
                            ? 'border-rose-400 bg-gradient-to-r from-slate-900 via-rose-950/40 to-rose-900/20 shadow-lg shadow-rose-950/50'
                            : isProfitable
                            ? 'border-emerald-500/40 bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/25'
                            : 'border-rose-500/40 bg-gradient-to-r from-slate-900 via-slate-900 to-rose-950/25'
                        }`}
                      >
                        {/* Target Hit Banner Alert if TP or SL is reached */}
                        {tpReached && (
                          <div className="p-2 rounded-lg bg-emerald-500/20 border border-emerald-400 text-emerald-300 text-xs font-bold flex items-center justify-between gap-2">
                            <span className="flex items-center gap-1.5">
                              <Award className="h-4 w-4 text-emerald-400 animate-bounce" />
                              <span>🎯 ¡Objetivo Take Profit Alcanzado! (+{tpPct?.toFixed(1)}%)</span>
                            </span>
                            <span className="text-[11px] font-mono text-white">Objetivo: {formatCurrency(tpPrice || 0)}</span>
                          </div>
                        )}

                        {slReached && (
                          <div className="p-2 rounded-lg bg-rose-500/20 border border-rose-400 text-rose-300 text-xs font-bold flex items-center justify-between gap-2">
                            <span className="flex items-center gap-1.5">
                              <AlertCircle className="h-4 w-4 text-rose-400" />
                              <span>🛑 Nivel de Stop Loss Tocado (-{slPct?.toFixed(1)}%)</span>
                            </span>
                            <span className="text-[11px] font-mono text-white">Stop: {formatCurrency(slPrice || 0)}</span>
                          </div>
                        )}

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 max-w-full">
                          {/* Asset Info */}
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img
                              src={getCryptoLogoUrl(trade.symbol)}
                              alt={trade.name}
                              onError={(e) => handleCryptoImageError(e, trade.symbol)}
                              referrerPolicy="no-referrer"
                              className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl object-contain border border-slate-700 bg-slate-950 p-1 shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-sm sm:text-base font-black text-white font-mono">{trade.symbol.toUpperCase()}</span>
                                <span className="text-xs text-slate-300 truncate max-w-[120px]">{trade.name}</span>
                                <span className={`rounded px-1.5 py-0.2 text-[9px] font-black uppercase shrink-0 ${
                                  trade.type === 'BUY' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                }`}>
                                  {trade.type === 'BUY' ? 'COMPRA' : 'VENTA (CORTO)'}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-400 flex items-center gap-1.5 truncate font-mono">
                                <span>{shares.toFixed(4)} tokens</span>
                                <span>•</span>
                                <span>Entrada: {formatCurrency(entryPrice)}</span>
                                <span>•</span>
                                <span>Ahora: {formatCurrency(currentPrice)}</span>
                              </div>
                            </div>
                          </div>

                          {/* Live P&L Display Card & Close Button */}
                          <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/80 shrink-0">
                            <div className="text-left sm:text-right">
                              <div className="text-[9px] text-slate-400 font-sans uppercase font-bold">Resultado en Vivo</div>
                              <div className={`text-sm sm:text-base font-black font-mono flex items-center gap-1 sm:justify-end ${
                                isProfitable ? 'text-emerald-400' : 'text-rose-400'
                              }`}>
                                {isProfitable ? <ArrowUpRight className="h-3.5 w-3.5 shrink-0" /> : <ArrowDownRight className="h-3.5 w-3.5 shrink-0" />}
                                <span>{isProfitable ? '+' : ''}{pnlEur.toFixed(2)} €</span>
                                <span className="text-[11px] font-bold">({isProfitable ? '+' : ''}{pnlPct.toFixed(2)}%)</span>
                              </div>
                            </div>

                            {/* Close Trade Action */}
                            <button
                              onClick={() => onCloseTrade(trade.id)}
                              className={`rounded-lg border px-3 py-1.5 text-xs font-black transition flex items-center gap-1 shadow-sm shrink-0 cursor-pointer ${
                                isProfitable 
                                  ? 'border-emerald-500/50 bg-emerald-500/20 hover:bg-emerald-500 hover:text-slate-950 text-emerald-300'
                                  : 'border-rose-500/50 bg-rose-500/20 hover:bg-rose-500 hover:text-white text-rose-300'
                              }`}
                              title="Cerrar posición y consolidar P&L"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>{isProfitable ? 'Cerrar con Ganancia' : 'Cerrar Posición'}</span>
                            </button>
                          </div>
                        </div>

                        {/* Trade Parameters Strip */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px] font-mono pt-2 border-t border-slate-800/60 bg-slate-950/40 p-2 rounded-lg">
                          <div>
                            <span className="text-[9px] text-slate-400 block font-sans">Capital Invertido</span>
                            <strong className="text-slate-200">{invested.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</strong>
                          </div>

                          <div>
                            <span className="text-[9px] text-slate-400 block font-sans">Precio Entrada</span>
                            <strong className="text-slate-200">{formatCurrency(entryPrice)}</strong>
                          </div>

                          <div>
                            <span className="text-[9px] text-slate-400 block font-sans">Precio Mercado</span>
                            <strong className={isProfitable ? 'text-emerald-300' : 'text-rose-300'}>
                              {formatCurrency(currentPrice)}
                            </strong>
                          </div>

                          <div>
                            <span className="text-[9px] text-slate-400 block font-sans">Valor Posición</span>
                            <strong className="text-white">{currentPositionValueEur.toFixed(2)} €</strong>
                          </div>
                        </div>

                        {/* Targets Strip (TP / SL monitoring) */}
                        {(tpPrice || slPrice) && (
                          <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono bg-slate-900/60 p-1.5 rounded-lg border border-slate-800/50">
                            {tpPrice && (
                              <div className="flex items-center gap-1 text-emerald-400">
                                <Target className="h-3 w-3" />
                                <span>TP: {formatCurrency(tpPrice)} ({tpPct ? `+${tpPct.toFixed(1)}%` : ''})</span>
                                {tpReached && <span className="font-black bg-emerald-500/20 px-1 rounded">¡Alcanzado!</span>}
                              </div>
                            )}
                            {slPrice && (
                              <div className="flex items-center gap-1 text-rose-400">
                                <ShieldAlert className="h-3 w-3" />
                                <span>SL: {formatCurrency(slPrice)} ({slPct ? `-${slPct.toFixed(1)}%` : ''})</span>
                                {slReached && <span className="font-black bg-rose-500/20 px-1 rounded">¡Tocado!</span>}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: HISTORIAL DE OPERACIONES CERRADAS */}
          {activeTab === 'closed_history' && (
            <div className="space-y-3 animate-in fade-in duration-200 max-w-full">
              {closedTrades.length === 0 ? (
                <div className="p-8 sm:p-12 text-center text-slate-400 rounded-2xl border border-slate-800 bg-slate-950/40">
                  <Clock className="h-8 w-8 text-slate-500 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-300">Aún no has cerrado ninguna operación.</p>
                  <p className="text-xs text-slate-500 mt-1">Al cerrar una posición abierta, quedará archivada aquí con su balance consolidado y estadísticas.</p>
                </div>
              ) : (
                <div className="space-y-3 max-w-full">
                  {/* Closed Performance Analytics Ribbon */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <div>
                      <div className="text-[10px] text-slate-400 font-sans">Total Cerradas</div>
                      <div className="text-sm font-black text-white mt-0.5">{portfolioSummary.closedCount} operaciones</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-sans">Tasa de Acierto (Win Rate)</div>
                      <div className="text-sm font-black text-emerald-400 mt-0.5">{portfolioSummary.winRatePct}%</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-sans">Beneficio Neto Consolidado</div>
                      <div className={`text-sm font-black mt-0.5 ${portfolioSummary.totalRealizedPnlEur >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {portfolioSummary.totalRealizedPnlEur >= 0 ? '+' : ''}{portfolioSummary.totalRealizedPnlEur.toFixed(2)} €
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-sans">Mejor Operación</div>
                      <div className="text-sm font-black text-emerald-300 mt-0.5">
                        +{portfolioSummary.bestTradeEur.toFixed(2)} €
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400 px-0.5">
                    <span>Historial detallado</span>
                    <span>Total: {closedTrades.length}</span>
                  </div>

                  {closedTrades.map((trade) => {
                    const isProfit = (trade.realizedPnlEur || 0) >= 0;
                    return (
                      <div
                        key={trade.id}
                        className="rounded-xl border border-slate-800 bg-slate-950/80 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs max-w-full"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img 
                            src={getCryptoLogoUrl(trade.symbol)} 
                            alt={trade.name} 
                            onError={(e) => handleCryptoImageError(e, trade.symbol)}
                            referrerPolicy="no-referrer"
                            className="h-8 w-8 rounded-lg object-contain border border-slate-700 bg-slate-900 p-1 shrink-0" 
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-white font-mono text-sm">{trade.symbol.toUpperCase()}</span>
                              <span className="text-slate-300 truncate max-w-[120px]">{trade.name}</span>
                              <span className={`text-[9px] px-1 py-0.2 rounded font-mono font-bold ${
                                trade.type === 'BUY' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                              }`}>
                                {trade.type}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400 truncate font-mono">
                              Invertido: {(trade.investedEur || trade.investedAmountEur || 0).toLocaleString('es-ES')} € • Entrada: {formatCurrency(trade.entryPriceUsd || trade.entryPriceEur)} → Salida: {formatCurrency(trade.exitPriceUsd || trade.exitPriceEur || trade.entryPriceUsd || trade.entryPriceEur)}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-1.5 sm:pt-0 border-t sm:border-t-0 border-slate-800/80">
                          <div className="text-left sm:text-right font-mono">
                            <div className="text-[9px] text-slate-400">Resultado Consolidado</div>
                            <div className={`text-xs sm:text-sm font-black ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {isProfit ? '+' : ''}{(trade.realizedPnlEur || 0).toFixed(2)} € ({isProfit ? '+' : ''}{(trade.realizedPnlPct || 0).toFixed(2)}%)
                            </div>
                          </div>

                          <button
                            onClick={() => onDeleteTrade(trade.id)}
                            className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition shrink-0 cursor-pointer"
                            title="Eliminar del historial"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>

        {/* COMPACT FOOTER */}
        <div className="px-3.5 py-2.5 border-t border-slate-800 bg-slate-950 flex items-center justify-between gap-2 text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-1.5 text-[11px] truncate">
            <Info className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            <span className="truncate">Guardado automáticamente en memoria persistente de tu navegador (localStorage)</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-bold text-white hover:bg-slate-700 transition shrink-0 cursor-pointer"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
