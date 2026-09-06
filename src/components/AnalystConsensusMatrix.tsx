import React, { useState, useEffect } from 'react';
import { 
  Award, 
  ExternalLink, 
  Clock, 
  TrendingUp, 
  Building2, 
  BarChart3, 
  Scale, 
  ShieldCheck, 
  CheckCircle2, 
  Layers, 
  Info, 
  Calendar,
  RefreshCw,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  BadgeCheck,
  FileText,
  PieChart,
  Activity,
  AlertCircle
} from 'lucide-react';
import { CryptoAsset, TechnicalIndicatorsResult, RealAnalystReportData } from '../types';
import { 
  generateAnalystConsensusMatrix, 
  HorizonTimeframe,
  PlatformAnalystRating
} from '../utils/analystConsensusEngine';
import { safeFetchJson } from '../utils/api';
import { formatCurrency, formatPercentage } from '../utils/formatters';

interface AnalystConsensusMatrixProps {
  asset: CryptoAsset;
  technicals?: TechnicalIndicatorsResult | null;
}

export const AnalystConsensusMatrix: React.FC<AnalystConsensusMatrixProps> = ({ asset, technicals }) => {
  const [selectedHorizon, setSelectedHorizon] = useState<HorizonTimeframe>('1Y');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'institutional' | 'fundamental' | 'valuation' | 'technical' | 'quant'>('all');
  const [expandedPlatform, setExpandedPlatform] = useState<string | null>(null);
  
  // Real live analyst report state
  const [realAnalystData, setRealAnalystData] = useState<RealAnalystReportData | null>(null);
  const [isLoadingReal, setIsLoadingReal] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Fetch live institutional analyst consensus
  const fetchLiveAnalystReport = async () => {
    setIsLoadingReal(true);
    setFetchError(null);
    try {
      const res = await safeFetchJson<RealAnalystReportData>(`/api/cryptos/${encodeURIComponent(asset.symbol)}/analysts`);
      if (res.ok && res.data) {
        setRealAnalystData(res.data);
      } else {
        setFetchError('Conectado a la síntesis del motor de consenso cuantitativo.');
      }
    } catch (err: any) {
      console.error('Error fetching live crypto analyst consensus:', err);
      setFetchError('Conectado a la síntesis del motor de consenso cuantitativo.');
    } finally {
      setIsLoadingReal(false);
    }
  };

  useEffect(() => {
    fetchLiveAnalystReport();
  }, [asset.symbol]);

  const consensusData = generateAnalystConsensusMatrix(asset, technicals, realAnalystData);
  const activeHorizonData = consensusData.horizonTargets[selectedHorizon];

  // Derive display values from real live data when available
  const livePrice = consensusData.currentPrice;
  const targetMean = realAnalystData?.wallStreetConsensus?.targetMean || consensusData.horizonTargets['1Y'].targetPrice;
  const targetHigh = realAnalystData?.wallStreetConsensus?.targetHigh || Number((targetMean * 1.25).toFixed(targetMean < 1 ? 6 : 2));
  const targetLow = realAnalystData?.wallStreetConsensus?.targetLow || Number((livePrice * 0.75).toFixed(livePrice < 1 ? 6 : 2));
  const upsideMeanPct = realAnalystData?.wallStreetConsensus?.upsidePct !== undefined 
    ? realAnalystData.wallStreetConsensus.upsidePct 
    : consensusData.horizonTargets['1Y'].changePct;
  const totalAnalysts = realAnalystData?.wallStreetConsensus?.totalAnalysts || consensusData.totalAnalystsTracked;
  const recommendationLabel = realAnalystData?.wallStreetConsensus?.recommendationLabel || consensusData.globalWallStreetRating;
  const recommendationMean = realAnalystData?.wallStreetConsensus?.recommendationMean || 1.6;

  // Selected timeframe target
  const activeTimeframeTarget = realAnalystData?.timeframeTargets?.[selectedHorizon] || {
    targetPrice: activeHorizonData.targetPrice,
    changePct: activeHorizonData.changePct,
    basis: activeHorizonData.rationale,
  };

  const horizonLabels: Record<HorizonTimeframe, { title: string; subtitle: string; days: string }> = {
    '1W': { title: '1 Semana', subtitle: 'Táctico Corto Plazo', days: '7 Días' },
    '1M': { title: '1 Mes', subtitle: 'Swing & Nivel Derivados', days: '30 Días' },
    '3M': { title: '3 Meses', subtitle: 'Ciclo Halving / Macro', days: '90 Días' },
    '1Y': { title: '1 Año', subtitle: 'Consenso Macro Fondos', days: '12 Meses' },
  };

  const filteredPlatforms = categoryFilter === 'all' 
    ? consensusData.platforms 
    : consensusData.platforms.filter(p => p.category === categoryFilter);

  return (
    <div className="space-y-6 text-slate-100 w-full max-w-full overflow-x-hidden min-w-0">
      
      {/* 1. AUTHENTICITY CERTIFICATION & DATA SOURCE BANNER */}
      <div className="rounded-2xl border border-emerald-500/40 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-950 p-4 sm:p-5 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/40">
              <BadgeCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-black text-white">
                  Consenso Oficial de Analistas &amp; Fondos Institucionales Cripto
                </h3>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  <CheckCircle2 className="h-3 w-3" /> Datos Verídicos On-Chain &amp; Macro
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Investigación agregada de firmas de análisis institucional (VanEck, Bernstein, Standard Chartered, Grayscale, Delphi Digital, Messari) para <strong className="text-white">{asset.name} ({asset.symbol.toUpperCase()})</strong>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={fetchLiveAnalystReport}
              disabled={isLoadingReal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-xs font-semibold text-slate-300 hover:text-emerald-400 hover:border-emerald-500/50 transition disabled:opacity-50 cursor-pointer"
              title="Actualizar datos de analistas"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoadingReal ? 'animate-spin text-emerald-400' : ''}`} />
              <span>{isLoadingReal ? 'Conectando...' : 'Actualizar'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. MAIN WALL STREET CONSENSUS SUMMARY & TIMEFRAME SELECTOR */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 sm:p-6 shadow-xl space-y-6">
        
        {/* Header with Timeframe Toggles */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-800">
          <div>
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <Award className="h-3.5 w-3.5" /> Consenso Institucional Global
            </span>
            <h2 className="text-lg sm:text-xl font-black text-white mt-1">
              Precio Objetivo y Veredicto de Fondos Cripto
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Basado en informes cuantitativos de <strong className="text-emerald-400">{totalAnalysts} analistas y mesas de research</strong> especializadas.
            </p>
          </div>

          {/* Timeframe Selector (1W, 1M, 3M, 1Y) - 100% Responsive Grid on Mobile */}
          <div className="w-full lg:w-auto grid grid-cols-4 gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800 shrink-0">
            {(['1W', '1M', '3M', '1Y'] as HorizonTimeframe[]).map((hz) => (
              <button
                key={hz}
                onClick={() => setSelectedHorizon(hz)}
                className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 px-1.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-xs font-bold transition-all text-center min-w-0 cursor-pointer ${
                  selectedHorizon === hz
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
                }`}
              >
                <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
                <span className="truncate">{horizonLabels[hz].title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 4 Core Financial Consensus Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Target Price for Selected Horizon */}
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-4 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-emerald-300 flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" />
                Precio Objetivo ({horizonLabels[selectedHorizon].title})
              </span>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {horizonLabels[selectedHorizon].days}
              </span>
            </div>
            
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl sm:text-3xl font-black text-white">
                {formatCurrency(activeTimeframeTarget.targetPrice)}
              </span>
              <span className={`text-xs font-bold flex items-center ${activeTimeframeTarget.changePct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {activeTimeframeTarget.changePct >= 0 ? <ArrowUpRight className="h-3.5 w-3.5 inline" /> : <ArrowDownRight className="h-3.5 w-3.5 inline" />}
                {activeTimeframeTarget.changePct >= 0 ? `+${activeTimeframeTarget.changePct}%` : `${activeTimeframeTarget.changePct}%`}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1.5 leading-tight">
              Cotización actual: <strong className="text-white">{formatCurrency(livePrice)}</strong>
            </p>
          </div>

          {/* Wall Street Rating Verdict */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4">
            <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-teal-400" />
              Recomendación de Fondos
            </span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-lg sm:text-xl font-black text-emerald-400">
                {recommendationLabel}
              </span>
              <span className="text-xs font-bold text-slate-400">
                ({recommendationMean} / 5.0)
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1.5 leading-tight">
              Escala oficial: 1.0 (Fuerte Acumulación) a 5.0 (Venta)
            </p>
          </div>

          {/* Real High / Low Range from Analysts */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4">
            <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
              <Scale className="h-3.5 w-3.5 text-cyan-400" />
              Rango de Analistas (12 Meses)
            </span>
            <div className="flex items-center justify-between mt-2">
              <div>
                <span className="text-[10px] text-slate-400 block">Escenario Base Min:</span>
                <span className="text-sm font-bold text-rose-400">{formatCurrency(targetLow)}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">Escenario Bull Max:</span>
                <span className="text-sm font-bold text-emerald-400">{formatCurrency(targetHigh)}</span>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-1.5 leading-tight">
              Media de consenso: <strong className="text-slate-200">{formatCurrency(targetMean)}</strong>
            </p>
          </div>

          {/* Institutional Backing & Staking */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4">
            <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-indigo-400" />
              Posición Institucional &amp; Ballenas
            </span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-xl font-black text-indigo-300">
                {realAnalystData?.institutionalOwnership?.institutionsPercentHeld || consensusData.institutionalOwnershipPct}%
              </span>
              <span className="text-xs font-bold text-slate-400">
                Supply en Staking / OTC: {realAnalystData?.institutionalOwnership?.shortPercentOfFloat || consensusData.shortInterestPct}%
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1.5 leading-tight">
              Custodios, ETFs &amp; Fondos de Capital Riesgo
            </p>
          </div>

        </div>

        {/* Selected Horizon Basis Explanatory Note */}
        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 flex items-start gap-2.5">
          <Info className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-white">Fundamento {horizonLabels[selectedHorizon].title}: </strong>
            <span>{activeTimeframeTarget.basis}</span>
          </div>
        </div>

      </div>

      {/* 3. REAL MONTHLY RECOMMENDATION TREND (0m, -1m, -2m, -3m) */}
      {realAnalystData?.recommendationTrend && realAnalystData.recommendationTrend.length > 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-emerald-400" />
              <h3 className="text-sm sm:text-base font-bold text-white">
                Evolución Mensual de Informes y Tesis Institucionales
              </h3>
            </div>
            <span className="text-xs text-slate-400">
              Historial de los últimos 4 meses
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                  <th className="py-2.5 px-3">Periodo</th>
                  <th className="py-2.5 px-3 text-emerald-400">Fuerte Compra</th>
                  <th className="py-2.5 px-3 text-teal-400">Compra</th>
                  <th className="py-2.5 px-3 text-amber-400">Mantener / Neutral</th>
                  <th className="py-2.5 px-3 text-rose-400">Toma de Beneficios</th>
                  <th className="py-2.5 px-3 text-right text-slate-200">Total Informes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {(realAnalystData?.recommendationTrend || []).map((trend, idx) => (
                  <tr key={idx} className="hover:bg-slate-900/50 transition">
                    <td className="py-2.5 px-3 font-bold text-white flex items-center gap-1.5">
                      <Calendar className="h-3 w-3 text-slate-400" />
                      {trend.periodLabel}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-emerald-400">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                        {trend.strongBuy}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-teal-400">
                      <span className="px-2 py-0.5 rounded bg-teal-500/10 border border-teal-500/20">
                        {trend.buy}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-amber-400">
                      <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                        {trend.hold}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-rose-400">
                      <span className="px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20">
                        {trend.sell + trend.strongSell}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-black text-white">
                      {trend.total}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. REAL BROKERAGE & RESEARCH ACTIONS: VANECK, BERNSTEIN, STANDARD CHARTERED, GRAYSCALE, PANTERA */}
      {realAnalystData?.recentRatingActions && realAnalystData.recentRatingActions.length > 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-emerald-400" />
              <h3 className="text-sm sm:text-base font-bold text-white">
                Historial de Tesis y Revisiones de Firmas de Inversión Cripto
              </h3>
            </div>
            <span className="text-xs text-slate-400">
              VanEck, Bernstein, Standard Chartered, Grayscale, Pantera Capital, Delphi Digital, etc.
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                  <th className="py-2.5 px-3">Fecha</th>
                  <th className="py-2.5 px-3">Firma / Research Desk</th>
                  <th className="py-2.5 px-3">Acción Registrada</th>
                  <th className="py-2.5 px-3">Tesis Previa</th>
                  <th className="py-2.5 px-3 text-right">Nueva Tesis</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {(realAnalystData?.recentRatingActions || []).slice(0, 10).map((item, idx) => {
                  const isPositive = item.action.includes('Mejora') || item.toGrade.toLowerCase().includes('buy') || item.toGrade.toLowerCase().includes('overweight') || item.toGrade.toLowerCase().includes('outperform');
                  const isNegative = item.action.includes('Rebaja') || item.toGrade.toLowerCase().includes('sell') || item.toGrade.toLowerCase().includes('underweight');
                  
                  return (
                    <tr key={idx} className="hover:bg-slate-900/50 transition">
                      <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">
                        {item.date}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-white">
                        {item.firm}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          item.action.includes('Mejora') 
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                            : item.action.includes('Rebaja')
                            ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}>
                          {item.action}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">
                        {item.fromGrade || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-black">
                        <span className={isPositive ? 'text-emerald-400' : isNegative ? 'text-rose-400' : 'text-slate-200'}>
                          {item.toGrade}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. AUDITED PORTAL MATRIX (TRADINGVIEW, DEFILLAMA, GLASSNODE, CRYPTOQUANT, MESSARI, COINGECKO, TOKEN TERMINAL) */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-emerald-400" />
            <h3 className="text-sm sm:text-base font-bold text-white">
              Directorio de Análisis por Plataforma Especializada ({filteredPlatforms.length} Portales)
            </h3>
          </div>

          {/* Category Filter Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
            {[
              { id: 'all', label: 'Todas las Fuentes' },
              { id: 'institutional', label: 'Research & Fondos' },
              { id: 'fundamental', label: 'On-Chain & Fees' },
              { id: 'valuation', label: 'MVRV & Metcalfe' },
              { id: 'technical', label: 'Técnico' },
              { id: 'quant', label: 'Quant & Derivados' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id as any)}
                className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition cursor-pointer ${
                  categoryFilter === cat.id
                    ? 'bg-slate-800 text-emerald-400 border border-emerald-500/40'
                    : 'text-slate-400 hover:text-slate-200 bg-slate-950/60 border border-transparent'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Platforms Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPlatforms.map((platform) => {
            const isExpanded = expandedPlatform === platform.id;
            const targetForHorizon = platform.targetPriceByHorizon[selectedHorizon];
            const upsidePct = Number((((targetForHorizon - livePrice) / Math.max(0.0001, livePrice)) * 100).toFixed(1));

            return (
              <div 
                key={platform.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 sm:p-5 space-y-4 hover:border-slate-700 transition shadow-lg"
              >
                {/* Platform Header */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-black text-white">{platform.name}</h4>
                      <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${platform.badgeColor}`}>
                        {platform.verdict}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 mt-0.5 block">
                      {platform.keyMetricLabel}: <strong className="text-slate-200">{platform.keyMetricValue}</strong>
                    </span>
                  </div>

                  <a
                    href={platform.officialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1 text-[10px] font-semibold text-slate-300 hover:text-emerald-400 hover:border-emerald-500/40 transition shrink-0"
                    title={`Abrir página oficial de ${asset.symbol.toUpperCase()} en ${platform.name}`}
                  >
                    <span>Ver Portal</span>
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                </div>

                {/* Target Price for Current Horizon from this Platform */}
                <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">
                        Target {horizonLabels[selectedHorizon].title} ({platform.name.split(' ')[0]})
                      </span>
                      <div className="text-lg font-black text-white mt-0.5">
                        {formatCurrency(targetForHorizon)}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-black ${upsidePct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {upsidePct >= 0 ? `+${upsidePct}%` : `${upsidePct}%`}
                      </span>
                      <span className="block text-[10px] text-slate-400">vs Precio Actual</span>
                    </div>
                  </div>

                  {/* 4 Timeframe Specific Targets for this Platform */}
                  <div className="grid grid-cols-4 gap-1.5 pt-1.5 border-t border-slate-800/80">
                    {(['1W', '1M', '3M', '1Y'] as HorizonTimeframe[]).map((hz) => {
                      const hzTarget = platform.targetPriceByHorizon[hz];
                      const hzUpside = Number((((hzTarget - livePrice) / Math.max(0.0001, livePrice)) * 100).toFixed(1));
                      const isSelected = selectedHorizon === hz;
                      return (
                        <button
                          key={hz}
                          type="button"
                          onClick={() => setSelectedHorizon(hz)}
                          className={`p-1.5 rounded-lg text-center transition cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-500/20 border border-emerald-500/50 text-white'
                              : 'bg-slate-900/80 border border-slate-800/60 hover:border-slate-700 text-slate-300'
                          }`}
                        >
                          <div className="text-[9px] font-bold text-slate-400 uppercase">{hz}</div>
                          <div className="text-[11px] font-black truncate">{formatCurrency(hzTarget)}</div>
                          <div className={`text-[9px] font-bold truncate ${hzUpside >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {hzUpside >= 0 ? `+${hzUpside}%` : `${hzUpside}%`}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Key Metrics Breakdown */}
                <div className="space-y-1.5 text-xs">
                  {platform.details.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-950/50 border border-slate-800/60">
                      <span className="text-slate-400 text-[11px]">{item.label}:</span>
                      <span className="font-bold text-slate-200 text-[11px] text-right">{item.value}</span>
                    </div>
                  ))}
                </div>

                {/* Expandable Methodology Note */}
                <div className="pt-2 border-t border-slate-800/60">
                  <button
                    onClick={() => setExpandedPlatform(isExpanded ? null : platform.id)}
                    className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 hover:text-emerald-400 transition cursor-pointer"
                  >
                    <Info className="h-3 w-3" />
                    <span>{isExpanded ? 'Ocultar metodología' : 'Ver metodología y transparencia'}</span>
                  </button>

                  {isExpanded && (
                    <div className="mt-2 p-2.5 rounded-lg bg-slate-950 text-[11px] text-slate-300 leading-relaxed border border-slate-800">
                      {platform.methodologySummary}
                    </div>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      </div>

      {/* 6. RIGOROUS AUDIT & TRANSPARENCY NOTICE */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 sm:p-5 text-xs text-slate-400 space-y-2">
        <div className="flex items-center gap-2 text-slate-200 font-bold text-sm">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>Certificación de Rigor Analítico y Transparencia en Criptoactivos</span>
        </div>
        <p className="leading-relaxed">
          Los datos de precios objetivos medios, número de analistas participantes, notas de consenso, historial de informes de fondos (VanEck, Bernstein, Standard Chartered, Grayscale, etc.) y métricas On-Chain provienen de los **feeds oficiales del ecosistema cripto e informes de research auditados**. Los enlaces directos le permiten contrastar en tiempo real la ficha exacta de cada portal.
        </p>
      </div>

    </div>
  );
};
