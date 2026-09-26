const express = require('express');
const router = express.Router();
const { HOMESTAY_PHRASES } = require('../data/phrasesData');

/**
 * Normalizes text for comparison
 */
function clean(str) {
  return String(str || '')
    .toLowerCase()
    .trim()
    .replace(/[.,!?;:"'।॥]/g, '')
    .replace(/\s+/g, ' ');
}

function getPhraseField(item, lang) {
  if (!item) return '';
  if (lang === 'en') return item.en || item.english || '';
  if (lang === 'ne') return item.ne || item.nepali || '';
  if (lang === 'hi') return item.hi || item.hindi || '';
  if (lang === 'bn') return item.bn || item.bengali || '';
  return item[lang] || '';
}

/**
 * Find exact or close phrase translation from phrase dictionary
 */
function findDictionaryTranslation(text, sourceLang, targetLang) {
  const q = clean(text);
  if (!q) return null;

  for (const item of HOMESTAY_PHRASES) {
    const sText = getPhraseField(item, sourceLang);
    if (sText && clean(sText) === q) {
      return getPhraseField(item, targetLang) || item.nepali || item.english;
    }
  }

  // Substring search
  for (const item of HOMESTAY_PHRASES) {
    const sText = getPhraseField(item, sourceLang);
    if (sText && (clean(sText).includes(q) || q.includes(clean(sText)))) {
      return getPhraseField(item, targetLang) || item.nepali || item.english;
    }
  }

  return null;
}

/**
 * Fallback translation generator for common homestay requests
 */
function fallbackTranslate(text, sourceLang, targetLang) {
  const matched = findDictionaryTranslation(text, sourceLang, targetLang);
  if (matched) return matched;

  const t = clean(text);

  // Common blanket / room queries
  if (t.includes('blanket') || t.includes('towel') || t.includes('कम्बल')) {
    if (targetLang === 'en') return 'Can I have another blanket?';
    if (targetLang === 'ne') return 'मलाई अर्को कम्बल दिनुहुन्छ?';
    if (targetLang === 'hi') return 'क्या मुझे एक और कंबल मिल सकता है?';
    if (targetLang === 'bn') return 'আমি কি আরেকটি কম্বল পেতে পারি?';
    return 'Would you like another blanket or towel?';
  }

  // Bathroom / washroom queries
  if (t.includes('bathroom') || t.includes('washroom') || t.includes('toilet') || t.includes('शौचालय')) {
    if (targetLang === 'en') return 'Where is the bathroom?';
    if (targetLang === 'ne') return 'शौचालय कहाँ छ?';
    if (targetLang === 'hi') return 'बाथरूम कहाँ है?';
    if (targetLang === 'bn') return 'বাথরুম কোথায়?';
    return 'Where is the bathroom?';
  }

  // Drinking water queries
  if (t.includes('drinking water') || t.includes('water') || t.includes('पानी')) {
    if (targetLang === 'en') return 'I need drinking water.';
    if (targetLang === 'ne') return 'मलाई पिउने पानी चाहिन्छ।';
    if (targetLang === 'hi') return 'मुझे पीने का पानी चाहिए।';
    if (targetLang === 'bn') return 'আমার খাবার জল দরকার।';
    return 'I need drinking water.';
  }

  // Clean room queries
  if (t.includes('clean') || t.includes('सफा')) {
    if (targetLang === 'en') return 'Please clean the room.';
    if (targetLang === 'ne') return 'कृपया कोठा सफा गरिदिनुहोस्।';
    if (targetLang === 'hi') return 'कृपया कमरा साफ कर दीजिए।';
    if (targetLang === 'bn') return 'অনুগ্রহ করে ঘরটি পরিষ্কার করে দিন।';
    return 'Please clean the room.';
  }

  // Tea queries
  if (t.includes('tea') || t.includes('चिया') || t.includes('चाय')) {
    if (targetLang === 'en') return 'Would you like some tea?';
    if (targetLang === 'ne') return 'तपाईंलाई चिया चाहिन्छ?';
    if (targetLang === 'hi') return 'क्या आप थोड़ी चाय लेना चाहेंगे?';
    if (targetLang === 'bn') return 'আপনি কি একটু চা খাবেন?';
    return 'Would you like some tea?';
  }

  // Room / comfort queries
  if (t.includes('room') || t.includes('comfortable') || t.includes('कोठा')) {
    if (targetLang === 'en') return 'Is everything comfortable in your room?';
    if (targetLang === 'ne') return 'के तपाईंको कोठामा सबै कुरा आरामदायी छ?';
    if (targetLang === 'hi') return 'क्या कमरे में सब कुछ आरामदायक है?';
    if (targetLang === 'bn') return 'ঘরে কি সবকিছু ঠিকঠাক আছে?';
    return 'Is everything comfortable in your room?';
  }

  // Welcome queries
  if (t.includes('welcome') || t.includes('hello') || t.includes('namaste') || t.includes('स्वागत')) {
    if (targetLang === 'en') return 'Welcome to our homestay.';
    if (targetLang === 'ne') return 'हाम्रो होमस्टेमा यहाँलाई स्वागत छ।';
    if (targetLang === 'hi') return 'हमारे होमस्टे में आपका स्वागत है।';
    if (targetLang === 'bn') return 'আমাদের হোমস্টেতে আপনাকে স্বাগতম।';
    return 'Welcome to our homestay.';
  }

  // Default fallback keeping language tone
  if (targetLang === 'en') return text;
  if (targetLang === 'ne') return `[नेपाली] ${text}`;
  if (targetLang === 'hi') return `[हिन्दी] ${text}`;
  if (targetLang === 'bn') return `[বাংলা] ${text}`;
  return text;
}

/**
 * Transform sentence for "Make Polite"
 */
function makePolite(text, lang = 'ne') {
  if (!text || !text.trim()) return text;
  const trimmed = text.trim();

  if (lang === 'ne') {
    if (trimmed.startsWith('कृपया') || trimmed.startsWith('हजुर')) return trimmed;
    return `हजुर, कृपया ${trimmed}`;
  }
  if (lang === 'hi') {
    if (trimmed.startsWith('कृपया') || trimmed.startsWith('नमस्ते')) return trimmed;
    return `नमस्ते! कृपया ${trimmed}`;
  }
  if (lang === 'bn') {
    if (trimmed.startsWith('অনুগ্রহ করে') || trimmed.startsWith('দয়া করে')) return trimmed;
    return `নমস্কার! অনুগ্রহ করে ${trimmed}`;
  }
  // English
  if (/^(please|kindly|could you|would you)/i.test(trimmed)) return trimmed;
  return `Kindly let us know: ${trimmed}`;
}

/**
 * Transform sentence for "Make Shorter"
 */
function makeShorter(text, lang = 'ne') {
  if (!text || !text.trim()) return text;
  const trimmed = text.trim();

  // Strip excessive polite prefixes to make short and crisp
  let cleaned = trimmed
    .replace(/^(हजुर,\s*|कृपया\s*|नमस्ते!\s*|নমস্কার!\s*|অনুগ্রহ করে\s*|kindly let us know:\s*)/i, '')
    .trim();

  // Pick first phrase or core sentence
  const parts = cleaned.split(/[।?!.]+/).filter(Boolean);
  return parts.length > 0 ? parts[0].trim() : cleaned;
}

/**
 * Generate explanation for "Explain"
 */
function explainMeaning(text, lang = 'ne') {
  const langNames = { en: 'English', ne: 'Nepali', hi: 'Hindi', bn: 'Bengali' };
  const targetName = langNames[lang] || lang;

  return {
    translated: text,
    language: targetName,
    politeness: 'Polite & respectful hospitality phrasing',
    context: 'Natural local hill homestay expression suitable for welcoming travelers and managing guest comfort.'
  };
}

/**
 * POST /api/translate
 * Translates text between en, hi, bn, ne
 */
router.post('/', (req, res) => {
  try {
    const { text, sourceLang = 'en', targetLang = 'ne' } = req.body || {};

    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, error: 'Input text is empty' });
    }

    if (sourceLang === targetLang) {
      return res.status(200).json({
        success: true,
        translatedText: text.trim(),
        sourceLang,
        targetLang
      });
    }

    const translatedText = fallbackTranslate(text.trim(), sourceLang, targetLang);

    return res.status(200).json({
      success: true,
      translatedText,
      sourceLang,
      targetLang
    });
  } catch (error) {
    console.error('Translation route error:', error.message);
    return res.status(500).json({ success: false, error: 'Translation processing failed' });
  }
});

