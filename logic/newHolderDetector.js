const { EventEmitter } = require('events');

/**
 * New Holder Detector
 * Tracks wallet balances and detects first-time token holders
 */
class NewHolderDetector extends EventEmitter {
  constructor(tokenListener) {
    super();
    this.tokenListener = tokenListener;
    this.walletBalances = new Map(); // Track wallet balances: Map<walletAddress, balance>
    this.alertedWallets = new Set(); // Track wallets we've already alerted for
    this.isListening = false;
    this.transferHandler = null;
  }

  /**
   * Starts listening for transfer events
   */
  start() {
    if (!this.tokenListener) {
      console.error('❌ Token listener not provided');
      return false;
    }

    // Listen to transfer events from token listener
    this.transferHandler = (transferData) => {
      this.handleTransfer(transferData);
    };
    this.tokenListener.on('transfer', this.transferHandler);

    this.isListening = true;
    console.log('✅ New holder detector started');
    return true;
  }

  /**
   * Handles transfer events and updates wallet balances
   * @param {Object} transferData - Transfer data from token listener
   */
  handleTransfer(transferData) {
    try {
      const { changes, signature, timestamp, tokenMint, slot } = transferData;

      if (!changes || changes.length === 0) {
        return;
      }

      // Process each balance change
      for (const change of changes) {
        const walletAddress = change.owner;
        const previousBalance = this.walletBalances.get(walletAddress) || 0;
        const newBalance = change.postAmount;

        // Update wallet balance
        this.walletBalances.set(walletAddress, newBalance);

        // Detect new holder: wallet went from 0 (or didn't exist) to >0
        const wasZero = previousBalance === 0 || previousBalance === null || previousBalance === undefined;
        const isNowPositive = newBalance > 0;

        if (wasZero && isNowPositive) {
          // This is a new holder!
          this.detectNewHolder(walletAddress, newBalance, transferData);
        }
      }
    } catch (error) {
      console.error('❌ Error handling transfer for new holder detection:', error.message);
    }
  }

  /**
   * Detects and emits event for a new holder
   * @param {string} walletAddress - Wallet address
   * @param {number} balance - New balance
   * @param {Object} transferData - Original transfer data
   */
  detectNewHolder(walletAddress, balance, transferData) {
    // Check if we've already alerted for this wallet
    if (this.alertedWallets.has(walletAddress)) {
      return;
    }

    // Mark as alerted
    this.alertedWallets.add(walletAddress);

    // Create new holder event data
    const newHolderData = {
      wallet: walletAddress,
      balance: balance,
      signature: transferData.signature,
      slot: transferData.slot,
      timestamp: transferData.timestamp,
      tokenMint: transferData.tokenMint
    };

    // Emit new holder event
    this.emit('newHolder', newHolderData);

    console.log(`🆕 New holder detected: ${this.truncateAddress(walletAddress)} (Balance: ${balance.toLocaleString()})`);
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
   * Gets the current balance of a wallet
   * @param {string} walletAddress - Wallet address
   * @returns {number} Current balance (0 if not tracked)
   */
  getBalance(walletAddress) {
    return this.walletBalances.get(walletAddress) || 0;
  }

  /**
   * Gets the total number of tracked wallets
   * @returns {number} Number of wallets
   */
  getTrackedWalletCount() {
    return this.walletBalances.size;
  }

  /**
   * Gets the total number of new holders detected
   * @returns {number} Number of new holders
   */
  getNewHolderCount() {
    return this.alertedWallets.size;
  }

  /**
   * Checks if a wallet has been alerted as a new holder
   * @param {string} walletAddress - Wallet address
   * @returns {boolean} True if already alerted
   */
  hasBeenAlerted(walletAddress) {
    return this.alertedWallets.has(walletAddress);
  }

  /**
   * Manually sets a wallet balance (useful for initialization)
   * @param {string} walletAddress - Wallet address
   * @param {number} balance - Balance to set
   */
  setBalance(walletAddress, balance) {
    this.walletBalances.set(walletAddress, balance);
  }

  /**
   * Clears all tracked data (useful for testing or reset)
   */
  clear() {
    this.walletBalances.clear();
    this.alertedWallets.clear();
    console.log('🗑️  New holder detector data cleared');
  }

  /**
   * Stops listening for transfer events
   */
  stop() {
    if (this.tokenListener && this.transferHandler) {
      this.tokenListener.removeListener('transfer', this.transferHandler);
      this.transferHandler = null;
    }
    this.isListening = false;
    console.log('🛑 New holder detector stopped');
  }
}

module.exports = { NewHolderDetector };
