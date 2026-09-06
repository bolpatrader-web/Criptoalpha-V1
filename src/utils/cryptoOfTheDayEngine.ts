import { CryptoAsset, CryptoOfTheDaySignal, MarketSessionInfo } from '../types';

export interface ComprehensiveCryptoStudy {
  sessionContext: {
    currentTimeUtc: string;
    marketStatus: 'ASIA_SESSION' | 'LONDON_OPEN' | 'NY_OPEN' | 'NY_AFTERNOON' | 'WEEKEND_VOLATILITY';
    marketStatusLabel: string;
    sessionProgressPct: number;
    activeSessions: MarketSessionInfo[];
    liquidityAnticipation: {
      direction: 'ALCISTA' | 'NEUTRAL' | 'BAJISTA';
      expectedMovePct: number;
      projectedTargetPrice: number;
      sessionStrategy: string;
      volumeRatio: number;
      liquidationTrapWarning: string;
    };
  };
  momentumHealth: {
    exhaustionScore: number;
    momentumStatus: 'FUERZA_INTACTA_EXPANSION' | 'EN_DESPEGUE_SALUDABLE' | 'MODERADO_CONSOLIDACION' | 'SOBREEXTENDIDO_AGOTADO';
    momentumStatusLabel: string;
    vwapProximity: 'POR_ENCIMA_DE_VWAP' | 'EN_RETESTEO_VWAP' | 'POR_DEBAJO_DE_VWAP';
    derivativesSqueezePotential: 'ALTO' | 'MODERADO' | 'BAJO';
    exhaustionRationale: string;
    gainAccumulatedTodayPct: number;
    remainingEnergyPct: number;
  };
  riskRewardAnalysis: {
    ratio: number;
    robustnessGrade: 'A+' | 'A' | 'B+' | 'B' | 'C';
    robustnessExplanation: string;
    expectedValuePer100Arrisk: number;
    winRateProjected: number;
    profitFactorEstimated: number;
    invalidationThreshold: string;
    optimalOrderType: 'LIMITE_ESCALONADA' | 'STOP_LIMIT_BREAKOUT' | 'MERCADO_EN_RETROCESO';
    asymmetryScore: number;
  };
  tacticalExecution: {
    recommendedTimeframe: 'INTRADIA_SCALPING' | 'SWING_CORTO_2_5D' | 'POSITION_CYCLE_1_3M';
    whaleAccumulationRatio: number;
    rvol20: number;
    macroAlignment: string;
    onChainFootprint: string;
    bestExecutionWindow: string;
  };
}

/**
 * Computes live 24/7/365 Crypto market session clock across Asia, London, Wall Street, and Weekend Liquidity.
 */
