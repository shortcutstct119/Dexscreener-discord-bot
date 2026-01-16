# Quick Setup Guide

## Step-by-Step Instructions

### 1. Install Dependencies

```bash
cd DEXPrice-DCMonitor
npm install
```

### 2. Create .env File

Copy the example file and edit it:

```bash
cp env.example .env
```

Then edit `.env` with your values:

```env
DISCORD_TOKEN=YOUR_ACTUAL_BOT_TOKEN
VOICE_CHANNEL_ID=1234567890123456789
CHAIN=solana
PAIR_HASH=YOUR_TOKEN_PAIR_ADDRESS
TOKEN_SYMBOL=WISH
UPDATE_FREQUENCY=6000
```

### 3. Get Your Discord Bot Token

1. Go to https://discord.com/developers/applications
2. Click "New Application"
3. Go to "Bot" tab → Click "Add Bot"
4. Click "Reset Token" and copy the token
5. Paste it into your `.env` file

### 4. Invite Bot to Your Server

1. In Discord Developer Portal, go to "OAuth2" → "URL Generator"
2. Select these scopes:
   - `bot`
3. Select these permissions:
   - `Manage Channels` (required!)
4. Copy the generated URL and open it in your browser
5. Select your server and authorize

### 5. Get Voice Channel ID

1. In Discord: Settings → Advanced → Enable "Developer Mode"
2. Right-click on your voice channel → "Copy ID"
3. Paste it into your `.env` file as `VOICE_CHANNEL_ID`

### 6. Get Pair Address

1. Go to https://dexscreener.com/
2. Search for your token (e.g., "WISH")
3. Copy the pair address from the URL
   - Example: `https://dexscreener.com/solana/ABC123...`
   - Copy `ABC123...` part
4. Paste it into your `.env` file as `PAIR_HASH`

### 7. Run the Bot

```bash
npm start
```

You should see:

```
✅ Logged in as YourBot#1234
🔄 Update frequency: 6000ms
📊 Monitoring token: $WISH
🚀 Bot is running...

✅ Channel updated → $WISH | $231k mcap | $0.000232 | $22k vol
```

## Troubleshooting

### "Voice channel not found"
- Make sure the bot is in your server
- Verify the `VOICE_CHANNEL_ID` is correct
- Ensure the bot has "View Channels" permission

### "Missing Permissions"
- The bot needs "Manage Channels" permission
- Go to Server Settings → Roles → Your Bot Role → Enable "Manage Channels"

### Rate Limit Issues
- Discord limits channel name changes to 2 per 10 minutes
- Keep `UPDATE_FREQUENCY` at 6000ms (6 seconds) or higher
- The bot will log errors if it hits rate limits

### "Failed to fetch pair data"
- Check that `CHAIN` and `PAIR_HASH` are correct
- Verify the pair exists on DexScreener
- Check your internet connection

## Docker Alternative

If you prefer Docker:

```bash
docker compose up -d --build
```

View logs:

```bash
docker compose logs -f
```

Stop:

```bash
docker compose down
```
