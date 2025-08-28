// send-whatsapp.js
const axios = require('axios');

// Hardcoded credentials (replace with your actual values)
const accessToken = 'EAARBnZC7iFKQBPC9tMHqbgpYFGPAx43pCQDCYl61PUCO3s6ZCYPE6Dr9LxEHgNlBeZC36cY4ZBL0KTJuI63Bdy7FoGdZB7Wwj5m8dZBtTNaZBsxZC0Ku1k93WkfCuzTqNt9Ck7mbSAulI7lnU4q2S9pwtWE76xWRH8kXQRmAVO3GBgV7GCBXaB3j3ZBFLv8Tu9dQtQwi1FZA8ZC3Nu44SUo8PS45GtX9n0vp88EZAY0v4BJT7tTEHAZDZD';
// const phoneNumberId = '7972586767';
const phoneNumberId = '785541811301232'; // in international format (e.g. 15551234567)
const recipientPhone = "917972586767"; // in international format (e.g. 15551234567)

async function sendWhatsAppMessage() {
  try {
    const response = await axios.post(
      `https://graph.facebook.com/v23.0/${phoneNumberId}/messages`,
      {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": recipientPhone,
        "type": "text",
        "text": {
          "preview_url": true,
          "body": "Hello, this is a test message from WhatsApp Cloud API using hardcoded values."
        }
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Message sent successfully:', response.data);
  } catch (error) {
    console.error('❌ Failed to send message:', error.response?.data || error.message);
  }
}

sendWhatsAppMessage();

