# 🤖 AlphaZero Telegram Bot

> O'z-o'zidan o'rganuvchi, har suhbatda evolyutsiya qiluvchi Telegram bot.  
> Vercel Serverless | Webhook-based | Uzbek AI

---

## 🧬 Qanday ishlaydi?

AlphaZero har suhbatda:
1. **Mavzuni aniqlaydi** — falsafa, texnologiya, matematika, tarix...
2. **Yangi so'zlarni topadi** — o'z lug'atida bo'lmagan tokenlarni saqlaydi
3. **Kontekstni eslab qoladi** — session ichida oldingi mavzuni biladi
4. **Evolyutsiya qiladi** — har gal yangi bilim qo'shiladi

---

## 📁 Fayl tuzilmasi

```
telegram-bot/
├── api/
│   └── webhook.js      ← Asosiy bot logikasi (Vercel serverless function)
├── scripts/
│   └── set-webhook.js  ← Webhook o'rnatish skripti
├── brain.json          ← Bot miyasi: so'zlar, mavzular, o'rganilgan bilimlar
├── vercel.json         ← Vercel konfiguratsiyasi
├── package.json
└── README.md
```

---

## 🚀 Deploy qilish (Qadamma-qadam)

### 1. BotFather dan token oling

```
Telegram → @BotFather → /newbot → Token oling
```

### 2. Vercelga deploy qiling

```bash
# Vercel CLI o'rnating
npm i -g vercel

# Login qiling
vercel login

# Deploy qiling
vercel --prod
```

Deploy tugagach, Vercel URL beradi:  
`https://your-project-name.vercel.app`

### 3. Environment variable qo'shing

Vercel Dashboard → Settings → Environment Variables:

```
BOT_TOKEN = 1234567890:ABCDEFghijklmnop...
```

Yoki CLI orqali:
```bash
vercel env add BOT_TOKEN
```

### 4. Webhook o'rnating

```bash
BOT_TOKEN=your_token VERCEL_URL=https://your-app.vercel.app node scripts/set-webhook.js
```

Yoki to'g'ridan-to'g'ri brauzerdan:
```
https://api.telegram.org/botYOUR_TOKEN/setWebhook?url=https://your-app.vercel.app/api/webhook
```

### 5. Test qiling!

Telegram botingizni oching → `/start` yozing → Suhbatlashing 🎉

---

## 💬 Bot buyruqlari

| Buyruq | Tavsif |
|--------|--------|
| `/start` | Botni ishga tushirish, statistika ko'rish |
| `/stats` | Evolyutsiya statistikasi, mavzular |
| `/brain` | O'rganilgan so'zlar ro'yxati |
| _(har qanday matn)_ | AI javob + o'rganish |

---

## 🧠 brain.json tuzilmasi

```json
{
  "generation": 0,           // Evolyutsiya avlodi
  "conversation_count": 0,   // Jami suhbatlar soni
  "vocabulary": {            // Asosiy lug'at
    "salom": ["assalomu alaykum", "xayr"]
  },
  "topics": {                // Mavzular va javoblar
    "falsafa": {
      "keywords": ["hayot", "fikr"],
      "responses": ["..."],
      "learned_count": 0     // Bu mavzu qancha marta muhokama qilindi
    }
  },
  "learned_words": [],       // Suhbatlardan o'rganilgan so'zlar
  "evolution_log": []        // Evolyutsiya tarixi
}
```

---

## ⚡ Vercel + Stateless muhit haqida

Vercel serverless functions **stateless** — har so'rovdan keyin memory tozalanadi.

**Evolyutsiya ma'lumotlarini saqlash uchun:**

### Variant A: Vercel KV (Redis) — Tavsiya etiladi
```bash
vercel kv create alphazero-brain
```

```js
// api/webhook.js ga qo'shing:
import { kv } from '@vercel/kv';

const brain = await kv.get('brain') || defaultBrain;
// ... suhbat ...
await kv.set('brain', updatedBrain);
```

### Variant B: GitHub API (JSON fayl orqali)
Bot o'zi brain.json ni GitHub'ga push qiladi.

### Variant C: Faunadb / PlanetScale / Supabase
Bepul tier bor, JSON saqlash mumkin.

> Hozirgi versiya: session ichida o'rganadi, Vercel loglariga yozadi.  
> KV qo'shsangiz — to'liq persistentlik!

---

## 🔧 Lokal test

```bash
# .env fayl yarating
echo "BOT_TOKEN=your_token" > .env

# Vercel dev server
vercel dev

# Ngrok bilan webhook test:
ngrok http 3000
# Keyin: set-webhook.js bilan ngrok URL ni bering
```

---

## 📈 AlphaZero Evolyutsiya Siklasi

```
Suhbat kirdi
    ↓
Mavzu aniqlanadi (NLP scoring)
    ↓
Kontekst tekshiriladi (oldingi mavzu?)
    ↓
Javob generatsiya qilinadi
    ↓
Yangi so'zlar ekstraktlanadi
    ↓
Evolution patch yaratiladi
    ↓
brain.json yangilanadi (KV bilan)
    ↓
Keyingi suhbatda yangi bilim ishlatiladi ♾️
```

---

## 🛠 Kengaytirish

**Yangi mavzu qo'shish** (`brain.json`):
```json
"fizika": {
  "keywords": ["kvant", "nisbiylik", "energiya", "massa"],
  "responses": [
    "Einstein dedi: E=mc² — Energiya va massa bir xil!",
    "Kvant mexanikasi: zarracha bir vaqtda ikki joyda bo'lishi mumkin."
  ],
  "learned_count": 0
}
```

**Vercel KV bilan to'liq persistentlik:**
```bash
npm install @vercel/kv
vercel kv create alphazero-brain
```

---

*Made with 🧠 by AlphaZero — O'zbek tili uchun o'z-o'zidan rivojlanuvchi AI bot*
