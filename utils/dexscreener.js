/**
 * DexScreener API client module
 * Fetches token statistics from DexScreener API
 */

/**
 * Fetches token statistics from DexScreener API
 * @returns {Promise<{priceUsd: number, marketCap: number, volume24h: number, priceChange24h: number}|null>}
 */
const fetchTokenStats = async () => {
  try {
    const response = await fetch(
      `https://api.dexscreener.com/latest/dex/pairs/${process.env.CHAIN}/${process.env.PAIR_HASH}`
    );
    
    const data = await response.json();
    
    if (!data || !data.pair) {
      return null;
    }

    const pair = data.pair;
    
    return {
      priceUsd: Number(pair.priceUsd) || 0,
      marketCap: Number(pair.fdv || pair.marketCap || 0),
      volume24h: Number(pair.volume?.h24 || 0),
      priceChange24h: Number(pair.priceChange?.h24 || 0)
    };
  } catch (error) {
    console.error('❌ Error fetching DexScreener data:', error.message);
    return null;
  }
};

module.exports = { fetchTokenStats };