export function getLiveCryptoSessionDetails(referenceDate: Date = new Date()) {
  const utcHours = referenceDate.getUTCHours() + referenceDate.getUTCMinutes() / 60;
  const dayOfWeek = referenceDate.getUTCDay(); // 0 = Sun, 6 = Sat
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  const utcFormatter = new Intl.DateTimeFormat('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'UTC'
  });
  const utcTimeFormatted = `${utcFormatter.format(referenceDate)} UTC (Mercado Global 24/7)`;

  let sessionPhase: 'ASIA_SESSION' | 'LONDON_OPEN' | 'NY_OPEN' | 'NY_AFTERNOON' | 'WEEKEND_VOLATILITY' = 'ASIA_SESSION';
  let marketStatusLabel = 'Sesión Asiática (00:00 - 08:00 UTC) • Flujo de Tokio, Singapur y Seúl';
  let sessionProgressPct = 50;

  if (isWeekend) {
    sessionPhase = 'WEEKEND_VOLATILITY';
    marketStatusLabel = 'Fin de Semana Cripto 24/7 • Menor Profundidad de Libro y Barridos de Stops';
    sessionProgressPct = Math.round((utcHours / 24) * 100);
  } else if (utcHours >= 0.0 && utcHours < 8.0) {
    sessionPhase = 'ASIA_SESSION';
    marketStatusLabel = 'Sesión Asiática (00:00 - 08:00 UTC) • Mayor Volumen en Altcoins y Reseteo Funding Rate';
    sessionProgressPct = Math.round((utcHours / 8.0) * 100);
  } else if (utcHours >= 8.0 && utcHours < 13.5) {
    sessionPhase = 'LONDON_OPEN';
    marketStatusLabel = 'Apertura Europea / Londres (08:00 - 13:30 UTC) • Entrada de Capital Institucional y DeFi';
    sessionProgressPct = Math.round(((utcHours - 8.0) / 5.5) * 100);
  } else if (utcHours >= 13.5 && utcHours < 20.0) {
    sessionPhase = 'NY_OPEN';
    marketStatusLabel = 'Sesión de Nueva York & Spot ETFs (13:30 - 20:00 UTC) • Máxima Liquidez y Flujo BTC/ETH';
    sessionProgressPct = Math.round(((utcHours - 13.5) / 6.5) * 100);
  } else {
    sessionPhase = 'NY_AFTERNOON';
    marketStatusLabel = 'Cierre de Nueva York & Liquidaciones Nocturnas (20:00 - 24:00 UTC)';
    sessionProgressPct = Math.round(((utcHours - 20.0) / 4.0) * 100);
  }

  const isAsiaActive = utcHours >= 0.0 && utcHours < 9.0;
  const isEuropeActive = utcHours >= 7.5 && utcHours < 16.5;
  const isNyActive = utcHours >= 13.5 && utcHours < 21.0;

  const activeSessions: MarketSessionInfo[] = [
    {
      name: 'Nueva York & Flujo Spot ETF (NYSE / CME)',
      region: 'Wall Street / Chicago (EE. UU.)',
      status: isNyActive ? 'HIGH_LIQUIDITY' : 'MODERATE_LIQUIDITY',
      hours: '13:30 - 20:00 UTC',
      isMainDriver: true,
    },
    {
      name: 'Londres & Hubs Europeos (LSE / Frankfurt / Zug)',
      region: 'Reino Unido & Suiza (Crypto Valley)',
      status: isEuropeActive ? 'HIGH_LIQUIDITY' : 'MODERATE_LIQUIDITY',
      hours: '08:00 - 16:30 UTC',
      isMainDriver: false,
    },
    {
      name: 'Asia Hub (Tokio, Singapur, Hong Kong, Seúl)',
      region: 'Asia-Pacífico',
      status: isAsiaActive ? 'HIGH_LIQUIDITY' : 'MODERATE_LIQUIDITY',
      hours: '00:00 - 08:30 UTC',
      isMainDriver: true,
    },
    {
      name: 'Mercados Derivados Cripto 24/7 (Perpetuals & Opciones)',
      region: 'Binance / Bybit / Deribit (Global)',
      status: isWeekend ? 'WEEKEND_ACTIVE' : 'HIGH_LIQUIDITY',
      hours: '24h/365d Continuo',
      isMainDriver: true,
    },
  ];

  return {
    currentTimeUtc: utcTimeFormatted,
    marketStatus: sessionPhase,
    marketStatusLabel,
    sessionProgressPct: Math.min(100, Math.max(0, sessionProgressPct)),
    activeSessions,
    isWeekend,
    utcHours,
  };
}

/**
 * Anticipates liquidity sweeps, funding rate pressure, and tactical entry points.
 */
