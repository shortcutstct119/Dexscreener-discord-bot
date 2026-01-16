# DexScreener Discord Bot

A comprehensive Discord bot that monitors Solana SPL tokens and provides real-time updates via voice channel names and Discord notifications. Features include price tracking, buy detection, holder monitoring, milestone alerts, and contest reminders.

## Features

### Core Features
- ✅ **Voice Channel Updates** - Automatically updates voice channel name with token price, market cap, and 24h change
- ✅ **Real-time Token Monitoring** - Monitors Solana SPL token transfers via WebSocket
- ✅ **Buy Detection** - Detects token purchases from AMM vaults
- ✅ **Large Buy Alerts** - Sends Discord notifications for purchases above a configurable USD threshold
- ✅ **New Holder Detection** - Tracks wallet balances and alerts when new holders acquire tokens
- ✅ **Market Cap Milestones** - Announces when market cap reaches configured milestones
- ✅ **Contest Reminders** - Schedules automatic reminders for contest start/end times

### Technical Features
- ✅ No commands required - fully automatic
- ✅ Event-driven architecture
- ✅ Modular design with CommonJS
- ✅ In-memory tracking (no database required)
- ✅ Error handling and graceful degradation

## Setup

### 1. Create Discord Bot

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to "Bot" section and create a bot
4. Copy the bot token
5. Enable the following permissions:
   - `Manage Channels` (required to rename voice channels)
   - `Send Messages` (required for text notifications)
6. Invite the bot to your server with the OAuth2 URL

### 2. Get Channel IDs

1. Enable Developer Mode in Discord (User Settings → Advanced → Developer Mode)
2. Right-click on the voice channel you want to update → Click "Copy ID"
3. Right-click on the text channel for notifications → Click "Copy ID" (optional)

### 3. Get DEX Pair Information

