// api/webhook.js — AlphaZero Telegram Bot
// Vercel Serverless Function | Webhook-based

const brain = require('../brain.json');

// ═══════════════════════════════════════════════
// ALPHAZERO CORE ENGINE
// ═══════════════════════════════════════════════

class AlphaZeroBot {
  constructor(knowledgeBase) {
    this.kb = JSON.parse(JSON.stringify(knowledgeBase)); // deep clone
    this.sessionMemory = new Map(); // in-memory session context
  }

  // Tokenize + normalize Uzbek text
  tokenize(text) {
    return text
      .toLowerCase()
      .replace(/[.,!؟?]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 1);
  }

  // Score how well a topic matches the message
  scoreTopic(tokens, topicData) {
    let score = 0;
    for (const keyword of topicData.keywords) {
      for (const token of tokens) {
        if (token.includes(keyword) || keyword.includes(token)) {
          score += token === keyword ? 3 : 1;
        }
      }
    }
    // Boost topics that were recently discussed
    return score;
  }

  // Detect best matching topic
  detectTopic(text) {
    const tokens = this.tokenize(text);
    let bestTopic = 'umumiy';
    let bestScore = 0;

    for (const [topicName, topicData] of Object.entries(this.kb.topics)) {
      if (topicName === 'umumiy') continue;
      const score = this.scoreTopic(tokens, topicData);
      if (score > bestScore) {
        bestScore = score;
        bestTopic = topicName;
      }
    }

    // Boost salomlashish if it's the first message
    if (bestScore === 0) {
      const greetings = this.kb.patterns.greetings;
      if (tokens.some(t => greetings.some(g => t.includes(g)))) {
        return 'salomlashish';
      }
    }

    return bestTopic;
  }

  // AlphaZero self-play: generate a response
  generateResponse(userId, text) {
    const topic = this.detectTopic(text);
    const topicData = this.kb.topics[topic];
    const tokens = this.tokenize(text);

    // Session context — remember last topic per user
    const lastTopic = this.sessionMemory.get(`${userId}_topic`);
    this.sessionMemory.set(`${userId}_topic`, topic);

    // Pick response (rotate based on learned_count)
    const responses = topicData.responses;
    const idx = (topicData.learned_count || 0) % responses.length;
    let response = responses[idx];

    // Detect new words not in vocabulary
    const newWords = this.extractNewWords(tokens);

    // Build enriched response
    let finalResponse = response;

    // Add context bridge if topic shifted
    if (lastTopic && lastTopic !== topic && lastTopic !== 'salomlashish') {
      const bridges = [
        `\n\n🔗 O'tgan gal *${this.topicLabel(lastTopic)}* haqida gaplashdik, endi *${this.topicLabel(topic)}*ga o'tdik.`,
        `\n\n🧠 Qiziq! *${this.topicLabel(lastTopic)}* dan *${this.topicLabel(topic)}* ga o'tish — bilimlar o'zaro bog'liq!`,
      ];
      finalResponse += bridges[Math.floor(Math.random() * bridges.length)];
    }

    // Add learned words to response occasionally
    if (this.kb.learned_words.length > 0 && Math.random() > 0.6) {
      const learnedWord = this.kb.learned_words[
        Math.floor(Math.random() * this.kb.learned_words.length)
      ];
      if (learnedWord && !text.toLowerCase().includes(learnedWord.word)) {
        finalResponse += `\n\n💡 O'rgangan so'zim: *${learnedWord.word}* — ${learnedWord.context}`;
      }
    }

    // Evolution data to return (caller will save to JSON)
    const evolution = {
      topic,
      newWords,
      learnedCountIncrement: topic,
      timestamp: new Date().toISOString(),
    };

    return { response: finalResponse, evolution, topic };
  }

  // Extract words not in existing vocabulary
  extractNewWords(tokens) {
    const allKnownWords = [
      ...Object.keys(this.kb.vocabulary),
      ...Object.values(this.kb.vocabulary).flat(),
      ...Object.values(this.kb.topics).flatMap(t => t.keywords),
    ].map(w => w.toLowerCase());

    return tokens.filter(t =>
      t.length > 3 &&
      !allKnownWords.some(k => k.includes(t) || t.includes(k)) &&
      !/^\d+$/.test(t)
    );
  }

  topicLabel(topic) {
    const labels = {
      falsafa: 'Falsafa',
      texnologiya: 'Texnologiya',
      matematika: 'Matematika',
      tarix: 'Tarix',
      salomlashish: 'Salomlashish',
      umumiy: 'Umumiy',
    };
    return labels[topic] || topic;
  }

  // Prepare evolution patch (what changes to apply to brain.json)
  buildEvolutionPatch(text, evolution) {
    const patch = {
      conversation_count_delta: 1,
      topic_to_increment: evolution.topic,
      new_learned_words: [],
      evolution_log_entry: null,
    };

    // Add new words discovered in this conversation
    if (evolution.newWords.length > 0) {
      evolution.newWords.slice(0, 3).forEach(word => {
        patch.new_learned_words.push({
          word,
          context: `"${text.substring(0, 40)}..." suhbatidan`,
          discovered_at: evolution.timestamp,
          topic: evolution.topic,
        });
      });

      // Log evolution
      patch.evolution_log_entry = {
        generation: this.kb.generation + 1,
        timestamp: evolution.timestamp,
        topic: evolution.topic,
        new_words: evolution.newWords.slice(0, 3),
        summary: `Yangi evolyutsiya: ${evolution.topic} sohasida ${evolution.newWords.length} yangi so'z o'rganildi`,
      };
    }

    return patch;
  }
}

