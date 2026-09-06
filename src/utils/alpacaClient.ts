import { AlpacaAccountInfo, AlpacaPosition, AlpacaOrder, AlpacaActivity, AlpacaPortfolioHistory, AlpacaBotRoutingConfig, AlpacaBotRoutingMode } from '../types';
import { safeFetchJson } from './api';

export async function fetchAlpacaAccount(): Promise<AlpacaAccountInfo> {
  try {
    const res = await safeFetchJson<any>('/api/alpaca/account');
    const data = res.data;
    if (res.ok && data && data.connected) {
      return {
        connected: true,
        accountNumber: data.accountNumber,
        status: String(data.status || 'ACTIVE'),
        cryptoStatus: data.cryptoStatus,
        currency: data.currency || 'USD',
        cash: data.cash ?? 100000,
        portfolioValue: data.portfolioValue ?? 100000,
        buyingPower: data.buyingPower ?? 400000,
        equity: data.equity ?? 100000,
        isPaper: data.isPaper ?? true,
        endpoint: data.endpoint || 'https://paper-api.alpaca.markets/v2',
      };
    }
    return {
      connected: false,
      cash: 0,
      portfolioValue: 0,
      buyingPower: 0,
      equity: 0,
      isPaper: true,
      endpoint: 'https://paper-api.alpaca.markets/v2',
      error: res.error || data?.error || 'No conectado a Alpaca',
    };
  } catch (err: any) {
    return {
      connected: false,
      cash: 0,
      portfolioValue: 0,
      buyingPower: 0,
      equity: 0,
      isPaper: true,
      endpoint: 'https://paper-api.alpaca.markets/v2',
      error: err?.message || 'Error de red con Alpaca',
    };
  }
}

export async function fetchAlpacaPositions(): Promise<AlpacaPosition[]> {
  try {
    const res = await safeFetchJson<{ positions: AlpacaPosition[] }>('/api/alpaca/positions');
    return res.data?.positions || [];
  } catch (err) {
    console.error('Error fetching Alpaca positions:', err);
    return [];
  }
}

export async function fetchAlpacaOrders(): Promise<AlpacaOrder[]> {
  try {
    const res = await safeFetchJson<{ orders: AlpacaOrder[] }>('/api/alpaca/orders');
    return res.data?.orders || [];
  } catch (err) {
    console.error('Error fetching Alpaca orders:', err);
    return [];
  }
}

// Cryptos actively tradable on Alpaca Markets Crypto Paper Trading
export const ALPACA_SUPPORTED_CRYPTO_SYMBOLS = new Set([
  'BTC', 'ETH', 'SOL', 'XRP', 'ADA', 'LINK', 'DOGE', 'AVAX', 'PEPE', 'ONDO',
  'AAVE', 'RENDER', 'UNI', 'LTC', 'SHIB', 'DOT', 'ARB', 'BCH', 'CRV', 'FIL',
  'GRT', 'LDO', 'PAXG', 'POL', 'SKY', 'SUSHI', 'TRUMP', 'WIF', 'BONK', 'HYPE',
  'BAT', 'XTZ', 'YFI', 'USDC', 'USDT'
]);

export function cleanCryptoBaseSymbol(symbol: string): string {
  if (!symbol) return '';
  return symbol.trim().toUpperCase().replace('/USD', '').replace('/USDT', '').replace('USD', '');
}

export function isAlpacaSupportedCrypto(symbol: string): boolean {
  const base = cleanCryptoBaseSymbol(symbol);
  return ALPACA_SUPPORTED_CRYPTO_SYMBOLS.has(base);
}

