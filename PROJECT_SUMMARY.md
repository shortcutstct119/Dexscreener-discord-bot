# Discord DEX Price Monitor Bot - Summary

## What Was Built

A streamlined Discord bot that automatically updates a voice channel name with real-time DEX token data.

## Key Features

✅ **Automatic Updates Every 6 Seconds**
- Updates voice channel name with latest token data
- No manual intervention required

✅ **Clean Display Format**
```
$WISH | $231k mcap | $0.000232 | $22k vol
```

✅ **No Commands Required**
- Fully automatic operation
- No user interaction needed
- Read-only except for channel name updates

✅ **Fetches Data from DexScreener API**
- Real-time price data
- Market cap (FDV)
- 24-hour trading volume

## Technical Details

### File Structure
```
DEXPrice-DCMonitor/
├── app.js              # Main bot logic (81 lines, clean & focused)
├── utils.js            # DexScreener API fetcher
├── package.json        # Dependencies
├── env.example         # Configuration template
├── README.md           # Full documentation
├── SETUP.md           # Step-by-step setup guide
├── Dockerfile         # Docker support
└── docker-compose.yml # Docker Compose config
```

### Core Functions

1. **formatNumber()** - Formats large numbers with k/m suffix
   - 1,234 → "1k"
   - 1,234,567 → "1m"

2. **formatPrice()** - Formats price with appropriate decimals
   - Adapts precision based on price magnitude
   - Range: 3-8 decimal places

3. **updateVoiceChannelName()** - Main update function
   - Fetches data from DexScreener
   - Formats channel name
   - Updates voice channel (only if changed)
   - Error handling with console logging

### Configuration (.env)

```env
DISCORD_TOKEN=your_bot_token
VOICE_CHANNEL_ID=your_channel_id
CHAIN=solana
PAIR_HASH=your_pair_address
TOKEN_SYMBOL=WISH
UPDATE_FREQUENCY=6000
```

## How It Works

1. Bot logs into Discord
2. Immediately fetches token data and updates channel
3. Sets interval timer (6 seconds)
4. Every 6 seconds:
   - Fetches latest data from DexScreener
   - Formats price, mcap, volume
   - Updates voice channel name if changed
   - Logs status to console

## Rate Limits

- Discord allows 2 channel name changes per 10 minutes
- 6-second update interval is safe (won't hit limits if price doesn't change)
- Bot only updates when data changes (smart caching)

## Requirements Met

✅ Discord bot that automatically updates a voice channel name  
✅ Update interval: every 6 seconds  
✅ Data source: DexScreener API  
✅ Display format: `$WISH | $231k mcap | $0.000232 | $22k vol`  
✅ No slash commands, no chat commands, no user interaction  
✅ Read-only behavior except renaming the voice channel  

## Getting Started

1. See `SETUP.md` for step-by-step instructions
2. See `README.md` for full documentation
3. Copy `env.example` to `.env` and configure
4. Run `npm install && npm start`

## Dependencies

- `discord.js` ^14.0.0 - Discord API wrapper
- `dotenv` ^16.4.2 - Environment variable management
- `@solana/web3.js` ^1.98.4 - (included but not required for basic functionality)

## Notes

- Minimal dependencies for reliability
- Clean, readable code (81 lines)
- Comprehensive error handling
- Docker support included
- Works with any DexScreener-supported chain
