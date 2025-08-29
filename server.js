// server.js
const express = require('express');
const fetch = require('node-fetch');
const app = express();

app.use(express.json());

app.post('/webhook', async (req, res) => {
  try {
    const discordWebhookUrl = "https://discord.com/api/webhooks/1408203109129256990/95rPDczDFbDQt1IivQRsS_iwRFkOnAc21x8dNzFEvE5ud2UTIfNresN2-kGqcVBA864Z";
    const response = await fetch(discordWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Webhook forward failed:', response.status, errorText);
      return res.status(response.status).send({ error: errorText });
    }
    console.log('Webhook forwarded successfully');
    res.status(200).send({ success: true });
  } catch (error) {
    console.error('Proxy error:', error.message);
    res.status(500).send({ error: error.message });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log('Proxy server running');
});
