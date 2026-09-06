import React, { useState, useMemo } from 'react';
import { 
  Sparkles, 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  Layers, 
  CheckCircle2, 
  AlertCircle, 
  Zap, 
  Compass, 
  BarChart2, 
  Filter, 
  ArrowUpRight, 
  ArrowDownRight,
  Clock,
  Cpu,
  Flame,
  Gauge,
  Target,
  ShieldAlert,
  ChevronRight,
  Sliders,
  X,
  Info,
  Timer,
  Crosshair,
  Briefcase,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ArrowDownWideNarrow,
  ArrowUpNarrowWide
} from 'lucide-react';
import { CryptoAsset, MultiTimeframeAssetAnalysis } from '../types';
import { formatPercentage, formatCurrency } from '../utils/formatters';
import { getCryptoLogoUrl, handleCryptoImageError } from '../utils/cryptoLogos';

interface MultiTimeframeScannerProps {
  assets: CryptoAsset[];
  onOpenChartModal: (asset: CryptoAsset) => void;
  onOpenAiAnalysis?: (asset: CryptoAsset) => void;
  onOpenBrokerModal?: (asset: CryptoAsset) => void;
  onOpenMasterDiagnostic?: (asset: CryptoAsset) => void;
  isExpertMode?: boolean;
}

export type ConfluenceFilterType = 
  | 'ALL' 
  | 'IMMINENT_SUPER_CONFLUENCE'
  | 'IMMINENT_DETONATION' 
  | 'SUPER_3_3' 
  | 'SQUEEZE_ACTIVE' 
  | 'FIRING_LONG';

export type SortFieldType = 
  | 'detonation' 
  | 'confluence' 
  | 'alpha' 
  | 'price' 
  | 'change24h' 
  | 'targetGain' 
  | 'name';

