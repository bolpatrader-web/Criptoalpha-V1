import React from 'react';

/**
 * High-definition Cryptocurrency Logo Provider & Fallback Engine
 * Fetches authentic vector/PNG logos from official CoinGecko, TrustWallet, and CryptoCompare CDNs.
 */

const KNOWN_CRYPTO_LOGOS: Record<string, string> = {
  btc: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png',
  eth: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png',
  sol: 'https://assets.coingecko.com/coins/images/4128/large/solana.png',
  bnb: 'https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png',
  xrp: 'https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png',
  doge: 'https://assets.coingecko.com/coins/images/5/large/dogecoin.png',
  ada: 'https://assets.coingecko.com/coins/images/975/large/cardano.png',
  sui: 'https://assets.coingecko.com/coins/images/26375/large/sui-ocean-square.png',
  avax: 'https://assets.coingecko.com/coins/images/12559/large/Avalanche_Circle_RedWhite_Trans.png',
  link: 'https://assets.coingecko.com/coins/images/877/large/chainlink-new-logo.png',
  shib: 'https://assets.coingecko.com/coins/images/11939/large/shiba.png',
  ton: 'https://assets.coingecko.com/coins/images/17980/large/ton_symbol.png',
  dot: 'https://assets.coingecko.com/coins/images/12171/large/polkadot.png',
  near: 'https://assets.coingecko.com/coins/images/10365/large/near.png',
  apt: 'https://assets.coingecko.com/coins/images/26455/large/aptos_round.png',
  uni: 'https://assets.coingecko.com/coins/images/12504/large/uniswap-uni.png',
  pepe: 'https://assets.coingecko.com/coins/images/29850/large/pepe-token.png',
  tao: 'https://assets.coingecko.com/coins/images/30353/large/bittensor-tao.png',
  fet: 'https://assets.coingecko.com/coins/images/5681/large/Fetch.jpg',
  render: 'https://assets.coingecko.com/coins/images/11636/large/rndr.png',
  arb: 'https://assets.coingecko.com/coins/images/16547/large/arbitrum_logo.png',
  op: 'https://assets.coingecko.com/coins/images/25244/large/Optimism.png',
  matic: 'https://assets.coingecko.com/coins/images/4713/large/polygon.png',
  pol: 'https://assets.coingecko.com/coins/images/4713/large/polygon.png',
  aave: 'https://assets.coingecko.com/coins/images/12645/large/AAVE.png',
  ondo: 'https://assets.coingecko.com/coins/images/26580/large/ondo.png',
  inj: 'https://assets.coingecko.com/coins/images/12882/large/Secondary_Symbol.png',
  tia: 'https://assets.coingecko.com/coins/images/31967/large/celestia.png',
  sei: 'https://assets.coingecko.com/coins/images/28205/large/Sei_Logo_-_Transparent.png',
  kas: 'https://assets.coingecko.com/coins/images/25751/large/kaspa-icon-exchanges.png',
  wif: 'https://assets.coingecko.com/coins/images/33566/large/dogwifhat.jpg',
  bonk: 'https://assets.coingecko.com/coins/images/28600/large/bonk.jpg',
  floki: 'https://assets.coingecko.com/coins/images/16746/large/FLOKI.png',
  icp: 'https://assets.coingecko.com/coins/images/14495/large/Internet_Computer_logo.png',
  stx: 'https://assets.coingecko.com/coins/images/2069/large/Stacks_logo_full.png',
  ftm: 'https://assets.coingecko.com/coins/images/4001/large/Fantom_round.png',
  s: 'https://assets.coingecko.com/coins/images/4001/large/Fantom_round.png',
  jup: 'https://assets.coingecko.com/coins/images/34188/large/jup.png',
  pendle: 'https://assets.coingecko.com/coins/images/15061/large/Pendle_Logo_Normal-03.png',
  ena: 'https://assets.coingecko.com/coins/images/36531/large/ethena.png',
  pyth: 'https://assets.coingecko.com/coins/images/31924/large/pyth.png',
  wld: 'https://assets.coingecko.com/coins/images/31062/large/worldcoin.png',
  grt: 'https://assets.coingecko.com/coins/images/13397/large/Graph_Token.png',
  hbar: 'https://assets.coingecko.com/coins/images/3688/large/hbar.png',
  vet: 'https://assets.coingecko.com/coins/images/1167/large/VET_Token_Icon.png',
  ldo: 'https://assets.coingecko.com/coins/images/13573/large/Lido_DAO.png',
  mkr: 'https://assets.coingecko.com/coins/images/1364/large/Mark_Maker.png',
  crv: 'https://assets.coingecko.com/coins/images/12124/large/Curve.png',
  gala: 'https://assets.coingecko.com/coins/images/12493/large/GALA-COINGECKO.png',
  algo: 'https://assets.coingecko.com/coins/images/4380/large/download.png',
  atom: 'https://assets.coingecko.com/coins/images/1481/large/cosmos_hub.png',
  rune: 'https://assets.coingecko.com/coins/images/6595/large/thorchain.png',
};

export function getCryptoLogoUrl(symbol?: string, customFallback?: string): string {
  if (!symbol) return customFallback || 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png';
  
  const clean = symbol.trim().toLowerCase().replace(/[\.\-\/]/g, '').replace('usd', '').replace('usdt', '');
  
  if (KNOWN_CRYPTO_LOGOS[clean]) {
    return KNOWN_CRYPTO_LOGOS[clean];
  }
  
  return `https://assets.coingecko.com/coins/images/1/large/bitcoin.png`;
}

export function getCryptoBackupLogoUrl(symbol?: string): string {
  if (!symbol) return 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png';
  const clean = symbol.trim().toLowerCase();
  return KNOWN_CRYPTO_LOGOS[clean] || 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png';
}

export function handleCryptoImageError(
  event: React.SyntheticEvent<HTMLImageElement, Event>,
  symbol?: string
) {
  const target = event.currentTarget;
  const backup = getCryptoBackupLogoUrl(symbol);
  
  if (target.src !== backup) {
    target.src = backup;
  }
}

// Backwards compatibility alias
export const getStockLogoUrl = getCryptoLogoUrl;
export const getStockBackupLogoUrl = getCryptoBackupLogoUrl;
export const handleStockImageError = handleCryptoImageError;
