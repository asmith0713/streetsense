const axios = require('axios');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

/**
 * Send emergency alert to a Telegram user
 * @param {string} telegramId - The Telegram user ID or chat ID
 * @param {object} emergencyData - Emergency details
 * @returns {Promise<boolean>} - Success status
 */
async function sendEmergencyAlert(telegramId, emergencyData) {
  if (!TELEGRAM_BOT_TOKEN) {
    console.warn('TELEGRAM_BOT_TOKEN not configured. Skipping Telegram notification.');
    return false;
  }

  if (!telegramId) {
    console.warn('No Telegram ID provided. Skipping notification.');
    return false;
  }

  try {
    const { userName, userPhone, type, severity, lat, lng, timestamp } = emergencyData;
    
    // Format emergency message
    const message = `
🚨 *EMERGENCY ALERT* 🚨

⚠️ *Type:* ${type.toUpperCase()}
🔴 *Severity:* ${severity.toUpperCase()}

👤 *Person in Distress:*
Name: ${userName || 'Not provided'}
Phone: ${userPhone || 'Not provided'}

📍 *Location:*
Latitude: ${lat}
Longitude: ${lng}

🗺️ *View on Map:*
https://www.google.com/maps?q=${lat},${lng}

⏰ *Time:* ${new Date(timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}

*Please contact them immediately or call emergency services!*

🚔 Police: 100
🚑 Ambulance: 108
👮 Women Helpline: 1091
📞 National Emergency: 112
`;

    const response = await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
      chat_id: telegramId,
      text: message,
      parse_mode: 'Markdown'
    });

    if (response.data.ok) {
      console.log(`✅ Emergency alert sent to Telegram ID: ${telegramId}`);
      return true;
    } else {
      console.error(`❌ Failed to send Telegram message:`, response.data);
      return false;
    }

  } catch (error) {
    console.error('Error sending Telegram alert:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Send emergency alerts to multiple Telegram contacts
 * @param {Array} contacts - Array of emergency contacts with telegramId
 * @param {object} emergencyData - Emergency details
 * @returns {Promise<Array>} - Array of results
 */
async function sendEmergencyAlertsToContacts(contacts, emergencyData) {
  if (!contacts || contacts.length === 0) {
    console.log('No emergency contacts to notify');
    return [];
  }

  const results = [];
  
  for (const contact of contacts) {
    if (contact.telegramId) {
      const success = await sendEmergencyAlert(contact.telegramId, emergencyData);
      results.push({
        contactName: contact.name,
        telegramId: contact.telegramId,
        success,
        notifiedAt: new Date()
      });
    } else {
      console.log(`⚠️ Contact ${contact.name} has no Telegram ID`);
    }
  }

  return results;
}

/**
 * Verify if a Telegram bot token is valid
 * @returns {Promise<boolean>}
 */
async function verifyBotToken() {
  if (!TELEGRAM_BOT_TOKEN) {
    return false;
  }

  try {
    const response = await axios.get(`${TELEGRAM_API_URL}/getMe`);
    if (response.data.ok) {
      console.log('✅ Telegram bot verified:', response.data.result.username);
      return true;
    }
    return false;
  } catch (error) {
    console.error('❌ Telegram bot verification failed:', error.message);
    return false;
  }
}

module.exports = {
  sendEmergencyAlert,
  sendEmergencyAlertsToContacts,
  verifyBotToken
};