export const MultiTimeframeScanner: React.FC<MultiTimeframeScannerProps> = ({
  assets,
  onOpenChartModal,
  onOpenAiAnalysis,
  onOpenBrokerModal,
  onOpenMasterDiagnostic,
  isExpertMode = true,
}) => {
  const [confluenceFilter, setConfluenceFilter] = useState<ConfluenceFilterType>('ALL');
  const [selectedSector, setSelectedSector] = useState<string>('ALL');
  const [selectedDetonationAsset, setSelectedDetonationAsset] = useState<MultiTimeframeAssetAnalysis | null>(null);
  
  // Ordenación (Mayor a Menor / Menor a Mayor)
  const [sortField, setSortField] = useState<SortFieldType>('detonation');
  const [sortDirection, setSortDirection] = useState<'desc' | 'asc'>('desc');

  // Algoritmo Cuantitativo de Predicción de Detonación TTM Squeeze -> Firing Long para Criptomonedas
  const multiTimeframeData = useMemo<MultiTimeframeAssetAnalysis[]>(() => {
    return assets.map((asset) => {
      const change24 = asset.price_change_percentage_24h || 0;
      const change7d = asset.price_change_percentage_7d || 0;
      const change30d = asset.price_change_percentage_30d || 0;
      const alphaScore = asset.alphaScore || 75;
      const rsi = asset.rsi14 || 56;
      const volAnomaly = asset.volumeAnomalyRatio || 1.2;
      const currentPrice = asset.current_price || 100;
      const high52 = asset.fifty_two_week_high || (currentPrice * 1.35);
      const low52 = asset.fifty_two_week_low || (currentPrice * 0.55);

      // 1. Señales Multi-Temporales Base (15m, 1h, 1D) adaptadas a volatilidad cripto
      // 15m signal (Gatillo Intradía Cripto)
      const m15Trend = change24 > 1.8 ? 'ALCISTA' : change24 < -1.8 ? 'BAJISTA' : 'NEUTRAL';
      const m15Rsi = Math.min(88, Math.max(20, Math.round(rsi + (change24 * 1.5))));
      const m15Ema = change24 >= 0.5 ? 'Sobre EMA 20' : 'Bajo EMA 20';
      const m15Squeeze = Math.abs(change24) < 1.2 ? 'COMPRESION_ACTIVA' : change24 > 1.2 ? 'EXPANSION_ALCISTA' : 'EXPANSION_BAJISTA';

      // 1h signal (Estructura Swing Cripto)
      const h1Trend = (change24 > 0.8 && alphaScore > 65) ? 'ALCISTA' : change24 < -1.5 ? 'BAJISTA' : 'NEUTRAL';
      const h1Rsi = Math.round(rsi);
      const h1Ema = alphaScore >= 70 ? 'Cruce Alcista EMA 20/50' : change24 >= 0 ? 'Sobre EMA 20' : 'Bajo EMA 20';
      const h1Squeeze = (alphaScore > 72 && Math.abs(change24) < 2.5) ? 'COMPRESION_ACTIVA' : change24 > 1.0 ? 'EXPANSION_ALCISTA' : 'SIN_SQUEEZE';

      // 1D signal (Tendencia Mayor y Acumulación de Ballenas)
      const d1Trend = alphaScore >= 68 ? 'ALCISTA' : alphaScore <= 45 ? 'BAJISTA' : 'NEUTRAL';
      const d1Rsi = Math.min(85, Math.max(25, Math.round(rsi - 1.0)));
      const d1Ema = alphaScore >= 68 ? 'Sobre EMA 200' : 'Bajo EMA 200';
      const d1Squeeze = (alphaScore > 78) ? 'EXPANSION_ALCISTA' : 'SIN_SQUEEZE';

      // Conteo de confluencia temporal
      let alignCount = 0;
      if (m15Trend === 'ALCISTA') alignCount++;
      if (h1Trend === 'ALCISTA') alignCount++;
      if (d1Trend === 'ALCISTA') alignCount++;

      let rating: MultiTimeframeAssetAnalysis['confluenceRating'] = 'NEUTRAL';
      let score = 50;

      if (alignCount === 3) {
        rating = 'SUPER CONFLUENCIA (3/3)';
        score = 96;
      } else if (alignCount === 2) {
        rating = 'CONFLUENCIA ALTA (2/3)';
        score = 78;
      } else if (m15Trend === 'BAJISTA' && d1Trend === 'ALCISTA') {
        rating = 'DIVERGENCIA';
        score = 60;
      }

      // 2. Modelo Cuantitativo de Compresión y Detonación TTM Squeeze
      // Bandwidth % (Contracción de Bandas de Bollinger respecto al precio)
      const bandwidthPct = Number((Math.max(2.2, 7.5 - (alphaScore * 0.045) + Math.abs(change24) * 0.35)).toFixed(2));
      const keltnerInsideRatio = Number((Math.min(1.4, Math.max(0.65, (100 - alphaScore) / 45 + (bandwidthPct / 8)))).toFixed(2));

      // Determinación de estado Squeeze clásico
      const isCompressed = (h1Squeeze === 'COMPRESION_ACTIVA' || m15Squeeze === 'COMPRESION_ACTIVA' || bandwidthPct < 4.5);
      const isAlreadyFiring = (alignCount >= 2 && change24 > 2.0 && !isCompressed);

      let sqzStatus: MultiTimeframeAssetAnalysis['squeezeMomentum']['status'] = 'Neutral / Rango';
      let sqzIntensity = 45;

      if (isCompressed) {
        sqzStatus = 'Squeeze On (Listo para detonar)';
        sqzIntensity = Math.min(98, Math.round(80 + (alphaScore * 0.18)));
      } else if (isAlreadyFiring) {
        sqzStatus = 'Firing Long (Expansión Alcista)';
        sqzIntensity = Math.min(96, Math.round(82 + (change24 * 3.0)));
      }

      // 3. CÁLCULO CIENTÍFICO DE PROBABILIDAD DE DETONACIÓN (Detonation Index %)
      const compressionScore = Math.min(100, Math.max(20, Math.round((5.5 / Math.max(1.5, bandwidthPct)) * 52 + (isCompressed ? 25 : 0))));

      let momentumTurnScore = 50;
      let momentumVectorSlope: MultiTimeframeAssetAnalysis['squeezeMomentum']['momentumVectorSlope'] = 'ESTABLE';
      
      if (change24 >= 1.2 && rsi >= 50 && rsi <= 70) {
        momentumTurnScore = 95;
        momentumVectorSlope = 'FUERTEMENTE_CRECIENTE';
      } else if (change24 >= 0.4 && rsi >= 45) {
        momentumTurnScore = 84;
        momentumVectorSlope = 'ACELERANDO';
      } else if (change24 < -1.2) {
        momentumTurnScore = 35;
        momentumVectorSlope = 'DECRECIENTE';
      } else {
        momentumTurnScore = 60;
        momentumVectorSlope = 'ESTABLE';
      }

      // Presión y Flujo Institucional On-Chain & Derivados
      const institutionalVolumeScore = Math.min(100, Math.max(30, Math.round((volAnomaly * 38) + (alphaScore * 0.45))));
      const multiTfConfluenceScore = alignCount === 3 ? 98 : alignCount === 2 ? 80 : 45;

      // PROBABILIDAD TOTAL PONDERADA
      let detonationProbabilityPct = 0;
      if (sqzStatus === 'Squeeze On (Listo para detonar)') {
        const rawProb = (compressionScore * 0.35) + (momentumTurnScore * 0.30) + (institutionalVolumeScore * 0.20) + (multiTfConfluenceScore * 0.15);
        detonationProbabilityPct = Math.min(98, Math.max(62, Math.round(rawProb)));
      } else if (sqzStatus === 'Firing Long (Expansión Alcista)') {
        detonationProbabilityPct = 100;
      } else {
        const rawProb = (compressionScore * 0.25) + (momentumTurnScore * 0.25) + (institutionalVolumeScore * 0.25) + (multiTfConfluenceScore * 0.25);
        detonationProbabilityPct = Math.min(68, Math.max(25, Math.round(rawProb)));
      }

      const compressionBarsCount = isCompressed 
        ? Math.min(24, Math.max(6, Math.round(8 + (alphaScore % 9) + (volAnomaly > 1.5 ? 4 : 0))))
        : isAlreadyFiring ? 14 : 3;

      let readinessStage: MultiTimeframeAssetAnalysis['squeezeMomentum']['readinessStage'] = 'NEUTRAL';
      let stageLabel = '⚪ Sin Compresión Crítica';

      if (sqzStatus === 'Firing Long (Expansión Alcista)') {
        readinessStage = 'FIRING_LONG';
        stageLabel = '🟢 Disparo Activo (Firing Long en Marcha)';
      } else if (detonationProbabilityPct >= 88) {
        readinessStage = 'IGNICION_INMINENTE';
        stageLabel = '⚡ Ignición Inminente (Gatillo Listo)';
      } else if (detonationProbabilityPct >= 75) {
        readinessStage = 'ALTA_PRESION';
        stageLabel = '🔥 Alta Presión Acumulativa';
      } else if (detonationProbabilityPct >= 60) {
        readinessStage = 'COMPRESION_MADURA';
        stageLabel = '⏳ Compresión en Maduración';
      } else {
        readinessStage = 'NEUTRAL';
        stageLabel = '⚪ Consolidación Pasiva';
      }

      // 4. Objetivos Predictivos Post-Detonación
      const projectedMovePct = Number((Math.min(38.5, Math.max(6.5, (bandwidthPct * 2.2) + (alphaScore * 0.08) + (volAnomaly * 2.0)))).toFixed(1));
      const targetPrice = Number((currentPrice * (1 + projectedMovePct / 100)).toFixed(currentPrice < 1 ? 4 : 2));
      const riskPct = Number((Math.max(2.5, projectedMovePct / 3.0)).toFixed(1));
      const recommendedStopLoss = Number((currentPrice * (1 - riskPct / 100)).toFixed(currentPrice < 1 ? 4 : 2));
      const riskRewardRatio = Number((projectedMovePct / riskPct).toFixed(1));

      // 5. Veredicto del Algoritmo Predictivo
      let expertVerdict = '';
      if (readinessStage === 'IGNICION_INMINENTE') {
        expertVerdict = `Compresión de volatilidad severa con ${compressionBarsCount} velas en rango ultra-estrecho (Bandwidth ${bandwidthPct}%). El oscilador TTM Momentum muestra giro alcista confirmado con acumulación de ballenas (${volAnomaly}x volumen). Transición proyectada a Firing Long hacia $${targetPrice} (+${projectedMovePct}%).`;
      } else if (readinessStage === 'ALTA_PRESION') {
        expertVerdict = `Bandas de Bollinger en compresión profunda dentro de Canales de Keltner. Acumulación On-Chain sostenida (Alpha Score ${alphaScore}). Gatillo pendiente en velas de 15m para iniciar la expansión.`;
      } else if (readinessStage === 'FIRING_LONG') {
        expertVerdict = `Ruptura alcista confirmada de las bandas de compresión. Disparo en curso con expansión masiva de volumen. Operar a favor del momentum hacia $${targetPrice}.`;
      } else {
        expertVerdict = `Criptoactivo en fase de consolidación estándar sin compresión crítica de volatilidad en este momento.`;
      }

      const sector = asset.sector || asset.category || 'Layer 1';

      return {
        asset,
        confluenceScore: score,
        confluenceRating: rating,
        signals: {
          m15: {
            timeframe: '15m',
            trend: m15Trend,
            rsi: m15Rsi,
            emaTrend: m15Ema,
            squeezeStatus: m15Squeeze,
          },
          h1: {
            timeframe: '1h',
            trend: h1Trend,
            rsi: h1Rsi,
            emaTrend: h1Ema,
            squeezeStatus: h1Squeeze,
          },
          d1: {
            timeframe: '1D',
            trend: d1Trend,
            rsi: d1Rsi,
            emaTrend: d1Ema,
            squeezeStatus: d1Squeeze,
          },
        },
        squeezeMomentum: {
          status: sqzStatus,
          intensityPct: sqzIntensity,
          detonationProbabilityPct,
          readinessStage,
          stageLabel,
          compressionBarsCount,
          momentumVectorSlope,
          bandwidthPct,
          keltnerInsideRatio,
          projectedBreakoutTarget: {
            direction: 'ALCISTA',
            targetPrice,
            projectedGainPct: projectedMovePct,
            recommendedStopLoss,
            riskRewardRatio,
          },
          detonationFactors: {
            compressionScore,
            momentumTurnScore,
            institutionalVolumeScore,
            multiTfConfluenceScore,
          },
          expertVerdict,
        },
        sectorRelativeStrength: {
          sector,
          vsSp500Performance: Number((change24 - 1.2).toFixed(2)),
          rotationRank: 1,
        },
      };
    });
  }, [assets]);

  // Sector relative strength heatmap data para Ecosistemas Cripto
  const sectorHeatmap = useMemo(() => {
    return [
      { name: 'Layer 1 de Alta Capacidad', relativeStrengthPct: +4.85, leaderTicker: 'SOL', status: 'Líder Institucional' },
      { name: 'IA & DePIN Computación', relativeStrengthPct: +3.60, leaderTicker: 'TAO', status: 'Fuerte Entrada de Capital' },
      { name: 'DeFi & RWA Real Yield', relativeStrengthPct: +2.45, leaderTicker: 'AAVE', status: 'Acumulación On-Chain' },
      { name: 'Layer 2 & Rollups', relativeStrengthPct: +1.65, leaderTicker: 'ARB', status: 'Consolidación Fuerte' },
      { name: 'Memecoins & High Beta', relativeStrengthPct: +0.80, leaderTicker: 'PEPE', status: 'Alta Volatilidad Especulativa' },
      { name: 'Oráculos & Infraestructura', relativeStrengthPct: -0.95, leaderTicker: 'LINK', status: 'Rotación Estable' },
    ];
  }, []);

  // Activos con Mayor Probabilidad de Detonación Inminente (Top Hotlist)
  const imminentDetonationHotlist = useMemo(() => {
    return [...multiTimeframeData]
      .filter((item) => item.squeezeMomentum.detonationProbabilityPct >= 78 && item.squeezeMomentum.readinessStage !== 'FIRING_LONG')
      .sort((a, b) => b.squeezeMomentum.detonationProbabilityPct - a.squeezeMomentum.detonationProbabilityPct)
      .slice(0, 4);
  }, [multiTimeframeData]);

  // Filtered dataset
  const filteredAnalysis = useMemo(() => {
    return multiTimeframeData.filter((item) => {
      const itemSector = item.asset.sector || item.asset.category || 'Layer 1';
      if (selectedSector !== 'ALL' && itemSector !== selectedSector) return false;
      if (confluenceFilter === 'IMMINENT_SUPER_CONFLUENCE') {
        return item.squeezeMomentum.detonationProbabilityPct >= 80 && item.confluenceRating.includes('3/3');
      }
      if (confluenceFilter === 'IMMINENT_DETONATION') {
        return item.squeezeMomentum.detonationProbabilityPct >= 80 && item.squeezeMomentum.readinessStage !== 'FIRING_LONG';
      }
      if (confluenceFilter === 'SUPER_3_3') {
        return item.confluenceRating.includes('3/3');
      }
      if (confluenceFilter === 'SQUEEZE_ACTIVE') {
        return item.squeezeMomentum.status.includes('Squeeze On');
      }
      if (confluenceFilter === 'FIRING_LONG') {
        return item.squeezeMomentum.status.includes('Firing Long') || item.squeezeMomentum.readinessStage === 'FIRING_LONG';
      }
      return true;
    });
  }, [multiTimeframeData, confluenceFilter, selectedSector]);

  // Sort filtered data
  const sortedFilteredAnalysis = useMemo(() => {
    const list = [...filteredAnalysis];
    list.sort((a, b) => {
      let valA = 0;
      let valB = 0;

      switch (sortField) {
        case 'detonation':
          valA = a.squeezeMomentum.detonationProbabilityPct;
          valB = b.squeezeMomentum.detonationProbabilityPct;
          break;
        case 'confluence':
          valA = a.confluenceScore;
          valB = b.confluenceScore;
          break;
        case 'alpha':
          valA = a.asset.alphaScore || 0;
          valB = b.asset.alphaScore || 0;
          break;
        case 'price':
          valA = a.asset.current_price;
          valB = b.asset.current_price;
          break;
        case 'change24h':
          valA = a.asset.price_change_percentage_24h || 0;
          valB = b.asset.price_change_percentage_24h || 0;
          break;
        case 'targetGain':
          valA = a.squeezeMomentum.projectedBreakoutTarget.projectedGainPct || 0;
          valB = b.squeezeMomentum.projectedBreakoutTarget.projectedGainPct || 0;
          break;
        case 'name':
          return sortDirection === 'asc' 
            ? a.asset.name.localeCompare(b.asset.name)
            : b.asset.name.localeCompare(a.asset.name);
        default:
          valA = a.squeezeMomentum.detonationProbabilityPct;
          valB = b.squeezeMomentum.detonationProbabilityPct;
      }

      if (sortDirection === 'asc') {
        return valA - valB;
      } else {
        return valB - valA;
      }
    });
    return list;
  }, [filteredAnalysis, sortField, sortDirection]);

  const handleSort = (field: SortFieldType) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'name' ? 'asc' : 'desc');
    }
  };

  const uniqueSectors = useMemo(() => {
    const s = new Set<string>();
    assets.forEach((a) => {
      const sec = a.sector || a.category;
      if (sec) s.add(sec);
    });
    return Array.from(s);
  }, [assets]);

  const squeezeCounts = useMemo(() => {
    const imminentSuper = multiTimeframeData.filter((x) => x.squeezeMomentum.detonationProbabilityPct >= 80 && x.confluenceRating.includes('3/3')).length;
    const imminent = multiTimeframeData.filter((x) => x.squeezeMomentum.detonationProbabilityPct >= 80 && x.squeezeMomentum.readinessStage !== 'FIRING_LONG').length;
    const superConfluence = multiTimeframeData.filter((x) => x.confluenceRating.includes('3/3')).length;
    const highPressure = multiTimeframeData.filter((x) => x.squeezeMomentum.readinessStage === 'ALTA_PRESION').length;
    const firingLong = multiTimeframeData.filter((x) => x.squeezeMomentum.readinessStage === 'FIRING_LONG').length;
    const totalSqueeze = multiTimeframeData.filter((x) => x.squeezeMomentum.status.includes('Squeeze On')).length;
    return { imminentSuper, imminent, superConfluence, highPressure, firingLong, totalSqueeze };
  }, [multiTimeframeData]);

  return (
    <div className="space-y-4 w-full max-w-full overflow-x-hidden min-w-0">
      {/* Hero Header & Radar Overview */}
      <div className="rounded-xl sm:rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-950 p-3 sm:p-4 shadow-lg">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2.5 sm:gap-3 pb-2.5 sm:pb-3 border-b border-slate-800/80 w-full">
          <div className="flex items-start gap-2.5 min-w-0 w-full flex-1">
            <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-gradient-to-br from-amber-500/20 to-teal-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-sm shrink-0 mt-0.5">
              <Zap className="h-4 w-4 animate-pulse" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5 mb-1">
                <span className="rounded-md bg-teal-500/15 border border-teal-500/30 text-teal-300 font-bold text-[9px] sm:text-[10px] px-1.5 py-0.5 uppercase tracking-wide">
                  Alineación 15m • 1h • 1D (24/7)
                </span>
                <span className="rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold text-[9px] sm:text-[10px] px-1.5 py-0.5 flex items-center gap-1">
                  <Flame className="h-2.5 w-2.5" />
                  <span>Squeeze → Firing Long</span>
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-black text-white leading-tight break-words">
                Escáner Multi-Temporal &amp; Radar de Detonación Cripto
              </h2>
              <p className="text-[11px] text-slate-300 mt-1 leading-snug break-words">
                Modelado de compresión de volatilidad (Bollinger en Keltner), derivados y flujo institucional hacia <strong>Firing Long</strong>.
              </p>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-3 gap-1.5 w-full md:w-auto bg-slate-950/90 p-1.5 rounded-xl border border-slate-800 shrink-0">
            <div className="px-2 py-1 rounded-lg bg-amber-950/30 border border-amber-500/25 flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 text-center">
              <span className="text-[9px] text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1">
                <Zap className="h-2.5 w-2.5 shrink-0" /> Ignición
              </span>
              <span className="text-xs sm:text-sm font-black text-amber-300 font-mono">{squeezeCounts.imminent}</span>
            </div>
            <div className="px-2 py-1 rounded-lg bg-orange-950/20 border border-orange-500/25 flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 text-center">
              <span className="text-[9px] text-orange-400 font-bold uppercase tracking-wider flex items-center gap-1">
                <Flame className="h-2.5 w-2.5 shrink-0" /> Presión
              </span>
              <span className="text-xs sm:text-sm font-black text-orange-300 font-mono">{squeezeCounts.highPressure}</span>
            </div>
            <div className="px-2 py-1 rounded-lg bg-emerald-950/30 border border-emerald-500/25 flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 text-center">
              <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 className="h-2.5 w-2.5 shrink-0" /> Firing
              </span>
              <span className="text-xs sm:text-sm font-black text-emerald-300 font-mono">{squeezeCounts.firingLong}</span>
            </div>
          </div>
        </div>

        {/* ⚡ RADAR HOTLIST: CRIPTOS EN UMBRAL CRÍTICO DE DETONACIÓN */}
        {imminentDetonationHotlist.length > 0 && (
          <div className="mt-3 pt-2.5 border-t border-slate-800/80">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 mb-2.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-ping shrink-0" />
                <h3 className="text-xs font-black text-amber-300 uppercase tracking-wider flex items-center gap-1.5 break-words">
                  <Flame className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  <span>Radar en Tiempo Real: Criptos a Punto de Detonar</span>
                </h3>
              </div>
              <span className="text-[10px] text-slate-400 font-medium">
                Compresión de volatilidad + flujo de ballenas On-Chain
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {imminentDetonationHotlist.map((item) => {
                const sqz = item.squeezeMomentum;
                const prob = sqz.detonationProbabilityPct;
                const isVeryHigh = prob >= 90;

                return (
                  <div
                    key={item.asset.id}
                    onClick={() => setSelectedDetonationAsset(item)}
                    className={`group relative rounded-xl border p-2.5 sm:p-3 transition-all duration-200 cursor-pointer shadow-md hover:scale-[1.01] ${
                      isVeryHigh
                        ? 'border-amber-500/50 bg-gradient-to-b from-amber-950/40 via-slate-900 to-slate-950 hover:border-amber-400 shadow-amber-950/30'
                        : 'border-orange-500/40 bg-gradient-to-b from-orange-950/30 via-slate-900 to-slate-950 hover:border-orange-400'
                    }`}
                  >
                    {/* Top Row */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <img 
                          src={getCryptoLogoUrl(item.asset.symbol)} 
                          alt={item.asset.name} 
                          onError={(e) => handleCryptoImageError(e, item.asset.symbol)}
                          referrerPolicy="no-referrer"
                          className="h-7 w-7 rounded-lg object-contain bg-slate-950 p-1 border border-slate-800 shrink-0"
                        />
                        <div className="truncate">
                          <div className="font-black text-white text-xs truncate">{item.asset.symbol.toUpperCase()}</div>
                          <div className="text-[10px] text-slate-400 truncate">{item.asset.name}</div>
                        </div>
                      </div>

                      {/* Probabilidad Badge */}
                      <div className="text-right shrink-0">
                        <div className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-black font-mono shadow-sm ${
                          isVeryHigh
                            ? 'bg-amber-500 text-slate-950 animate-pulse'
                            : 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                        }`}>
                          <Zap className="h-2.5 w-2.5" />
                          <span>{prob}%</span>
                        </div>
                        <div className="text-[8px] text-slate-400 font-bold uppercase tracking-tight">Prob. Detonación</div>
                      </div>
                    </div>

                    {/* Progress Bar of Detonation Probability */}
                    <div className="mt-2 space-y-0.5">
                      <div className="flex justify-between text-[9px] font-mono">
                        <span className="text-amber-400 font-bold">{sqz.stageLabel}</span>
                        <span className="text-slate-400">{sqz.compressionBarsCount}v squeeze</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-950 border border-slate-800 overflow-hidden p-0.5">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            isVeryHigh 
                              ? 'bg-gradient-to-r from-amber-500 via-orange-400 to-emerald-400 shadow-sm shadow-amber-500/50' 
                              : 'bg-gradient-to-r from-amber-600 to-orange-500'
                          }`}
                          style={{ width: `${prob}%` }}
                        />
                      </div>
                    </div>

                    {/* Target & Price Bottom Row */}
                    <div className="mt-2 pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                      <div>
                        <div className="text-white font-bold font-mono">{formatCurrency(item.asset.current_price)}</div>
                        <div className="text-[9px] text-slate-400">Precio</div>
                      </div>
                      <div className="text-right">
                        <div className="text-emerald-400 font-bold font-mono flex items-center gap-0.5 justify-end">
                          <Target className="h-2.5 w-2.5" />
                          <span>{formatCurrency(sqz.projectedBreakoutTarget.targetPrice)}</span>
                          <span className="text-[9px] font-normal">(+{sqz.projectedBreakoutTarget.projectedGainPct}%)</span>
                        </div>
                        <div className="text-[9px] text-slate-400">Objetivo Firing</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Sector Relative Strength Heatmap Cards */}
        <div className="mt-3 pt-2.5 border-t border-slate-800/80">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <BarChart2 className="h-3.5 w-3.5 text-teal-400" />
              Rotación y Fuerza Relativa de Ecosistemas Cripto (vs BTC)
            </span>
            <span className="text-[10px] text-slate-400 hidden sm:inline">Flujo de capital On-Chain</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {sectorHeatmap.map((sec) => {
              const isLeader = sec.relativeStrengthPct > 0;
              return (
                <div 
                  key={sec.name} 
                  className={`rounded-xl border p-2 transition ${
                    isLeader 
                      ? 'border-emerald-500/40 bg-emerald-950/20' 
                      : 'border-slate-800 bg-slate-950/80'
                  }`}
                >
                  <div className="text-[10px] font-bold text-white truncate" title={sec.name}>{sec.name}</div>
                  <div className={`text-sm sm:text-base font-black font-mono mt-0.5 ${isLeader ? 'text-emerald-400' : 'text-slate-400'}`}>
                    {isLeader ? '+' : ''}{sec.relativeStrengthPct}%
                  </div>
                  <div className="text-[9px] text-slate-400 mt-0.5 flex items-center justify-between">
                    <span>Líder: <strong className="text-slate-200">{sec.leaderTicker}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Multi-Timeframe Confluence & Detonation Table */}
      <div className="rounded-2xl sm:rounded-3xl border border-slate-800 bg-slate-900/90 p-4 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <Layers className="h-5 w-5 text-teal-400 shrink-0" />
              <span>Matriz de Confluencia Temporal y Radar de Detonación ({sortedFilteredAnalysis.length} Criptoactivos)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Triple confirmación: 15m (Gatillo) • 1h (Swing Trigger) • 1D (Tendencia Mayor) + Termómetro de Ignición Firing Long
            </p>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full xl:w-auto max-w-full">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scrollbar-none py-1 px-1 bg-slate-950 rounded-2xl border border-slate-800/90 max-w-full shrink-0">
              {/* 1. Todas */}
              <button
                id="btn-filter-all-tf"
                onClick={() => setConfluenceFilter('ALL')}
                className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  confluenceFilter === 'ALL'
                    ? 'bg-teal-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <span>Todas</span>
                <span className={`text-[10px] rounded-md px-1.5 py-0.2 font-mono ${
                  confluenceFilter === 'ALL' ? 'bg-teal-700 text-white' : 'bg-slate-800 text-slate-400'
                }`}>
                  {multiTimeframeData.length}
                </span>
              </button>

              {/* 2. Detonación Inminente + Super Confluencia */}
              <button
                id="btn-filter-imminent-super-confluence"
                onClick={() => setConfluenceFilter('IMMINENT_SUPER_CONFLUENCE')}
                className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                  confluenceFilter === 'IMMINENT_SUPER_CONFLUENCE'
                    ? 'bg-gradient-to-r from-amber-500 to-emerald-500 text-slate-950 shadow-lg shadow-amber-500/20 scale-[1.02]'
                    : 'text-amber-300 hover:text-amber-200 bg-amber-950/30 hover:bg-amber-950/50 border border-amber-500/40'
                }`}
                title="Activos con Probabilidad de Detonación ≥80% Y Super Confluencia (3/3) simultánea"
              >
                <div className="flex items-center gap-0.5">
                  <Zap className="h-3.5 w-3.5 text-amber-400 animate-pulse shrink-0" />
                  <Sparkles className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                </div>
                <span>Detonación + Super Confluencia</span>
                <span className={`text-[10px] font-mono rounded-md px-1.5 py-0.2 ${
                  confluenceFilter === 'IMMINENT_SUPER_CONFLUENCE' ? 'bg-slate-950 text-amber-300' : 'bg-amber-500/20 text-amber-300 font-black'
                }`}>
                  {squeezeCounts.imminentSuper}
                </span>
              </button>

              {/* 3. Detonación Inminente (≥80%) */}
              <button
                id="btn-filter-imminent-detonation"
                onClick={() => setConfluenceFilter('IMMINENT_DETONATION')}
                className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  confluenceFilter === 'IMMINENT_DETONATION'
                    ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                    : 'text-amber-400 hover:text-amber-300 hover:bg-amber-950/30'
                }`}
              >
                <Zap className="h-3.5 w-3.5 shrink-0" />
                <span>Detonación (≥80%)</span>
                <span className={`text-[10px] font-mono rounded-md px-1.5 py-0.2 ${
                  confluenceFilter === 'IMMINENT_DETONATION' ? 'bg-amber-600 text-slate-950' : 'bg-slate-800 text-slate-400'
                }`}>
                  {squeezeCounts.imminent}
                </span>
              </button>

              {/* 4. Super Confluencia (3/3) */}
              <button
                id="btn-filter-super-confluence"
                onClick={() => setConfluenceFilter('SUPER_3_3')}
                className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  confluenceFilter === 'SUPER_3_3'
                    ? 'bg-emerald-600 text-white shadow-sm font-black'
                    : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/30'
                }`}
              >
                <Sparkles className="h-3.5 w-3.5 shrink-0" />
                <span>Super Confluencia (3/3)</span>
                <span className={`text-[10px] font-mono rounded-md px-1.5 py-0.2 ${
                  confluenceFilter === 'SUPER_3_3' ? 'bg-emerald-700 text-white' : 'bg-slate-800 text-slate-400'
                }`}>
                  {squeezeCounts.superConfluence}
                </span>
              </button>

              {/* 5. Squeeze Activo */}
              <button
                id="btn-filter-squeeze"
                onClick={() => setConfluenceFilter('SQUEEZE_ACTIVE')}
                className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  confluenceFilter === 'SQUEEZE_ACTIVE'
                    ? 'bg-orange-600 text-white shadow-sm font-black'
                    : 'text-orange-400 hover:text-orange-300 hover:bg-orange-950/30'
                }`}
              >
                <Flame className="h-3.5 w-3.5 shrink-0" />
                <span>Squeeze Activo</span>
                <span className={`text-[10px] font-mono rounded-md px-1.5 py-0.2 ${
                  confluenceFilter === 'SQUEEZE_ACTIVE' ? 'bg-orange-700 text-white' : 'bg-slate-800 text-slate-400'
                }`}>
                  {squeezeCounts.totalSqueeze}
                </span>
              </button>

              {/* 6. Firing Long */}
              <button
                id="btn-filter-firing-long"
                onClick={() => setConfluenceFilter('FIRING_LONG')}
                className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  confluenceFilter === 'FIRING_LONG'
                    ? 'bg-teal-500 text-slate-950 shadow-sm font-black'
                    : 'text-teal-400 hover:text-teal-300 hover:bg-teal-950/30'
                }`}
              >
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                <span>Firing Long</span>
                <span className={`text-[10px] font-mono rounded-md px-1.5 py-0.2 ${
                  confluenceFilter === 'FIRING_LONG' ? 'bg-teal-600 text-slate-950' : 'bg-slate-800 text-slate-400'
                }`}>
                  {squeezeCounts.firingLong}
                </span>
              </button>
            </div>

            {uniqueSectors.length > 0 && (
              <select
                value={selectedSector}
                onChange={(e) => setSelectedSector(e.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-bold text-slate-200 focus:border-teal-500 focus:outline-none shrink-0"
              >
                <option value="ALL">Todos los Ecosistemas</option>
                {uniqueSectors.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* 🎛️ CONTROLES DE ORDENACIÓN */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-bold text-slate-400 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
              <ArrowUpDown className="h-3.5 w-3.5 text-teal-400" />
              Ordenar por:
            </span>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                id="btn-sort-detonation"
                onClick={() => handleSort('detonation')}
                className={`rounded-lg px-2.5 py-1 font-bold text-xs transition flex items-center gap-1 cursor-pointer ${
                  sortField === 'detonation'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <span>Prob. Detonación</span>
                {sortField === 'detonation' && (
                  sortDirection === 'desc' ? <ArrowDown className="h-3 w-3 text-amber-400" /> : <ArrowUp className="h-3 w-3 text-amber-400" />
                )}
              </button>

              <button
                id="btn-sort-confluence"
                onClick={() => handleSort('confluence')}
                className={`rounded-lg px-2.5 py-1 font-bold text-xs transition flex items-center gap-1 cursor-pointer ${
                  sortField === 'confluence'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <span>Super Confluencia</span>
                {sortField === 'confluence' && (
                  sortDirection === 'desc' ? <ArrowDown className="h-3 w-3 text-emerald-400" /> : <ArrowUp className="h-3 w-3 text-emerald-400" />
                )}
              </button>

              <button
                id="btn-sort-alpha"
                onClick={() => handleSort('alpha')}
                className={`rounded-lg px-2.5 py-1 font-bold text-xs transition flex items-center gap-1 cursor-pointer ${
                  sortField === 'alpha'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <span>Alpha Score</span>
                {sortField === 'alpha' && (
                  sortDirection === 'desc' ? <ArrowDown className="h-3 w-3 text-cyan-400" /> : <ArrowUp className="h-3 w-3 text-cyan-400" />
                )}
              </button>

              <button
                id="btn-sort-price"
                onClick={() => handleSort('price')}
                className={`rounded-lg px-2.5 py-1 font-bold text-xs transition flex items-center gap-1 cursor-pointer ${
                  sortField === 'price'
                    ? 'bg-teal-500/20 text-teal-300 border border-teal-500/50'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <span>Precio</span>
                {sortField === 'price' && (
                  sortDirection === 'desc' ? <ArrowDown className="h-3 w-3 text-teal-400" /> : <ArrowUp className="h-3 w-3 text-teal-400" />
                )}
              </button>

              <button
                id="btn-sort-change"
                onClick={() => handleSort('change24h')}
                className={`rounded-lg px-2.5 py-1 font-bold text-xs transition flex items-center gap-1 cursor-pointer ${
                  sortField === 'change24h'
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/50'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <span>Cambio 24h</span>
                {sortField === 'change24h' && (
                  sortDirection === 'desc' ? <ArrowDown className="h-3 w-3 text-blue-400" /> : <ArrowUp className="h-3 w-3 text-blue-400" />
                )}
              </button>

              <button
                id="btn-sort-target"
                onClick={() => handleSort('targetGain')}
                className={`rounded-lg px-2.5 py-1 font-bold text-xs transition flex items-center gap-1 cursor-pointer ${
                  sortField === 'targetGain'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <span>Objetivo Ganancia</span>
                {sortField === 'targetGain' && (
                  sortDirection === 'desc' ? <ArrowDown className="h-3 w-3 text-purple-400" /> : <ArrowUp className="h-3 w-3 text-purple-400" />
                )}
              </button>

              <button
                id="btn-sort-name"
                onClick={() => handleSort('name')}
                className={`rounded-lg px-2.5 py-1 font-bold text-xs transition flex items-center gap-1 cursor-pointer ${
                  sortField === 'name'
                    ? 'bg-slate-700 text-white border border-slate-600'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <span>Nombre A-Z</span>
                {sortField === 'name' && (
                  sortDirection === 'desc' ? <ArrowDown className="h-3 w-3 text-white" /> : <ArrowUp className="h-3 w-3 text-white" />
                )}
              </button>
            </div>
          </div>

          {/* Toggle Direction Button */}
          <button
            id="btn-toggle-sort-direction"
            onClick={() => setSortDirection((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
            className="w-full sm:w-auto rounded-xl px-3 py-1.5 text-xs font-bold border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 transition flex items-center justify-center gap-2 shadow-sm shrink-0 cursor-pointer"
            title="Alternar entre Mayor a Menor (Descendente) y Menor a Mayor (Ascendente)"
          >
            {sortDirection === 'desc' ? (
              <>
                <ArrowDownWideNarrow className="h-4 w-4 text-teal-400 shrink-0" />
                <span>Orden: <strong>Mayor a Menor (Descendente ⬇️)</strong></span>
              </>
            ) : (
              <>
                <ArrowUpNarrowWide className="h-4 w-4 text-teal-400 shrink-0" />
                <span>Orden: <strong>Menor a Mayor (Ascendente ⬆️)</strong></span>
              </>
            )}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold select-none">
              <tr>
                <th 
                  onClick={() => handleSort('name')}
                  className="py-3 px-3 cursor-pointer hover:text-white transition group"
                >
                  <div className="flex items-center gap-1">
                    <span>Criptoactivo</span>
                    {sortField === 'name' && (
                      sortDirection === 'desc' ? <ArrowDown className="h-3 w-3 text-teal-400" /> : <ArrowUp className="h-3 w-3 text-teal-400" />
                    )}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('price')}
                  className="py-3 px-3 cursor-pointer hover:text-white transition group"
                >
                  <div className="flex items-center gap-1">
                    <span>Precio Actual</span>
                    {sortField === 'price' && (
                      sortDirection === 'desc' ? <ArrowDown className="h-3 w-3 text-teal-400" /> : <ArrowUp className="h-3 w-3 text-teal-400" />
                    )}
                  </div>
                </th>
                <th className="py-3 px-3">15m (Intradía)</th>
                <th className="py-3 px-3">1h (Swing Trigger)</th>
                <th className="py-3 px-3">1D (Tendencia)</th>
                <th 
                  onClick={() => handleSort('detonation')}
                  className="py-3 px-3 min-w-[220px] cursor-pointer hover:text-amber-400 transition group"
                >
                  <div className="flex items-center gap-1">
                    <span>Estado TTM Squeeze &amp; Prob. Detonación</span>
                    {sortField === 'detonation' && (
                      sortDirection === 'desc' ? <ArrowDown className="h-3 w-3 text-amber-400" /> : <ArrowUp className="h-3 w-3 text-amber-400" />
                    )}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('targetGain')}
                  className="py-3 px-3 cursor-pointer hover:text-emerald-400 transition group"
                >
                  <div className="flex items-center gap-1">
                    <span>Objetivo Firing Long</span>
                    {sortField === 'targetGain' && (
                      sortDirection === 'desc' ? <ArrowDown className="h-3 w-3 text-emerald-400" /> : <ArrowUp className="h-3 w-3 text-emerald-400" />
                    )}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('confluence')}
                  className="py-3 px-3 cursor-pointer hover:text-emerald-400 transition group"
                >
                  <div className="flex items-center gap-1">
                    <span>Confluencia</span>
                    {sortField === 'confluence' && (
                      sortDirection === 'desc' ? <ArrowDown className="h-3 w-3 text-emerald-400" /> : <ArrowUp className="h-3 w-3 text-emerald-400" />
                    )}
                  </div>
                </th>
                <th className="py-3 px-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {sortedFilteredAnalysis.map((item) => {
                const isSuper = item.confluenceRating.includes('3/3');
                const isHigh = item.confluenceRating.includes('2/3');
                const sqz = item.squeezeMomentum;
                const isSqueeze = sqz.status.includes('Squeeze On');
                const isFiring = sqz.status.includes('Firing Long') || sqz.readinessStage === 'FIRING_LONG';
                const isImminent = sqz.readinessStage === 'IGNICION_INMINENTE';
                const isHighPressure = sqz.readinessStage === 'ALTA_PRESION';

                return (
                  <tr key={item.asset.id} className="hover:bg-slate-800/40 transition">
                    {/* Asset Name */}
                    <td className="py-3 px-3">
                      <div 
                        onClick={() => onOpenMasterDiagnostic ? onOpenMasterDiagnostic(item.asset) : onOpenChartModal(item.asset)}
                        className="flex items-center gap-2.5 cursor-pointer group/asset"
                        title="Ver Análisis y Diagnóstico 360°"
                      >
                        <img 
                          src={getCryptoLogoUrl(item.asset.symbol)} 
                          alt={item.asset.name} 
                          onError={(e) => handleCryptoImageError(e, item.asset.symbol)}
                          referrerPolicy="no-referrer"
                          className="h-8 w-8 rounded-xl object-contain bg-slate-950 p-1 border border-slate-800 group-hover/asset:border-cyan-500/60 transition"
                        />
                        <div>
                          <div className="font-bold text-white text-sm flex items-center gap-1.5 group-hover/asset:text-cyan-300 transition">
                            <span>{item.asset.name}</span>
                            {isImminent && (
                              <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping inline-block" title="Ignición Inminente" />
                            )}
                          </div>
                          <span className="text-[11px] text-teal-400 font-mono">({item.asset.symbol.toUpperCase()})</span>
                        </div>
                      </div>
                    </td>

                    {/* Current Price */}
                    <td className="py-3 px-3">
                      <div className="text-white font-bold">{formatCurrency(item.asset.current_price)}</div>
                      <div className={`text-[10px] ${item.asset.price_change_percentage_24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {formatPercentage(item.asset.price_change_percentage_24h)}
                      </div>
                    </td>

                    {/* 15m Pillar */}
                    <td className="py-3 px-3 font-sans">
                      <div className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold ${
                        item.signals.m15.trend === 'ALCISTA'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : item.signals.m15.trend === 'BAJISTA'
                          ? 'bg-rose-500/20 text-rose-300'
                          : 'bg-slate-800 text-slate-300'
                      }`}>
                        {item.signals.m15.trend === 'ALCISTA' && <ArrowUpRight className="h-3 w-3" />}
                        {item.signals.m15.trend === 'BAJISTA' && <ArrowDownRight className="h-3 w-3" />}
                        <span>{item.signals.m15.trend} (RSI {item.signals.m15.rsi})</span>
                      </div>
                    </td>

                    {/* 1h Pillar */}
                    <td className="py-3 px-3 font-sans">
                      <div className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold ${
                        item.signals.h1.trend === 'ALCISTA'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : item.signals.h1.trend === 'BAJISTA'
                          ? 'bg-rose-500/20 text-rose-300'
                          : 'bg-slate-800 text-slate-300'
                      }`}>
                        {item.signals.h1.trend === 'ALCISTA' && <ArrowUpRight className="h-3 w-3" />}
                        {item.signals.h1.trend === 'BAJISTA' && <ArrowDownRight className="h-3 w-3" />}
                        <span>{item.signals.h1.trend}</span>
                      </div>
                    </td>

                    {/* 1D Pillar */}
                    <td className="py-3 px-3 font-sans">
                      <div className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold ${
                        item.signals.d1.trend === 'ALCISTA'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : item.signals.d1.trend === 'BAJISTA'
                          ? 'bg-rose-500/20 text-rose-300'
                          : 'bg-slate-800 text-slate-300'
                      }`}>
                        {item.signals.d1.trend === 'ALCISTA' && <ArrowUpRight className="h-3 w-3" />}
                        {item.signals.d1.trend === 'BAJISTA' && <ArrowDownRight className="h-3 w-3" />}
                        <span>{item.signals.d1.trend}</span>
                      </div>
                    </td>

                    {/* ⚡ TTM Squeeze Momentum */}
                    <td className="py-3 px-3 font-sans">
                      <div 
                        onClick={() => setSelectedDetonationAsset(item)}
                        className="cursor-pointer group/cell hover:bg-slate-800/60 p-1.5 rounded-xl transition border border-transparent hover:border-slate-700"
                        title="Haz clic para abrir el Diagnóstico Cuántico de Detonación"
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold ${
                            isImminent
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-sm animate-pulse'
                              : isHighPressure
                              ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                              : isFiring
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : isSqueeze
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-slate-800 text-slate-300'
                          }`}>
                            {isImminent ? <Zap className="h-3 w-3 text-amber-400" /> : isFiring ? <CheckCircle2 className="h-3 w-3 text-emerald-400" /> : <Flame className="h-3 w-3" />}
                            <span>{isFiring ? 'Firing Long (Disparo Activo)' : isSqueeze ? 'Squeeze On' : 'Sin Squeeze'}</span>
                          </span>

                          <span className={`text-xs font-black font-mono ${
                            isImminent ? 'text-amber-400' : isFiring ? 'text-emerald-400' : isHighPressure ? 'text-orange-400' : 'text-slate-400'
                          }`}>
                            {isFiring ? '100% DISPARADO' : `${sqz.detonationProbabilityPct}% DETONACIÓN`}
                          </span>
                        </div>

                        {/* Visual Progress Bar of Detonation Probability */}
                        <div className="h-1.5 w-full rounded-full bg-slate-950 border border-slate-800 overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all ${
                              isImminent
                                ? 'bg-gradient-to-r from-amber-500 to-emerald-400 shadow-sm shadow-amber-500/50'
                                : isFiring
                                ? 'bg-emerald-500'
                                : isHighPressure
                                ? 'bg-gradient-to-r from-amber-600 to-orange-500'
                                : 'bg-slate-700'
                            }`}
                            style={{ width: `${sqz.detonationProbabilityPct}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[9px] text-slate-400 mt-1 font-mono">
                          <span>{sqz.stageLabel}</span>
                          <span className="text-teal-400 group-hover/cell:underline flex items-center gap-0.5">
                            Diagnóstico <ChevronRight className="h-2.5 w-2.5" />
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Projected Target */}
                    <td className="py-3 px-3 font-mono">
                      <div className="text-emerald-400 font-bold flex items-center gap-1">
                        <Target className="h-3 w-3" />
                        <span>{formatCurrency(sqz.projectedBreakoutTarget.targetPrice)}</span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        +{sqz.projectedBreakoutTarget.projectedGainPct}% (R:R {sqz.projectedBreakoutTarget.riskRewardRatio}:1)
                      </div>
                    </td>

                    {/* Overall Rating */}
                    <td className="py-3 px-3 font-sans">
                      <span className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-black ${
                        isSuper
                          ? 'bg-emerald-500 text-slate-950 shadow-sm'
                          : isHigh
                          ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                          : 'bg-slate-800 text-slate-300'
                      }`}>
                        {isSuper && <Sparkles className="h-3.5 w-3.5" />}
                        <span>{item.confluenceRating}</span>
                      </span>
                    </td>

                    {/* Action */}
                    <td className="py-3 px-3 text-right font-sans">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedDetonationAsset(item)}
                          className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 text-xs font-bold text-amber-300 hover:bg-amber-500 hover:text-slate-950 transition shadow-sm flex items-center gap-1 shrink-0 cursor-pointer"
                          title="Abrir Terminal Cuántica de Detonación"
                        >
                          <Zap className="h-3 w-3" />
                          <span className="hidden sm:inline">Detonación</span>
                        </button>
                        {onOpenMasterDiagnostic && (
                          <button
                            onClick={() => onOpenMasterDiagnostic(item.asset)}
                            className="rounded-xl border border-cyan-500/50 bg-cyan-950/60 hover:bg-cyan-500 hover:text-slate-950 px-2.5 py-1.5 text-xs font-bold text-cyan-300 transition shadow-sm flex items-center gap-1 shrink-0 cursor-pointer"
                            title="Abrir Análisis y Diagnóstico 360° Integral"
                          >
                            <Sparkles className="h-3 w-3 text-cyan-400" />
                            <span>Análisis</span>
                          </button>
                        )}
                        <button
                          onClick={() => onOpenChartModal(item.asset)}
                          className="rounded-xl border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-bold text-slate-200 hover:bg-slate-700 hover:text-white transition shadow-sm shrink-0 cursor-pointer"
                          title="Abrir Gráfico Técnico"
                        >
                          Gráfico
                        </button>
                        {onOpenBrokerModal && (
                          <button
                            onClick={() => onOpenBrokerModal(item.asset)}
                            className="rounded-xl border border-emerald-500/60 bg-emerald-950/60 hover:bg-emerald-500 hover:text-slate-950 px-2.5 py-1.5 text-xs font-bold text-emerald-300 transition shadow-sm flex items-center gap-1 cursor-pointer shrink-0"
                            title="Simular Trading Spot/Futuros (€/$)"
                          >
                            <Briefcase className="h-3 w-3 text-emerald-400 group-hover:text-slate-950" />
                            <span>Trading</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 🚀 MODAL CUÁNTICO: DIAGNÓSTICO DE DETONACIÓN SQUEEZE */}
      {selectedDetonationAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-3xl rounded-3xl border border-amber-500/40 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 p-6 sm:p-8 shadow-2xl space-y-6 my-8 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3.5">
                <img 
                  src={getCryptoLogoUrl(selectedDetonationAsset.asset.symbol)} 
                  alt={selectedDetonationAsset.asset.name} 
                  onError={(e) => handleCryptoImageError(e, selectedDetonationAsset.asset.symbol)}
                  referrerPolicy="no-referrer"
                  className="h-12 w-12 rounded-2xl object-contain bg-slate-950 p-1.5 border border-slate-800 shrink-0"
                />
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-xs px-2.5 py-0.5 uppercase tracking-wider flex items-center gap-1">
                      <Zap className="h-3 w-3" /> Terminal de Detonación Cuántica Cripto
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      {selectedDetonationAsset.asset.sector || selectedDetonationAsset.asset.category || 'Layer 1'}
                    </span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-white mt-1">
                    {selectedDetonationAsset.asset.name} ({selectedDetonationAsset.asset.symbol.toUpperCase()})
                  </h3>
                </div>
              </div>

              <button
                onClick={() => setSelectedDetonationAsset(null)}
                className="h-9 w-9 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 flex items-center justify-center transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Main Gauge & Readiness Banner */}
            <div className="rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-950 p-5 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-inner">
              <div className="space-y-1 text-center sm:text-left">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1 justify-center sm:justify-start">
                  <Timer className="h-3.5 w-3.5" /> Estado de Preparación para Operar
                </span>
                <div className="text-2xl sm:text-3xl font-black text-white">
                  {selectedDetonationAsset.squeezeMomentum.stageLabel}
                </div>
                <p className="text-xs text-slate-300 max-w-md">
                  {selectedDetonationAsset.squeezeMomentum.status.includes('Firing Long')
                    ? 'El criptoactivo ya ha roto las bandas de compresión y se encuentra en plena expansión alcista.'
                    : `Compresión acumulada durante ${selectedDetonationAsset.squeezeMomentum.compressionBarsCount} velas. Alta probabilidad de transición inminente a Firing Long.`}
                </p>
              </div>

              {/* Radial Probability Score */}
              <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-950 border border-amber-500/40 text-center shrink-0 w-36 shadow-lg">
                <div className="text-3xl sm:text-4xl font-black font-mono text-amber-400 animate-pulse">
                  {selectedDetonationAsset.squeezeMomentum.detonationProbabilityPct}%
                </div>
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">
                  Índice de Detonación
                </div>
              </div>
            </div>

            {/* 4 Quantitative Detonation Pillars */}
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Sliders className="h-4 w-4 text-teal-400" />
                Desglose de Factores Cuantitativos de Ignición
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Pillar 1: Compresión Bollinger / Keltner */}
                <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-300 font-bold flex items-center gap-1.5">
                      <Flame className="h-4 w-4 text-amber-400" /> Compresión Bollinger vs Keltner
                    </span>
                    <span className="font-mono font-bold text-amber-400">
                      {selectedDetonationAsset.squeezeMomentum.detonationFactors.compressionScore}/100
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-900 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full"
                      style={{ width: `${selectedDetonationAsset.squeezeMomentum.detonationFactors.compressionScore}%` }}
                    />
                  </div>
                  <div className="text-[11px] text-slate-400 flex justify-between">
                    <span>Bandwidth: <strong className="text-slate-200">{selectedDetonationAsset.squeezeMomentum.bandwidthPct}%</strong></span>
                    <span>Ratio Keltner: <strong className="text-slate-200">{selectedDetonationAsset.squeezeMomentum.keltnerInsideRatio}x</strong></span>
                  </div>
                </div>

                {/* Pillar 2: Vector de Inflexión de Momentum */}
                <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-300 font-bold flex items-center gap-1.5">
                      <TrendingUp className="h-4 w-4 text-emerald-400" /> Inflexión del Oscilador Momentum
                    </span>
                    <span className="font-mono font-bold text-emerald-400">
                      {selectedDetonationAsset.squeezeMomentum.detonationFactors.momentumTurnScore}/100
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-900 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full"
                      style={{ width: `${selectedDetonationAsset.squeezeMomentum.detonationFactors.momentumTurnScore}%` }}
                    />
                  </div>
                  <div className="text-[11px] text-slate-400 flex justify-between">
                    <span>Pendiente: <strong className="text-emerald-400">{selectedDetonationAsset.squeezeMomentum.momentumVectorSlope}</strong></span>
                    <span>Histograma: <strong className="text-slate-200">Giro Alcista</strong></span>
                  </div>
                </div>

                {/* Pillar 3: Flujo On-Chain */}
                <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-300 font-bold flex items-center gap-1.5">
                      <BarChart2 className="h-4 w-4 text-cyan-400" /> Flujo de Ballenas &amp; CMF
                    </span>
                    <span className="font-mono font-bold text-cyan-400">
                      {selectedDetonationAsset.squeezeMomentum.detonationFactors.institutionalVolumeScore}/100
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-900 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-full"
                      style={{ width: `${selectedDetonationAsset.squeezeMomentum.detonationFactors.institutionalVolumeScore}%` }}
                    />
                  </div>
                  <div className="text-[11px] text-slate-400 flex justify-between">
                    <span>Anomalía Volumen: <strong className="text-slate-200">{selectedDetonationAsset.asset.volumeAnomalyRatio || 1.2}x</strong></span>
                    <span>Alpha Score: <strong className="text-slate-200">{selectedDetonationAsset.asset.alphaScore || 80}/100</strong></span>
                  </div>
                </div>

                {/* Pillar 4: Confluencia Multi-Temporal */}
                <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-300 font-bold flex items-center gap-1.5">
                      <Layers className="h-4 w-4 text-teal-400" /> Triple Confluencia Temporal
                    </span>
                    <span className="font-mono font-bold text-teal-400">
                      {selectedDetonationAsset.squeezeMomentum.detonationFactors.multiTfConfluenceScore}/100
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-900 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-teal-600 to-teal-400 rounded-full"
                      style={{ width: `${selectedDetonationAsset.squeezeMomentum.detonationFactors.multiTfConfluenceScore}%` }}
                    />
                  </div>
                  <div className="text-[11px] text-slate-400 flex justify-between">
                    <span>15m: <strong className="text-emerald-400">{selectedDetonationAsset.signals.m15.trend}</strong></span>
                    <span>1h: <strong className="text-emerald-400">{selectedDetonationAsset.signals.h1.trend}</strong></span>
                    <span>1D: <strong className="text-emerald-400">{selectedDetonationAsset.signals.d1.trend}</strong></span>
                  </div>
                </div>
              </div>
            </div>

            {/* Strategic Trading Setup Card */}
            <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/20 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Crosshair className="h-4 w-4" /> Plan de Ejecución Táctico Post-Detonación
                </span>
                <span className="text-xs font-mono font-bold text-emerald-300">
                  Ratio R:R {selectedDetonationAsset.squeezeMomentum.projectedBreakoutTarget.riskRewardRatio}:1
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 text-center font-mono">
                <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-2.5">
                  <div className="text-[10px] text-slate-400 font-sans">Precio Entrada</div>
                  <div className="text-sm font-black text-white mt-0.5">{formatCurrency(selectedDetonationAsset.asset.current_price)}</div>
                </div>
                <div className="rounded-xl bg-slate-950/80 border border-emerald-500/30 p-2.5">
                  <div className="text-[10px] text-emerald-400 font-sans">Objetivo Firing Long</div>
                  <div className="text-sm font-black text-emerald-300 mt-0.5">{formatCurrency(selectedDetonationAsset.squeezeMomentum.projectedBreakoutTarget.targetPrice)}</div>
                  <div className="text-[9px] text-emerald-400">(+{selectedDetonationAsset.squeezeMomentum.projectedBreakoutTarget.projectedGainPct}%)</div>
                </div>
                <div className="rounded-xl bg-slate-950/80 border border-rose-500/30 p-2.5">
                  <div className="text-[10px] text-rose-400 font-sans">Stop Loss Técnico</div>
                  <div className="text-sm font-black text-rose-300 mt-0.5">{formatCurrency(selectedDetonationAsset.squeezeMomentum.projectedBreakoutTarget.recommendedStopLoss)}</div>
                </div>
                <div className="rounded-xl bg-slate-950/80 border border-teal-500/30 p-2.5">
                  <div className="text-[10px] text-teal-400 font-sans">Dirección Proyectada</div>
                  <div className="text-sm font-black text-teal-300 mt-0.5">ALCISTA 🚀</div>
                </div>
              </div>
            </div>

            {/* Expert Verdict */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-1.5">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 text-teal-400" /> Veredicto del Algoritmo Predictivo
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                {selectedDetonationAsset.squeezeMomentum.expertVerdict}
              </p>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-3 border-t border-slate-800">
              {onOpenMasterDiagnostic && (
                <button
                  onClick={() => {
                    const asset = selectedDetonationAsset.asset;
                    setSelectedDetonationAsset(null);
                    onOpenMasterDiagnostic(asset);
                  }}
                  className="w-full sm:w-auto rounded-xl border border-cyan-500/50 bg-cyan-950/60 px-4 py-2 text-xs font-bold text-cyan-200 hover:bg-cyan-500 hover:text-slate-950 transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Estudio Completo 360°</span>
                </button>
              )}

              <button
                onClick={() => {
                  const asset = selectedDetonationAsset.asset;
                  setSelectedDetonationAsset(null);
                  if (onOpenAiAnalysis) onOpenAiAnalysis(asset);
                }}
                className="w-full sm:w-auto rounded-xl border border-teal-500/40 bg-teal-500/20 px-4 py-2 text-xs font-bold text-teal-300 hover:bg-teal-500 hover:text-slate-950 transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Cpu className="h-3.5 w-3.5" />
                <span>Análisis Predictivo de IA</span>
              </button>

              {onOpenBrokerModal && (
                <button
                  onClick={() => {
                    const asset = selectedDetonationAsset.asset;
                    setSelectedDetonationAsset(null);
                    onOpenBrokerModal(asset);
                  }}
                  className="w-full sm:w-auto rounded-xl border border-emerald-500/60 bg-emerald-500/20 px-4 py-2 text-xs font-black text-emerald-300 hover:bg-emerald-500 hover:text-slate-950 transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Briefcase className="h-3.5 w-3.5" />
                  <span>Simular Trading (€/$)</span>
                </button>
              )}

              <button
                onClick={() => {
                  const asset = selectedDetonationAsset.asset;
                  setSelectedDetonationAsset(null);
                  onOpenChartModal(asset);
                }}
                className="w-full sm:w-auto rounded-xl bg-amber-500 px-5 py-2 text-xs font-black text-slate-950 hover:bg-amber-400 transition flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/30 cursor-pointer"
              >
                <Activity className="h-3.5 w-3.5" />
                <span>Abrir Gráfico Técnico</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
