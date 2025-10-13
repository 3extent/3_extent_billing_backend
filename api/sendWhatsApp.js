// send-whatsapp.js (broadcast with hardcoded values)
const axios = require('axios');

// Hardcoded credentials and settings
const PHONE_NUMBER_ID = '785541811301232'; // your WABA phone number ID
const ACCESS_TOKEN = 'EAARBnZC7iFKQBPkQre1cTZC5NElCuagPLAFPNFn2Sx60vymji6l6hLOtoTNfUeC8mDIsKbn197BCkg9MXZCLAL4gPBDSlFZC6rBiGub1Qbc6sQYUaOw0KoLYLyOT9cfIRGybj28DUDoLZArPZCLShDkOv1EuDoxJZCm83ZAHjOrYncZAbPwKE7X0YPB34Q5kFL8UoQDuszoZAqb4Hgsxa2OGiPKq8tbxhXlPTPDVBW8ujvLGdXrQZDZD';
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
 * Uploads an image to WhatsApp media servers and returns the media ID
 * @param {string} imageUrl - Public URL of the image to upload
 * @returns {string} Media ID for use in messages
 */
async function uploadImage(imageUrl) {
  const uploadPayload = {
    "messaging_product": "whatsapp",
    "type": "image",
    "url": imageUrl
  };

  const resp = await axios.post(
    `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/media`,
    uploadPayload,
    {
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    }
  );
  return resp.data.id;
}

/**
 * Sends a single WhatsApp image message via Cloud API
 * @param {string} recipientPhone - E.164 format phone number
 * @param {string} imageUrl - Public URL of the image to send
 * @param {string} caption - Optional caption for the image
 */
async function sendImageSingle(recipientPhone, imageUrl, caption = "") {
  // First upload the image to get media ID
  const mediaId = await uploadImage(imageUrl);

  const payload = {
    "messaging_product": "whatsapp",
    "to": recipientPhone,
    "type": "image",
    "image": {
      "id": mediaId,
      "caption": caption
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

/**
 * Broadcast images to multiple recipients with concurrency, retry, and handling for
 * common rate-limit scenarios (throughput and pair rate).
 * @param {string[]} recipients — list of phone numbers in WhatsApp format (with country code)
 * @param {string} imageUrl — public URL of the image to send
 * @param {string[]} captionsArr — array of captions, one per recipient (optional)
 */
async function broadcastImage(recipients, imageUrl, captionsArr = []) {
  const indices = recipients.map((_, i) => i);
  const running = new Set();

  async function runOne(i) {
    const to = recipients[i];
    const caption = captionsArr[i] || "";

    let attempt = 0;
    const maxAttempts = 5;
    while (attempt < maxAttempts) {
      attempt++;
      try {
        const res = await sendImageSingle(to, imageUrl, caption);
        console.log(`✅ Image sent to ${to}:`, res);
        break;
      } catch (err) {
        const errData = err.response?.data;
        console.error(`❌ Error sending image to ${to} (attempt ${attempt}):`, errData || err.message);

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
  "918010926634",
  "918010926634",
  "918010926634",
  "918010926634",
  "918010926634",
  "918010926634",
  "918010926634",
  "918010926634",
  "918010926634",
  "918010926634",
  "918010926634",
  "918010926634",
  "918010926634",
  "918010926634",
  "918010926634",
  "918010926634",
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

// Example usage for images
const imageUrl = "https://www.google.com/url?sa=i&url=https%3A%2F%2Fwww.istockphoto.com%2Fstock-photos%2Fnature-and-landscapes&psig=AOvVaw3MwdkMNm8y_f1NAxE0lFM9&ust=1759900315751000&source=images&cd=vfe&opi=89978449&ved=0CBIQjRxqFwoTCIjku9ypkZADFQAAAAAdAAAAABAE";
const imageCaptions = ["Check out this image!", "Another caption"];

// // Send single image
// sendImageSingle("919561856673", imageUrl, "Hello from image!")
//   .then(res => console.log("Single image sent:", res))
//   .catch(err => console.error("Single image error:", err));

// Broadcast image to multiple recipients
// broadcastImage(recipients, imageUrl, imageCaptions)
//   .then(() => console.log("Image broadcast done"))
//   .catch(err => console.error("Image broadcast error:", err));