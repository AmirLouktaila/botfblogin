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
    <h1>✅ Simsimi Bot Login</h1>
    <p><a href="/login">ربط صفحتي على فيسبوك</a></p>
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
            null,
            { params: { access_token: page.access_token } }
        );

        /* 3‑5) الرد بمعلومات الصفحة */
        res.send(`
      <h2>✅ تم ربط الصفحة بنجاح!</h2>
      <ul>
        <li><strong>اسم الصفحة:</strong> ${page.name}</li>
        <li><strong>Page ID:</strong> ${page.id}</li>
        <li><strong>Page Access Token:</strong> ${page.access_token}</li>
        <li><strong>🔗 رابط الصفحة:</strong> <a href="https://www.facebook.com/${page.id}" target="_blank">فتح الصفحة</a></li>
      </ul>
      <p>يمكنك الآن استخدام هذا التوكن لرسائل البوت أو إعداد الـ Webhook.</p>
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
