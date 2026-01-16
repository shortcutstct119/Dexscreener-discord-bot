const cron = require('node-cron');
const { sendMessage } = require('../discord/notifier');

/**
 * Contest Reminder Scheduler
 * Schedules and sends Discord reminders for contest start/end times
 */
class ContestReminders {
  constructor(discordClient) {
    this.discordClient = discordClient;
    this.jobs = [];
    this.contestStartTime = null;
    this.contestEndTime = null;
    this.isScheduled = false;

    // Load contest times from environment
    this.loadContestTimes();
  }

  /**
   * Loads contest start/end times from environment variables
   */
  loadContestTimes() {
    const startTimeEnv = process.env.CONTEST_START_TIME;
    const endTimeEnv = process.env.CONTEST_END_TIME;

    if (!startTimeEnv || startTimeEnv.trim() === '') {
      console.warn('⚠️  CONTEST_START_TIME not set - contest reminders will be disabled');
      return;
    }

    if (!endTimeEnv || endTimeEnv.trim() === '') {
      console.warn('⚠️  CONTEST_END_TIME not set - contest reminders will be disabled');
      return;
    }

    // Parse times (support ISO datetime or cron format)
    try {
      this.contestStartTime = new Date(startTimeEnv);
      this.contestEndTime = new Date(endTimeEnv);

      // Validate dates
      if (isNaN(this.contestStartTime.getTime())) {
        console.error('❌ Invalid CONTEST_START_TIME format');
        return;
      }

      if (isNaN(this.contestEndTime.getTime())) {
        console.error('❌ Invalid CONTEST_END_TIME format');
        return;
      }

      console.log(`✅ Contest times loaded:`);
      console.log(`   Start: ${this.contestStartTime.toLocaleString()}`);
      console.log(`   End: ${this.contestEndTime.toLocaleString()}`);
    } catch (error) {
      console.error('❌ Error parsing contest times:', error.message);
    }
  }

  /**
   * Converts a Date to a cron expression for a specific time
   * @param {Date} date - Date object
   * @returns {string} Cron expression (minute hour day month dayOfWeek)
   */
  dateToCron(date) {
    const minute = date.getMinutes();
    const hour = date.getHours();
    const day = date.getDate();
    const month = date.getMonth() + 1; // getMonth() returns 0-11
    const dayOfWeek = '*'; // Any day of week

    return `${minute} ${hour} ${day} ${month} *`;
  }

  /**
   * Calculates a reminder time (X hours before a target time)
   * @param {Date} targetTime - Target time
   * @param {number} hoursBefore - Hours before target time
   * @returns {Date} Reminder time
   */
  getReminderTime(targetTime, hoursBefore) {
    const reminderTime = new Date(targetTime);
    reminderTime.setHours(reminderTime.getHours() - hoursBefore);
    return reminderTime;
  }

  /**
   * Formats a reminder message
   * @param {string} type - Type of reminder ('start' or 'end')
   * @param {Date} contestTime - Contest time
   * @param {number} hoursBefore - Hours before (0 for exact time)
   * @returns {string} Formatted message
   */
  formatReminderMessage(type, contestTime, hoursBefore = 0) {
    const tokenSymbol = process.env.TOKEN_SYMBOL || 'TOKEN';
    const timeStr = contestTime.toLocaleString();
    
    let message = '';
    
    if (type === 'start') {
      if (hoursBefore > 0) {
        message = `🎯 **Contest Starting Soon!** 🎯\n\n` +
          `⏰ Contest starts in **${hoursBefore} hour${hoursBefore > 1 ? 's' : ''}**\n` +
          `📅 Start time: ${timeStr}\n` +
          `🚀 Get ready for the $${tokenSymbol} contest!`;
      } else {
        message = `🎉 **Contest Started!** 🎉\n\n` +
          `⏰ The contest has officially begun!\n` +
          `📅 Start time: ${timeStr}\n` +
          `🚀 Good luck with $${tokenSymbol}!`;
      }
    } else if (type === 'end') {
      if (hoursBefore > 0) {
        message = `⏳ **Contest Ending Soon!** ⏳\n\n` +
          `⏰ Contest ends in **${hoursBefore} hour${hoursBefore > 1 ? 's' : ''}**\n` +
          `📅 End time: ${timeStr}\n` +
          `🚀 Last chance for $${tokenSymbol}!`;
      } else {
        message = `🏁 **Contest Ended!** 🏁\n\n` +
          `⏰ The contest has officially ended!\n` +
          `📅 End time: ${timeStr}\n` +
          `🎊 Thank you for participating in the $${tokenSymbol} contest!`;
      }
    }

    return message;
  }

