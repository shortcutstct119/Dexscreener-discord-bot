const { fetchTokenStats } = require('../utils/dexscreener');
const { sendMessage } = require('../discord/notifier');

/**
 * Large Buy Alerts
 * Monitors buy events and sends Discord alerts for large purchases
 */
class LargeBuyAlerts {
  constructor(buyDetector, discordClient) {
    this.buyDetector = buyDetector;
    this.discordClient = discordClient;
    this.sentAlerts = new Set(); // Track sent alerts by signature to prevent duplicates
    this.threshold = 0;
    this.isListening = false;
    this.buyHandler = null;

    // Load threshold from environment
    this.loadThreshold();
  }

  /**
   * Loads the large buy threshold from environment variable
   */
  loadThreshold() {
    const thresholdEnv = process.env.LARGE_BUY_USD;
    
    if (!thresholdEnv || thresholdEnv.trim() === '') {
      console.warn('⚠️  LARGE_BUY_USD not set - large buy alerts will be disabled');
      this.threshold = 0;
      return;
    }

    const threshold = parseFloat(thresholdEnv);
    
    if (isNaN(threshold) || threshold <= 0) {
      console.warn('⚠️  Invalid LARGE_BUY_USD value - large buy alerts will be disabled');
      this.threshold = 0;
      return;
    }

    this.threshold = threshold;
    console.log(`✅ Large buy alert threshold set to $${this.threshold.toLocaleString()}`);
  }

  /**
   * Starts listening for large buy events
   */
  start() {
    if (this.threshold === 0) {
      console.warn('⚠️  Cannot start large buy alerts - threshold not configured');
      return false;
    }

    if (!this.buyDetector) {
      console.error('❌ Buy detector not provided');
      return false;
    }

    if (!this.discordClient) {
      console.error('❌ Discord client not provided');
      return false;
    }

    // Listen to buy events from buy detector
    this.buyHandler = (buyData) => {
      this.handleBuy(buyData);
    };
    this.buyDetector.on('buy', this.buyHandler);

    this.isListening = true;
    console.log('✅ Large buy alerts started');
    return true;
  }

  /**
   * Handles buy events and checks if they qualify for alerts
   * @param {Object} buyData - Buy data from buy detector
   */
  async handleBuy(buyData) {
    try {
      const { signature, amount, buyer, timestamp } = buyData;

      // Prevent duplicate alerts
      if (this.sentAlerts.has(signature)) {
        return;
      }

      // Fetch current token price from DexScreener
      const tokenStats = await fetchTokenStats();
      
      if (!tokenStats || !tokenStats.priceUsd) {
        console.warn('⚠️  Could not fetch token price for buy alert');
        return;
      }

      // Calculate USD value of the buy
      const buyAmountUsd = amount * tokenStats.priceUsd;

      // Check if buy exceeds threshold
      if (buyAmountUsd >= this.threshold) {
        // Mark as sent to prevent duplicates
        this.sentAlerts.add(signature);

        // Format and send Discord message
        const message = this.formatBuyAlert(buyData, buyAmountUsd, tokenStats.priceUsd);
        await sendMessage(this.discordClient, message);

        console.log(`📢 Large buy alert sent: $${buyAmountUsd.toLocaleString()} (${amount.toLocaleString()} tokens)`);
      }
    } catch (error) {
      console.error('❌ Error handling large buy alert:', error.message);
    }
  }

  /**
   * Formats a buy alert message for Discord
   * @param {Object} buyData - Buy data
   * @param {number} buyAmountUsd - USD value of the buy
   * @param {number} tokenPrice - Current token price in USD
   * @returns {string} Formatted Discord message
   */
  formatBuyAlert(buyData, buyAmountUsd, tokenPrice) {
    const { amount, buyer, signature, timestamp } = buyData;
    const tokenSymbol = process.env.TOKEN_SYMBOL || 'TOKEN';
    
    // Format amounts
    const formattedAmount = this.formatTokenAmount(amount);
    const formattedUsd = this.formatUsdAmount(buyAmountUsd);
    const formattedPrice = this.formatPrice(tokenPrice);

    // Format timestamp
    const timeStr = timestamp ? timestamp.toLocaleTimeString() : 'Unknown';

    // Truncate buyer address for display (show first 4 and last 4 chars)
    const buyerDisplay = this.truncateAddress(buyer);

    // Create Solana explorer link
    const explorerLink = `https://solscan.io/tx/${signature}`;

    // Build message
    const message = `🚀 **LARGE BUY ALERT** 🚀\n\n` +
      `💰 **Amount:** ${formattedAmount} $${tokenSymbol} ($${formattedUsd})\n` +
      `💵 **Price:** $${formattedPrice}\n` +
      `👤 **Buyer:** \`${buyerDisplay}\`\n` +
      `🕐 **Time:** ${timeStr}\n` +
      `🔗 **Transaction:** [View on Solscan](${explorerLink})`;

    return message;
  }

  /**
   * Formats token amount with appropriate decimals
   * @param {number} amount - Token amount
   * @returns {string} Formatted amount
   */
  formatTokenAmount(amount) {
    if (amount >= 1_000_000) {
      return (amount / 1_000_000).toFixed(2) + 'M';
    }
    if (amount >= 1_000) {
      return (amount / 1_000).toFixed(2) + 'K';
    }
    return amount.toFixed(2);
  }

  /**
   * Formats USD amount with commas
   * @param {number} amount - USD amount
   * @returns {string} Formatted amount
   */
  formatUsdAmount(amount) {
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  /**
   * Formats price with appropriate decimals
   * @param {number} price - Price value
   * @returns {string} Formatted price
   */
  formatPrice(price) {
    if (price >= 1) return price.toFixed(3);
    if (price >= 0.01) return price.toFixed(4);
    if (price >= 0.0001) return price.toFixed(6);
    return price.toFixed(8);
  }

  /**
   * Truncates a Solana address for display
   * @param {string} address - Full address
   * @returns {string} Truncated address (first 4 + ... + last 4)
   */
  truncateAddress(address) {
    if (!address || address.length < 12) return address;
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  }

  /**
   * Stops listening for large buy events
   */
  stop() {
    if (this.buyDetector && this.buyHandler) {
      this.buyDetector.removeListener('buy', this.buyHandler);
      this.buyHandler = null;
    }
    this.isListening = false;
    console.log('🛑 Large buy alerts stopped');
  }

  /**
   * Clears the sent alerts cache (useful for testing or reset)
   */
  clearCache() {
    this.sentAlerts.clear();
    console.log('🗑️  Alert cache cleared');
  }

  /**
   * Gets the current threshold
   * @returns {number} Threshold in USD
   */
  getThreshold() {
    return this.threshold;
  }
}

module.exports = { LargeBuyAlerts };
