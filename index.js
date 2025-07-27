// server.js
const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const app = express();
const PORT = 3000;

app.use(bodyParser.urlencoded({ extended: true }));

let pagesCache = [];
const APP_ID = process.env.appi
const APP_SECRET = process.env.apps
const REDIRECT_URI = `${process.env.RENDER_EXTERNAL_URL}/callback`

/* ====== 1) صفحة رئيسية بسيطة ====== */
app.get('/', (_req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="ar">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>ربط صفحة فيسبوك</title>
  <style>
    body {
      background: linear-gradient(135deg, #4f46e5, #7c3aed);
      color: #fff;
      font-family: 'Segoe UI', sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
      text-align: center;
    }
    h1 {
      font-size: 2.5rem;
      margin-bottom: 1rem;
    }
    a {
      background: #fff;
      color: #4f46e5;
      padding: 0.8rem 1.5rem;
      border-radius: 8px;
      font-size: 1.1rem;
      text-decoration: none;
      transition: 0.3s ease;
    }
    a:hover {
      background: #f1f1f1;
    }
  </style>
</head>
<body>
  <h1>🤖 Simsimi Bot</h1>
  <p><a href="/login">🔗Link my Facebook page</a></p>
</body>
</html>
  `);
});

/* ====== 2) مسار login يحوّل المستخدم إلى رابط OAuth ====== */
app.get('/login', (_req, res) => {
    const oauthURL =
        `https://www.facebook.com/v19.0/dialog/oauth?` +
        `client_id=${APP_ID}` +
        `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
        `&scope=public_profile,email,pages_show_list,pages_manage_metadata,pages_messaging,pages_read_engagement` +
        `&response_type=code` +
        `&auth_type=rerequest`;
    res.redirect(oauthURL);
});

app.post('/connect-page', (req, res) => {
  const index = parseInt(req.body.index);
  const page = pagesCache[index];
  if (!page) return res.status(404).send("Page not found");

  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <title>Page Connected</title>
      <style>
        body { font-family: 'Segoe UI', sans-serif; background: #f3f4f6; padding: 2rem; color: #111827; }
        .container {
          max-width: 700px; margin: auto; background: #fff; padding: 2rem;
          border-radius: 12px; box-shadow: 0 8px 16px rgba(0,0,0,0.1);
        }
        img { max-width: 150px; border-radius: 10px; margin-bottom: 1rem; }
        button {
          padding: 0.7rem 1.5rem; font-size: 1rem;
          background-color: #4f46e5; color: white;
          border: none; border-radius: 8px; cursor: pointer;
        }
        button.running { background-color: #16a34a; }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>✅ Page Linked Successfully!</h2>
        <ul>
          <li><strong>Name Page:</strong> ${page.name}</li>
          <li><strong>Page ID:</strong> ${page.id}</li>
                    <li><strong>Page Access Token:</strong> ***************************************************...</li>
          // <li><strong>Page Access Token:</strong> ${page.access_token.slice(0, 60)}...</li>
          <li><strong>🖼️ Image Page:</strong><br/><img src="https://graph.facebook.com/${page.id}/picture?type=large" /></li>
          <li><strong>🔗 Url Page:</strong> <a href="https://www.facebook.com/${page.id}" target="_blank">Open Page</a></li>
        </ul>
        <p style="text-align: center; margin-top: 1.5rem;">📬 You can now use this token for bot messaging or setting up the Webhook.</p>
        <div style="text-align: center; margin-top: 2rem;">
          <button id="startBtn" onclick="toggleButton()">Start</button>
        </div>
      </div>

      <script>
        function toggleButton() {
          const btn = document.getElementById("startBtn");
          if (btn.innerText === "Start") {
            btn.innerText = "Running";
            btn.classList.add("running");
          } else {
            btn.innerText = "Start";
            btn.classList.remove("running");
          }
        }
      </script>
    </body>
    </html>
  `);
});
/* ====== 3) مسار callback من فيسبوك ====== */
app.get('/callback', async (req, res) => {
    const { code } = req.query;
    if (!code) return res.status(400).send('❌ لم يُرسل Facebook كود التفويض.');

    try {
        /* 3‑1) تبديل code ← user_access_token */
        const tokenRes = await axios.get('https://graph.facebook.com/v19.0/oauth/access_token', {
            params: {
                client_id: APP_ID,
                client_secret: APP_SECRET,
                redirect_uri: REDIRECT_URI,
                code
            }
        });
        const userAccessToken = tokenRes.data.access_token;
        console.log('✅ User Access Token:', userAccessToken);

        /* 3‑2) فحص صلاحيات التوكن */
        const debugRes = await axios.get('https://graph.facebook.com/debug_token', {
            params: {
                input_token: userAccessToken,
                access_token: `${APP_ID}|${APP_SECRET}`
            }
        });
        console.log('🔐 Scopes:', debugRes.data.data.scopes);

        /* 3‑3) جلب الصفحات التي يديرها المستخدم */
        const pagesRes = await axios.get('https://graph.facebook.com/v19.0/me/accounts', {
            params: { access_token: userAccessToken }
        });
        const pages = pagesRes.data.data;
      pagesCache = pages
        console.log('📄 Pages:', pages);

        if (!pages?.length) {
            return res.send(`
        ⚠️ لا توجد صفحات Admin أو لم تمنح الأذونات المطلوبة.<br/>
        ◀️ أعد المحاولة واختر الصفحة، وتأكّد من السماح بكل الصلاحيات.<br/>
        <a href="/login">🔄 إعادة الربط</a>
      `);
        }

        /* 3‑4) ربط أول صفحة (يمكنك تنفيذ واجهة لاختيار صفحة) */
        const page = pages[0];
        await axios.post(
            `https://graph.facebook.com/v19.0/${page.id}/subscribed_apps`,
            {
                subscribed_fields: [
                    "messages",
                    "messaging_postbacks",
                    "message_deliveries",
                    "messaging_optins",
                    "message_reads",
                    "messaging_referrals"
                ]
            },
            {
                params: { access_token: page.access_token }
            }
          );

        /* 3‑5) الرد بمعلومات الصفحة */
res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Select a Page</title>
  <style>
    body {
      font-family: 'Segoe UI', sans-serif;
      background: #f3f4f6;
      padding: 2rem;
      color: #111827;
    }
    .page-list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 1.5rem;
    }
    .card {
      background: white;
      padding: 1rem;
      border-radius: 10px;
      box-shadow: 0 8px 16px rgba(0,0,0,0.1);
      text-align: center;
    }
    .card img {
      width: 100px;
      border-radius: 50%;
      margin-bottom: 1rem;
    }
    .card h3 {
      margin: 0.5rem 0;
    }
    .card button {
      margin-top: 1rem;
      padding: 0.5rem 1rem;
      background: #4f46e5;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      transition: background 0.3s ease;
    }
    .card button:hover {
      background: #3730a3;
    }
  </style>
</head>
<body>
  <h2>🔗 Choose a Page to Connect</h2>
  <div class="page-list">
    ${pages.map((page, i) => `
      <div class="card">
        <img src="https://graph.facebook.com/${page.id}/picture?type=large" />
        <h3>${page.name}</h3>
        <form method="POST" action="/connect-page">
          <input type="hidden" name="index" value="${i}" />
          <button type="submit">Connect</button>
        </form>
      </div>
    `).join('')}
  </div>
</body>
</html>
`);


    } catch (err) {
        console.error('❌ Facebook API Error:', err.response?.data || err.message);
        res.status(500).send('❌ حدث خطأ أثناء عملية الربط. راجع سجلات الخادم.');
    }
});

/* ====== تشغيل الخادم ====== */
app.listen(PORT, () =>
    console.log(`🚀 http://localhost:${PORT} قيد التشغيل`)
);