  /**
   * Schedules a reminder job
   * @param {Date} reminderTime - When to send the reminder
   * @param {string} type - Type of reminder ('start' or 'end')
   * @param {Date} contestTime - Contest time
   * @param {number} hoursBefore - Hours before contest time
   */
  scheduleReminder(reminderTime, type, contestTime, hoursBefore = 0) {
    // Check if reminder time is in the past
    if (reminderTime < new Date()) {
      console.warn(`⚠️  Skipping reminder for ${type} (time is in the past)`);
      return;
    }

    const cronExpression = this.dateToCron(reminderTime);
    const message = this.formatReminderMessage(type, contestTime, hoursBefore);

    const job = cron.schedule(cronExpression, async () => {
      console.log(`📢 Sending ${type} reminder...`);
      await sendMessage(this.discordClient, message);
    }, {
      scheduled: false,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });

    this.jobs.push(job);
    console.log(`✅ Scheduled ${type} reminder for ${reminderTime.toLocaleString()}`);
  }

  /**
   * Starts scheduling all contest reminders
   */
  start() {
    if (!this.contestStartTime || !this.contestEndTime) {
      console.warn('⚠️  Cannot start contest reminders - contest times not configured');
      return false;
    }

    if (!this.discordClient) {
      console.error('❌ Discord client not provided');
      return false;
    }

    if (this.isScheduled) {
      console.warn('⚠️  Contest reminders are already scheduled');
      return false;
    }

    // Schedule start reminders (24h before, 1h before, at start)
    this.scheduleReminder(this.getReminderTime(this.contestStartTime, 24), 'start', this.contestStartTime, 24);
    this.scheduleReminder(this.getReminderTime(this.contestStartTime, 1), 'start', this.contestStartTime, 1);
    this.scheduleReminder(this.contestStartTime, 'start', this.contestStartTime, 0);

    // Schedule end reminders (24h before, 1h before, at end)
    this.scheduleReminder(this.getReminderTime(this.contestEndTime, 24), 'end', this.contestEndTime, 24);
    this.scheduleReminder(this.getReminderTime(this.contestEndTime, 1), 'end', this.contestEndTime, 1);
    this.scheduleReminder(this.contestEndTime, 'end', this.contestEndTime, 0);

    // Start all jobs
    this.jobs.forEach(job => job.start());

    this.isScheduled = true;
    console.log(`✅ Contest reminders scheduled (${this.jobs.length} reminders)`);
    return true;
  }

  /**
   * Stops all scheduled reminders
   */
  stop() {
    this.jobs.forEach(job => job.stop());
    this.jobs = [];
    this.isScheduled = false;
    console.log('🛑 Contest reminders stopped');
  }

  /**
   * Gets the contest start time
   * @returns {Date|null} Contest start time
   */
  getContestStartTime() {
    return this.contestStartTime;
  }

  /**
   * Gets the contest end time
   * @returns {Date|null} Contest end time
   */
  getContestEndTime() {
    return this.contestEndTime;
  }

  /**
   * Gets the number of scheduled reminders
   * @returns {number} Number of scheduled reminders
   */
  getScheduledCount() {
    return this.jobs.length;
  }
}

module.exports = { ContestReminders };
