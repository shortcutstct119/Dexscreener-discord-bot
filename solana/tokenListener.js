const { Connection, PublicKey } = require('@solana/web3.js');
const { EventEmitter } = require('events');

/**
 * SPL Token Transfer Listener
 * Monitors Solana SPL token transfers and emits events
 */
class TokenListener extends EventEmitter {
  constructor() {
    super();
    this.connection = null;
    this.subscriptionId = null;
    this.isListening = false;
    
    // SPL Token Program ID
    this.TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
  }

  /**
   * Starts listening for token transfers
   * @returns {Promise<boolean>} - Returns true if started successfully
   */
  async start() {
    try {
      // Validate environment variables
      const rpcWs = process.env.SOLANA_RPC_WS;
      const tokenMint = process.env.TOKEN_MINT;

      if (!rpcWs || rpcWs.trim() === '') {
        console.error('❌ SOLANA_RPC_WS is not set in .env file');
        return false;
      }

      if (!tokenMint || tokenMint.trim() === '') {
        console.error('❌ TOKEN_MINT is not set in .env file');
        return false;
      }

      // Validate token mint address
      let tokenMintPubkey;
      try {
        tokenMintPubkey = new PublicKey(tokenMint);
      } catch (error) {
        console.error('❌ Invalid TOKEN_MINT address:', error.message);
        return false;
      }

      // Create connection with WebSocket endpoint for subscriptions
      // Use HTTP endpoint if available for regular RPC calls, otherwise use WS endpoint
      const rpcHttp = process.env.SOLANA_RPC_HTTP || rpcWs;
      this.connection = new Connection(rpcHttp, {
        commitment: 'confirmed',
        wsEndpoint: rpcWs
      });

      console.log('🔗 Connecting to Solana RPC...');
      
      // Subscribe to SPL Token Program logs
      // This catches all token transfers, then we filter by our mint
      this.subscriptionId = this.connection.onLogs(
        this.TOKEN_PROGRAM_ID,
        (logs, context) => {
          this.handleLogs(logs, context, tokenMintPubkey);
        },
        {
          commitment: 'confirmed'
        }
      );

      this.isListening = true;
      console.log(`✅ Listening for transfers of token: ${tokenMint}`);
      return true;

    } catch (error) {
      console.error('❌ Error starting token listener:', error.message);
      this.emit('error', error);
      return false;
    }
  }


  /**
   * Handles program logs and filters for transfer events
   */
  handleLogs(logs, context, tokenMint) {
    try {
      // All logs here are from the Token Program
      // Parse the transaction to check if it involves our token mint
      this.parseTransaction(logs.signature, tokenMint);
    } catch (error) {
      // Silently handle errors - transaction parsing happens async
    }
  }

  /**
   * Parses a transaction to extract transfer information
   */
  async parseTransaction(signature, tokenMint) {
    try {
      if (!this.connection) return;

      const tx = await this.connection.getTransaction(signature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0
      });

      if (!tx || !tx.meta) return;

      // Check if transaction involves our token mint
      const preTokenBalances = tx.meta.preTokenBalances || [];
      const postTokenBalances = tx.meta.postTokenBalances || [];

      // Find token balance changes for our mint
      const relevantChanges = [];
      
      for (const postBalance of postTokenBalances) {
        if (postBalance.mint === tokenMint.toString()) {
          const preBalance = preTokenBalances.find(
            pre => pre.accountIndex === postBalance.accountIndex
          );

          const preAmount = preBalance ? parseFloat(preBalance.uiTokenAmount.uiAmountString || '0') : 0;
          const postAmount = parseFloat(postBalance.uiTokenAmount.uiAmountString || '0');
          const change = postAmount - preAmount;

          if (change !== 0) {
            relevantChanges.push({
              accountIndex: postBalance.accountIndex,
              owner: postBalance.owner,
              mint: postBalance.mint,
              change: change,
              preAmount: preAmount,
              postAmount: postAmount
            });
          }
        }
      }

      // If we found relevant changes, emit transfer event
      if (relevantChanges.length > 0) {
        const transferData = {
          signature: signature,
          slot: tx.slot,
          timestamp: tx.blockTime ? new Date(tx.blockTime * 1000) : new Date(),
          tokenMint: tokenMint.toString(),
          changes: relevantChanges,
          fee: tx.meta.fee
        };

        this.emit('transfer', transferData);
      }

    } catch (error) {
      // Silently handle errors (transaction might not be available yet)
      // Don't spam console with errors
    }
  }

  /**
   * Stops listening for token transfers
   */
  async stop() {
    try {
      if (this.subscriptionId !== null && this.connection) {
        await this.connection.removeOnLogsListener(this.subscriptionId);
        this.subscriptionId = null;
      }
      this.isListening = false;
      console.log('🛑 Stopped listening for token transfers');
    } catch (error) {
      console.error('❌ Error stopping token listener:', error.message);
    }
  }

  /**
   * Gets the connection instance (for HTTP RPC calls)
   */
  getConnection() {
    if (!this.connection && process.env.SOLANA_RPC_HTTP) {
      this.connection = new Connection(process.env.SOLANA_RPC_HTTP, {
        commitment: 'confirmed'
      });
    }
    return this.connection;
  }
}

module.exports = { TokenListener };
