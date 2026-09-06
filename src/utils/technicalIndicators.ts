import { KlineData, TechnicalIndicatorsResult } from '../types';

/**
 * Calculates exponential moving average (EMA)
 */
export function calculateEMA(prices: number[], period: number): number[] {
  if (prices.length < period) return [];
  const k = 2 / (period + 1);
  const emaArray: number[] = [];
  
  // Initial SMA for the first EMA seed
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += prices[i];
  }
  let currentEMA = sum / period;
  emaArray.push(currentEMA);

  for (let i = period; i < prices.length; i++) {
    currentEMA = prices[i] * k + currentEMA * (1 - k);
    emaArray.push(currentEMA);
  }

  return emaArray;
}

/**
 * Calculates Relative Strength Index (RSI) with Wilder's smoothing
 */
export function calculateRSI(prices: number[], period: number = 14): {
  current: number;
  series: { time: number; value: number }[];
} {
  if (prices.length <= period) {
    return { current: 50, series: [] };
  }

  const deltas: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    deltas.push(prices[i] - prices[i - 1]);
  }

  let gains = 0;
  let losses = 0;

  for (let i = 0; i < period; i++) {
    const diff = deltas[i];
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  const series: { time: number; value: number }[] = [];
  let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  let rsi = 100 - 100 / (1 + rs);

  for (let i = period; i < deltas.length; i++) {
    const diff = deltas[i];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsi = 100 - 100 / (1 + rs);
    series.push({ time: i, value: Number(rsi.toFixed(2)) });
  }

  return {
    current: Number((series[series.length - 1]?.value || 50).toFixed(2)),
    series,
  };
}

/**
 * Calculates MACD (12, 26, 9)
 */
export function calculateMACD(prices: number[]): {
  macdLine: number;
  signalLine: number;
  histogram: number;
  series: { time: number; macd: number; signal: number; hist: number }[];
  crossover: 'bullish_cross' | 'bearish_cross' | 'none';
} {
  if (prices.length < 35) {
    return {
      macdLine: 0,
      signalLine: 0,
      histogram: 0,
      series: [],
      crossover: 'none',
    };
  }

  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);

  // Align arrays: ema12 starts at index 11, ema26 starts at index 25
  const offset = 26 - 12; // 14
  const macdValues: number[] = [];

  for (let i = 0; i < ema26.length; i++) {
    const val12 = ema12[i + offset];
    const val26 = ema26[i];
    if (val12 !== undefined && val26 !== undefined) {
      macdValues.push(val12 - val26);
    }
  }

  const signalValues = calculateEMA(macdValues, 9);
  const signalOffset = macdValues.length - signalValues.length;

  const series: { time: number; macd: number; signal: number; hist: number }[] = [];

  for (let i = 0; i < signalValues.length; i++) {
    const macd = macdValues[i + signalOffset];
    const signal = signalValues[i];
    const hist = macd - signal;
    series.push({
      time: i,
      macd: Number(macd.toFixed(4)),
      signal: Number(signal.toFixed(4)),
      hist: Number(hist.toFixed(4)),
    });
  }

  const last = series[series.length - 1] || { macd: 0, signal: 0, hist: 0 };
  const prev = series[series.length - 2] || { macd: 0, signal: 0, hist: 0 };

  let crossover: 'bullish_cross' | 'bearish_cross' | 'none' = 'none';
  if (prev.macd <= prev.signal && last.macd > last.signal) {
    crossover = 'bullish_cross';
  } else if (prev.macd >= prev.signal && last.macd < last.signal) {
    crossover = 'bearish_cross';
  }

  return {
    macdLine: last.macd,
    signalLine: last.signal,
    histogram: last.hist,
    series,
    crossover,
  };
}

/**
 * Calculates Bollinger Bands (20 periods, 2 std dev)
 */
