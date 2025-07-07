const express = require('express');
const axios = require('axios');
const app = express();
const PORT = 3030;

const APP_ID =  process.env.appi
const APP_SECRET = process.env.apps
const REDIRECT_URI = `${process.env.RENDER_EXTERNAL_URL}/callback`

// ✅ صفحة رئيسية للرابط الأساسي
app.get('/', (req, res) => {
    res.send(`
        <h1>✅ MyBot </h1>
        <p>الخادم يعمل بنجاح، ويمكن لـ Facebook التحقق من هذا الرابط.</p>
    `);
});

// ✅ رابط الكولباك من Facebook
app.get('/callback', async (req, res) => {
    const code = req.query.code;

    if (!code) {
        return res.status(400).send('Code not found in query.');
    }

    try {
        const tokenRes = await axios.get(`https://graph.facebook.com/v19.0/oauth/access_token`, {
            params: {
                client_id: APP_ID,
                client_secret: APP_SECRET,
                redirect_uri: REDIRECT_URI,
                code: code
            }
        });

        const accessToken = tokenRes.data.access_token;

        const pagesRes = await axios.get(`https://graph.facebook.com/me/accounts`, {
            params: {
                access_token: accessToken
            }
        });

        const pages = pagesRes.data.data;

        if (pages.length === 0) {
            return res.send('لا توجد صفحات مرتبطة بهذا الحساب.');
        }

        const firstPage = pages[0];

        res.send(`
            <h2>✅ تم الربط بنجاح!</h2>
            <p><strong>اسم الصفحة:</strong> ${firstPage.name}</p>
            <p><strong>ID:</strong> ${firstPage.id}</p>
            <p><strong>Page Access Token:</strong> ${firstPage.access_token}</p>
        `);
    } catch (err) {
        console.error(err.response?.data || err.message);
        res.status(500).send('حدث خطأ أثناء جلب التوكن أو الصفحات.');
    }
});

app.listen(PORT, () => {
    console.log(`✅ السيرفر يعمل على http://localhost:${PORT}`);
});
