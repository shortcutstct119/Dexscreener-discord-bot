/**
 * Discord text channel notifier module
 * Sends messages to a configured text channel
 */

/**
 * Sends a message to the configured text channel
 * @param {Client} client - Discord client instance
 * @param {string} message - Message content to send
 * @returns {Promise<boolean>} - Returns true if message was sent successfully, false otherwise
 */
const sendMessage = async (client, message) => {
  try {
    const channelId = process.env.TEXT_CHANNEL_ID;
    
    // Skip if TEXT_CHANNEL_ID is not configured
    if (!channelId || channelId === 'undefined' || channelId === 'your_text_channel_id_here' || channelId.trim() === '') {
      return false;
    }

    const channel = await client.channels.fetch(channelId);

    if (!channel) {
      console.error(`❌ Text channel not found (ID: ${channelId})`);
      console.error('   Make sure the bot has access to the channel and the ID is correct.');
      return false;
    }

    // Check if channel is a text-based channel
    if (!channel.isTextBased()) {
      console.error(`❌ Channel is not a text channel (ID: ${channelId})`);
      return false;
    }

    await channel.send(message);
    return true;
  } catch (error) {
    if (error.message.includes('snowflake')) {
      console.error('❌ Invalid TEXT_CHANNEL_ID - must be a valid Discord channel ID');
      console.error('   Get the channel ID by right-clicking the channel → Copy ID (Developer Mode must be enabled)');
    } else {
      console.error('❌ Error sending message:', error.message);
    }
    return false;
  }
};

module.exports = { sendMessage };
