const { EventEmitter } = require('events');
const { fetchTokenStats } = require('../utils/dexscreener');

/**
 * Market Cap Milestone Tracker
 * Monitors market cap and announces when milestones are reached
 */
class MarketCapMilestones extends EventEmitter {
  constructor() {
    super();
    this.milestones = [];
    this.reachedMilestones = new Set(); // Track reached milestones to alert only once
    this.lastMarketCap = 0;
    this.checkInterval = null;
    this.isMonitoring = false;

    // Load milestones from environment
    this.loadMilestones();
  }

  /**
   * Loads market cap milestones from environment variable
   */
  loadMilestones() {
    const milestonesEnv = process.env.MARKET_CAP_MILESTONES;
    
    if (!milestonesEnv || milestonesEnv.trim() === '') {
      console.warn('⚠️  MARKET_CAP_MILESTONES not set - milestone tracking will be disabled');
      return;
    }

    const milestoneStrings = milestonesEnv.split(',').map(m => m.trim()).filter(m => m !== '');
    
    if (milestoneStrings.length === 0) {
      console.warn('⚠️  No valid market cap milestones found - milestone tracking will be disabled');
      return;
    }

    // Parse and validate milestones
    for (const milestoneStr of milestoneStrings) {
      const milestone = parseFloat(milestoneStr);
      
      if (isNaN(milestone) || milestone <= 0) {
        console.warn(`⚠️  Invalid milestone skipped: ${milestoneStr}`);
        continue;
      }

      this.milestones.push(milestone);
    }

    // Sort milestones in ascending order
    this.milestones.sort((a, b) => a - b);

    if (this.milestones.length > 0) {
      console.log(`✅ Loaded ${this.milestones.length} market cap milestone(s): ${this.milestones.map(m => `$${m.toLocaleString()}`).join(', ')}`);
    }
  }

  /**
   * Checks market cap against milestones
   * @param {number} marketCap - Current market cap value
   */
  checkMilestones(marketCap) {
    if (this.milestones.length === 0) {
      return;
    }

    if (!marketCap || marketCap <= 0) {
      return;
    }

    // Check each milestone
    for (const milestone of this.milestones) {
      // Skip if already reached
      if (this.reachedMilestones.has(milestone)) {
        continue;
      }

      // Check if market cap has reached or exceeded this milestone
      if (marketCap >= milestone) {
        // Mark as reached
        this.reachedMilestones.add(milestone);

        // Emit milestone event
        const milestoneData = {
          milestone: milestone,
          marketCap: marketCap,
          timestamp: new Date()
        };

        this.emit('milestone', milestoneData);
        console.log(`🎯 Market cap milestone reached: $${milestone.toLocaleString()} (Current: $${marketCap.toLocaleString()})`);
      }
    }

    this.lastMarketCap = marketCap;
  }

  /**
   * Checks market cap by fetching from DexScreener
   */
  async checkMarketCap() {
    try {
      const stats = await fetchTokenStats();
      
      if (!stats || !stats.marketCap) {
        return;
      }

      this.checkMilestones(stats.marketCap);
    } catch (error) {
      console.error('❌ Error checking market cap milestones:', error.message);
    }
  }

  /**
   * Starts monitoring market cap at specified interval
   * @param {number} intervalMs - Check interval in milliseconds (default: 60000 = 1 minute)
   */
  startMonitoring(intervalMs = 60000) {
    if (this.milestones.length === 0) {
      console.warn('⚠️  Cannot start monitoring - no milestones configured');
      return false;
    }

    if (this.isMonitoring) {
      console.warn('⚠️  Market cap milestone monitoring is already running');
      return false;
    }

    // Initial check
    this.checkMarketCap();

    // Set up interval
    this.checkInterval = setInterval(() => {
      this.checkMarketCap();
    }, intervalMs);

    this.isMonitoring = true;
    console.log(`✅ Market cap milestone monitoring started (interval: ${intervalMs}ms)`);
    return true;
  }

  /**
   * Stops monitoring market cap
   */
  stopMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.isMonitoring = false;
    console.log('🛑 Market cap milestone monitoring stopped');
  }

  /**
   * Gets the list of configured milestones
   * @returns {number[]} Array of milestone values
   */
  getMilestones() {
    return [...this.milestones];
  }

  /**
   * Gets the list of reached milestones
   * @returns {number[]} Array of reached milestone values
   */
  getReachedMilestones() {
    return Array.from(this.reachedMilestones);
  }

  /**
   * Checks if a specific milestone has been reached
   * @param {number} milestone - Milestone value to check
   * @returns {boolean} True if milestone has been reached
   */
  isMilestoneReached(milestone) {
    return this.reachedMilestones.has(milestone);
  }

  /**
   * Manually marks a milestone as reached (useful for initialization)
   * @param {number} milestone - Milestone value to mark
   */
  markMilestoneReached(milestone) {
    this.reachedMilestones.add(milestone);
  }

  /**
   * Clears all reached milestones (useful for testing or reset)
   */
  clearReachedMilestones() {
    this.reachedMilestones.clear();
    console.log('🗑️  Reached milestones cleared');
  }

  /**
   * Gets the last known market cap value
   * @returns {number} Last market cap value
   */
  getLastMarketCap() {
    return this.lastMarketCap;
  }
}

module.exports = { MarketCapMilestones };
