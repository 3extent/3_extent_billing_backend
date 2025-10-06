// send-whatsapp.js (broadcast with hardcoded values)
const axios = require('axios');

// Hardcoded credentials and settings
const PHONE_NUMBER_ID = '785541811301232'; // your WABA phone number ID
const ACCESS_TOKEN = 'EAARBnZC7iFKQBPiRq7o5K0JhE5jrk9P7icMuUkFZA0ppmI2Kw2kuHTTevZAEKjVr38JQDvgZAcGUd5HNqQsYyD88Mbjt7q88mTmvkHiw17ZCZCmtI1PQwZBm4MH0QS3zI3wlp1dsthg9NFvFYbioRF0afVa0juQCHU2oihJ6QqQPpHnnIX8rNmhsnyeCJr0ix8boEiGyxB2pANs1fHsPsiKyZA6wXemhfXcvkDqjie8ZCma6f9wZDZD';
const MAX_CONCURRENCY = 10;   // how many parallel sends you allow
const PAIR_RATE_DELAY = 6000; // 6 seconds (pair rate limit)
const THROUGHPUT_LIMIT = 80;  // messages per second (informational)

/**
 * Sends a single WhatsApp template message via Cloud API
 * Returns the API response data or throws error.
 * @param {string} recipientPhone - E.164, e.g. "+919876543210" or "919876543210"
 * @param {string} templateName - Pre-approved template name
 * @param {string[]} templateParameters - Array of strings for body parameters
 */
async function sendSingle(recipientPhone, templateName, templateParameters = []) {
  const payload = {
    "messaging_product": "whatsapp",
    "to": recipientPhone,
    "type": "template",
    "template": {
        "name": templateName,
        "language": {
            "code": "en_US"
        }
    }
  };

  const resp = await axios.post(
    `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`,
    payload,
    {
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    }
  );
  return resp.data;
}

/**
 * Broadcast messages to multiple recipients with concurrency, retry, and handling for
 * common rate-limit scenarios (throughput and pair rate).
 * @param {string[]} recipients — list of phone numbers in WhatsApp format (with country code)
 * @param {string} templateName
 * @param {string[][]} parametersArr — array of parameter arrays, one per recipient
 */
async function broadcast(recipients, templateName, parametersArr = []) {
  const indices = recipients.map((_, i) => i);
  const running = new Set();

  async function runOne(i) {
    const to = recipients[i];
    const params = parametersArr[i] || [];

    let attempt = 0;
    const maxAttempts = 5;
    while (attempt < maxAttempts) {
      attempt++;
      try {
        const res = await sendSingle(to, templateName, params);
        console.log(`✅ Sent to ${to}:`, res);
        break;
      } catch (err) {
        const errData = err.response?.data;
        console.error(`❌ Error sending to ${to} (attempt ${attempt}):`, errData || err.message);

        const errorCode = errData?.error?.code;
        if (errorCode === 130429) {
          // throughput exceeded → backoff with incremental delay
          await sleep(1000 * attempt);
          continue;
        }
        if (errorCode === 131056) {
          // pair rate limit → wait full 6s
          await sleep(PAIR_RATE_DELAY);
          continue;
        }
        // Non-recoverable → stop retrying
        break;
      }
    }
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  while (indices.length > 0) {
    if (running.size < MAX_CONCURRENCY) {
      const i = indices.shift();
      const p = runOne(i).finally(() => running.delete(p));
      running.add(p);
    } else {
      await Promise.race(running);
    }
  }

  await Promise.all(running);
}

// --- Hardcoded example usage ---
const recipients = [
  "919561856673",
  "919561856673",
  "919561856673",
  "919561856673",
  "919561856673",
  "919561856673",
  "919561856673",
  "919561856673",
  "919561856673",
  "919561856673",
  "919561856673",
  "919561856673",
  "919561856673",
  "919561856673"
];
const paramsArr = [
  ["Alice"],
  ["Bob"],
  ["Charlie"]
];
// Use your approved template name here
const TEMPLATE_NAME = "hello_world";

broadcast(recipients, TEMPLATE_NAME, paramsArr)
  .then(() => console.log("Broadcast done"))
  .catch(err => console.error("Broadcast error:", err));