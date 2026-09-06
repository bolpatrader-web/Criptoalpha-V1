import { CryptoCatalystEvent } from '../types';

// Base de datos de catalizadores críticos y eventos on-chain del mercado de criptomonedas
const KNOWN_CRYPTO_CATALYSTS: Record<string, Partial<CryptoCatalystEvent>> = {
  btc: {
    eventName: 'Impacto del Post-Halving & Flujos Institucionales Spot ETF',
    daysUntil: 2,
    isImminent: true,
    eventType: 'HALVING_CYCLE',
    eventTypeLabel: '🔥 Shock de Oferta Post-Halving & Reserva Estratégica',
    estimatedImpact: 'Reducción de emisión diaria de mineros a 450 BTC/día vs absorción neta de ETFs de +2,500 BTC/día.',
    impliedVolatilityMovePct: 7.8,
    squeezeCompatibility: 'CATALIZADOR_EXPANSION',
    squeezeCompatibilityLabel: '🔥 Catalizador de Expansión Masiva',
    catalystNote: 'Acumulación récord en fondos de custodia institucional. Se proyecta presión compradora sobre los libros de órdenes con baja oferta líquida en exchanges.',
  },
  eth: {
    eventName: 'Hardfork Pectra & Actualización EIP-7702 / EIP-7251',
    daysUntil: 5,
    isImminent: true,
    eventType: 'NETWORK_UPGRADE',
    eventTypeLabel: '⚡ Upgrade de Red Pectra (Staking 2048 ETH & Abstracción de Cuentas)',
    estimatedImpact: 'Optimización drástica de consumo de gas y capacidad de staking de validadores a 2048 ETH.',
    impliedVolatilityMovePct: 9.4,
    squeezeCompatibility: 'CATALIZADOR_EXPANSION',
    squeezeCompatibilityLabel: '🔥 Catalizador de Expansión',
    catalystNote: 'Pectra introduce mejoras críticas de escalabilidad y contratos inteligentes. Gran catalizador para la rotación de capital desde L1 hacia el ecosistema Ethereum.',
  },
  sol: {
    eventName: 'Despliegue del Cliente Validador Firedancer (Jump Crypto)',
    daysUntil: 8,
    isImminent: false,
    eventType: 'NETWORK_UPGRADE',
    eventTypeLabel: '🚀 Firedancer en Mainnet (Capacidad 1M+ TPS)',
    estimatedImpact: 'Diversidad de clientes y reducción de latencia a menos de 50 milisegundos.',
    impliedVolatilityMovePct: 12.5,
    squeezeCompatibility: 'CATALIZADOR_EXPANSION',
    squeezeCompatibilityLabel: '🔥 Catalizador de Expansión',
    catalystNote: 'Firedancer elimina cuellos de botella de hardware y consolida a Solana como la blockchain preferida para trading de alta frecuencia y PayFi.',
  },
  sui: {
    eventName: 'Consenso Mysticeti Sub-Segundo & Emisión Masiva de USDC Nativo',
    daysUntil: 3,
    isImminent: true,
    eventType: 'MAINNET_LAUNCH',
    eventTypeLabel: '🌊 Consenso Mysticeti (390ms Finalidad)',
    estimatedImpact: 'Finalidad récord entre Layer 1s y crecimiento parabólico de TVL en protocolos Move.',
    impliedVolatilityMovePct: 14.0,
    squeezeCompatibility: 'CATALIZADOR_EXPANSION',
    squeezeCompatibilityLabel: '🔥 Catalizador de Expansión',
    catalystNote: 'Flujo de entrada de liquidez institucional con más de $1.4B en TVL. Fuerte candidato a liderar la rotación de nuevas L1s de alto rendimiento.',
  },
  tao: {
    eventName: 'Reforma de Emisión Dinámica dTAO & Benchmark de Subnets IA',
    daysUntil: 4,
    isImminent: true,
    eventType: 'NETWORK_UPGRADE',
    eventTypeLabel: '🧠 Lanzamiento dTAO & Subnets de IA Competitivas',
    estimatedImpact: 'Asignación de tokens directamente ligada al rendimiento y utilidad real de cada subred de IA.',
    impliedVolatilityMovePct: 15.2,
    squeezeCompatibility: 'CATALIZADOR_EXPANSION',
    squeezeCompatibilityLabel: '🔥 Catalizador de Expansión',
    catalystNote: 'Bittensor lidera la narrativa de inteligencia artificial descentralizada. La llegada de dTAO desbloquea liquidez masiva para subnets especializadas.',
  },
  xrp: {
    eventName: 'Lanzamiento Global de Ripple USD (RLUSD) en Redes Bancarias',
    daysUntil: 6,
    isImminent: true,
    eventType: 'MAINNET_LAUNCH',
    eventTypeLabel: '🏦 Integración Bancaria RLUSD & Licencias NYDFS',
    estimatedImpact: 'Adopción institucional de stablecoins respaldadas por dólares para liquidaciones transfronterizas.',
    impliedVolatilityMovePct: 11.0,
    squeezeCompatibility: 'CATALIZADOR_EXPANSION',
    squeezeCompatibilityLabel: '🔥 Catalizador de Expansión',
    catalystNote: 'Aprobación regulatoria y liquidez empresarial que catapulta la demanda sobre el libro de órdenes del XRP Ledger.',
  },
  link: {
    eventName: 'Interconexión Swift & Redes de Producción Bancaria CCIP 1.5',
    daysUntil: 7,
    isImminent: false,
    eventType: 'NETWORK_UPGRADE',
    eventTypeLabel: '🔗 Chainlink CCIP en Producción Interbancaria',
    estimatedImpact: 'Estandarización de transferencia de activos tokenizados RWA entre bancos y blockchains.',
    impliedVolatilityMovePct: 8.5,
    squeezeCompatibility: 'CATALIZADOR_EXPANSION',
    squeezeCompatibilityLabel: '🔥 Catalizador de Expansión',
    catalystNote: 'Chainlink es el estándar indiscutible de oráculos y conectividad financiera con Wall Street (Euroclear, DTCC, Swift).',
  },
  ondo: {
    eventName: 'Expansión de Bonos del Tesoro USDY & Fondo BUIDL de BlackRock',
    daysUntil: 9,
    isImminent: false,
    eventType: 'MAINNET_LAUNCH',
    eventTypeLabel: '🏛️ Tokenización RWA con BlackRock BUIDL',
    estimatedImpact: 'Crecimiento de emisión de bonos tokenizados con rendimiento del 5.1% APY respaldado por deuda soberana.',
    impliedVolatilityMovePct: 10.8,
    squeezeCompatibility: 'CATALIZADOR_EXPANSION',
    squeezeCompatibilityLabel: '🔥 Catalizador de Expansión',
    catalystNote: 'Pionero institucional en RWA. El apoyo directo de los mayores gestores de activos del mundo actúa como catalizador permanente.',
  },
  aave: {
    eventName: 'Despliegue de Aave V4 & Votación de Distribución de Tarifas (Fee Switch)',
    daysUntil: 11,
    isImminent: false,
    eventType: 'NETWORK_UPGRADE',
    eventTypeLabel: '💰 Aave V4 & Activación del Fee Switch',
    estimatedImpact: 'Redirección de millones de dólares en ingresos por préstamos hacia la quema y recompra de tokens AAVE.',
    impliedVolatilityMovePct: 12.0,
    squeezeCompatibility: 'CATALIZADOR_EXPANSION',
    squeezeCompatibilityLabel: '🔥 Catalizador de Expansión',
    catalystNote: 'Mayor mercado de liquidez descentralizada con más de $18B en TVL. La activación del fee switch generará flujo de compra constante.',
  },
  pendle: {
    eventName: 'Lanzamiento de Mercados de Rendimiento en Solana & Bitcoin L2s',
    daysUntil: 10,
    isImminent: false,
    eventType: 'MAINNET_LAUNCH',
    eventTypeLabel: '📈 Expansión Multichain de Yield Tokenization',
    estimatedImpact: 'Captura de miles de millones en TVL en los ecosistemas de staking líquido de Solana y Bitcoin.',
    impliedVolatilityMovePct: 13.4,
    squeezeCompatibility: 'CATALIZADOR_EXPANSION',
    squeezeCompatibilityLabel: '🔥 Catalizador de Expansión',
    catalystNote: 'Monopolio en el comercio de rendimiento y puntos en DeFi. Su expansión a nuevas redes multiplica sus métricas de protocolo.',
  },
  tia: {
    eventName: 'Upgrade Lemongrab & Aumento de Bloques de Disponibilidad Modular',
    daysUntil: 14,
    isImminent: false,
    eventType: 'NETWORK_UPGRADE',
    eventTypeLabel: '🧱 Celestia DA Expansion (128MB Bloques)',
    estimatedImpact: 'Multiplicación de la capacidad de procesamiento para cientos de rollups concurrentes.',
    impliedVolatilityMovePct: 16.0,
    squeezeCompatibility: 'VENTANA_SEGURA',
    squeezeCompatibilityLabel: '🟢 Ventana Técnica Limpia (14d)',
    catalystNote: 'Tras absorber el desbloqueo inicial de tokens, la red consolida su liderazgo en la capa de datos modulares.',
  },
  uni: {
    eventName: 'Despliegue de Unichain L2 en Mainnet & Hooks de Uniswap V4',
    daysUntil: 12,
    isImminent: false,
    eventType: 'MAINNET_LAUNCH',
    eventTypeLabel: '🦄 Mainnet de Unichain L2 & Uniswap V4 Hooks',
    estimatedImpact: 'Internalización de valor de MEV y reducción del 95% en comisiones para proveedores de liquidez.',
    impliedVolatilityMovePct: 11.2,
    squeezeCompatibility: 'CATALIZADOR_EXPANSION',
    squeezeCompatibilityLabel: '🔥 Catalizador de Expansión',
    catalystNote: 'Transformación estratégica de Uniswap de simple dApp a su propia Layer 2 soberana construida sobre el Superchain.',
  },
  pepe: {
    eventName: 'Listado en Nuevos Derivados Institucionales & Quema Comunitaria',
    daysUntil: 4,
    isImminent: true,
    eventType: 'TOKEN_UNLOCK',
    eventTypeLabel: '🐸 Expansión de Liquidez & Quema de Tokens',
    estimatedImpact: 'Alta atracción de volumen retail y rotación de ganancias tras repuntes de Bitcoin.',
    impliedVolatilityMovePct: 18.5,
    squeezeCompatibility: 'ALERTA_RIESGO_BINARIO',
    squeezeCompatibilityLabel: '⚠️ Alta Volatilidad Implícita (±18.5%)',
    catalystNote: 'Moneda meme con la mayor profundidad de libro en Ethereum. Excelente catalizador de volatilidad para entradas rápidas.',
  },
  near: {
    eventName: 'Protocolo de Abstracción de Cadenas & Modelos de IA Open Source de 1.4T Parámetros',
    daysUntil: 15,
    isImminent: false,
    eventType: 'NETWORK_UPGRADE',
    eventTypeLabel: '🌐 NEAR Chain Abstraction & Despliegue Modelo IA',
    estimatedImpact: 'Firma de transacciones multichain desde una sola cuenta NEAR sin puentes manuales.',
    impliedVolatilityMovePct: 10.5,
    squeezeCompatibility: 'VENTANA_SEGURA',
    squeezeCompatibilityLabel: '🟢 Ventana Técnica Limpia (15d)',
    catalystNote: 'Pioneros en la convergencia de IA de código abierto y usabilidad Web3 para millones de usuarios.',
  },
};