export async function placeAlpacaOrder(params: {
  symbol: string;
  side: 'buy' | 'sell';
  notional?: number;
  qty?: number;
  clientOrderId?: string;
  source?: 'quant' | 'scalp' | 'daemon' | 'manual';
}): Promise<{ success: boolean; order?: AlpacaOrder; error?: string; unsupported?: boolean }> {
  try {
    const baseSymbol = cleanCryptoBaseSymbol(params.symbol);
    if (!isAlpacaSupportedCrypto(params.symbol)) {
      return {
        success: false,
        unsupported: true,
        error: `El par ${baseSymbol}/USD no está listado en Alpaca Crypto (operado en simulación local)`,
      };
    }

    const payload = {
      ...params,
      client_order_id: params.clientOrderId || `criptoalpha_${params.source || 'bot'}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    };

    const res = await fetch('/api/alpaca/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      return {
        success: false,
        unsupported: data?.unsupported || false,
        error: data?.message || data?.error || 'Error al enviar orden a Alpaca',
      };
    }
    return { success: true, order: data.order };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error de conexión' };
  }
}

export async function setAlpacaExclusiveBotMode(enabled: boolean): Promise<{ success: boolean; exclusiveBotMode: boolean; message?: string }> {
  try {
    const res = await fetch('/api/alpaca/exclusive-mode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, exclusiveBotMode: true, message: err?.message };
  }
}

export async function purgeForeignAlpacaOrdersAndPositions(): Promise<{ success: boolean; cancelledCount: number; closedPositionsCount: number; message: string }> {
  try {
    const res = await fetch('/api/alpaca/sync-exclusive-purge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, cancelledCount: 0, closedPositionsCount: 0, message: err?.message || 'Error de red' };
  }
}

export async function closeAlpacaPosition(symbol: string): Promise<{ success: boolean; error?: string }> {
  try {
    const cleanSymbol = symbol.replace('/', '');
    const res = await fetch(`/api/alpaca/positions/${cleanSymbol}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data?.error || 'Error al cerrar posición' };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error de conexión' };
  }
}