export function calculateBollingerBands(prices: number[], period: number = 20, multiplier: number = 2) {
  if (prices.length < period) {
    const p = prices[prices.length - 1] || 0;
    return { upper: p, middle: p, lower: p, bandwidth: 0, percentB: 0.5, isSqueeze: false };
  }

  const slice = prices.slice(-period);
  const sum = slice.reduce((a, b) => a + b, 0);
  const mean = sum / period;

  const variance = slice.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / period;
  const stdDev = Math.sqrt(variance);

  const upper = mean + stdDev * multiplier;
  const lower = mean - stdDev * multiplier;
  const bandwidth = mean > 0 ? (upper - lower) / mean : 0;
  
  const currentPrice = prices[prices.length - 1];
  const percentB = upper !== lower ? (currentPrice - lower) / (upper - lower) : 0.5;

  return {
    upper: Number(upper.toFixed(4)),
    middle: Number(mean.toFixed(4)),
    lower: Number(lower.toFixed(4)),
    bandwidth: Number(bandwidth.toFixed(4)),
    percentB: Number(percentB.toFixed(4)),
    isSqueeze: bandwidth < 0.05, // Squeeze condition indicates upcoming explosive volatility
  };
}

/**
 * Calculates ATR (Average True Range)
 */
export function calculateATR(klines: KlineData[], period: number = 14): {
  value: number;
  volatilityLevel: 'baja' | 'moderada' | 'alta' | 'extrema';
} {
  if (klines.length < period + 1) {
    return { value: 0, volatilityLevel: 'moderada' };
  }

  const trueRanges: number[] = [];
  for (let i = 1; i < klines.length; i++) {
    const high = klines[i].high;
    const low = klines[i].low;
    const prevClose = klines[i - 1].close;

    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    trueRanges.push(tr);
  }

  const recentTR = trueRanges.slice(-period);
  const atr = recentTR.reduce((a, b) => a + b, 0) / period;
  const currentPrice = klines[klines.length - 1].close;
  const atrPercentage = currentPrice > 0 ? (atr / currentPrice) * 100 : 0;

  let volatilityLevel: 'baja' | 'moderada' | 'alta' | 'extrema' = 'moderada';
  if (atrPercentage < 1.5) volatilityLevel = 'baja';
  else if (atrPercentage < 4.0) volatilityLevel = 'moderada';
  else if (atrPercentage < 8.0) volatilityLevel = 'alta';
  else volatilityLevel = 'extrema';

  return {
    value: Number(atr.toFixed(4)),
    volatilityLevel,
  };
}

/**
 * Calculates Stochastic Oscillator (%K, %D)
 */
export function calculateStochastic(klines: KlineData[], kPeriod: number = 14, dPeriod: number = 3) {
  if (klines.length < kPeriod) {
    return { k: 50, d: 50, signal: 'neutral' as const };
  }

  const kValues: number[] = [];
  for (let i = kPeriod - 1; i < klines.length; i++) {
    const window = klines.slice(i - kPeriod + 1, i + 1);
    const highestHigh = Math.max(...window.map((k) => k.high));
    const lowestLow = Math.min(...window.map((k) => k.low));
    const currentClose = klines[i].close;

    const k = highestHigh === lowestLow ? 50 : ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;
    kValues.push(k);
  }

  const recentK = kValues.slice(-dPeriod);
  const d = recentK.reduce((a, b) => a + b, 0) / (recentK.length || 1);
  const currentK = kValues[kValues.length - 1] || 50;

  let signal: 'oversold' | 'overbought' | 'neutral' = 'neutral';
  if (currentK < 20 && d < 20) signal = 'oversold';
  else if (currentK > 80 && d > 80) signal = 'overbought';

  return {
    k: Number(currentK.toFixed(2)),
    d: Number(d.toFixed(2)),
    signal,
  };
}

/**
 * Calculates Volume Anomaly (Z-Score) & On-Balance Volume
 */