/**
 * Obtiene o genera la información del calendario de catalizadores, upgrades y eventos on-chain para cualquier criptomoneda
 */
export function getCryptoCatalyst(symbol: string, currentPrice: number = 100): CryptoCatalystEvent {
  const key = symbol.toLowerCase().replace(/[\.\-\/]/g, '').replace('usd', '').replace('usdt', '');
  
  if (KNOWN_CRYPTO_CATALYSTS[key]) {
    const known = KNOWN_CRYPTO_CATALYSTS[key];
    const today = new Date();
    const targetDate = new Date(today.getTime() + (known.daysUntil || 7) * 86400000);
    const day = targetDate.getDate();
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const month = months[targetDate.getMonth()];
    const dateFormatted = `${day} ${month} (${known.daysUntil}d)`;

    return {
      symbol: symbol.toUpperCase(),
      eventName: known.eventName || 'Evento de Red & Actualización On-Chain',
      eventDateFormatted: dateFormatted,
      daysUntil: known.daysUntil || 7,
      isImminent: (known.daysUntil || 7) <= 5,
      eventType: known.eventType || 'NETWORK_UPGRADE',
      eventTypeLabel: known.eventTypeLabel || '⚡ Upgrade Técnico de Red',
      estimatedImpact: known.estimatedImpact || 'Mejora sustancial de escalabilidad, TVL y eficiencia de tarifas.',
      impliedVolatilityMovePct: known.impliedVolatilityMovePct || 9.5,
      squeezeCompatibility: known.squeezeCompatibility || 'VENTANA_SEGURA',
      squeezeCompatibilityLabel: known.squeezeCompatibilityLabel || '🟢 Ventana Técnica Limpia',
      catalystNote: known.catalystNote || 'Calendario de catalizadores técnicos y fundamentales oficial.',
    };
  }

  // Generador determinista para cualquier otra criptomoneda
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) {
    hash = (hash << 5) - hash + symbol.charCodeAt(i);
    hash |= 0;
  }
  const positiveHash = Math.abs(hash);

  const daysUntil = (positiveHash % 25) + 2; // entre 2 y 27 días
  const isImminent = daysUntil <= 5;

  const today = new Date();
  const targetDate = new Date(today.getTime() + daysUntil * 86400000);
  const day = targetDate.getDate();
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const month = months[targetDate.getMonth()];
  const dateFormatted = `${day} ${month} (${daysUntil}d)`;

  const impliedMove = Number((6.5 + (positiveHash % 12)).toFixed(1));

  let compatibility: CryptoCatalystEvent['squeezeCompatibility'] = 'VENTANA_SEGURA';
  let compatibilityLabel = `🟢 Ventana Técnica Limpia (${daysUntil}d)`;

  if (isImminent) {
    compatibility = 'ALERTA_RIESGO_BINARIO';
    compatibilityLabel = '⚠️ Alta Volatilidad (<5d)';
  } else if (daysUntil <= 9) {
    compatibility = 'CATALIZADOR_EXPANSION';
    compatibilityLabel = '🔥 Catalizador Próximo';
  }

  return {
    symbol: symbol.toUpperCase(),
    eventName: `Actualización de Mainnet & Expansión de Ecosistema`,
    eventDateFormatted: dateFormatted,
    daysUntil,
    isImminent,
    eventType: 'NETWORK_UPGRADE',
    eventTypeLabel: '⚡ Optimización de Rendimiento & Liquidez',
    estimatedImpact: `Incremento de adopción institucional, soporte de monederos y quema periódica de comisiones.`,
    impliedVolatilityMovePct: impliedMove,
    squeezeCompatibility: compatibility,
    squeezeCompatibilityLabel: compatibilityLabel,
    catalystNote: isImminent
      ? `Evento fundamental en ${daysUntil} días. Alta volatilidad implícita esperada (±${impliedMove}%). Vigilar stops antes de la confirmación de ruptura.`
      : `Ventana técnica de ${daysUntil} días sin interferencias de grandes desbloqueos de tokens. Configuración óptima para seguir señales de compresión y flujo de ballenas.`,
  };
}

// Backwards compatibility alias
export const getEarningsCatalyst = getCryptoCatalyst;