export async function cancelAlpacaOrder(orderId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`/api/alpaca/orders/${orderId}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data?.error || 'Error al cancelar orden' };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error de conexión' };
  }
}

export async function fetchAlpacaActivities(activityType: string = 'FILL'): Promise<AlpacaActivity[]> {
  try {
    const res = await safeFetchJson<{ activities: AlpacaActivity[] }>(`/api/alpaca/activities?activity_type=${activityType}&limit=100`);
    return res.data?.activities || [];
  } catch (err) {
    console.error('Error fetching Alpaca activities:', err);
    return [];
  }
}

export async function fetchAlpacaPortfolioHistory(period: string = '1M', timeframe: string = '1D'): Promise<AlpacaPortfolioHistory | null> {
  try {
    const res = await safeFetchJson<AlpacaPortfolioHistory>(`/api/alpaca/portfolio/history?period=${period}&timeframe=${timeframe}`);
    return res.data || null;
  } catch (err) {
    console.error('Error fetching Alpaca portfolio history:', err);
    return null;
  }
}

export async function closeAllAlpacaPositions(): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch('/api/alpaca/positions', {
      method: 'DELETE',
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data?.error || 'Error al liquidar posiciones' };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error de conexión' };
  }
}

export async function fetchAlpacaDaemonStatus(): Promise<any | null> {
  try {
    const res = await safeFetchJson<any>('/api/alpaca/daemon/status');
    if (res.ok && res.data?.success) {
      return res.data;
    }
    return null;
  } catch {
    return null;
  }
}

export async function toggleAlpacaDaemon(enabled?: boolean): Promise<{ success: boolean; message?: string; enabled?: boolean; error?: string }> {
  try {
    const res = await safeFetchJson<any>('/api/alpaca/daemon/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(enabled !== undefined ? { enabled } : {}),
    });
    if (res.ok && res.data) {
      return res.data;
    }
    return { success: false, error: res.error || 'Error al alternar motor 24/7' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error de conexión' };
  }
}

export async function updateAlpacaDaemonConfig(config: any): Promise<{ success: boolean; config?: any; error?: string }> {
  try {
    const res = await safeFetchJson<any>('/api/alpaca/daemon/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    if (res.ok && res.data?.success) {
      return res.data;
    }
    return { success: false, error: res.error || 'Error al guardar configuración' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error de conexión' };
  }
}

// ==========================================
// ALPACA BOT ROUTING & DEACTIVATION
// ==========================================

const ROUTING_STORAGE_KEY = 'crypto_alpha_alpaca_bot_routing';

export function getAlpacaBotRoutingLocal(): AlpacaBotRoutingConfig {
  try {
    const raw = localStorage.getItem(ROUTING_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        scalpEnabled: parsed.scalpEnabled ?? true,
        quantEnabled: parsed.quantEnabled ?? true,
        mode: parsed.mode || (parsed.scalpEnabled && parsed.quantEnabled ? 'both' : parsed.scalpEnabled ? 'scalp_only' : parsed.quantEnabled ? 'quant_only' : 'none'),
        lastUpdated: parsed.lastUpdated,
      };
    }
  } catch {}
  return {
    scalpEnabled: true,
    quantEnabled: true,
    mode: 'both',
  };
}

export function isQuantAllowedToAlpaca(): boolean {
  return getAlpacaBotRoutingLocal().quantEnabled;
}

export function isScalpingAllowedToAlpaca(): boolean {
  return getAlpacaBotRoutingLocal().scalpEnabled;
}

export async function fetchAlpacaBotRouting(): Promise<AlpacaBotRoutingConfig> {
  try {
    const res = await safeFetchJson<{ success: boolean; routing: AlpacaBotRoutingConfig }>('/api/alpaca/bot-routing');
    if (res.ok && res.data?.routing) {
      const r = res.data.routing;
      const mode: AlpacaBotRoutingMode = r.scalpEnabled && r.quantEnabled ? 'both' : r.scalpEnabled ? 'scalp_only' : r.quantEnabled ? 'quant_only' : 'none';
      const updatedConfig = { ...r, mode };
      localStorage.setItem(ROUTING_STORAGE_KEY, JSON.stringify(updatedConfig));
      return updatedConfig;
    }
  } catch (e) {
    console.warn('Error al obtener routing de Alpaca del servidor, usando local:', e);
  }
  return getAlpacaBotRoutingLocal();
}

export async function saveAlpacaBotRouting(config: AlpacaBotRoutingConfig): Promise<{ success: boolean; routing?: AlpacaBotRoutingConfig; error?: string }> {
  try {
    const mode: AlpacaBotRoutingMode = config.scalpEnabled && config.quantEnabled ? 'both' : config.scalpEnabled ? 'scalp_only' : config.quantEnabled ? 'quant_only' : 'none';
    const payload = {
      scalpEnabled: config.scalpEnabled,
      quantEnabled: config.quantEnabled,
      mode,
      lastUpdated: new Date().toISOString(),
    };
    localStorage.setItem(ROUTING_STORAGE_KEY, JSON.stringify(payload));
    
    // Disparar evento para que los hubs de bots actualicen su interfaz inmediatamente
    window.dispatchEvent(new CustomEvent('alpaca_bot_routing_changed', { detail: payload }));

    const res = await safeFetchJson<{ success: boolean; routing: AlpacaBotRoutingConfig }>('/api/alpaca/bot-routing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    return { success: res.ok, routing: payload };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error de conexión' };
  }
}

export async function deactivateBotAndLiquidate(
  botType: 'scalp' | 'quant' | 'both',
  symbolsToClose?: string[]
): Promise<{ success: boolean; closedPositionsCount: number; cancelledOrdersCount: number; message: string; routing?: AlpacaBotRoutingConfig }> {
  try {
    const res = await fetch('/api/alpaca/deactivate-bot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ botType, symbolsToClose }),
    });
    const data = await res.json();

    const current = getAlpacaBotRoutingLocal();
    const newConfig: AlpacaBotRoutingConfig = {
      ...current,
      scalpEnabled: botType === 'both' ? false : botType === 'scalp' ? false : current.scalpEnabled,
      quantEnabled: botType === 'both' ? false : botType === 'quant' ? false : current.quantEnabled,
      lastUpdated: new Date().toISOString(),
    };
    newConfig.mode = newConfig.scalpEnabled && newConfig.quantEnabled ? 'both' : newConfig.scalpEnabled ? 'scalp_only' : newConfig.quantEnabled ? 'quant_only' : 'none';
    
    localStorage.setItem(ROUTING_STORAGE_KEY, JSON.stringify(newConfig));
    window.dispatchEvent(new CustomEvent('alpaca_bot_routing_changed', { detail: newConfig }));

    return {
      success: res.ok && data.success,
      closedPositionsCount: data.closedPositionsCount || 0,
      cancelledOrdersCount: data.cancelledOrdersCount || 0,
      message: data.message || `Bot ${botType} desactivado correctamente en Alpaca.`,
      routing: newConfig,
    };
  } catch (err: any) {
    return {
      success: false,
      closedPositionsCount: 0,
      cancelledOrdersCount: 0,
      message: err?.message || 'Error al comunicar con Alpaca',
    };
  }
}