export function calculateVolumeAnalysis(klines: KlineData[], period: number = 20) {
  if (klines.length < period) {
    return {
      currentVsAverageRatio: 1,
      isVolumeSpike: false,
      zScore: 0,
      obvTrend: 'neutral' as const,
    };
  }

  const volumes = klines.map((k) => k.volume);
  const currentVol = volumes[volumes.length - 1];
  const slice = volumes.slice(-period);
  const avgVol = slice.reduce((a, b) => a + b, 0) / period;

  const variance = slice.reduce((acc, v) => acc + Math.pow(v - avgVol, 2), 0) / period;
  const stdDev = Math.sqrt(variance) || 1;
  const zScore = (currentVol - avgVol) / stdDev;

  const ratio = avgVol > 0 ? currentVol / avgVol : 1;
  const isVolumeSpike = ratio >= 1.75 || zScore >= 2.0;

  // OBV calculation
  let obv = 0;
  const obvValues: number[] = [0];
  for (let i = 1; i < klines.length; i++) {
    if (klines[i].close > klines[i - 1].close) {
      obv += klines[i].volume;
    } else if (klines[i].close < klines[i - 1].close) {
      obv -= klines[i].volume;
    }
    obvValues.push(obv);
  }

  const recentOBV = obvValues.slice(-5);
  const obvTrend = recentOBV[recentOBV.length - 1] > recentOBV[0] ? 'acumulacion' : 'distribucion';

  return {
    currentVsAverageRatio: Number(ratio.toFixed(2)),
    isVolumeSpike,
    zScore: Number(zScore.toFixed(2)),
    obvTrend: (ratio > 1.2 && obvTrend === 'acumulacion' ? 'acumulacion' : obvTrend) as 'acumulacion' | 'distribucion' | 'neutral',
  };
}

/**
 * Calculates Classic Pivot Points (Support & Resistance)
 */
export function calculatePivotPoints(high: number, low: number, close: number) {
  const p = (high + low + close) / 3;
  const r1 = 2 * p - low;
  const s1 = 2 * p - high;
  const r2 = p + (high - low);
  const s2 = p - (high - low);
  const r3 = high + 2 * (p - low);
  const s3 = low - 2 * (high - p);

  return {
    pivot: Number(p.toFixed(4)),
    r1: Number(r1.toFixed(4)),
    r2: Number(r2.toFixed(4)),
    r3: Number(r3.toFixed(4)),
    s1: Number(s1.toFixed(4)),
    s2: Number(s2.toFixed(4)),
    s3: Number(s3.toFixed(4)),
  };
}

/**
 * Comprehensive Technical Analysis Analyzer
 */