1. Go to [DexScreener](https://dexscreener.com/)
2. Search for your token
3. Copy the pair address from the URL (e.g., for Solana: `https://dexscreener.com/solana/YOUR_PAIR_HASH`)

### 4. Get Solana RPC Endpoints

You'll need WebSocket and HTTP RPC endpoints. Options:
- **Free**: Use public Solana RPC (may have rate limits)
- **Recommended**: Use a service like [Helius](https://helius.dev/), [QuickNode](https://www.quicknode.com/), or [Alchemy](https://www.alchemy.com/)

### 5. Configure Environment

Rename `.env.example` to `.env` and fill in your values:

#### Required Variables

```env
# Discord Bot Configuration
DISCORD_TOKEN=your_discord_bot_token_here
VOICE_CHANNEL_ID=your_voice_channel_id_here

# DEX Configuration
CHAIN=solana
PAIR_HASH=your_pair_address_here
TOKEN_SYMBOL=WISH

# Update frequency in milliseconds (180000 = 3 minutes)
UPDATE_FREQUENCY=180000
```

#### Optional Variables (for advanced features)

```env
# Text Channel ID for notifications (optional)
TEXT_CHANNEL_ID=

# Solana Configuration (required for buy/holder detection)
SOLANA_RPC_HTTP=https://api.mainnet-beta.solana.com
SOLANA_RPC_WS=wss://api.mainnet-beta.solana.com
TOKEN_MINT=your_token_mint_address_here

# AMM Vault Addresses (comma-separated) for buy detection
AMM_VAULTS=vault1_address,vault2_address

# Large Buy Alert Threshold (USD)
LARGE_BUY_USD=1000

# Market Cap Milestones (comma-separated, in USD)
MARKET_CAP_MILESTONES=500000,1000000,2000000

# Contest Reminder Times (ISO datetime format: YYYY-MM-DDTHH:mm:ss)
CONTEST_START_TIME=2024-12-25T10:00:00
CONTEST_END_TIME=2024-12-31T18:00:00
```

## Run

### Using Node.js

```sh
npm install
npm start
```

### Using Docker

```sh
docker compose up -d --build
```

## Features in Detail

### Voice Channel Updates

The voice channel name is automatically updated to display:

```
$WISH +12.4% | $259k | $0.000260
```

Where:
- `$WISH` - Token symbol
- `+12.4%` - 24-hour price change
- `$259k` - Market cap (formatted with k/m suffix)
- `$0.000260` - Current price in USD

**Note**: Discord rate limits channel name updates to 2 per 10 minutes. Default update frequency is 3 minutes (180000ms) to stay within limits.

### Buy Detection

When `AMM_VAULTS` is configured, the bot monitors transfers from AMM vaults to wallets and detects purchases. Configured AMM vault addresses should be comma-separated:

```env
AMM_VAULTS=So11111111111111111111111111111111111112,TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA
```

### Large Buy Alerts

When `LARGE_BUY_USD` is set, the bot sends formatted Discord messages for purchases exceeding the threshold. Example message:

```
🚀 **LARGE BUY ALERT** 🚀

💰 **Amount:** 1.23M $TOKEN ($5,000.00)
💵 **Price:** $0.004060
👤 **Buyer:** `Abc1...Xyz9`
🕐 **Time:** 3:45:30 PM
🔗 **Transaction:** [View on Solscan](https://solscan.io/tx/...)
```

### New Holder Detection

The bot tracks wallet balances in memory and detects when a wallet goes from 0 to >0 tokens (first-time holder). Sends Discord alerts:

```
🆕 **New Holder Detected!** 🆕

👤 **Wallet:** `Abc1...Xyz9`
💰 **Balance:** 1,234.56 $TOKEN
🔗 **View:** [Solscan](https://solscan.io/account/...)
```

### Market Cap Milestones

When `MARKET_CAP_MILESTONES` is configured, the bot monitors market cap and announces when milestones are reached. Example:

```env
MARKET_CAP_MILESTONES=500000,1000000,2000000,5000000
```

Each milestone triggers a Discord message:

```
🎯 **Market Cap Milestone Reached!** 🎯

💰 **Milestone:** $1,000,000
📊 **Current Market Cap:** $1,234,567
🎉 Congratulations on reaching this milestone for $TOKEN!
```

### Contest Reminders

When `CONTEST_START_TIME` and `CONTEST_END_TIME` are configured, the bot automatically schedules reminders:

- 24 hours before contest start
- 1 hour before contest start
- At contest start time
- 24 hours before contest end
- 1 hour before contest end
- At contest end time

All reminders are sent to the configured text channel.

## Module Architecture

The bot is built with a modular architecture:

- `utils/dexscreener.js` - DexScreener API client
- `solana/tokenListener.js` - Solana SPL token transfer monitoring
- `logic/buyDetector.js` - Buy detection from AMM vaults
- `logic/largeBuyAlerts.js` - Large buy alert system
- `logic/newHolderDetector.js` - New holder detection
- `logic/marketCapMilestones.js` - Market cap milestone tracking
- `logic/contestReminders.js` - Contest reminder scheduling
- `discord/notifier.js` - Discord message sending

## Notes

- **Rate Limits**: Discord rate limits channel name updates to 2 per 10 minutes. Default is 3 minutes between updates.
- **Intents**: The bot only requires `Guilds` intent (no message reading needed)
- **Memory**: All tracking is done in-memory. Restarting the bot resets holder tracking and milestone states.
- **Optional Features**: All advanced features are optional. The bot will work with just the required variables for voice channel updates.
- **Error Handling**: The bot includes error handling and will continue running even if optional features fail to initialize.

## Troubleshooting

### Bot not updating voice channel
- Check that `VOICE_CHANNEL_ID` is correct
- Verify bot has "Manage Channels" permission
- Check Discord rate limits (wait 10 minutes if you've been testing)

### Buy detection not working
- Verify `SOLANA_RPC_WS` is a valid WebSocket endpoint
- Check that `TOKEN_MINT` is the correct token mint address
- Ensure `AMM_VAULTS` contains valid Solana addresses

### Discord messages not sending
- Verify `TEXT_CHANNEL_ID` is set and correct
- Check bot has "Send Messages" permission
- Ensure the channel is a text channel

### Market cap milestones not triggering
- Verify `MARKET_CAP_MILESTONES` is set with comma-separated values
- Check that DexScreener API is accessible
- Milestones are checked every 60 seconds

## License

MIT