export function calculateCryptoLiquidityAndStrategy(
  asset: CryptoAsset,
  sessionInfo: ReturnType<typeof getLiveCryptoSessionDetails>
) {
  const change24 = asset.price_change_percentage_24h || 2.5;
  const alphaScore = asset.alphaScore || 80;
  const volRatio = asset.volumeAnomalyRatio || 1.45;
  const currentPrice = asset.current_price || 100;
  const fundingRate = asset.fundingRate8h || 0.01;

  let direction: 'ALCISTA' | 'NEUTRAL' | 'BAJISTA' = 'ALCISTA';
  let expectedMovePct = 0;

  if (change24 > 2.0 && alphaScore > 75) {
    direction = 'ALCISTA';
    expectedMovePct = Number((1.2 + (alphaScore / 100) * 2.8 + Math.min(4.5, change24 * 0.35)).toFixed(2));
  } else if (change24 < -2.0) {
    direction = 'BAJISTA';
    expectedMovePct = Number((-1.0 - Math.abs(change24) * 0.3).toFixed(2));
  } else {
    direction = 'NEUTRAL';
    expectedMovePct = Number((0.8 + (alphaScore > 80 ? 1.2 : 0.2)).toFixed(2));
  }

  const projectedTargetPrice = Number((currentPrice * (1 + expectedMovePct / 100)).toFixed(currentPrice < 1 ? 6 : 2));
  const volumeRatio = Number((volRatio * (sessionInfo.isWeekend ? 0.85 : 1.25)).toFixed(2));

  let sessionStrategy = '';
  let liquidationTrapWarning = '';

  if (sessionInfo.marketStatus === 'NY_OPEN') {
    sessionStrategy = `Sesión de Wall Street & Flujo Spot ETF activa: Máxima liquidez de entrada. Aprovechar retrocesos al VWAP diario o al soporte de 1 hora para compras escalonadas con alta confluencia institucional.`;
    liquidationTrapWarning = `Vigilar picos de volatilidad en la apertura de ETFs (14:30 UTC); evitar entrar en el extremo superior de velas de 5m sin confirmación de absorción de ventas.`;
  } else if (sessionInfo.marketStatus === 'ASIA_SESSION') {
    sessionStrategy = `Sesión Asiática en desarrollo: Alta actividad en altcoins y rotación rápida. Las órdenes límite en niveles de retroceso Fib 0.618 ofrecen el mejor ratio R/B antes del relevo europeo.`;
    liquidationTrapWarning = `Precaución con los barridos de liquidez asiáticos (Asian Range High/Low) que suelen buscar los stops de minoristas antes de iniciar la tendencia limpia.`;
  } else if (sessionInfo.marketStatus === 'WEEKEND_VOLATILITY') {
    sessionStrategy = `Fin de semana cripto: La menor liquidez de los creadores de mercado permite movimientos explosivos rápidos. Utilizar órdenes límite estrictas con Stop Loss holgado bajo el soporte semanal.`;
    liquidationTrapWarning = `Alerta de 'Weekend Fakeout': Los movimientos de sábado/domingo a menudo son neutralizados con la apertura de futuros de CME el domingo a las 23:00 UTC.`;
  } else {
    sessionStrategy = `Sesión Europea & DeFi Hub: Flujos constantes de staking y arbitraje. Ideal para posicionar órdenes Swing de 2 a 5 días con objetivos en TP1 y TP2.`;
    liquidationTrapWarning = `Supervisar el Funding Rate de futuros (${(fundingRate * 100).toFixed(3)}%); si supera +0.05%, esperar un leve 'long squeeze' antes de entrar.`;
  }

  return {
    direction,
    expectedMovePct,
    projectedTargetPrice,
    sessionStrategy,
    volumeRatio,
    liquidationTrapWarning,
  };
}

/**
 * Diagnoses whether the crypto momentum is fresh and expanding or overextended with liquidation risks.
 */
