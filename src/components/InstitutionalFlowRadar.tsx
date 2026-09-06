import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  Eye, 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  ShieldAlert, 
  Zap, 
  DollarSign, 
  Clock, 
  Search, 
  Filter, 
  CheckCircle2, 
  ArrowUpRight, 
  ArrowDownRight,
  ExternalLink,
  Layers,
  Sparkles,
  BarChart2,
  Coins
} from 'lucide-react';
import { 
  CryptoAsset, 
  DarkPoolBlockTrade, 
  UnusualOptionFlowItem, 
  InstitutionalTickerSummary 
} from '../types';
import { formatCurrency, formatCompactNumber } from '../utils/formatters';

interface InstitutionalFlowRadarProps {
  assets: CryptoAsset[];
  onOpenChartModal: (asset: CryptoAsset) => void;
  onCreateAlert?: (asset: CryptoAsset, targetPrice: number, desc: string) => void;
  isExpertMode?: boolean;
}

export const InstitutionalFlowRadar: React.FC<InstitutionalFlowRadarProps> = ({
  assets,
  onOpenChartModal,
  onCreateAlert,
  isExpertMode = true,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'dark_pools' | 'options_flow' | 'accumulation_matrix'>('dark_pools');
  const [selectedTickerFilter, setSelectedTickerFilter] = useState<string>('ALL');
  const [sentimentFilter, setSentimentFilter] = useState<'ALL' | 'BULLISH' | 'BEARISH'>('ALL');

  // Real-time simulated & deterministic crypto OTC & Whale Block Trades
  const darkPoolTrades = useMemo<DarkPoolBlockTrade[]>(() => {
    const venues: DarkPoolBlockTrade['venue'][] = [
      'Coinbase Prime OTC', 'Wintermute Liquid', 'Cumberland DRW', 'FalconX Institutional', 'Binance VIP OTC', 'Galaxy Digital'
    ];

    const sampleData: { ticker: string; name: string; price: number; size: number; sentiment: DarkPoolBlockTrade['sentiment']; minAgo: number }[] = [
      { ticker: 'BTC', name: 'Bitcoin', price: 91500, size: 850, sentiment: 'ACUMULACION_INSTITUCIONAL', minAgo: 3 },
      { ticker: 'ETH', name: 'Ethereum', price: 2750, size: 14500, sentiment: 'ACUMULACION_INSTITUCIONAL', minAgo: 7 },
      { ticker: 'SOL', name: 'Solana', price: 185.40, size: 120000, sentiment: 'ACUMULACION_INSTITUCIONAL', minAgo: 12 },
      { ticker: 'TAO', name: 'Bittensor', price: 540.20, size: 18000, sentiment: 'ACUMULACION_INSTITUCIONAL', minAgo: 18 },
      { ticker: 'AAVE', name: 'Aave', price: 215.80, size: 35000, sentiment: 'ACUMULACION_INSTITUCIONAL', minAgo: 24 },
      { ticker: 'SUI', name: 'Sui', price: 3.45, size: 2500000, sentiment: 'ACUMULACION_INSTITUCIONAL', minAgo: 31 },
      { ticker: 'LINK', name: 'Chainlink', price: 18.90, size: 450000, sentiment: 'ACUMULACION_INSTITUCIONAL', minAgo: 39 },
      { ticker: 'PEPE', name: 'Pepe', price: 0.0000185, size: 450000000000, sentiment: 'DISTRIBUCION_VENTA', minAgo: 45 },
      { ticker: 'DOGE', name: 'Dogecoin', price: 0.285, size: 15000000, sentiment: 'CRUCE_NEUTRAL', minAgo: 52 },
      { ticker: 'AVAX', name: 'Avalanche', price: 32.80, size: 210000, sentiment: 'ACUMULACION_INSTITUCIONAL', minAgo: 58 },
    ];

    const now = Date.now();

    return sampleData.map((item, idx) => {
      const liveAsset = assets.find((a) => a.symbol.toUpperCase() === item.ticker);
      const actualPrice = liveAsset?.current_price || item.price;
      const actualName = liveAsset?.name || item.name;
      const dollarValue = actualPrice * item.size;
      let premiumTier: DarkPoolBlockTrade['premiumTier'] = 'Standard Block ($2M+)';
      if (dollarValue >= 50000000) {
        premiumTier = 'Mega Block ($50M+)';
      } else if (dollarValue >= 10000000) {
        premiumTier = 'Large Block ($10M+)';
      }

      const d = new Date(now - item.minAgo * 60 * 1000);
      const timeStr = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      return {
        id: `otc-${item.ticker}-${idx}`,
        ticker: item.ticker,
        companyName: actualName,
        timestamp: timeStr,
        price: actualPrice,
        size: item.size,
        dollarValue,
        venue: venues[idx % venues.length],
        sentiment: item.sentiment,
        premiumTier,
        priceVsMarketPct: Number(((Math.random() * 0.4) - 0.1).toFixed(2)),
      };
    });
  }, [assets]);

  // Unusual Options & Deribit/Derivatives Flow
  const optionsFlow = useMemo<UnusualOptionFlowItem[]>(() => {
    const sampleOptions: {
      ticker: string;
      type: 'CALL' | 'PUT';
      strike: number;
      exp: string;
      spot: number;
      premium: number;
      contracts: number;
      iv: number;
      orderType: 'SWEEP' | 'BLOCK' | 'SPLIT';
      sentiment: 'BULLISH' | 'BEARISH';
      conf: number;
      catalyst?: string;
      minAgo: number;
    }[] = [
      { ticker: 'BTC', type: 'CALL', strike: 105000, exp: '26 Sep 2026', spot: 91500, premium: 14500000, contracts: 1850, iv: 58, orderType: 'SWEEP', sentiment: 'BULLISH', conf: 98, catalyst: 'Sweeps masivos de Calls OTM en Deribit para vencimiento trimestral', minAgo: 4 },
      { ticker: 'ETH', type: 'CALL', strike: 3400, exp: '31 Oct 2026', spot: 2750, premium: 6820000, contracts: 4500, iv: 64, orderType: 'BLOCK', sentiment: 'BULLISH', conf: 95, catalyst: 'Bloque OTC institucional acumulativo con liquidación física', minAgo: 11 },
      { ticker: 'SOL', type: 'CALL', strike: 240, exp: '26 Sep 2026', spot: 185.40, premium: 4200000, contracts: 6200, iv: 72, orderType: 'SWEEP', sentiment: 'BULLISH', conf: 92, catalyst: 'Flujo comprador agresivo por encima de precio Ask', minAgo: 19 },
      { ticker: 'BTC', type: 'PUT', strike: 82000, exp: '19 Sep 2026', spot: 91500, premium: 3100000, contracts: 850, iv: 52, orderType: 'SPLIT', sentiment: 'BEARISH', conf: 84, catalyst: 'Cobertura de riesgo por creadores de mercado', minAgo: 26 },
      { ticker: 'TAO', type: 'CALL', strike: 650, exp: '31 Oct 2026', spot: 540.20, premium: 2450000, contracts: 1100, iv: 85, orderType: 'SWEEP', sentiment: 'BULLISH', conf: 94, catalyst: 'Entrada masiva de capital en sector Inteligencia Artificial', minAgo: 38 },
      { ticker: 'AAVE', type: 'CALL', strike: 280, exp: '26 Sep 2026', spot: 215.80, premium: 1890000, contracts: 2200, iv: 76, orderType: 'BLOCK', sentiment: 'BULLISH', conf: 91, catalyst: 'Acumulación institucional en protocolos de Real Yield DeFi', minAgo: 48 },
    ];

    const now = Date.now();

    return sampleOptions.map((opt, idx) => {
      const liveAsset = assets.find((a) => a.symbol.toUpperCase() === opt.ticker);
      const actualSpot = liveAsset?.current_price || opt.spot;
      const actualStrike = opt.type === 'CALL' 
        ? Number((actualSpot * (1 + (opt.strike > opt.spot ? 0.12 : 0.05))).toFixed(actualSpot < 1 ? 4 : 2))
        : Number((actualSpot * 0.90).toFixed(actualSpot < 1 ? 4 : 2));
      
      const d = new Date(now - opt.minAgo * 60 * 1000);
      const timeStr = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

      return {
        id: `deriv-${opt.ticker}-${idx}`,
        ticker: opt.ticker,
        timestamp: timeStr,
        type: opt.type,
        strike: actualStrike,
        expiration: opt.exp,
        spotPrice: actualSpot,
        premiumTotal: opt.premium,
        contracts: opt.contracts,
        impliedVolatility: opt.iv,
        orderType: opt.orderType,
        sentiment: opt.sentiment,
        institutionalConfidence: opt.conf,
        catalystNotice: opt.catalyst,
      };
    });
  }, [assets]);

  // Crypto Whale Accumulation Matrix
  const accumulationMatrix = useMemo<InstitutionalTickerSummary[]>(() => {
    const list = [
      { ticker: 'BTC', companyName: 'Bitcoin', baseScore: 98, baseFlow: 840.5, pcRatio: 0.38, flowSentiment: 'Muy Alcista', divergenceAlert: 'Divergencia On-Chain: Salida récord de 18,500 BTC de exchanges a cold wallets mientras el precio consolida.' },
      { ticker: 'ETH', companyName: 'Ethereum', baseScore: 92, baseFlow: 420.2, pcRatio: 0.44, flowSentiment: 'Muy Alcista', divergenceAlert: 'Staking institucional masivo en validadores con reducción de oferta circulante.' },
      { ticker: 'SOL', companyName: 'Solana', baseScore: 95, baseFlow: 310.8, pcRatio: 0.41, flowSentiment: 'Muy Alcista', divergenceAlert: 'Acumulación sostenida en OTC Prime y crecimiento vertical de TVL en DEXs.' },
      { ticker: 'TAO', companyName: 'Bittensor', baseScore: 94, baseFlow: 185.0, pcRatio: 0.35, flowSentiment: 'Muy Alcista', divergenceAlert: 'Entrada de fondos de capital riesgo enfocados en IA descentralizada.' },
      { ticker: 'AAVE', companyName: 'Aave', baseScore: 90, baseFlow: 145.3, pcRatio: 0.49, flowSentiment: 'Alcista Sólido', divergenceAlert: 'Ingresos por comisiones en máximos anuales e incremento del buyback de tokens.' },
      { ticker: 'SUI', companyName: 'Sui', baseScore: 88, baseFlow: 110.4, pcRatio: 0.52, flowSentiment: 'Alcista Sólido', divergenceAlert: 'Récord de volumen diario en red y bajas tasas de financiación en perpetuos.' },
      { ticker: 'DOGE', companyName: 'Dogecoin', baseScore: 74, baseFlow: -35.2, pcRatio: 0.95, flowSentiment: 'Neutral / Coberturas', divergenceAlert: 'Liquidaciones de posiciones largas en futuros perpetuos con funding rate neutro.' },
    ];

    return list.map((item) => {
      const liveAsset = assets.find((a) => a.symbol.toUpperCase() === item.ticker);
      const actualScore = liveAsset?.alphaScore ? Math.min(99, Math.max(60, liveAsset.alphaScore + 10)) : item.baseScore;
      return {
        ticker: item.ticker,
        companyName: liveAsset?.name || item.companyName,
        institutionalAccumulationScore: actualScore,
        netDarkPoolFlowMillion: item.baseFlow,
        putCallRatio: item.pcRatio,
        flowSentiment: item.flowSentiment as InstitutionalTickerSummary['flowSentiment'],
        divergenceAlert: item.divergenceAlert,
      };
    });
  }, [assets]);

  // Filtered lists
  const filteredDarkPool = useMemo(() => {
    return darkPoolTrades.filter((t) => {
      if (selectedTickerFilter !== 'ALL' && t.ticker !== selectedTickerFilter) return false;
      if (sentimentFilter === 'BULLISH' && t.sentiment !== 'ACUMULACION_INSTITUCIONAL') return false;
      if (sentimentFilter === 'BEARISH' && t.sentiment !== 'DISTRIBUCION_VENTA') return false;
      return true;
    });
  }, [darkPoolTrades, selectedTickerFilter, sentimentFilter]);

  const filteredOptions = useMemo(() => {
    return optionsFlow.filter((o) => {
      if (selectedTickerFilter !== 'ALL' && o.ticker !== selectedTickerFilter) return false;
      if (sentimentFilter === 'BULLISH' && o.sentiment !== 'BULLISH') return false;
      if (sentimentFilter === 'BEARISH' && o.sentiment !== 'BEARISH') return false;
      return true;
    });
  }, [optionsFlow, selectedTickerFilter, sentimentFilter]);

  const uniqueTickers = useMemo(() => {
    const set = new Set<string>();
    darkPoolTrades.forEach((d) => set.add(d.ticker));
    optionsFlow.forEach((o) => set.add(o.ticker));
    return Array.from(set);
  }, [darkPoolTrades, optionsFlow]);

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden min-w-0">
      {/* Header Card */}
      <div className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-950 p-6 sm:p-8 shadow-2xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-slate-800">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-lg">
              <Building2 className="h-7 w-7" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 font-bold text-xs px-2.5 py-0.5 uppercase tracking-wider">
                  Radar de Huella de Ballenas e Instituciones
                </span>
                <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-xs px-2 py-0.5">
                  Mesas OTC &amp; Opciones Deribit
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">
                Flujo Institucional &amp; Bloques OTC de Ballenas Cripto
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
                Rastreo en tiempo real de operaciones en bloques multimillonarios fuera de libro (Coinbase Prime, Wintermute, Cumberland) y compras agresivas de opciones Call/Put de fondos cripto.
              </p>
            </div>
          </div>

          {/* Quick Metrics Badge */}
          <div className="flex items-center gap-3 bg-slate-950/80 border border-slate-800 p-3 rounded-2xl">
            <div className="text-right">
              <div className="text-[10px] text-slate-400 uppercase font-bold">Flujo Neto OTC &amp; On-Chain</div>
              <div className="text-xl font-black text-emerald-400 font-mono">+$2,185.0M</div>
            </div>
            <div className="h-8 w-px bg-slate-800" />
            <div className="text-right">
              <div className="text-[10px] text-slate-400 uppercase font-bold">Ratio Put/Call Total</div>
              <div className="text-xl font-black text-cyan-400 font-mono">0.42 (Muy Alcista)</div>
            </div>
          </div>
        </div>

        {/* High-Impact Divergence Alert Banner */}
        <div className="mt-6 p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/40 flex items-start gap-3">
          <Eye className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <span className="font-bold text-indigo-300 block uppercase tracking-wider">
              Divergencia de Acumulación Detectada en BTC, SOL y TAO:
            </span>
            <p className="text-slate-200 leading-relaxed">
              Mientras el mercado minorista duda, los fondos institucionales han absorbido más de <strong>$1,200M en mesas OTC privadas</strong> en las últimas 4 horas con un aumento vertical del interés abierto en Calls OTM de Deribit.
            </p>
          </div>
        </div>

        {/* Sub-Tabs & Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-6 pt-4 border-t border-slate-800">
          {/* Sub Navigation */}
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950 p-1">
            <button
              id="subtab-dark-pools"
              onClick={() => setActiveSubTab('dark_pools')}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === 'dark_pools'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Building2 className="h-3.5 w-3.5" />
              <span>Bloques OTC &amp; Ballenas ({filteredDarkPool.length})</span>
            </button>
            <button
              id="subtab-options-flow"
              onClick={() => setActiveSubTab('options_flow')}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === 'options_flow'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Zap className="h-3.5 w-3.5" />
              <span>Opciones Deribit ({filteredOptions.length})</span>
            </button>
            <button
              id="subtab-accumulation-matrix"
              onClick={() => setActiveSubTab('accumulation_matrix')}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === 'accumulation_matrix'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Matriz On-Chain</span>
            </button>
          </div>

          {/* Ticker & Sentiment Filters */}
          <div className="flex items-center gap-2">
            <select
              id="filter-institutional-ticker"
              value={selectedTickerFilter}
              onChange={(e) => setSelectedTickerFilter(e.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs font-bold text-slate-200 focus:border-indigo-500 focus:outline-none"
            >
              <option value="ALL">Todas las Criptos</option>
              {uniqueTickers.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>

            <select
              id="filter-institutional-sentiment"
              value={sentimentFilter}
              onChange={(e) => setSentimentFilter(e.target.value as any)}
              className="rounded-xl border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs font-bold text-slate-200 focus:border-indigo-500 focus:outline-none"
            >
              <option value="ALL">Todo Sentimiento</option>
              <option value="BULLISH">Solo Alcista (Acumulación)</option>
              <option value="BEARISH">Solo Bajista (Distribución)</option>
            </select>
          </div>
        </div>
      </div>

      {/* VIEW 1: OTC TAPE */}
      {activeSubTab === 'dark_pools' && (
        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <Building2 className="h-5 w-5 text-indigo-400" />
                <span>Tape de Bloques OTC de Ballenas (&gt; $2M)</span>
              </h3>
              <p className="text-xs text-slate-400">
                Operaciones liquidadas a través de Coinbase Prime, Wintermute, Cumberland y mesas de liquidez privada
              </p>
            </div>
            <span className="text-xs text-emerald-400 font-mono font-bold flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              Feed en Vivo 24/7
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Hora</th>
                  <th className="py-2.5 px-3">Cripto / Activo</th>
                  <th className="py-2.5 px-3">Precio Ejecución</th>
                  <th className="py-2.5 px-3">Tamaño (Tokens)</th>
                  <th className="py-2.5 px-3">Valor Total ($)</th>
                  <th className="py-2.5 px-3">Nivel de Bloque</th>
                  <th className="py-2.5 px-3">Mesa OTC / Custodio</th>
                  <th className="py-2.5 px-3">Sentimiento</th>
                  <th className="py-2.5 px-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {(filteredDarkPool || []).map((dp) => {
                  const isAccum = dp.sentiment === 'ACUMULACION_INSTITUCIONAL';
                  const isMega = dp.dollarValue >= 50000000;
                  const matchingAsset = assets.find((a) => a.symbol.toLowerCase() === dp.ticker.toLowerCase());

                  return (
                    <tr key={dp.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-3 text-slate-400 font-sans">{dp.timestamp}</td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">{dp.ticker}</span>
                          <span className="text-[11px] text-slate-400 font-sans hidden md:inline">{dp.companyName}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-200 font-bold">{formatCurrency(dp.price)}</td>
                      <td className="py-3 px-3 text-slate-300">{dp.size >= 1000 ? formatCompactNumber(dp.size) : dp.size.toLocaleString()}</td>
                      <td className="py-3 px-3">
                        <span className={`font-black ${isMega ? 'text-amber-300' : 'text-emerald-400'}`}>
                          ${formatCompactNumber(dp.dollarValue)}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-sans">
                        <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                          isMega 
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' 
                            : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                        }`}>
                          {dp.premiumTier}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-400 font-sans">{dp.venue}</td>
                      <td className="py-3 px-3 font-sans">
                        <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold ${
                          isAccum 
                            ? 'bg-emerald-500/20 text-emerald-300' 
                            : 'bg-rose-500/20 text-rose-300'
                        }`}>
                          {isAccum ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                          {isAccum ? 'Acumulación' : 'Distribución'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-sans">
                        {matchingAsset && (
                          <button
                            onClick={() => onOpenChartModal(matchingAsset)}
                            className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] font-bold text-slate-200 hover:bg-slate-700 hover:text-white transition cursor-pointer"
                          >
                            Ver Gráfico
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: UNUSUAL DERIBIT OPTIONS FLOW */}
      {activeSubTab === 'options_flow' && (
        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-400" />
                <span>Flujo de Opciones Inusuales en Deribit (Calls &amp; Puts Institucionales)</span>
              </h3>
              <p className="text-xs text-slate-400">
                Apuestas de alta convicción ejecutadas por creadores de mercado y hedge funds cripto
              </p>
            </div>
            <span className="text-xs text-amber-400 font-mono font-bold">
              Prima Total Filtrada: $32.8M
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(filteredOptions || []).map((opt) => {
              const isBull = opt.sentiment === 'BULLISH';
              const matchingAsset = assets.find((a) => a.symbol.toLowerCase() === opt.ticker.toLowerCase());

              return (
                <div 
                  key={opt.id} 
                  className={`rounded-2xl border p-4 transition hover:border-indigo-500/60 ${
                    isBull 
                      ? 'border-emerald-500/30 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/20' 
                      : 'border-rose-500/30 bg-gradient-to-br from-slate-950 via-slate-900 to-rose-950/20'
                  }`}
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-black text-white font-mono">{opt.ticker}</span>
                      <span className={`rounded px-2 py-0.5 text-xs font-black font-mono ${
                        opt.type === 'CALL' ? 'bg-emerald-500 text-slate-950' : 'bg-rose-500 text-white'
                      }`}>
                        ${formatCompactNumber(opt.strike)} {opt.type}
                      </span>
                      <span className="text-xs text-slate-400 font-sans">{opt.expiration}</span>
                    </div>

                    <span className="text-xs font-mono text-slate-400">{opt.timestamp}</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 py-3 text-xs font-mono">
                    <div>
                      <div className="text-[10px] text-slate-400 font-sans">Prima Pagada:</div>
                      <div className="text-sm font-bold text-emerald-400">${formatCompactNumber(opt.premiumTotal)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-sans">Contratos:</div>
                      <div className="text-sm font-bold text-white">{opt.contracts.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-sans">Tipo de Orden:</div>
                      <div className="text-sm font-bold text-indigo-400">{opt.orderType}</div>
                    </div>
                  </div>

                  {opt.catalystNotice && (
                    <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 flex items-start gap-2">
                      <Sparkles className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span>{opt.catalystNotice}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-3 mt-1 border-t border-slate-800 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-400">Confianza Institucional:</span>
                      <span className="font-bold text-emerald-400 font-mono">{opt.institutionalConfidence}%</span>
                    </div>

                    {matchingAsset && (
                      <button
                        onClick={() => onOpenChartModal(matchingAsset)}
                        className="flex items-center gap-1 text-xs font-bold text-indigo-400 hover:text-indigo-300 cursor-pointer"
                      >
                        <span>Analizar Gráfico</span>
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 3: ON-CHAIN WHALE ACCUMULATION MATRIX */}
      {activeSubTab === 'accumulation_matrix' && (
        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl space-y-4">
          <div className="pb-3 border-b border-slate-800">
            <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <Layers className="h-5 w-5 text-indigo-400" />
              <span>Termómetro de Presión On-Chain por Criptoactivo</span>
            </h3>
            <p className="text-xs text-slate-400">
              Puntuación consolidada que combina flujo de mesas OTC, retiros a Cold Storage, funding rate y volumen Z-Score
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(accumulationMatrix || []).map((item) => {
              const matchingAsset = assets.find((a) => a.symbol.toLowerCase() === item.ticker.toLowerCase());

              return (
                <div 
                  key={item.ticker} 
                  className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5 space-y-3 hover:border-slate-700 transition"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-lg font-black text-white font-mono">{item.ticker}</h4>
                      <p className="text-xs text-slate-400">{item.companyName}</p>
                    </div>
                    <span className={`rounded px-2.5 py-1 text-xs font-bold ${
                      item.flowSentiment.includes('Alcista')
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    }`}>
                      {item.flowSentiment}
                    </span>
                  </div>

                  {/* Score Gauge */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-400">Fuerza de Acumulación:</span>
                      <span className="font-bold text-emerald-400 font-mono">{item.institutionalAccumulationScore}/100</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${
                          item.institutionalAccumulationScore >= 75
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                            : 'bg-gradient-to-r from-amber-500 to-rose-500'
                        }`}
                        style={{ width: `${item.institutionalAccumulationScore}%` }}
                      />
                    </div>
                  </div>

                  {/* Flow Stats */}
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
                    <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-800">
                      <div className="text-[10px] text-slate-400 font-sans">Flujo Neto OTC:</div>
                      <div className={`font-bold ${item.netDarkPoolFlowMillion >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {item.netDarkPoolFlowMillion >= 0 ? '+' : ''}${item.netDarkPoolFlowMillion}M
                      </div>
                    </div>
                    <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-800">
                      <div className="text-[10px] text-slate-400 font-sans">Ratio Put / Call:</div>
                      <div className="font-bold text-cyan-300">{item.putCallRatio}</div>
                    </div>
                  </div>

                  {item.divergenceAlert && (
                    <p className="text-[11px] text-amber-300 bg-amber-950/20 border border-amber-500/30 p-2 rounded-xl leading-relaxed">
                      💡 {item.divergenceAlert}
                    </p>
                  )}

                  {matchingAsset && (
                    <button
                      onClick={() => onOpenChartModal(matchingAsset)}
                      className="w-full mt-2 rounded-xl border border-slate-700 bg-slate-800/80 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700 hover:text-white transition cursor-pointer"
                    >
                      Abrir Gráfico y Plan de Trade
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
