// server.js
const express = require('express');
const axios = require('axios');
const app = express();
const PORT = 3030;

/* === بيانات تطبيقك === */
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
  <p><a href="/login">🔗 ربط صفحتي على فيسبوك</a></p>
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
<html lang="ar">
<head>
  <meta charset="UTF-8" />
  <title>تم ربط الصفحة</title>
  <style>
    body {
      background: #f3f4f6;
      font-family: 'Segoe UI', sans-serif;
      padding: 2rem;
      color: #111827;
    }
    .container {
      max-width: 600px;
      margin: auto;
      background: #fff;
      border-radius: 12px;
      padding: 2rem;
      box-shadow: 0 8px 16px rgba(0,0,0,0.1);
    }
    h2 {
      color: #16a34a;
      text-align: center;
    }
    ul {
      list-style: none;
      padding: 0;
    }
    li {
      margin: 1rem 0;
      background: #f9fafb;
      padding: 1rem;
      border-left: 4px solid #4f46e5;
      border-radius: 6px;
    }
    img {
      max-width: 100%;
      border-radius: 10px;
      margin-top: 0.5rem;
    }
    a {
      color: #2563eb;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
<div class="container">
  <h2>✅ Page Linked Successfully!</h2>
  <ul>
    <li><strong>Name Page:</strong> ${page.name}</li>
    <li><strong>Page ID:</strong> ${page.id}</li>
    <li><strong>Page Access Token:</strong> ${page.access_token.slice(0, 60) + "..."}</li>
    <li><strong>🖼️ Image Page:</strong><br/><img src="https://graph.facebook.com/${page.id}/picture?type=large" /></li>
    <li><strong>🔗Url Page:</strong> <a href="https://www.facebook.com/${page.id}" target="_blank">Open Page</a></li>
  </ul>
  <p style="text-align: center; margin-top: 1.5rem;">📬 You can now use this token for bot messaging or setting up the Webhook.</p>

  <!-- ✅ زر التشغيل -->
  <div style="text-align: center; margin-top: 2rem;">
    <button id="startBtn" onclick="toggleButton()" style="
      padding: 0.7rem 1.5rem;
      font-size: 1rem;
      background-color: #4f46e5;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.3s ease;
    ">
      Start
    </button>
  </div>

  <!-- ✅ سكريبت للتغيير -->
  <script>
    function toggleButton() {
      const btn = document.getElementById("startBtn");
      if (btn.innerText === "Start") {
        btn.innerText = "Running";
        btn.style.backgroundColor = "#16a34a"; // أخضر
      } else {
        btn.innerText = "Start";
        btn.style.backgroundColor = "#4f46e5"; // أزرق بنفسجي
      }
    }
  </script>
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
