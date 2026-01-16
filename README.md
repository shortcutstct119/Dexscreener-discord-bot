# DEXPrice-DCMonitor

A Discord bot that automatically updates a voice channel name with real-time DEX token data from [DexScreener](https://docs.dexscreener.com/).

## Features

- ✅ Automatically updates voice channel name every 6 seconds
- ✅ Displays token price, market cap, and 24h volume
- ✅ Clean format: `$WISH | $231k mcap | $0.000232 | $22k vol`
- ✅ No commands required - fully automatic
- ✅ Minimal and focused functionality

## Setup

### 1. Create Discord Bot

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to "Bot" section and create a bot
4. Copy the bot token
5. Enable the following permissions:
   - `Manage Channels` (required to rename voice channels)
6. Invite the bot to your server with the OAuth2 URL

### 2. Get Voice Channel ID

1. Enable Developer Mode in Discord (User Settings → Advanced → Developer Mode)
2. Right-click on the voice channel you want to update
3. Click "Copy ID"

### 3. Get Pair Address

1. Go to [DexScreener](https://dexscreener.com/)
2. Search for your token
3. Copy the pair address from the URL (e.g., for Solana: `https://dexscreener.com/solana/YOUR_PAIR_HASH`)

### 4. Configure Environment

Rename `.env.example` to `.env` and fill in your values:

```env
# Discord Bot Token
DISCORD_TOKEN=your_discord_bot_token_here

# Voice Channel ID to update
VOICE_CHANNEL_ID=your_voice_channel_id_here

# DEX Configuration
CHAIN=solana
PAIR_HASH=your_pair_address_here

# Token Symbol (displayed in channel name)
TOKEN_SYMBOL=WISH

# Update frequency in milliseconds (6000 = 6 seconds)
UPDATE_FREQUENCY=6000
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

## Example Output

The voice channel name will be automatically updated to display:

```
$WISH | $231k mcap | $0.000232 | $22k vol
```

Where:
- `$WISH` - Token symbol
- `$231k mcap` - Market cap (formatted with k/m suffix)
- `$0.000232` - Current price in USD
- `$22k vol` - 24-hour volume

## Notes

- Discord rate limits channel name updates to 2 per 10 minutes
- If you update too frequently, the bot may hit rate limits
- 6 seconds is recommended to stay within rate limits
- The bot only requires `Guilds` intent (no message reading needed)
