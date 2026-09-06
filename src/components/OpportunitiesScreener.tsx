import React, { useState, useMemo } from 'react';
import { 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  Flame, 
  Zap, 
  Filter, 
  Activity, 
  Cpu, 
  Bell, 
  Info,
  ArrowUpDown,
  Layers,
  BarChart3,
  Search,
  Building,
  Target,
  Briefcase,
  Coins
} from 'lucide-react';
import { CryptoAsset } from '../types';
import { formatCurrency, formatPercentage, formatCompactNumber } from '../utils/formatters';
import { getCryptoLogoUrl, handleCryptoImageError } from '../utils/cryptoLogos';

interface OpportunitiesScreenerProps {
  assets: CryptoAsset[];
  isLoading: boolean;
  onSelectAssetForAnalysis: (asset: CryptoAsset) => void;
  onSelectAssetForChart: (asset: CryptoAsset) => void;
  onCreateAlertForAsset: (asset: CryptoAsset) => void;
  onOpenBrokerModal?: (asset: CryptoAsset) => void;
  onOpenMasterDiagnostic?: (asset: CryptoAsset) => void;
  isExpertMode: boolean;
  searchQuery: string;
}

export const OpportunitiesScreener: React.FC<OpportunitiesScreenerProps> = ({
  assets,
  isLoading,
  onSelectAssetForAnalysis,
  onSelectAssetForChart,
  onCreateAlertForAsset,
  onOpenBrokerModal,
  onOpenMasterDiagnostic,
  isExpertMode,
  searchQuery,
}) => {
  const [selectedSector, setSelectedSector] = useState<string>('all');
  const [minAlphaScore, setMinAlphaScore] = useState<number>(0);
  const [selectedSignalFilter, setSelectedSignalFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'alphaScore' | 'volume' | 'change24h' | 'market_cap' | 'tvl' | 'mvrv'>('alphaScore');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Sector categories mapping for Cryptocurrency markets
  const sectorsList = [
    { id: 'all', label: 'Todos los Ecosistemas' },
    { id: 'l1', label: 'Layer 1 & Infra' },
    { id: 'l2', label: 'Layer 2 & Rollups' },
    { id: 'defi', label: 'DeFi & Yield' },
    { id: 'ai', label: 'IA & DePIN' },
    { id: 'rwa', label: 'RWA & Institucional' },
    { id: 'meme', label: 'Memecoins & High Beta' },
    { id: 'oracles', label: 'Oráculos & Smart Contracts' },
  ];

  const sectorKeywords: Record<string, string[]> = {
    l1: ['btc', 'eth', 'sol', 'sui', 'apt', 'avax', 'near', 'sei', 'ada', 'dot', 'ton', 'bnb'],
    l2: ['arb', 'op', 'matic', 'pol', 'strk', 'zk', 'manta', 'blast'],
    defi: ['aave', 'uni', 'pendle', 'mkr', 'crv', 'snx', 'ldo', 'ena', 'jup', 'ray'],
    ai: ['tao', 'render', 'fet', 'akt', 'grt', 'io', 'arkm', 'near'],
    rwa: ['ondo', 'mkr', 'link', 'cfg', 'polyx'],
    meme: ['doge', 'shib', 'pepe', 'wif', 'bonk', 'floki', 'bome', 'popcat'],
    oracles: ['link', 'pyth', 'api3', 'band'],
  };

  // Top highlight cards computations
  const topConfluence = useMemo(() => {
    return [...assets].sort((a, b) => (b.alphaScore || 0) - (a.alphaScore || 0))[0];
  }, [assets]);

  const topVolumeBreakout = useMemo(() => {
    return [...assets].sort((a, b) => (b.volumeAnomalyRatio || 0) - (a.volumeAnomalyRatio || 0))[0];
  }, [assets]);

  const topOversoldDip = useMemo(() => {
    const oversoldList = assets.filter((a) => (a.rsi14 || 50) < 40);
    return oversoldList.sort((a, b) => (a.rsi14 || 50) - (b.rsi14 || 50))[0] || assets[0];
  }, [assets]);

  const topMomentum = useMemo(() => {
    return [...assets].sort((a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h)[0];
  }, [assets]);

  // Filtered & Sorted Assets
  const filteredAssets = useMemo(() => {
    return assets
      .filter((asset) => {
        // 1. Text Search Filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchName = asset.name.toLowerCase().includes(q);
          const matchSymbol = asset.symbol.toLowerCase().includes(q);
          const matchSector = (asset.sector || asset.category || '').toLowerCase().includes(q);
          if (!matchName && !matchSymbol && !matchSector) return false;
        }

        // 2. Sector Filter
        if (selectedSector !== 'all') {
          const list = sectorKeywords[selectedSector] || [];
          const symbolMatch = list.includes(asset.symbol.toLowerCase());
          const categoryMatch = (asset.category || asset.sector || '').toLowerCase().includes(selectedSector);
          if (!symbolMatch && !categoryMatch) return false;
        }

        // 3. Min Alpha Score
        if ((asset.alphaScore || 0) < minAlphaScore) return false;

        // 4. Signal Filter
        if (selectedSignalFilter !== 'all') {
          if (selectedSignalFilter === 'strong_buy' && asset.trendSignal !== 'strong_buy') return false;
          if (selectedSignalFilter === 'buy' && !['strong_buy', 'buy'].includes(asset.trendSignal || '')) return false;
          if (selectedSignalFilter === 'oversold' && (asset.rsi14 || 50) >= 40) return false;
          if (selectedSignalFilter === 'volume_spike' && (asset.volumeAnomalyRatio || 0) < 1.4) return false;
        }

        return true;
      })
      .sort((a, b) => {
        let valA = 0;
        let valB = 0;

        if (sortBy === 'alphaScore') {
          valA = a.alphaScore || 0;
          valB = b.alphaScore || 0;
        } else if (sortBy === 'volume') {
          valA = a.total_volume || 0;
          valB = b.total_volume || 0;
        } else if (sortBy === 'change24h') {
          valA = a.price_change_percentage_24h || 0;
          valB = b.price_change_percentage_24h || 0;
        } else if (sortBy === 'market_cap') {
          valA = a.market_cap || 0;
          valB = b.market_cap || 0;
        } else if (sortBy === 'tvl') {
          valA = a.tvl || 0;
          valB = b.tvl || 0;
        } else if (sortBy === 'mvrv') {
          valA = a.mvrvScore || 0;
          valB = b.mvrvScore || 0;
        }

        return sortOrder === 'desc' ? valB - valA : valA - valB;
      });
  }, [assets, searchQuery, selectedSector, minAlphaScore, selectedSignalFilter, sortBy, sortOrder]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400 bg-emerald-950/50 border-emerald-500/40';
    if (score >= 65) return 'text-teal-400 bg-teal-950/50 border-teal-500/40';
    if (score >= 45) return 'text-slate-300 bg-slate-800/60 border-slate-700/60';
    if (score >= 30) return 'text-amber-400 bg-amber-950/50 border-amber-500/40';
    return 'text-rose-400 bg-rose-950/50 border-rose-500/40';
  };

  const getSignalBadge = (signal?: string) => {
    switch (signal) {
      case 'strong_buy':
        return <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-0.5 text-[11px] font-bold text-emerald-400">COMPRA FUERTE</span>;
      case 'buy':
        return <span className="rounded-full bg-teal-500/20 border border-teal-500/40 px-2.5 py-0.5 text-[11px] font-bold text-teal-400">COMPRA</span>;
      case 'sell':
        return <span className="rounded-full bg-amber-500/20 border border-amber-500/40 px-2.5 py-0.5 text-[11px] font-bold text-amber-400">VENTA</span>;
      case 'strong_sell':
        return <span className="rounded-full bg-rose-500/20 border border-rose-500/40 px-2.5 py-0.5 text-[11px] font-bold text-rose-400">VENTA FUERTE</span>;
      default:
        return <span className="rounded-full bg-slate-800 border border-slate-700 px-2.5 py-0.5 text-[11px] font-semibold text-slate-300">NEUTRAL</span>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 w-full max-w-full overflow-x-hidden min-w-0">
      {/* Top Banner Explainer */}
      {!isExpertMode && (
        <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 p-4 text-slate-200">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-emerald-500/20 p-2 text-emerald-400">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">
                ¿Cómo funciona el Escáner de Oportunidades Alpha en Criptomonedas?
              </h3>
              <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                Este panel evalúa en tiempo real los principales criptoactivos combinando análisis técnico (RSI, EMA 20/50/200, Bollinger Bands), métricas On-Chain (MVRV Z-Score, TVL, Funding Rates de Futuros) e inyecciones anormales de volumen de ballenas. Un <strong>Alpha Score &gt; 75</strong> indica una oportunidad de alta probabilidad matemática.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 4 Key Highlight Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Máxima Confluencia Cripto */}
        {topConfluence && (
          <div 
            onClick={() => onSelectAssetForAnalysis(topConfluence)}
            className="cursor-pointer group rounded-2xl border border-slate-800 bg-slate-900/90 p-4 hover:border-emerald-500/50 hover:bg-slate-900 transition shadow-sm"
          >
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="flex items-center gap-1 font-semibold text-emerald-400">
                <Sparkles className="h-3.5 w-3.5" /> Mayor Alpha Score
              </span>
              <span className="rounded bg-emerald-950 border border-emerald-800/60 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400">
                {topConfluence.alphaScore} pts
              </span>
            </div>
            <div className="flex items-center gap-3">
              <img 
                src={getCryptoLogoUrl(topConfluence.symbol)} 
                alt={topConfluence.name} 
                onError={(e) => handleCryptoImageError(e, topConfluence.symbol)}
                referrerPolicy="no-referrer"
                className="h-9 w-9 rounded-xl object-contain border border-slate-700 p-1 bg-slate-950" 
              />
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-white text-sm truncate group-hover:text-emerald-300 transition">
                  {topConfluence.name}
                </h4>
                <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                  <span>{formatCurrency(topConfluence.current_price)}</span>
                  <span className="text-emerald-400 font-bold">
                    {formatPercentage(topConfluence.price_change_percentage_24h)}
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-3 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Ecosistema: {topConfluence.sector || topConfluence.category || 'Layer 1'}</span>
              <span className="text-emerald-400 font-bold">Analizar →</span>
            </div>
          </div>
        )}

        {/* Card 2: Ruptura de Volumen On-Chain */}
        {topVolumeBreakout && (
          <div 
            onClick={() => onSelectAssetForAnalysis(topVolumeBreakout)}
            className="cursor-pointer group rounded-2xl border border-slate-800 bg-slate-900/90 p-4 hover:border-teal-500/50 hover:bg-slate-900 transition shadow-sm"
          >
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="flex items-center gap-1 font-semibold text-teal-400">
                <Zap className="h-3.5 w-3.5" /> Flujo de Ballenas
              </span>
              <span className="rounded bg-teal-950 border border-teal-800/60 px-1.5 py-0.5 text-[10px] font-bold text-teal-400">
                {(topVolumeBreakout.volumeAnomalyRatio || 1).toFixed(2)}x Media
              </span>
            </div>
            <div className="flex items-center gap-3">
              <img 
                src={getCryptoLogoUrl(topVolumeBreakout.symbol)} 
                alt={topVolumeBreakout.name} 
                onError={(e) => handleCryptoImageError(e, topVolumeBreakout.symbol)}
                referrerPolicy="no-referrer"
                className="h-9 w-9 rounded-xl object-contain border border-slate-700 p-1 bg-slate-950" 
              />
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-white text-sm truncate group-hover:text-teal-300 transition">
                  {topVolumeBreakout.name}
                </h4>
                <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                  <span>{formatCurrency(topVolumeBreakout.current_price)}</span>
                  <span className="text-teal-400 font-bold">
                    {formatPercentage(topVolumeBreakout.price_change_percentage_24h)}
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-3 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Volumen 24h: {formatCompactNumber(topVolumeBreakout.total_volume)}</span>
              <span className="text-teal-400 font-bold">Analizar →</span>
            </div>
          </div>
        )}

        {/* Card 3: Rebote por Sobreventa (RSI Dip) */}
        {topOversoldDip && (
          <div 
            onClick={() => onSelectAssetForAnalysis(topOversoldDip)}
            className="cursor-pointer group rounded-2xl border border-slate-800 bg-slate-900/90 p-4 hover:border-cyan-500/50 hover:bg-slate-900 transition shadow-sm"
          >
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="flex items-center gap-1 font-semibold text-cyan-400">
                <TrendingDown className="h-3.5 w-3.5" /> Oportunidad Sobreventa
              </span>
              <span className="rounded bg-cyan-950 border border-cyan-800/60 px-1.5 py-0.5 text-[10px] font-bold text-cyan-400">
                RSI {topOversoldDip.rsi14 || 35}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <img 
                src={getCryptoLogoUrl(topOversoldDip.symbol)} 
                alt={topOversoldDip.name} 
                onError={(e) => handleCryptoImageError(e, topOversoldDip.symbol)}
                referrerPolicy="no-referrer"
                className="h-9 w-9 rounded-xl object-contain border border-slate-700 p-1 bg-slate-950" 
              />
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-white text-sm truncate group-hover:text-cyan-300 transition">
                  {topOversoldDip.name}
                </h4>
                <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                  <span>{formatCurrency(topOversoldDip.current_price)}</span>
                  <span className="text-slate-300 font-bold">
                    {formatPercentage(topOversoldDip.price_change_percentage_24h)}
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-3 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Distancia ATH: {topOversoldDip.ath_change_percentage?.toFixed(1)}%</span>
              <span className="text-cyan-400 font-bold">Analizar →</span>
            </div>
          </div>
        )}

        {/* Card 4: Fuerte Momentum 24h */}
        {topMomentum && (
          <div 
            onClick={() => onSelectAssetForAnalysis(topMomentum)}
            className="cursor-pointer group rounded-2xl border border-slate-800 bg-slate-900/90 p-4 hover:border-emerald-500/50 hover:bg-slate-900 transition shadow-sm"
          >
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="flex items-center gap-1 font-semibold text-emerald-400">
                <Flame className="h-3.5 w-3.5 text-emerald-400" /> Líder en Momentum
              </span>
              <span className="rounded bg-emerald-950 border border-emerald-800/60 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400">
                +{topMomentum.price_change_percentage_24h.toFixed(2)}%
              </span>
            </div>
            <div className="flex items-center gap-3">
              <img 
                src={getCryptoLogoUrl(topMomentum.symbol)} 
                alt={topMomentum.name} 
                onError={(e) => handleCryptoImageError(e, topMomentum.symbol)}
                referrerPolicy="no-referrer"
                className="h-9 w-9 rounded-xl object-contain border border-slate-700 p-1 bg-slate-950" 
              />
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-white text-sm truncate group-hover:text-emerald-300 transition">
                  {topMomentum.name}
                </h4>
                <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                  <span>{formatCurrency(topMomentum.current_price)}</span>
                  <span className="text-emerald-400 font-bold">
                    {formatPercentage(topMomentum.price_change_percentage_24h)}
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-3 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Cap: {formatCompactNumber(topMomentum.market_cap)}</span>
              <span className="text-emerald-400 font-bold">Analizar →</span>
            </div>
          </div>
        )}
      </div>

      {/* Filter and Sector Bar */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 space-y-4 shadow-sm">
        {/* Sector Selection Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-xs font-bold text-slate-400 flex items-center gap-1 shrink-0 mr-1">
            <Coins className="h-3.5 w-3.5 text-emerald-400" /> Ecosistemas:
          </span>
          {sectorsList.map((sec) => (
            <button
              key={sec.id}
              onClick={() => setSelectedSector(sec.id)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                selectedSector === sec.id
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-950'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              {sec.label}
            </button>
          ))}
        </div>

        {/* Filters and Sorters Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-slate-800/80">
          {/* Signal Filter */}
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Filtro de Señal Algorítmica:
            </label>
            <select
              value={selectedSignalFilter}
              onChange={(e) => setSelectedSignalFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
            >
              <option value="all">Todas las Señales</option>
              <option value="strong_buy">Compra Fuerte (Alpha &gt; 80)</option>
              <option value="buy">Señal de Compra</option>
              <option value="oversold">Sobreventa Extrema (RSI &lt; 40)</option>
              <option value="volume_spike">Pico de Volumen On-Chain (&gt; 1.4x)</option>
            </select>
          </div>

          {/* Min Alpha Score */}
          <div>
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              <span>Score Mínimo:</span>
              <span className="text-emerald-400">{minAlphaScore} pts</span>
            </div>
            <input
              type="range"
              min="0"
              max="85"
              step="5"
              value={minAlphaScore}
              onChange={(e) => setMinAlphaScore(Number(e.target.value))}
              className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* Sort By Field */}
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Ordenar por Métrica:
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
            >
              <option value="alphaScore">Alpha Score (Oportunidad)</option>
              <option value="volume">Volumen Negociado 24h</option>
              <option value="change24h">Variación 24h (%)</option>
              <option value="market_cap">Capitalización de Mercado</option>
              <option value="tvl">Total Value Locked (TVL)</option>
              <option value="mvrv">MVRV Z-Score</option>
            </select>
          </div>

          {/* Sort Order */}
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Dirección de Orden:
            </label>
            <button
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-800 transition cursor-pointer"
            >
              <ArrowUpDown className="h-3.5 w-3.5 text-emerald-400" />
              <span>{sortOrder === 'desc' ? 'Mayor a Menor (Descendente)' : 'Menor a Mayor (Ascendente)'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Screened Cryptos Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">
              Resultados del Escaneo ({filteredAssets.length} Criptomonedas Filtradas)
            </h3>
          </div>
          <span className="text-xs text-slate-400">Precios y métricas On-Chain en vivo 24/7</span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-slate-400">
            <Activity className="h-8 w-8 animate-spin text-emerald-400 mx-auto mb-2" />
            <p className="text-sm">Cargando cotizaciones cripto y calculando matrices cuantitativas...</p>
          </div>
        ) : filteredAssets.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Info className="h-8 w-8 text-amber-400 mx-auto mb-2" />
            <p className="text-sm">No se encontraron criptomonedas con los filtros seleccionados.</p>
            <button
              onClick={() => {
                setSelectedSector('all');
                setMinAlphaScore(0);
                setSelectedSignalFilter('all');
              }}
              className="mt-3 rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-emerald-400 font-bold hover:bg-slate-700 cursor-pointer"
            >
              Restablecer Filtros
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-4 py-3">Símbolo / Cripto</th>
                  <th className="px-4 py-3 text-right">Precio Actual</th>
                  <th className="px-4 py-3 text-right">Var. 24h</th>
                  <th className="px-4 py-3 text-right">Var. 7d</th>
                  <th className="px-4 py-3 text-center">Alpha Score</th>
                  <th className="px-4 py-3 text-center">RSI (14)</th>
                  <th className="px-4 py-3 text-right">MVRV / TVL</th>
                  <th className="px-4 py-3 text-center">Señal</th>
                  <th className="px-4 py-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredAssets.map((asset) => (
                  <tr 
                    key={asset.id} 
                    className="hover:bg-slate-800/40 transition group"
                  >
                    {/* Ticker & Name */}
                    <td className="px-4 py-3">
                      <div 
                        onClick={() => onOpenMasterDiagnostic ? onOpenMasterDiagnostic(asset) : onSelectAssetForChart(asset)}
                        className="flex items-center gap-3 cursor-pointer group/asset"
                        title="Ver Análisis y Diagnóstico 360°"
                      >
                        <img 
                          src={getCryptoLogoUrl(asset.symbol)} 
                          alt={asset.name} 
                          onError={(e) => handleCryptoImageError(e, asset.symbol)}
                          referrerPolicy="no-referrer"
                          className="h-8 w-8 rounded-xl object-contain border border-slate-700 p-1 bg-slate-950 shrink-0 group-hover/asset:border-cyan-500/60 transition" 
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-white group-hover/asset:text-cyan-300 transition">
                              {asset.symbol.toUpperCase()}
                            </span>
                            <span className="rounded bg-slate-800 px-1 py-0.2 text-[9px] text-slate-400 font-mono">
                              {asset.sector || asset.category || 'Layer 1'}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 truncate max-w-[150px]">
                            {asset.name}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Current Price */}
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-100">
                      {formatCurrency(asset.current_price)}
                    </td>

                    {/* Change 24h */}
                    <td className="px-4 py-3 text-right font-mono font-bold">
                      <span className={asset.price_change_percentage_24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                        {formatPercentage(asset.price_change_percentage_24h)}
                      </span>
                    </td>

                    {/* Change 7d */}
                    <td className="px-4 py-3 text-right font-mono">
                      <span className={(asset.price_change_percentage_7d || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                        {formatPercentage(asset.price_change_percentage_7d || 0)}
                      </span>
                    </td>

                    {/* Alpha Score Badge */}
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block rounded-lg border px-2 py-0.5 font-mono text-xs font-black ${getScoreColor(asset.alphaScore || 50)}`}>
                        {asset.alphaScore || 50}
                      </span>
                    </td>

                    {/* RSI */}
                    <td className="px-4 py-3 text-center font-mono">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        (asset.rsi14 || 50) <= 35 
                          ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/60' 
                          : (asset.rsi14 || 50) >= 70 
                          ? 'bg-rose-950 text-rose-300 border border-rose-800/60' 
                          : 'text-slate-300'
                      }`}>
                        {asset.rsi14 || 50}
                      </span>
                    </td>

                    {/* MVRV / TVL */}
                    <td className="px-4 py-3 text-right font-mono text-slate-300">
                      {asset.tvl ? formatCompactNumber(asset.tvl) : (asset.mvrvScore ? `${asset.mvrvScore.toFixed(2)}z` : '1.80z')}
                    </td>

                    {/* Trend Signal Badge */}
                    <td className="px-4 py-3 text-center">
                      {getSignalBadge(asset.trendSignal)}
                    </td>

                    {/* Action Controls */}
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {onOpenMasterDiagnostic && (
                          <button
                            onClick={() => onOpenMasterDiagnostic(asset)}
                            className="rounded-lg border border-cyan-500/50 bg-cyan-950/60 p-1.5 text-cyan-300 hover:bg-cyan-500 hover:text-slate-950 transition cursor-pointer"
                            title="Abrir Análisis 360° Completo"
                          >
                            <Sparkles className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => onSelectAssetForChart(asset)}
                          className="rounded-lg border border-slate-700 bg-slate-800 p-1.5 text-slate-300 hover:bg-slate-700 hover:text-white transition cursor-pointer"
                          title="Abrir Gráfico Técnico"
                        >
                          <BarChart3 className="h-3.5 w-3.5 text-emerald-400" />
                        </button>
                        {onOpenBrokerModal && (
                          <button
                            onClick={() => onOpenBrokerModal(asset)}
                            className="rounded-lg border border-emerald-500/60 bg-emerald-950/60 p-1.5 text-emerald-300 hover:bg-emerald-500 hover:text-slate-950 transition cursor-pointer"
                            title="Simular Trading Spot o Futuros"
                          >
                            <Briefcase className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => onSelectAssetForAnalysis(asset)}
                          className="rounded-lg border border-indigo-700/60 bg-indigo-950/60 p-1.5 text-indigo-300 hover:bg-indigo-900 transition cursor-pointer"
                          title="Diagnóstico IA Gemini"
                        >
                          <Cpu className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => onCreateAlertForAsset(asset)}
                          className="rounded-lg border border-amber-700/60 bg-amber-950/60 p-1.5 text-amber-300 hover:bg-amber-900 transition cursor-pointer"
                          title="Crear Alerta de Volumen"
                        >
                          <Bell className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
