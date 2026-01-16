const { EventEmitter } = require('events');
const { PublicKey } = require('@solana/web3.js');

/**
 * Buy Detector
 * Detects token buys by monitoring transfers from AMM vaults to wallets
 */
class BuyDetector extends EventEmitter {
  constructor(tokenListener) {
    super();
    this.tokenListener = tokenListener;
    this.ammVaults = [];
    this.isListening = false;
    this.transferHandler = null; // Store handler reference for cleanup
    
    // Parse AMM vaults from environment
    this.loadAmmVaults();
  }

  /**
   * Loads AMM vault addresses from environment variable
   */
  loadAmmVaults() {
    const ammVaultsEnv = process.env.AMM_VAULTS;
    
    if (!ammVaultsEnv || ammVaultsEnv.trim() === '') {
      console.warn('⚠️  AMM_VAULTS not set - buy detection will be disabled');
      return;
    }

    const addresses = ammVaultsEnv.split(',').map(addr => addr.trim()).filter(addr => addr !== '');
    
    if (addresses.length === 0) {
      console.warn('⚠️  No valid AMM vault addresses found - buy detection will be disabled');
      return;
    }

    // Validate addresses
    for (const address of addresses) {
      try {
        const pubkey = new PublicKey(address);
        this.ammVaults.push(pubkey.toString());
      } catch (error) {
        console.warn(`⚠️  Invalid AMM vault address skipped: ${address}`);
      }
    }

    if (this.ammVaults.length > 0) {
      console.log(`✅ Loaded ${this.ammVaults.length} AMM vault(s) for buy detection`);
    }
  }

  /**
   * Starts listening for buy events
   */
  start() {
    if (this.ammVaults.length === 0) {
      console.warn('⚠️  Cannot start buy detector - no AMM vaults configured');
      return false;
    }

    if (!this.tokenListener) {
      console.error('❌ Token listener not provided');
      return false;
    }

    // Listen to transfer events from token listener
    this.transferHandler = (transferData) => {
      this.detectBuy(transferData);
    };
    this.tokenListener.on('transfer', this.transferHandler);

    this.isListening = true;
    console.log('✅ Buy detector started');
    return true;
  }

  /**
   * Detects if a transfer is a buy (from AMM vault to wallet)
   * @param {Object} transferData - Transfer data from token listener
   */
  detectBuy(transferData) {
    try {
      const { changes, signature, timestamp, tokenMint, slot, fee } = transferData;

      if (!changes || changes.length === 0) {
        return;
      }

      // Find transfers FROM AMM vaults (negative change, owner in AMM_VAULTS)
      const ammVaultTransfers = changes.filter(change => 
        change.change < 0 && this.ammVaults.includes(change.owner)
      );

      // Find transfers TO wallets (positive change, owner NOT in AMM_VAULTS)
      const walletTransfers = changes.filter(change => 
        change.change > 0 && !this.ammVaults.includes(change.owner)
      );

      // A buy occurs when tokens flow from AMM vault to wallet
      if (ammVaultTransfers.length > 0 && walletTransfers.length > 0) {
        // Calculate total buy amount (sum of all wallet receives)
        const totalBuyAmount = walletTransfers.reduce((sum, change) => sum + change.change, 0);

        // Get the buyer wallet address (the wallet that received tokens)
        const buyerWallet = walletTransfers[0].owner;

        // Get the AMM vault that sent tokens
        const ammVault = ammVaultTransfers[0].owner;

        // Create buy event data
        const buyData = {
          signature: signature,
          slot: slot,
          timestamp: timestamp,
          tokenMint: tokenMint,
          buyer: buyerWallet,
          ammVault: ammVault,
          amount: totalBuyAmount,
          fee: fee,
          // Include all wallet transfers for detailed tracking
          walletTransfers: walletTransfers,
          ammVaultTransfers: ammVaultTransfers
        };

        this.emit('buy', buyData);
      }
    } catch (error) {
      console.error('❌ Error detecting buy:', error.message);
    }
  }

  /**
   * Stops listening for buy events
   */
  stop() {
    if (this.tokenListener && this.transferHandler) {
      this.tokenListener.removeListener('transfer', this.transferHandler);
      this.transferHandler = null;
    }
    this.isListening = false;
    console.log('🛑 Buy detector stopped');
  }

  /**
   * Gets the list of configured AMM vaults
   * @returns {string[]} Array of AMM vault addresses
   */
  getAmmVaults() {
    return [...this.ammVaults];
  }
}

module.exports = { BuyDetector };
