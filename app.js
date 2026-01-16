const { Client, GatewayIntentBits } = require('discord.js');
const dotenv = require('dotenv');
const { fetchPairData } = require('./utils');

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

    const data = await fetchPairData();
    
    if (!data || !data.pair) {
      console.error('❌ Failed to fetch pair data');
      return;
    }

    const pair = data.pair;
    const symbol = process.env.TOKEN_SYMBOL || 'TOKEN';
    const price = formatPrice(Number(pair.priceUsd));
    const mcap = formatNumber(Number(pair.fdv || pair.marketCap || 0));
    const priceChange24h = formatPercentageChange(Number(pair.priceChange?.h24 || 0));

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

client.on('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  console.log(`🔄 Update frequency: ${process.env.UPDATE_FREQUENCY || 6000}ms`);
  console.log(`📊 Monitoring token: $${process.env.TOKEN_SYMBOL || 'TOKEN'}`);
  console.log(`🔗 Chain: ${process.env.CHAIN}`);
  console.log(`📝 Pair: ${process.env.PAIR_HASH}`);
  console.log(`🎤 Voice Channel ID: ${process.env.VOICE_CHANNEL_ID}`);
  console.log('🚀 Bot is running...\n');

  // Initial update
  updateVoiceChannelName();

  // Set interval for updates (default: 6000ms = 6 seconds)
  const updateFrequency = parseInt(process.env.UPDATE_FREQUENCY) || 180000;
  setInterval(updateVoiceChannelName, updateFrequency);
});

client.login(process.env.DISCORD_TOKEN);