// send-whatsapp.js
const axios = require('axios');

// Hardcoded credentials (replace with your actual values)
const accessToken = 'EAARBnZC7iFKQBPGBa14Ne516r5jneL854ZCn3AZAmbY8HrAnRrSbG8CBjcwwFwNPTd0dX42WEnkvPLoz4ZBojjOuL2BAIc9xldJmuZAFFvMKogYZBQAAP7cPLMvMWc9xtsp8LiQst0LxZAUGB1XIZCwgVSBsFcBWKU2RZAaUBnQ98gycyc0ZAmKBj7ZBZCw4sorTeJXGhpl56ZCk36UMvOXXpFeq0s56xMfytSDO139aOIbfU0Qfd2AZDZD';
// const phoneNumberId = '7972586767';
const phoneNumberId = '785541811301232'; // in international format (e.g. 15551234567)
const recipientPhone = ['919975747759', "917972586767"]; // in international format (e.g. 15551234567)

async function sendWhatsAppMessage() {
  try {
    const response = await axios.post(
      `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: recipientPhone,
        type: 'text',
        text: {
          body: 'Hello! This is a test message from WhatsApp Cloud API using hardcoded values.'
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
