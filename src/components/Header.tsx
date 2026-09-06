import React, { useState, useRef, useEffect } from 'react';
import { 
  TrendingUp, 
  Activity, 
  Cpu, 
  Bell, 
  Briefcase, 
  FileText, 
  HelpCircle, 
  Zap, 
  RefreshCw, 
  Search, 
  Sparkles, 
  Flame, 
  LayoutDashboard,
  BarChart3,
  Coins,
  Compass,
  ArrowUpRight,
  ArrowDownRight,
  SlidersHorizontal,
  ChevronRight,
  ChevronDown,
  Loader2,
  Wallet,
  Menu,
  X,
  Layers,
  Check,
  Cloud
} from 'lucide-react';
import { GlobalMarketData, CryptoAsset } from '../types';
import { formatCompactNumber, formatPercentage, formatCurrency } from '../utils/formatters';
import { safeFetchJson } from '../utils/api';
import { getCryptoLogoUrl, handleCryptoImageError } from '../utils/cryptoLogos';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  isExpertMode: boolean;
  setIsExpertMode: (val: boolean) => void;
  globalData: GlobalMarketData | null;
  isLoading?: boolean;
  onRefresh?: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  alertsCount?: number;
  activeAlertsCount?: number;
  openEducationModal?: () => void;
  assets?: CryptoAsset[];
  onOpenMasterDiagnostic?: (asset: CryptoAsset) => void;
  onOpenBrokerModal?: () => void;
  openTradesCount?: number;
  brokerPnlEur?: number;
  onOpenAlpacaModal?: () => void;
  onOpenCloudSyncModal?: () => void;
}

