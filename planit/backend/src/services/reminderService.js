const cron = require('node-cron');
const pool = require('../config/db');

function getTwilioClient() {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } = process.env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) return null;
  // Lazy-require so the app starts without crashing when Twilio isn't configured
  const twilio = require('twilio');
  return twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
}

async function sendSms(to, body) {
  const client = getTwilioClient();
  if (!client) {
    console.log(`[Reminder SMS] (Twilio not configured) → ${to}: ${body}`);
    return;
  }
  await client.messages.create({
    from: process.env.TWILIO_FROM_NUMBER,
    to,
    body,
  });
}

// Check for due reminders every minute
function startReminderService() {
  cron.schedule('* * * * *', async () => {
    try {
      // Fetch due reminders and the user's phone number in one query
      const result = await pool.query(
        `UPDATE reminders r
         SET is_sent = TRUE
         FROM users u
         WHERE r.user_id = u.id
           AND r.is_sent = FALSE
           AND r.remind_at <= NOW()
         RETURNING r.id, r.user_id, r.message, r.plan_id, r.task_id,
                   u.phone_number, u.full_name`
      );

      for (const reminder of result.rows) {
        console.log(`[Reminder] User ${reminder.user_id} (${reminder.full_name}): ${reminder.message}`);

        if (reminder.phone_number) {
          try {
            await sendSms(reminder.phone_number, `Planit reminder: ${reminder.message}`);
            console.log(`[Reminder SMS] Sent to ${reminder.phone_number}`);
          } catch (smsErr) {
            console.error(`[Reminder SMS] Failed for user ${reminder.user_id}:`, smsErr.message);
          }
        } else {
          console.log(`[Reminder SMS] User ${reminder.user_id} has no phone number — skipping SMS`);
        }
      }

      if (result.rows.length > 0) {
        console.log(`[Reminder Service] Processed ${result.rows.length} reminder(s)`);
      }
    } catch (err) {
      console.error('[Reminder Service] Error:', err.message);
    }
  });

  console.log('[Reminder Service] Started — checking every minute');
}

module.exports = { startReminderService };
