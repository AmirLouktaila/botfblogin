const express = require('express');
const axios = require('axios');
const app = express();

/* بيانات تطبيقك */
const APP_ID = process.env.appi
const APP_SECRET = process.env.apps
const REDIRECT_URI = `${process.env.RENDER_EXTERNAL_URL}/callback`

/* صفحة رئيسية بسيطة (ضرورية لاجتياز فحص فيسبوك) */
app.get('/', (_req, res) => {
    res.send(`<h1>✅ Simsimi Bot Login</h1>
            <p>اضغط على زر ربط الصفحة من الواجهة الأمامية.</p>`);
});

app.get('/callback', async (req, res) => {
    const code = req.query.code;
    if (!code) return res.status(400).send('No code received');

    try {
        // 1. الحصول على user access token
        const tokenResponse = await axios.get(`https://graph.facebook.com/v19.0/oauth/access_token`, {
            params: {
                client_id: APP_ID,
                client_secret: APP_SECRET,
                redirect_uri: REDIRECT_URI,
                code: code,
            }
        });
        const userAccessToken = tokenResponse.data.access_token;

        // 2. الحصول على الصفحات
        const pagesRes = await axios.get(`https://graph.facebook.com/v19.0/me/accounts`, {
            params: {
                access_token: userAccessToken
            }
        });

        const pages = pagesRes.data.data;
        if (!pages || pages.length === 0) {
            return res.send('⚠️ لا توجد صفحات أو لم تمنح الصلاحيات!');
        }

        // 3. عرض كل الصفحات التي وافق عليها المستخدم
        const html = pages.map(p => `
            <div style="padding:10px;margin:10px;border:1px solid #ccc">
                <strong>📄 اسم الصفحة:</strong> ${p.name} <br/>
                <strong>🆔 ID:</strong> ${p.id} <br/>
                <strong>🔑 Access Token:</strong> ${p.access_token}
            </div>
        `).join('');

        res.send(`<h2>✅ الصفحات المرتبطة بحسابك:</h2>${html}`);
    } catch (error) {
        console.error(error.response?.data || error.message);
        res.status(500).send('❌ حدث خطأ في الاتصال بـ Facebook API.');
    }
});

app.listen(3030, () => {
    console.log('✅ Server is running on http://localhost:3030');
});
