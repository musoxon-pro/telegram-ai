#!/usr/bin/env node
// scripts/set-webhook.js
// Vercelga deploy qilgandan keyin webhook o'rnatish uchun

const BOT_TOKEN = process.env.BOT_TOKEN;
const VERCEL_URL = process.env.VERCEL_URL || process.argv[2];

if (!BOT_TOKEN) {
  console.error('❌ BOT_TOKEN env o\'zgaruvchisi yo\'q!');
  console.log('Foydalanish: BOT_TOKEN=xxx VERCEL_URL=https://your-app.vercel.app node scripts/set-webhook.js');
  process.exit(1);
}

if (!VERCEL_URL) {
  console.error('❌ VERCEL_URL berilmagan!');
  console.log('Foydalanish: VERCEL_URL=https://your-app.vercel.app node scripts/set-webhook.js');
  process.exit(1);
}

const webhookUrl = `${VERCEL_URL}/api/webhook`;

async function setWebhook() {
  console.log(`🔗 Webhook o'rnatilmoqda: ${webhookUrl}`);
  
  const response = await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ['message'],
        drop_pending_updates: true,
      }),
    }
  );

  const data = await response.json();
  
  if (data.ok) {
    console.log('✅ Webhook muvaffaqiyatli o\'rnatildi!');
    console.log(`📡 URL: ${webhookUrl}`);
  } else {
    console.error('❌ Xato:', data.description);
  }

  // Get webhook info
  const infoRes = await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`
  );
  const info = await infoRes.json();
  console.log('\n📊 Webhook holati:');
  console.log(JSON.stringify(info.result, null, 2));
}

setWebhook().catch(console.error);