export function performFullTechnicalAnalysis(klines: KlineData[]): TechnicalIndicatorsResult {
  if (!klines || klines.length === 0) {
    // Default safe response
    return {
      rsi: { current: 50, series: [], signal: 'neutral' },
      macd: { macdLine: 0, signalLine: 0, histogram: 0, series: [], crossover: 'none' },
      bollingerBands: { upper: 0, middle: 0, lower: 0, bandwidth: 0, percentB: 0.5, isSqueeze: false },
      ema: { ema20: 0, ema50: 0, ema200: 0, goldenCross: false, deathCross: false, trend: 'neutral' },
      atr: { value: 0, volatilityLevel: 'moderada' },
      stochastic: { k: 50, d: 50, signal: 'neutral' },
      volumeAnalysis: { currentVsAverageRatio: 1, isVolumeSpike: false, zScore: 0, obvTrend: 'neutral' },
      pivotPoints: { pivot: 0, r1: 0, r2: 0, r3: 0, s1: 0, s2: 0, s3: 0 },
      overallSignal: { score: 50, recommendation: 'NEUTRAL', confidence: 50, summary: 'Datos insuficientes para análisis' },
    };
  }

  const prices = klines.map((k) => k.close);
  const lastKline = klines[klines.length - 1];

  // 1. RSI
  const rsiData = calculateRSI(prices, 14);
  let rsiSignal: 'oversold' | 'overbought' | 'neutral' = 'neutral';
  if (rsiData.current < 30) rsiSignal = 'oversold';
  else if (rsiData.current > 70) rsiSignal = 'overbought';

  // 2. MACD
  const macdData = calculateMACD(prices);

  // 3. Bollinger Bands
  const bbData = calculateBollingerBands(prices, 20, 2);

  // 4. EMAs
  const ema20Arr = calculateEMA(prices, 20);
  const ema50Arr = calculateEMA(prices, 50);
  const ema200Arr = calculateEMA(prices, 200);

  const ema20 = ema20Arr[ema20Arr.length - 1] || lastKline.close;
  const ema50 = ema50Arr[ema50Arr.length - 1] || lastKline.close;
  const ema200 = ema200Arr[ema200Arr.length - 1] || lastKline.close;

  const currentPrice = lastKline.close;
  let emaTrend: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  if (currentPrice > ema50 && ema50 > ema200) emaTrend = 'bullish';
  else if (currentPrice < ema50 && ema50 < ema200) emaTrend = 'bearish';

  const goldenCross = ema50 > ema200 && (ema50Arr[ema50Arr.length - 2] || 0) <= (ema200Arr[ema200Arr.length - 2] || 0);
  const deathCross = ema50 < ema200 && (ema50Arr[ema50Arr.length - 2] || 0) >= (ema200Arr[ema200Arr.length - 2] || 0);

  // 5. ATR
  const atrData = calculateATR(klines, 14);

  // 6. Stochastic
  const stochData = calculateStochastic(klines, 14, 3);

  // 7. Volume
  const volData = calculateVolumeAnalysis(klines, 20);

  // 8. Pivot Points
  const pivots = calculatePivotPoints(lastKline.high, lastKline.low, lastKline.close);

  // 9. Composite Score (0 - 100)
  let score = 50;

  // RSI score influence
  if (rsiData.current < 30) score += 15; // Oversold bounce opportunity
  else if (rsiData.current > 70) score -= 15; // Overbought risk
  else if (rsiData.current >= 45 && rsiData.current <= 60) score += 5; // Healthy momentum

  // MACD score influence
  if (macdData.crossover === 'bullish_cross') score += 15;
  else if (macdData.crossover === 'bearish_cross') score -= 15;
  else if (macdData.histogram > 0) score += 8;
  else if (macdData.histogram < 0) score -= 8;

  // Trend EMA influence
  if (emaTrend === 'bullish') score += 12;
  else if (emaTrend === 'bearish') score -= 12;
  if (goldenCross) score += 15;
  if (deathCross) score -= 15;

  // Volume & OBV influence
  if (volData.isVolumeSpike && currentPrice > ema20) score += 10; // Volume confirmed breakout
  if (volData.obvTrend === 'acumulacion') score += 6;

  // Bollinger Bands
  if (bbData.percentB < 0.15) score += 8; // Near lower band support
  else if (bbData.percentB > 0.85) score -= 8; // Near upper band resistance

  score = Math.max(5, Math.min(95, Math.round(score)));

  let recommendation: 'COMPRA FUERTE' | 'COMPRA' | 'NEUTRAL' | 'VENTA' | 'VENTA FUERTE' = 'NEUTRAL';
  if (score >= 75) recommendation = 'COMPRA FUERTE';
  else if (score >= 60) recommendation = 'COMPRA';
  else if (score <= 25) recommendation = 'VENTA FUERTE';
  else if (score <= 40) recommendation = 'VENTA';

  const confidence = Math.min(95, Math.max(50, Math.abs(score - 50) * 1.6 + 45));

  let summary = '';
  if (score >= 65) {
    summary = `Señales alcistas consistentes con RSI en ${rsiData.current}, momentum MACD positivo y acumulación de volumen institucional.`;
  } else if (score <= 35) {
    summary = `Presión bajista dominante con EMA en declive, RSI en ${rsiData.current} y riesgo de continuación a la baja hacia soporte en $${pivots.s1}.`;
  } else {
    summary = `Estructura de consolidación y equilibrio entre oferta y demanda. Esperar ruptura de $${pivots.r1} o confirmación de volumen.`;
  }

  return {
    rsi: {
      current: rsiData.current,
      series: rsiData.series,
      signal: rsiSignal,
    },
    macd: macdData,
    bollingerBands: bbData,
    ema: {
      ema20: Number(ema20.toFixed(4)),
      ema50: Number(ema50.toFixed(4)),
      ema200: Number(ema200.toFixed(4)),
      goldenCross,
      deathCross,
      trend: emaTrend,
    },
    atr: atrData,
    stochastic: stochData,
    volumeAnalysis: volData,
    pivotPoints: pivots,
    overallSignal: {
      score,
      recommendation,
      confidence: Math.round(confidence),
      summary,
    },
  };
}