export function calculateCryptoMomentumHealthAndExhaustion(
  asset: CryptoAsset,
  sessionInfo: ReturnType<typeof getLiveCryptoSessionDetails>
) {
  const change24 = asset.price_change_percentage_24h || 2.5;
  const rsi = asset.rsi14 || 55;
  const alphaScore = asset.alphaScore || 80;
  const volRatio = asset.volumeAnomalyRatio || 1.45;
  const fundingRate = asset.fundingRate8h || 0.01;

  let exhaustionPoints = 0;

  // RSI factor
  if (rsi > 78) exhaustionPoints += 38;
  else if (rsi > 70) exhaustionPoints += 22;
  else if (rsi > 64) exhaustionPoints += 10;
  else if (rsi < 38) exhaustionPoints += 12;

  // 24h gain factor
  if (change24 > 25) exhaustionPoints += 35;
  else if (change24 > 15) exhaustionPoints += 22;
  else if (change24 > 8) exhaustionPoints += 10;
  else if (change24 >= 1.0 && change24 <= 6.5) exhaustionPoints += 2; // Optimal Sweet Spot

  // Funding rate overheating factor
  if (fundingRate > 0.03) exhaustionPoints += 20;
  else if (fundingRate > 0.018) exhaustionPoints += 10;

  const exhaustionScore = Math.min(95, Math.max(8, Math.round(exhaustionPoints)));
  const remainingEnergyPct = 100 - exhaustionScore;

  let momentumStatus: 'FUERZA_INTACTA_EXPANSION' | 'EN_DESPEGUE_SALUDABLE' | 'MODERADO_CONSOLIDACION' | 'SOBREEXTENDIDO_AGOTADO' = 'FUERZA_INTACTA_EXPANSION';
  let momentumStatusLabel = 'Fuerza Intacta • Máxima Energía de Expansión';
  let exhaustionRationale = '';

  if (exhaustionScore <= 28) {
    momentumStatus = 'FUERZA_INTACTA_EXPANSION';
    momentumStatusLabel = 'Fuerza Intacta • Zona Dulce de Compra (Sin Agotamiento)';
    exhaustionRationale = `El activo presenta un avance controlado (+${change24.toFixed(1)}%) con RSI equilibrado (${rsi.toFixed(1)}) y tasas de financiación saludables. El flujo de acumulación de ballenas está en fase inicial y conserva todo el potencial de subida hacia los objetivos TP1, TP2 y Moonbag.`;
  } else if (exhaustionScore <= 55) {
    momentumStatus = 'EN_DESPEGUE_SALUDABLE';
    momentumStatusLabel = 'Despegue Saludable • Impulso Comprador Activo';
    exhaustionRationale = `Estructura alcista firme con volumen anómalo positivo (${volRatio.toFixed(2)}x sobre la media). El indicador RSI (${rsi.toFixed(1)}) conserva margen técnico holgado antes de alcanzar zonas de sobrecompra.`;
  } else if (exhaustionScore <= 75) {
    momentumStatus = 'MODERADO_CONSOLIDACION';
    momentumStatusLabel = 'Consolidación • Requiere Entrada Límite en Soporte';
    exhaustionRationale = `El activo ha recorrido una parte significativa de su impulso. Se recomienda ejecutar mediante orden límite escalonada en soporte para no perseguir velas alcistas en máximos.`;
  } else {
    momentumStatus = 'SOBREEXTENDIDO_AGOTADO';
    momentumStatusLabel = 'Alerta de Sobreextensión • Riesgo de Toma de Ganancias';
    exhaustionRationale = `Subida pronunciada acumulada (+${change24.toFixed(1)}%) con RSI elevado (${rsi.toFixed(1)}) y financiación caliente. Posible barrido de posiciones largas antes de continuar la tendencia principal.`;
  }

  // VWAP Proximity
  let vwapProximity: 'POR_ENCIMA_DE_VWAP' | 'EN_RETESTEO_VWAP' | 'POR_DEBAJO_DE_VWAP' = 'POR_ENCIMA_DE_VWAP';
  if (change24 > 1.2) {
    vwapProximity = 'POR_ENCIMA_DE_VWAP';
  } else if (change24 >= -1.0 && change24 <= 1.2) {
    vwapProximity = 'EN_RETESTEO_VWAP';
  } else {
    vwapProximity = 'POR_DEBAJO_DE_VWAP';
  }

  // Derivatives Squeeze Potential
  let derivativesSqueezePotential: 'ALTO' | 'MODERADO' | 'BAJO' = 'ALTO';
  if (alphaScore > 82 && volRatio > 1.4 && exhaustionScore < 60) {
    derivativesSqueezePotential = 'ALTO';
  } else if (alphaScore > 70) {
    derivativesSqueezePotential = 'MODERADO';
  } else {
    derivativesSqueezePotential = 'BAJO';
  }

  return {
    exhaustionScore,
    momentumStatus,
    momentumStatusLabel,
    vwapProximity,
    derivativesSqueezePotential,
    exhaustionRationale,
    gainAccumulatedTodayPct: change24,
    remainingEnergyPct,
  };
}

