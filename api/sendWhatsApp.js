const axios = require('axios');

const token = 'c6c59b352334baa91ef6ced7929469cc';
const phoneNumberId = '+14155238886';
const to = '917972586767';

axios.post(
  `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
  {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: 'order_update',
      language: { code: 'en_US' },
    },
  },
  {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  }
).then(res => console.log('Sent!'))
  .catch(err => console.error(err.response.data));
