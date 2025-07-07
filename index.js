const express = require('express');
const axios = require('axios');
const app = express();
const PORT = 3030;

/* بيانات تطبيقك */
const APP_ID = process.env.appi
const APP_SECRET = process.env.apps
const REDIRECT_URI = `${process.env.RENDER_EXTERNAL_URL}/callback`

/* صفحة رئيسية بسيطة (ضرورية لاجتياز فحص فيسبوك) */
app.get('/', (_req, res) => {
    res.send(`<h1>✅ Simsimi Bot Login</h1>
            <p>اضغط على زر ربط الصفحة من الواجهة الأمامية.</p>`);
});

/* مسار الكولباك من فيسبوك */
app.get('/callback', async (req, res) => {
    const { code } = req.query;
    if (!code) return res.status(400).send('Code missing.');

    try {
        /* 1) تبديل الـ code إلى User Access Token */
        const tokenRes = await axios.get('https://graph.facebook.com/v19.0/oauth/access_token', {
            params: {
                client_id: APP_ID,
                client_secret: APP_SECRET,
                redirect_uri: REDIRECT_URI,
                code
            }
        });
        const userToken = tokenRes.data.access_token;

        /* 2) جلب الصفحات المرتبطة بالحساب */
        const pagesRes = await axios.get('https://graph.facebook.com/v19.0/me/accounts', {
            params: { access_token: userToken }
        });
        const pages = pagesRes.data.data;

        if (!pages || pages.length === 0) {
            return res.send('⚠️ لم تُمنح صلاحية الوصول إلى أي صفحة، أو لا توجد صفحات Admin.');
        }

        /* سنربط أول صفحة (يمكنك بناء واجهة للاختيار) */
        const page = pages[0];

        /* 3) ربط البوت بالصفحة (Subscribe) */
        await axios.post(`https://graph.facebook.com/v19.0/${page.id}/subscribed_apps`, null, {
            params: { access_token: page.access_token }
        });

        /* 4) إظهار معلومات الصفحة */
        res.send(`
      <h2>✅ تم ربط الصفحة بنجاح!</h2>
      <p><strong>اسم الصفحة:</strong> ${page.name}</p>
      <p><strong>Page ID:</strong> ${page.id}</p>
      <p><strong>Page Access Token:</strong> ${page.access_token}</p>
      <p><strong>🔗 رابط الصفحة:</strong> <a href="https://www.facebook.com/${page.id}" target="_blank">فتح الصفحة على فيسبوك</a></p>
    `);
    } catch (err) {
        console.error('Facebook API Error:', err.response?.data || err.message);
        res.status(500).send('❌ حدث خطأ أثناء ربط الصفحة.');
    }
});

app.listen(PORT, () =>
    console.log(`✅ السيرفر يعمل على http://localhost:${PORT}`)
);