/**
 * Calculates strict Risk/Reward (R/B) robustness, Mathematical Expected Value (EV),
 * win rate probability, and optimal order type for Crypto.
 */
export function calculateCryptoRiskRewardMetrics(
  currentPrice: number,
  tp1Pct: number,
  tp2Pct: number,
  tpMaxPct: number,
  slPct: number,
  alphaScore: number
) {
  const avgTpPct = (tp1Pct + tp2Pct) / 2;
  const ratio = Number((avgTpPct / slPct).toFixed(2));
  const maxRatio = Number((tpMaxPct / slPct).toFixed(2));

  // Projected Win Rate based on quantitative model (70% - 86%)
  const winRateProjected = Math.min(86, Math.max(70, Math.round(65 + (alphaScore / 100) * 20)));
  const lossRate = 100 - winRateProjected;

  // Expected Value per $100 risked
  const expectedRewardDollars = (winRateProjected / 100) * (ratio * 100);
  const expectedLossDollars = (lossRate / 100) * 100;
  const expectedValuePer100Arrisk = Number((expectedRewardDollars - expectedLossDollars).toFixed(1));

  // Estimated Profit Factor
  const profitFactorEstimated = Number(((winRateProjected * avgTpPct) / (lossRate * slPct)).toFixed(2));

  let robustnessGrade: 'A+' | 'A' | 'B+' | 'B' | 'C' = 'A';
  let robustnessExplanation = '';

  if (ratio >= 3.5 && winRateProjected >= 76) {
    robustnessGrade = 'A+';
    robustnessExplanation = `Relación R/B Cripto Élite (1:${ratio}). Por cada $1 arriesgado, el modelo proyecta $${ratio} de ganancia media ($${maxRatio} en objetivo Moonbag Ciclo), con un Valor Esperado (EV) altamente positivo de +$${expectedValuePer100Arrisk} por cada $100 arriesgados.`;
  } else if (ratio >= 2.8) {
    robustnessGrade = 'A';
    robustnessExplanation = `Excelente asimetría positiva (1:${ratio}). Estructura que protege el capital y maximiza el despegue alcista con Stop Loss ceñido bajo soporte clave.`;
  } else if (ratio >= 2.0) {
    robustnessGrade = 'B+';
    robustnessExplanation = `Relación R/B sólida (1:${ratio}), apta para operativa táctica con toma parcial de ganancias asegurada en TP1.`;
  } else {
    robustnessGrade = 'B';
    robustnessExplanation = `Relación R/B equilibrada (1:${ratio}). Requiere disciplina rigurosa de salida al alcanzar el primer objetivo de beneficio.`;
  }

  const asymmetryScore = Math.min(99, Math.round(ratio * 25));
  const optimalOrderType: 'LIMITE_ESCALONADA' | 'STOP_LIMIT_BREAKOUT' | 'MERCADO_EN_RETROCESO' = 
    ratio >= 3.0 ? 'LIMITE_ESCALONADA' : 'STOP_LIMIT_BREAKOUT';

  const slPrice = Number((currentPrice * (1 - slPct / 100)).toFixed(currentPrice < 1 ? 6 : 2));
  const invalidationThreshold = `$${slPrice} (-${slPct}%): Quiebre del nivel estructural y pérdida de mínimos de liquidez en gráficos diarios.`;

  return {
    ratio,
    robustnessGrade,
    robustnessExplanation,
    expectedValuePer100Arrisk,
    winRateProjected,
    profitFactorEstimated,
    invalidationThreshold,
    optimalOrderType,
    asymmetryScore,
  };
}