export const NAV_ITEMS = [
  { 
    id: 'home', 
    label: 'Inicio / Hub', 
    shortLabel: 'Inicio',
    icon: LayoutDashboard, 
    desc: 'Panel general y accesos directos',
    color: 'text-emerald-400' 
  },
  { 
    id: 'quant_bot', 
    label: 'Bot Autónomo Quant', 
    shortLabel: 'Bot 24/7',
    icon: Cpu, 
    badge: '24/7 EN VIVO', 
    badgeColor: 'bg-emerald-500/30 text-emerald-300 border-emerald-500/50', 
    desc: 'Trading autónomo 50€/100€ con TP & SL',
    color: 'text-emerald-400', 
    pulse: true 
  },
  { 
    id: 'scalping_bot', 
    label: 'Bot Scalping Pro (1M/5M)', 
    shortLabel: 'Bot Scalping',
    icon: Zap, 
    badge: 'SCALPING PRO', 
    badgeColor: 'bg-amber-500/30 text-amber-300 border-amber-500/50', 
    desc: 'Scalping 1.000€ en tiempo real con velas, EMAs y VWAP',
    color: 'text-amber-400', 
    pulse: true 
  },
  { 
    id: 'crypto_of_the_day', 
    label: 'Cripto del Día', 
    shortLabel: 'Cripto del Día',
    icon: Flame, 
    badge: 'Señal Top', 
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', 
    desc: 'Setup diario con ignición de volumen',
    color: 'text-emerald-400', 
    pulse: true 
  },
  { 
    id: 'opportunities', 
    label: 'Oportunidades Alpha', 
    shortLabel: 'Oportunidades',
    icon: Sparkles, 
    desc: 'Screener multi-factor y Alpha Score',
    color: 'text-teal-400' 
  },
  { 
    id: 'multi_timeframe', 
    label: 'Escáner Multi-Temporal', 
    shortLabel: 'Multi-Temporal',
    icon: Compass, 
    desc: 'Confluencia 15m, 1h, 4h, 1D y 1W',
    color: 'text-teal-300' 
  },
  { 
    id: 'institutional_flow', 
    label: 'Flujo On-Chain & Ballenas', 
    shortLabel: 'Ballenas',
    icon: Activity, 
    desc: 'Movimientos de billeteras institucionales',
    color: 'text-indigo-400' 
  },
  { 
    id: 'backtesting', 
    label: 'Backtesting Real', 
    shortLabel: 'Backtesting',
    icon: BarChart3, 
    desc: 'Simulación histórica con slippage y comisiones',
    color: 'text-emerald-300' 
  },
  { 
    id: 'ai_predictions', 
    label: 'IA Predictiva Gemini', 
    shortLabel: 'IA Gemini',
    icon: Cpu, 
    desc: 'Proyecciones y análisis neuronal',
    color: 'text-teal-400' 
  },
  { 
    id: 'alerts', 
    label: 'Alertas Volumen & Volatilidad', 
    shortLabel: 'Alertas',
    icon: Bell, 
    badgeType: 'alerts',
    desc: 'Disparadores automáticos de mercado',
    color: 'text-amber-400' 
  },
  { 
    id: 'portfolio', 
    label: 'Wallets Web3 & Exchanges', 
    shortLabel: 'Cartera',
    icon: Wallet, 
    desc: 'Sincronización y tracking de activos',
    color: 'text-cyan-400' 
  },
  { 
    id: 'reports', 
    label: 'Estudios & Informes PDF', 
    shortLabel: 'Informes',
    icon: FileText, 
    desc: 'Descarga de análisis e historial en PDF/Excel',
    color: 'text-fuchsia-400' 
  },
];

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  isExpertMode,
  setIsExpertMode,
  globalData,
  isLoading = false,
  onRefresh = () => {},
  searchQuery,
  setSearchQuery,
  alertsCount = 0,
  activeAlertsCount = 0,
  openEducationModal = () => {},
  assets = [],
  onOpenMasterDiagnostic,
  onOpenBrokerModal,
  openTradesCount = 0,
  brokerPnlEur = 0,
  onOpenAlpacaModal,
  onOpenCloudSyncModal,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [isSearchingOnline, setIsSearchingOnline] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        // keep open if clicked inside
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getFngColor = (val: number) => {
    if (val <= 25) return 'text-rose-400 bg-rose-950/40 border-rose-800/50';
    if (val <= 45) return 'text-amber-400 bg-amber-950/40 border-amber-800/50';
    if (val <= 55) return 'text-slate-300 bg-slate-800/40 border-slate-700/50';
    if (val <= 75) return 'text-emerald-400 bg-emerald-950/40 border-emerald-800/50';
    return 'text-cyan-400 bg-cyan-950/40 border-cyan-800/50';
  };

  const fngVal = globalData?.fearAndGreedIndex?.value || globalData?.fearGreedIndex?.value || 74;
  const effectiveAlerts = alertsCount || activeAlertsCount;

  // Filter assets based on query
  const queryTrimmed = searchQuery.trim().toLowerCase();
  const matchedAssets = queryTrimmed
    ? assets.filter(
        (a) =>
          a.symbol.toLowerCase().includes(queryTrimmed) ||
          a.name.toLowerCase().includes(queryTrimmed) ||
          (a.sector && a.sector.toLowerCase().includes(queryTrimmed)) ||
          (a.category && a.category.toLowerCase().includes(queryTrimmed))
      ).slice(0, 6)
    : [];

  // Popular Quick Crypto Tickers for 1-click diagnostic
  const popularTickers = ['BTC', 'ETH', 'SOL', 'SUI', 'TAO', 'XRP', 'DOGE', 'RENDER', 'AAVE', 'PEPE', 'PENDLE', 'LINK'];

  // Handle direct crypto analysis launch
  const handleLaunchAnalysis = async (tickerOrAsset: string | CryptoAsset) => {
    setIsDropdownOpen(false);
    setSearchError(null);

    if (typeof tickerOrAsset === 'object') {
      if (onOpenMasterDiagnostic) {
        onOpenMasterDiagnostic(tickerOrAsset);
      }
      return;
    }

    const symbolClean = tickerOrAsset.trim().toUpperCase().replace('USDT', '').replace('USD', '');
    if (!symbolClean) return;

    // 1. Look in local assets list
    const found = assets.find((a) => a.symbol.toUpperCase() === symbolClean || a.id.toUpperCase() === symbolClean);
    if (found) {
      if (onOpenMasterDiagnostic) {
        onOpenMasterDiagnostic(found);
      }
      return;
    }

    // 2. Fetch live data dynamically from backend for any custom cryptocurrency
    setIsSearchingOnline(true);
    try {
      const res = await safeFetchJson<CryptoAsset>(`/api/crypto/asset?symbol=${encodeURIComponent(symbolClean)}`);
      if (res.ok && res.data) {
        const fetchedAsset: CryptoAsset = res.data;
        if (onOpenMasterDiagnostic) {
          onOpenMasterDiagnostic(fetchedAsset);
        }
      } else {
        setSearchError(`No se encontró la cotización para "${symbolClean}". Verifica el símbolo.`);
      }
    } catch (e) {
      setSearchError(`Error al consultar "${symbolClean}". Inténtalo nuevamente.`);
    } finally {
      setIsSearchingOnline(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (matchedAssets.length > 0) {
        handleLaunchAnalysis(matchedAssets[0]);
      } else if (searchQuery.trim()) {
        handleLaunchAnalysis(searchQuery.trim());
      }
    }
  };

  const activeItem = NAV_ITEMS.find((item) => item.id === activeTab) || NAV_ITEMS[0];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/95 backdrop-blur-md overflow-x-hidden">
      {/* 1. TOP GLOBAL CRYPTO MARKET TICKER BAR */}
      <div className="w-full border-b border-slate-800/50 bg-slate-900/70 px-2.5 sm:px-4 py-1 text-[11px] sm:text-xs text-slate-300">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-1.5 sm:gap-2">
          {/* Market items */}
          <div className="flex items-center gap-2 sm:gap-4 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
            {/* Bitcoin BTC */}
            <div className="flex items-center gap-1 shrink-0">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-semibold text-slate-400 text-[10px] sm:text-xs">BTC:</span>
              <span className="font-bold text-slate-100 text-[11px] sm:text-xs">
                {globalData?.btcPrice ? `$${globalData.btcPrice.toLocaleString()}` : '$88,450.00'}
              </span>
              <span className="font-bold text-emerald-400 text-[10px] sm:text-xs">
                +{globalData?.btcChangePct || 3.14}%
              </span>
            </div>

            {/* Ethereum ETH (Hidden on very small screens) */}
            <div className="hidden sm:flex items-center gap-1 border-l border-slate-700/60 pl-2.5 shrink-0">
              <span className="text-slate-400 text-xs">ETH:</span>
              <span className="font-bold text-slate-100 text-xs">
                {globalData?.ethPrice ? `$${globalData.ethPrice.toLocaleString()}` : '$2,580.40'}
              </span>
              <span className="font-semibold text-emerald-400 text-xs">
                +{globalData?.ethChangePct || 4.25}%
              </span>
            </div>

            {/* Solana SOL */}
            <div className="hidden md:flex items-center gap-1 border-l border-slate-700/60 pl-2.5 shrink-0">
              <span className="text-slate-400 text-xs">SOL:</span>
              <span className="font-bold text-slate-100 text-xs">
                {globalData?.solPrice ? `$${globalData.solPrice.toLocaleString()}` : '$158.80'}
              </span>
              <span className="font-semibold text-emerald-400 text-xs">
                +{globalData?.solChangePct || 6.10}%
              </span>
            </div>

            {/* Total Cap */}
            <div className="hidden lg:flex items-center gap-1 border-l border-slate-700/60 pl-2.5 shrink-0">
              <span className="text-slate-400">Cap. Total:</span>
              <span className="font-medium text-slate-200">
                {globalData ? formatCompactNumber(globalData.totalMarketCapUsd) : '$3.15T'}
              </span>
            </div>
          </div>

          {/* Right: Fear & Greed + Refresh Button */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 sm:px-2 py-0.2 text-[9px] sm:text-xs font-semibold ${getFngColor(fngVal)}`}>
              <Zap className="h-2.5 w-2.5 shrink-0" />
              <span className="truncate">{globalData?.fearAndGreedIndex?.classification || 'Codicia'}</span> • {fngVal}
            </span>

            <button
              id="refresh-crypto-data-btn"
              onClick={onRefresh}
              disabled={isLoading}
              title="Actualizar datos cripto en tiempo real"
              className="flex items-center gap-1 rounded border border-slate-700 bg-slate-800/80 p-1 sm:px-1.5 sm:py-0.5 text-slate-300 hover:bg-slate-700 hover:text-white transition disabled:opacity-50 text-[10px] sm:text-xs cursor-pointer shrink-0"
            >
              <RefreshCw className={`h-2.5 w-2.5 sm:h-3 sm:w-3 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
              <span className="hidden sm:inline">24/7</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. MAIN BRAND & ACTION HEADER BAR */}
      <div className="mx-auto flex max-w-7xl items-center justify-between px-2 sm:px-4 py-1.5 sm:py-2 gap-1.5 sm:gap-2">
        {/* Brand & Logo */}
        <div 
          onClick={() => setActiveTab('home')}
          className="flex items-center gap-1.5 sm:gap-2 cursor-pointer group shrink-0 min-w-0"
          title="Ir a la Página Principal"
        >
          <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-700 shadow-md shadow-emerald-500/20 text-white font-black shrink-0 group-hover:scale-105 transition">
            <Coins className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div className="flex items-center gap-1 min-w-0">
            <h1 className="text-xs sm:text-base font-bold tracking-tight text-white flex items-center gap-1 group-hover:text-emerald-300 transition whitespace-nowrap">
              <span>CryptoAlpha</span>
              <span className="hidden min-[420px]:inline-block rounded bg-emerald-500/20 border border-emerald-500/30 px-1 py-0.2 text-[8px] sm:text-[9px] font-bold text-emerald-400 tracking-wider">
                AI PRO
              </span>
            </h1>
          </div>
        </div>

        {/* DESKTOP UNIVERSAL ASSET SEARCH BOX */}
        <div ref={searchContainerRef} className="hidden md:flex items-center flex-1 max-w-md lg:max-w-lg mx-3 relative">
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-emerald-400" />
            <input
              id="global-crypto-search-input-desktop"
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsDropdownOpen(true);
              }}
              onFocus={() => setIsDropdownOpen(true)}
              onKeyDown={handleKeyDown}
              placeholder="Buscar criptomoneda (BTC, ETH, SOL, SUI, TAO...)"
              className="w-full rounded-xl border border-slate-700/80 bg-slate-900/90 py-2 pl-10 pr-24 text-xs text-slate-100 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-inner"
            />
            
            <div className="absolute right-1.5 top-1.5 flex items-center gap-1">
              {searchQuery && (
                <button 
                  onClick={() => {
                    setSearchQuery('');
                    setIsDropdownOpen(false);
                  }}
                  className="text-xs text-slate-400 hover:text-white px-1.5 py-0.5 rounded cursor-pointer"
                >
                  ✕
                </button>
              )}
              <button
                onClick={() => handleLaunchAnalysis(searchQuery)}
                disabled={isSearchingOnline || !searchQuery.trim()}
                className="flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-2.5 py-1 text-[11px] font-bold text-white transition disabled:opacity-40 cursor-pointer shadow-md shadow-emerald-600/20"
              >
                {isSearchingOnline ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                <span>Diagnóstico</span>
              </button>
            </div>
          </div>

          {/* Autocomplete Dropdown List on Desktop */}
          {isDropdownOpen && searchQuery.trim() && (
            <div className="absolute top-full left-0 right-0 mt-1.5 rounded-2xl border border-slate-700/90 bg-slate-900 shadow-2xl p-2 z-50 max-h-96 overflow-y-auto space-y-1">
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Coincidencias en Tiempo Real</span>
                <span className="text-emerald-400">Pulsa Enter para Diagnóstico 360°</span>
              </div>

              {matchedAssets.map((asset) => (
                <div
                  key={asset.id}
                  onClick={() => handleLaunchAnalysis(asset)}
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-800/90 border border-transparent hover:border-slate-700 cursor-pointer transition"
                >
                  <div className="flex items-center gap-2.5">
                    <img 
                      src={getCryptoLogoUrl(asset.symbol)} 
                      alt={asset.name} 
                      onError={(e) => handleCryptoImageError(e, asset.symbol)}
                      referrerPolicy="no-referrer"
                      className="h-7 w-7 rounded-lg object-contain p-0.5 border border-slate-700 bg-slate-900" 
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white text-xs">{asset.symbol.toUpperCase()}</span>
                        <span className="text-[11px] text-slate-300 truncate max-w-[140px]">{asset.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-400">{asset.sector || asset.category || 'Cripto'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-xs font-bold text-white">{formatCurrency(asset.current_price)}</div>
                      <div className={`text-[10px] font-semibold ${asset.price_change_percentage_24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {formatPercentage(asset.price_change_percentage_24h)}
                      </div>
                    </div>
                    <button className="rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold px-2 py-1 flex items-center gap-1">
                      <Sparkles className="h-2.5 w-2.5" />
                      360°
                    </button>
                  </div>
                </div>
              ))}

              <div
                onClick={() => handleLaunchAnalysis(searchQuery)}
                className="mt-1 pt-1.5 border-t border-slate-800 flex items-center justify-between p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 hover:bg-emerald-900/50 cursor-pointer transition text-xs"
              >
                <div className="flex items-center gap-2 text-emerald-300">
                  <Sparkles className="h-4 w-4 text-emerald-400" />
                  <span>Diagnosticar <strong>"{searchQuery.toUpperCase()}"</strong> con todos los estudios</span>
                </div>
                <ChevronRight className="h-4 w-4 text-emerald-400" />
              </div>
            </div>
          )}
        </div>

        {/* Header Right Action Controls */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 ml-auto">
          {/* Beginner / Pro Mode Toggle */}
          <div className="flex items-center rounded-lg border border-slate-800 bg-slate-900/90 p-0.5 text-[9.5px] sm:text-xs shrink-0">
            <button
              id="mode-beginner-btn"
              onClick={() => setIsExpertMode(false)}
              className={`rounded-md px-1.5 sm:px-2 py-0.5 font-medium transition whitespace-nowrap cursor-pointer ${
                !isExpertMode 
                  ? 'bg-emerald-600 text-white shadow-sm font-bold' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="hidden sm:inline">Principiante</span>
              <span className="sm:hidden">Básico</span>
            </button>
            <button
              id="mode-expert-btn"
              onClick={() => setIsExpertMode(true)}
              className={`rounded-md px-1.5 sm:px-2 py-0.5 font-medium transition whitespace-nowrap cursor-pointer ${
                isExpertMode 
                  ? 'bg-indigo-600 text-white shadow-sm font-bold' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Pro
            </button>
          </div>

          {/* Autonomous Quant Bot Quick Button */}
          <button
            id="header-open-quant-bot-btn"
            onClick={() => setActiveTab('quant_bot')}
            className={`flex items-center gap-1 sm:gap-1.5 rounded-lg border px-1.5 sm:px-2 py-1 transition text-[10px] sm:text-xs font-black shadow-sm cursor-pointer shrink-0 ${
              activeTab === 'quant_bot'
                ? 'border-emerald-400 bg-emerald-500 text-slate-950 shadow-emerald-500/20'
                : 'border-emerald-500/60 bg-emerald-950/70 text-emerald-300 hover:bg-emerald-500 hover:text-slate-950'
            }`}
            title="Abrir Bot de Trading Autónomo Cuantitativo 24/7"
          >
            <Cpu className="h-3 w-3 sm:h-3.5 sm:w-3.5 animate-pulse text-emerald-400" />
            <span>Bot</span>
            <span className="hidden sm:inline-block rounded-full bg-emerald-400/20 border border-emerald-400/40 text-[9px] px-1 py-0.2 font-mono text-emerald-300">
              24/7
            </span>
          </button>

          {/* Desktop Simulator Trading Button */}
          {onOpenBrokerModal && (
            <button
              id="header-open-broker-sim-btn"
              onClick={onOpenBrokerModal}
              className="hidden sm:flex items-center gap-1.5 rounded-lg border border-emerald-500/50 bg-emerald-950/60 hover:bg-emerald-500 hover:text-slate-950 px-2 py-1 text-emerald-300 transition text-xs font-black shadow-sm cursor-pointer shrink-0"
              title="Abrir Simulador de Trading Cripto"
            >
              <Briefcase className="h-3.5 w-3.5 text-emerald-400" />
              <span className="hidden md:inline">Simulador</span>
              {openTradesCount > 0 && (
                <span className="rounded-full bg-emerald-500 text-slate-950 px-1.5 py-0.2 text-[9px] font-black">
                  {openTradesCount}
                </span>
              )}
            </button>
          )}

          {/* Alpaca Paper Trading Live Activity Summary Button */}
          {onOpenAlpacaModal && (
            <button
              id="header-open-alpaca-modal-btn"
              onClick={onOpenAlpacaModal}
              className="flex items-center gap-1 sm:gap-1.5 rounded-lg sm:rounded-xl border border-amber-500/60 bg-gradient-to-r from-amber-950/70 via-slate-900 to-amber-950/70 hover:from-amber-500 hover:to-amber-600 hover:text-slate-950 px-2 sm:px-3 py-1 sm:py-1.5 text-amber-300 transition-all text-[11px] sm:text-xs font-black shadow-md cursor-pointer shrink-0 group"
              title="Resumen comentado de la actividad de Alpaca en tiempo real ($100.000 USD)"
            >
              <span className="text-xs sm:text-sm group-hover:scale-125 transition-transform shrink-0">🦙</span>
              <span className="tracking-tight whitespace-nowrap">
                <span className="hidden sm:inline">Actividad </span>Alpaca
              </span>
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
              <span className="hidden md:inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-[9px] px-1.5 py-0.2 font-mono text-emerald-300">
                EN VIVO
              </span>
            </button>
          )}

          {/* Cloud Multi-Device Sync Indicator Button (Desktop / Tablet) */}
          {onOpenCloudSyncModal && (
            <button
              id="header-cloud-sync-btn"
              onClick={onOpenCloudSyncModal}
              className="hidden sm:flex items-center gap-1.5 rounded-xl border border-emerald-500/50 bg-slate-900/90 hover:bg-emerald-500/20 px-2 sm:px-2.5 py-1 sm:py-1.5 text-emerald-300 transition text-xs font-bold shadow-sm cursor-pointer shrink-0 group"
              title="Sincronización multi-dispositivo en tiempo real con Firebase Firestore"
            >
              <Cloud className="w-3.5 h-3.5 text-emerald-400 group-hover:animate-pulse" />
              <span className="hidden lg:inline">Nube 24/7</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            </button>
          )}

          {/* Mobile All-Sections Menu Button */}
          <button
            id="mobile-sections-menu-btn"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={`flex md:hidden items-center gap-1 rounded-lg border px-1.5 sm:px-2 py-1 text-[11px] font-bold transition cursor-pointer shrink-0 ${
              isMobileMenuOpen
                ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                : 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800'
            }`}
            title="Ver todas las secciones del menú"
          >
            {isMobileMenuOpen ? <X className="h-3.5 w-3.5" /> : <Menu className="h-3.5 w-3.5 text-emerald-400" />}
            <span className="hidden min-[380px]:inline">Menú</span>
          </button>

          {/* Educational Guide Button */}
          <button
            id="open-education-guide-btn"
            onClick={openEducationModal}
            className="hidden sm:flex items-center justify-center rounded-lg border border-slate-700/80 bg-slate-900/80 p-1 sm:p-1.5 text-slate-300 hover:bg-slate-800 hover:text-white transition shrink-0 cursor-pointer"
            title="Guía de Indicadores Cripto"
          >
            <HelpCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-400" />
          </button>
        </div>
      </div>

      {/* 3. MOBILE HIGH-IMPACT SEARCH & DIAGNOSTIC BOX */}
      <div className="block md:hidden px-2.5 pb-1.5 pt-0.5">
        <div className="relative w-full" ref={searchContainerRef}>
          <div className="relative flex items-center">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-emerald-400" />
            <input
              id="mobile-global-crypto-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsDropdownOpen(true);
              }}
              onFocus={() => setIsDropdownOpen(true)}
              onKeyDown={handleKeyDown}
              placeholder="Buscar criptomoneda (BTC, ETH, SOL, SUI...)"
              className="w-full rounded-lg border border-emerald-500/40 bg-slate-900 py-1.5 pl-8 pr-20 text-[11px] text-white placeholder-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400 shadow-sm"
            />
            
            <div className="absolute right-1 top-1 flex items-center gap-1">
              {searchQuery && (
                <button 
                  onClick={() => {
                    setSearchQuery('');
                    setIsDropdownOpen(false);
                  }}
                  className="text-[10px] text-slate-400 hover:text-white px-1 cursor-pointer"
                >
                  ✕
                </button>
              )}
              <button
                onClick={() => handleLaunchAnalysis(searchQuery)}
                disabled={isSearchingOnline || !searchQuery.trim()}
                className="flex items-center gap-1 rounded-md bg-gradient-to-r from-emerald-600 to-teal-600 px-2 py-0.5 text-[10px] font-bold text-white transition disabled:opacity-40 cursor-pointer shadow-sm"
              >
                {isSearchingOnline ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Sparkles className="h-2.5 w-2.5" />}
                <span>Analizar</span>
              </button>
            </div>
          </div>

          {/* Quick Popular Ticker Chips on Mobile with Non-Breaking Container */}
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pt-1 text-[10px] w-full">
            <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider shrink-0 flex items-center gap-0.5">
              <Sparkles className="h-2.5 w-2.5 text-emerald-400" />
              TOP:
            </span>
            {popularTickers.map((ticker) => {
              const matched = assets.find((a) => a.symbol.toUpperCase() === ticker);
              return (
                <button
                  key={ticker}
                  onClick={() => handleLaunchAnalysis(matched || ticker)}
                  className="shrink-0 rounded border border-slate-700/80 bg-slate-900/90 px-1.5 py-0.2 font-bold text-slate-200 hover:border-emerald-500 hover:bg-emerald-950/40 hover:text-emerald-300 transition text-[10px] cursor-pointer"
                >
                  {ticker}
                </button>
              );
            })}
          </div>

          {/* Autocomplete Dropdown List on Mobile */}
          {isDropdownOpen && searchQuery.trim() && (
            <div className="absolute top-full left-0 right-0 mt-1.5 rounded-2xl border border-slate-700/90 bg-slate-900 shadow-2xl p-2 z-50 max-h-80 overflow-y-auto space-y-1">
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Resultados</span>
                <span className="text-emerald-400">Pulsa para Diagnóstico 360°</span>
              </div>

              {matchedAssets.map((asset) => (
                <div
                  key={asset.id}
                  onClick={() => handleLaunchAnalysis(asset)}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-800/90 border border-transparent hover:border-slate-700 cursor-pointer transition"
                >
                  <div className="flex items-center gap-2">
                    <img 
                      src={getCryptoLogoUrl(asset.symbol)} 
                      alt={asset.name} 
                      onError={(e) => handleCryptoImageError(e, asset.symbol)}
                      referrerPolicy="no-referrer"
                      className="h-6 w-6 rounded-lg object-contain p-0.5 border border-slate-700 bg-slate-900" 
                    />
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-white text-xs">{asset.symbol.toUpperCase()}</span>
                        <span className="text-[10px] text-slate-300 truncate max-w-[110px]">{asset.name}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <div className="text-xs font-bold text-white">{formatCurrency(asset.current_price)}</div>
                      <div className={`text-[10px] font-semibold ${asset.price_change_percentage_24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {formatPercentage(asset.price_change_percentage_24h)}
                      </div>
                    </div>
                    <span className="rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold px-2 py-1">
                      360°
                    </span>
                  </div>
                </div>
              ))}

              <div
                onClick={() => handleLaunchAnalysis(searchQuery)}
                className="mt-1 pt-1 border-t border-slate-800 flex items-center justify-between p-2 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-300 cursor-pointer"
              >
                <span>⚡ Diagnosticar <strong>"{searchQuery.toUpperCase()}"</strong></span>
                <ChevronRight className="h-3.5 w-3.5 text-emerald-400" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. RESPONSIVE NAVIGATION TABS (DESKTOP & MOBILE SCROLLABLE BAR) */}
      <div className="w-full border-t border-slate-800/60 bg-slate-950/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-2.5 sm:px-4">
          <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto scrollbar-none py-1 w-full mask-linear-gradient">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id || (item.id === 'crypto_of_the_day' && activeTab === 'stock_of_the_day') || (item.id === 'ai_predictions' && activeTab === 'ai');
              
              let itemBadge = null;
              if (item.badge) {
                itemBadge = (
                  <span className={`rounded px-1.5 py-0.2 text-[8px] sm:text-[9px] font-black uppercase font-mono border shrink-0 ${item.badgeColor || 'bg-emerald-500/30 text-emerald-300 border-emerald-500/50'}`}>
                    {item.badge}
                  </span>
                );
              } else if (item.badgeType === 'alerts' && effectiveAlerts > 0) {
                itemBadge = (
                  <span className="rounded-full bg-amber-500/20 border border-amber-500/40 px-1.5 py-0.2 text-[9px] font-bold text-amber-300 shrink-0">
                    {effectiveAlerts}
                  </span>
                );
              }

              return (
                <button
                  key={item.id}
                  id={`nav-tab-${item.id}`}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`flex items-center gap-1.5 sm:gap-2 whitespace-nowrap px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-bold transition rounded-xl cursor-pointer shrink-0 ${
                    isActive
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm font-black'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent'
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${item.pulse ? 'animate-pulse' : ''} ${isActive ? 'text-emerald-400' : item.color}`} />
                  <span>{item.label}</span>
                  {itemBadge}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* 5. EXPANDABLE MOBILE MENU DRAWER / MODAL (SOLVES "GOING TO THE RIGHT" COMPLETELY) */}
      {isMobileMenuOpen && (
        <div 
          ref={mobileMenuRef}
          className="block md:hidden border-t border-slate-800 bg-slate-950/98 p-3 shadow-2xl animate-in slide-in-from-top duration-200 max-h-[80vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-emerald-400" />
              <span className="text-xs font-black uppercase tracking-wider text-slate-200">
                Todas las Secciones del Menú (11)
              </span>
            </div>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-1 rounded-lg bg-slate-900 text-slate-400 hover:text-white text-xs flex items-center gap-1"
            >
              <X className="h-3.5 w-3.5" />
              <span>Cerrar</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id || (item.id === 'crypto_of_the_day' && activeTab === 'stock_of_the_day') || (item.id === 'ai_predictions' && activeTab === 'ai');

              return (
                <div
                  key={`drawer-${item.id}`}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`flex items-start gap-3 p-2.5 rounded-xl border transition cursor-pointer ${
                    isActive
                      ? 'bg-emerald-950/70 border-emerald-500 text-white shadow-lg'
                      : 'bg-slate-900/90 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className={`p-2 rounded-lg bg-slate-950 border border-slate-800 shrink-0 ${item.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className={`text-xs font-bold truncate ${isActive ? 'text-emerald-300' : 'text-white'}`}>
                        {item.label}
                      </span>
                      {isActive && <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />}
                    </div>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">
                      {item.desc}
                    </p>
                    {item.badge && (
                      <span className={`inline-block mt-1 rounded px-1.5 py-0.2 text-[8px] font-black uppercase font-mono border ${item.badgeColor || 'bg-emerald-500/30 text-emerald-300 border-emerald-500/50'}`}>
                        {item.badge}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Actions at bottom of mobile menu */}
          <div className="mt-3 pt-3 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            {onOpenBrokerModal && (
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onOpenBrokerModal();
                }}
                className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 font-bold"
              >
                <Briefcase className="h-3.5 w-3.5" />
                <span>Simulador</span>
              </button>
            )}
            {onOpenAlpacaModal && (
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onOpenAlpacaModal();
                }}
                className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-amber-600/20 border border-amber-500/40 text-amber-300 font-bold"
              >
                <span>🦙</span>
                <span>Alpaca En Vivo</span>
              </button>
            )}
            {onOpenCloudSyncModal && (
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onOpenCloudSyncModal();
                }}
                className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 font-bold"
              >
                <Cloud className="h-3.5 w-3.5 text-emerald-400" />
                <span>Nube 24/7 Sync</span>
              </button>
            )}
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                openEducationModal();
              }}
              className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 font-bold"
            >
              <HelpCircle className="h-3.5 w-3.5 text-emerald-400" />
              <span>Guía Cripto</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