// ═══════════════════════════════════════════════
// VERCEL SERVERLESS HANDLER
// ═══════════════════════════════════════════════

module.exports = async function handler(req, res) {
  // Only accept POST (Telegram webhook sends POST)
  if (req.method !== 'POST') {
    return res.status(200).json({ ok: true, message: 'AlphaZero Bot aktiv ✓' });
  }

  const BOT_TOKEN = process.env.BOT_TOKEN;
  if (!BOT_TOKEN) {
    console.error('BOT_TOKEN env yo\'q!');
    return res.status(500).json({ error: 'BOT_TOKEN sozlanmagan' });
  }

  try {
    const update = req.body;

    // Only handle text messages
    if (!update.message || !update.message.text) {
      return res.status(200).json({ ok: true });
    }

    const message = update.message;
    const chatId = message.chat.id;
    const userId = message.from.id;
    const text = message.text;
    const username = message.from.first_name || 'Do\'st';

    // /start command
    if (text === '/start') {
      await sendMessage(BOT_TOKEN, chatId, 
        `🤖 *AlphaZero* — O'z-o'zidan O'rganuvchi Bot\n\n` +
        `Salom, *${username}*! Men har suhbatdan o'rganib rivojlanaman.\n\n` +
        `📊 *Hozirgi holat:*\n` +
        `• Avlod: ${brain.generation}\n` +
        `• Suhbatlar: ${brain.conversation_count}\n` +
        `• O'rganilgan so'zlar: ${brain.learned_words.length}\n\n` +
        `_Savol bering, fikr bildiring — men o'rganaman!_ 🧠`
      );
      return res.status(200).json({ ok: true });
    }

    // /stats command
    if (text === '/stats') {
      const topTopics = Object.entries(brain.topics)
        .sort((a, b) => (b[1].learned_count || 0) - (a[1].learned_count || 0))
        .slice(0, 3)
        .map(([name, data]) => `• ${name}: ${data.learned_count || 0} marta`)
        .join('\n');

      await sendMessage(BOT_TOKEN, chatId,
        `📈 *AlphaZero Statistika*\n\n` +
        `🧬 Avlod: *${brain.generation}*\n` +
        `💬 Suhbatlar: *${brain.conversation_count}*\n` +
        `📚 O'rganilgan so'zlar: *${brain.learned_words.length}*\n\n` +
        `🏆 *Eng ko'p muhokama qilingan mavzular:*\n${topTopics}\n\n` +
        `🔬 *So'nggi evolyutsiyalar:*\n` +
        (brain.evolution_log.slice(-3).map(e => `• ${e.summary}`).join('\n') || 'Hali yo\'q')
      );
      return res.status(200).json({ ok: true });
    }

    // /brain command — show learned words
    if (text === '/brain') {
      const recentWords = brain.learned_words.slice(-10);
      const wordList = recentWords.length > 0
        ? recentWords.map(w => `• *${w.word}* (${w.topic})`).join('\n')
        : 'Hali yangi so\'z o\'rganilmagan';

      await sendMessage(BOT_TOKEN, chatId,
        `🧠 *AlphaZero Brain — O'rganilgan So'zlar*\n\n${wordList}\n\n` +
        `_Har suhbat bilan miyam kengayib boradi..._`
      );
      return res.status(200).json({ ok: true });
    }

    // === MAIN AI RESPONSE ===
    const bot = new AlphaZeroBot(brain);
    const { response, evolution, topic } = bot.generateResponse(userId, text);
    const patch = bot.buildEvolutionPatch(text, evolution);

    // Apply patch to in-memory brain (for logging)
    // Note: In Vercel stateless env, we return evolution data in logs
    // For persistence, use external KV store (Vercel KV / Redis)
    const evolutionNote = patch.new_learned_words.length > 0
      ? `\n\n🧬 _Evolyutsiya: ${patch.new_learned_words.map(w => w.word).join(', ')} — yangi so'zlar o'rganildi_`
      : '';

    // Add topic indicator
    const topicEmoji = {
      falsafa: '🔮',
      texnologiya: '⚡',
      matematika: '🔢',
      tarix: '📜',
      salomlashish: '👋',
      umumiy: '💭',
    }[topic] || '💭';

    const finalMessage = `${topicEmoji} ${response}${evolutionNote}`;

    await sendMessage(BOT_TOKEN, chatId, finalMessage);

    // Log evolution to console (Vercel logs)
    if (patch.evolution_log_entry) {
      console.log('🧬 EVOLUTION:', JSON.stringify(patch.evolution_log_entry));
    }
    console.log(`📊 User:${userId} | Topic:${topic} | NewWords:${patch.new_learned_words.length}`);

    return res.status(200).json({ ok: true });

  } catch (error) {
    console.error('Bot xatosi:', error);
    return res.status(200).json({ ok: true }); // Always return 200 to Telegram
  }
};

// ═══════════════════════════════════════════════
// TELEGRAM API HELPER
// ═══════════════════════════════════════════════

async function sendMessage(token, chatId, text) {
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error('Telegram API xato:', err);
  }

  return response;
}