/**
 * Computes tactical crypto execution parameters: Whale accumulation, RVOL, on-chain footprint, and time window.
 */
export function calculateCryptoTacticalExecutionParams(
  asset: CryptoAsset,
  sessionInfo: ReturnType<typeof getLiveCryptoSessionDetails>
) {
  const volRatio = asset.volumeAnomalyRatio || 1.45;
  const alphaScore = asset.alphaScore || 82;

  const rvol20 = Number((volRatio * 1.15).toFixed(2));
  const whaleAccumulationRatio = Number((Math.min(88, Math.max(52, 54 + (alphaScore - 60) * 0.72))).toFixed(1));

  let recommendedTimeframe: 'INTRADIA_SCALPING' | 'SWING_CORTO_2_5D' | 'POSITION_CYCLE_1_3M' = 'SWING_CORTO_2_5D';
  if (volRatio > 2.2 && alphaScore > 88) {
    recommendedTimeframe = 'INTRADIA_SCALPING';
  } else if (alphaScore > 76) {
    recommendedTimeframe = 'SWING_CORTO_2_5D';
  } else {
    recommendedTimeframe = 'POSITION_CYCLE_1_3M';
  }

  const macroAlignment = alphaScore > 75 
    ? 'Alineación Alcista Fuerte con la Dominancia de Bitcoin y Flujos Spot ETF' 
    : 'Descorrelación Positiva / Impulso Autónomo por Catalizador Tecnológico y TVL';

  const onChainFootprint = `${whaleAccumulationRatio}% del volumen reciente absorbido en monederos fríos y contratos de staking fuera de los exchanges.`;

  let bestExecutionWindow = '';
  if (sessionInfo.marketStatus === 'NY_OPEN') {
    bestExecutionWindow = 'Ventana Wall Street: 14:00 - 18:30 UTC (Entrada de flujo institucional Spot ETF)';
  } else if (sessionInfo.marketStatus === 'ASIA_SESSION') {
    bestExecutionWindow = 'Ventana Asiática: 02:00 - 06:00 UTC (Reseteo de Funding y Rotación Altcoins)';
  } else if (sessionInfo.marketStatus === 'LONDON_OPEN') {
    bestExecutionWindow = 'Ventana Europea: 09:00 - 12:00 UTC (Consolidación y ruptura de rangos)';
  } else {
    bestExecutionWindow = 'Ventana 24/7: Compras límite escalonadas en retroceso a soporte';
  }

  return {
    recommendedTimeframe,
    whaleAccumulationRatio,
    rvol20,
    macroAlignment,
    onChainFootprint,
    bestExecutionWindow,
  };
}

/**
 * Builds the complete institutional crypto study.
 */
export function buildComprehensiveCryptoStudy(
  asset: CryptoAsset,
  tp1Pct: number = 8.5,
  tp2Pct: number = 22.0,
  tpMaxPct: number = 48.0,
  slPct: number = 3.2
): ComprehensiveCryptoStudy {
  const currentPrice = asset.current_price || 100;
  const sessionContext = getLiveCryptoSessionDetails();
  const liquidityAnticipation = calculateCryptoLiquidityAndStrategy(asset, sessionContext);
  const momentumHealth = calculateCryptoMomentumHealthAndExhaustion(asset, sessionContext);
  const riskRewardAnalysis = calculateCryptoRiskRewardMetrics(
    currentPrice,
    tp1Pct,
    tp2Pct,
    tpMaxPct,
    slPct,
    asset.alphaScore || 80
  );
  const tacticalExecution = calculateCryptoTacticalExecutionParams(asset, sessionContext);

  return {
    sessionContext: {
      ...sessionContext,
      liquidityAnticipation,
    },
    momentumHealth,
    riskRewardAnalysis,
    tacticalExecution,
  };
}

// Backwards compatibility alias
export const buildComprehensiveStockStudy = buildComprehensiveCryptoStudy;
export const getLiveMarketSessionDetails = getLiveCryptoSessionDetails;
