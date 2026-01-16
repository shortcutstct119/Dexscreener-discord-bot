const { Client, GatewayIntentBits } = require('discord.js');
const dotenv = require('dotenv');
const { fetchTokenStats } = require('./utils/dexscreener');
const { TokenListener } = require('./solana/tokenListener');
const { BuyDetector } = require('./logic/buyDetector');
const { NewHolderDetector } = require('./logic/newHolderDetector');
const { LargeBuyAlerts } = require('./logic/largeBuyAlerts');
const { MarketCapMilestones } = require('./logic/marketCapMilestones');
const { ContestReminders } = require('./logic/contestReminders');
const { sendMessage } = require('./discord/notifier');

dotenv.config();

// Validate required environment variables
const requiredEnvVars = ['DISCORD_TOKEN', 'VOICE_CHANNEL_ID', 'CHAIN', 'PAIR_HASH'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingVars.forEach(varName => {
    console.error(`   - ${varName}`);
  });
  console.error('\n💡 Please create a .env file with all required variables.');
  console.error('   See env.example for reference.\n');
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

// Format large numbers with k/m suffix
function formatNumber(value) {
  if (!value || value <= 0 || isNaN(value)) return '0';
  if (value >= 1_000_000) return Math.floor(value / 1_000_000) + 'm';
  if (value >= 1_000) return Math.floor(value / 1_000) + 'k';
  return Math.floor(value).toString();
}

// Format large numbers with k/m suffix and one decimal place
function formatNumberWithDecimal(value) {
  if (!value || value <= 0 || isNaN(value)) return '0';
  if (value >= 1_000_000) return (value / 1_000_000).toFixed(1) + 'm';
  if (value >= 1_000) return (value / 1_000).toFixed(1) + 'k';
  return value.toFixed(1);
}

// Format price with appropriate decimals
function formatPrice(value) {
  if (!value || value <= 0) return '0';
  if (value >= 1) return value.toFixed(3);
  if (value >= 0.01) return value.toFixed(4);
  if (value >= 0.0001) return value.toFixed(6);
  return value.toFixed(8);
}

// Format percentage change with one decimal place
function formatPercentageChange(value) {
  if (value === null || value === undefined || isNaN(value)) return '0.0';
  const formatted = Math.abs(value).toFixed(1);
  return value >= 0 ? `+${formatted}` : `-${formatted}`;
}

// Update voice channel name with token data
async function updateVoiceChannelName() {
  try {
    // Validate VOICE_CHANNEL_ID is set
    const channelId = process.env.VOICE_CHANNEL_ID;
    if (!channelId || channelId === 'undefined' || channelId === 'your_voice_channel_id_here') {
      console.error('❌ VOICE_CHANNEL_ID is not set in .env file');
      return;
    }

    const stats = await fetchTokenStats();
    
    if (!stats) {
      console.error('❌ Failed to fetch token stats');
      return;
    }

    const symbol = process.env.TOKEN_SYMBOL || 'TOKEN';
    const price = formatPrice(stats.priceUsd);
    const mcap = formatNumber(stats.marketCap);
    const priceChange24h = formatPercentageChange(stats.priceChange24h);

    // Format: $WISH 12.4% | $259k | $0.000260
    const channelName = `$${symbol} ${priceChange24h}% | $${mcap} | $${price}`;

    const channel = await client.channels.fetch(channelId);

    if (!channel) {
      console.error(`❌ Voice channel not found (ID: ${channelId})`);
      console.error('   Make sure the bot has access to the channel and the ID is correct.');
      return;
    }

    if (channel.name !== channelName) {
      console.log(channelName);
      await channel.setName(channelName);
      console.log(`✅ Channel updated → ${channelName}`);
    } else {
      console.log(`⏭️  No change needed`);
    }

  } catch (error) {
    if (error.message.includes('snowflake')) {
      console.error('❌ Invalid VOICE_CHANNEL_ID - must be a valid Discord channel ID');
      console.error('   Get the channel ID by right-clicking the channel → Copy ID (Developer Mode must be enabled)');
    } else {
      console.error('❌ Error updating channel:', error.message);
    }
  }
}

client.on('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  console.log(`🔄 Update frequency: ${process.env.UPDATE_FREQUENCY || 6000}ms`);
  console.log(`📊 Monitoring token: $${process.env.TOKEN_SYMBOL || 'TOKEN'}`);
  console.log(`🔗 Chain: ${process.env.CHAIN}`);
  console.log(`📝 Pair: ${process.env.PAIR_HASH}`);
  console.log(`🎤 Voice Channel ID: ${process.env.VOICE_CHANNEL_ID}`);
  console.log('🚀 Bot is running...\n');

  // Initialize Solana token listener
  let tokenListener = null;
  let buyDetector = null;
  let newHolderDetector = null;
  let largeBuyAlerts = null;
  let marketCapMilestones = null;
  let contestReminders = null;

  // Initialize Solana listener if configured
  if (process.env.SOLANA_RPC_WS && process.env.TOKEN_MINT) {
    try {
      console.log('🔗 Initializing Solana token listener...');
      tokenListener = new TokenListener();
      
      tokenListener.on('error', (error) => {
        console.error('❌ Token listener error:', error.message);
      });

      const listenerStarted = await tokenListener.start();
      if (listenerStarted) {
        console.log('✅ Solana token listener started\n');

        // Initialize buy detector if AMM vaults are configured
        if (process.env.AMM_VAULTS && process.env.AMM_VAULTS.trim() !== '') {
          console.log('💰 Initializing buy detector...');
          buyDetector = new BuyDetector(tokenListener);
          
          buyDetector.on('buy', (buyData) => {
            console.log(`💰 Buy detected: ${buyData.amount.toLocaleString()} tokens by ${buyData.buyer.slice(0, 8)}...`);
          });

          if (buyDetector.start()) {
            console.log('✅ Buy detector started\n');

            // Initialize large buy alerts if threshold is configured
            if (process.env.LARGE_BUY_USD && process.env.LARGE_BUY_USD.trim() !== '') {
              console.log('📢 Initializing large buy alerts...');
              largeBuyAlerts = new LargeBuyAlerts(buyDetector, client);
              
              if (largeBuyAlerts.start()) {
                console.log(`✅ Large buy alerts started (threshold: $${largeBuyAlerts.getThreshold().toLocaleString()})\n`);
              }
            }
          }
        }

        // Initialize new holder detector
        console.log('🆕 Initializing new holder detector...');
        newHolderDetector = new NewHolderDetector(tokenListener);
        
        newHolderDetector.on('newHolder', async (holderData) => {
          const tokenSymbol = process.env.TOKEN_SYMBOL || 'TOKEN';
          const walletDisplay = `${holderData.wallet.slice(0, 4)}...${holderData.wallet.slice(-4)}`;
          const explorerLink = `https://solscan.io/account/${holderData.wallet}`;
          
          const message = `🆕 **New Holder Detected!** 🆕\n\n` +
            `👤 **Wallet:** \`${walletDisplay}\`\n` +
            `💰 **Balance:** ${holderData.balance.toLocaleString()} $${tokenSymbol}\n` +
            `🔗 **View:** [Solscan](${explorerLink})`;

          console.log(`🆕 New holder: ${walletDisplay} (${holderData.balance.toLocaleString()} tokens)`);
          await sendMessage(client, message);
        });

        if (newHolderDetector.start()) {
          console.log('✅ New holder detector started\n');
        }
      }
    } catch (error) {
      console.error('❌ Error initializing Solana listener:', error.message);
    }
  } else {
    console.log('⚠️  Solana listener not configured (SOLANA_RPC_WS or TOKEN_MINT missing)\n');
  }

  // Initialize market cap milestones if configured
  if (process.env.MARKET_CAP_MILESTONES && process.env.MARKET_CAP_MILESTONES.trim() !== '') {
    console.log('🎯 Initializing market cap milestones...');
    marketCapMilestones = new MarketCapMilestones();
    
    marketCapMilestones.on('milestone', async (milestoneData) => {
      const tokenSymbol = process.env.TOKEN_SYMBOL || 'TOKEN';
      const formattedMilestone = milestoneData.milestone.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      });
      const formattedMarketCap = milestoneData.marketCap.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      });

      const message = `🎯 **Market Cap Milestone Reached!** 🎯\n\n` +
        `💰 **Milestone:** $${formattedMilestone}\n` +
        `📊 **Current Market Cap:** $${formattedMarketCap}\n` +
        `🎉 Congratulations on reaching this milestone for $${tokenSymbol}!`;

      console.log(`🎯 Market cap milestone: $${formattedMilestone} (Current: $${formattedMarketCap})`);
      await sendMessage(client, message);
    });

    // Start monitoring (check every 60 seconds)
    if (marketCapMilestones.startMonitoring(60000)) {
      console.log('✅ Market cap milestones monitoring started\n');
    }
  }

  // Initialize contest reminders if configured
  if (process.env.CONTEST_START_TIME && process.env.CONTEST_END_TIME) {
    console.log('⏰ Initializing contest reminders...');
    contestReminders = new ContestReminders(client);
    
    if (contestReminders.start()) {
      console.log(`✅ Contest reminders scheduled (${contestReminders.getScheduledCount()} reminders)\n`);
    }
  }

  // Initial voice channel update
  updateVoiceChannelName();

  // Set interval for voice channel updates (default: 180000ms = 3 minutes)
  const updateFrequency = parseInt(process.env.UPDATE_FREQUENCY) || 180000;
  setInterval(updateVoiceChannelName, updateFrequency);

  console.log('✨ All modules initialized and running!\n');
});

client.login(process.env.DISCORD_TOKEN);