/**
 * POST /api/phrase-action
 * Handles Make Polite, Make Shorter, Explain Meaning
 */
router.post('/phrase-action', (req, res) => {
  try {
    const { text, action, targetLang = 'ne' } = req.body || {};

    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, error: 'Input text is required' });
    }

    const trimmed = text.trim();

    if (action === 'polite' || action === 'make_polite') {
      const politeText = makePolite(trimmed, targetLang);
      return res.status(200).json({
        success: true,
        action: 'polite',
        original: trimmed,
        result: politeText
      });
    }

    if (action === 'shorter' || action === 'make_shorter') {
      const shorterText = makeShorter(trimmed, targetLang);
      return res.status(200).json({
        success: true,
        action: 'shorter',
        original: trimmed,
        result: shorterText
      });
    }

    if (action === 'explain' || action === 'explain_meaning') {
      const explanation = explainMeaning(trimmed, targetLang);
      return res.status(200).json({
        success: true,
        action: 'explain',
        original: trimmed,
        result: trimmed,
        explanation
      });
    }

    return res.status(400).json({ success: false, error: 'Unknown action specified' });
  } catch (error) {
    console.error('Phrase action route error:', error.message);
    return res.status(500).json({ success: false, error: 'Action processing failed' });
  }
});

module.exports = router;
module.exports.makePolite = makePolite;
module.exports.makeShorter = makeShorter;
module.exports.explainMeaning = explainMeaning;
module.exports.fallbackTranslate = fallbackTranslate;
