// src/lib/n8n.js
// Thin wrapper for n8n webhook POSTs.
// All webhook calls are wrapped in try/catch — if n8n is unreachable
// the error is logged but NEVER propagated to the caller.
const axios = require('axios');

/**
 * postDeadlineWebhook
 * Fires the deadline-reminder webhook in the background.
 */
async function postDeadlineWebhook(payload) {
  const url = process.env.N8N_DEADLINE_WEBHOOK;
  if (!url) {
    console.warn('[n8n] N8N_DEADLINE_WEBHOOK is not set — skipping.');
    return;
  }
  try {
    await axios.post(url, payload, { timeout: 5000 });
    console.log('[n8n] Deadline webhook fired successfully.');
  } catch (err) {
    console.error(
      '[n8n] Deadline webhook failed (non-blocking):',
      err.message
    );
  }
}

/**
 * postAttendanceWebhook
 * Fires the attendance-alert webhook in the background.
 */
async function postAttendanceWebhook(payload) {
  const url = process.env.N8N_ATTENDANCE_WEBHOOK;
  if (!url) {
    console.warn('[n8n] N8N_ATTENDANCE_WEBHOOK is not set — skipping.');
    return;
  }
  try {
    await axios.post(url, payload, { timeout: 5000 });
    console.log('[n8n] Attendance webhook fired successfully.');
  } catch (err) {
    console.error(
      '[n8n] Attendance webhook failed (non-blocking):',
      err.message
    );
  }
}

module.exports = { postDeadlineWebhook, postAttendanceWebhook };
