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
 * Fallback translation generator for common homestay requests across ALL 4 supported languages
 */
function fallbackTranslate(text, sourceLang, targetLang) {
  if (sourceLang === targetLang) return text;

  const matched = findDictionaryTranslation(text, sourceLang, targetLang);
  if (matched) return matched;

  const t = clean(text);

  // 1. "How are you?"
  if (t.includes('how are you') || t.includes('कैसे') || t.includes('कस्तो') || t.includes('কেমন')) {
    if (targetLang === 'en') return 'How are you?';
    if (targetLang === 'hi') return 'आप कैसे हैं?';
    if (targetLang === 'ne') return 'तपाईं कस्तो हुनुहुन्छ?';
    if (targetLang === 'bn') return 'আপনি কেমন আছেন?';
  }

  // 2. "Where is my room?"
  if ((t.includes('where') && (t.includes('room') || t.includes('my room'))) ||
      t.includes('कमरा कहाँ') || t.includes('कोठा कहाँ') || t.includes('ঘর কোথায়')) {
    if (targetLang === 'en') return 'Where is my room?';
    if (targetLang === 'hi') return 'मेरा कमरा कहाँ है?';
    if (targetLang === 'ne') return 'मेरो कोठा कहाँ छ?';
    if (targetLang === 'bn') return 'আমার ঘরটি কোথায়?';
  }

  // 3. Towel / Blanket requests
  if (t.includes('blanket') || t.includes('towel') || t.includes('कम्बल') || t.includes('तौलिया') || t.includes('তোয়ালে')) {
    if (targetLang === 'en') return 'Can I have another blanket or towel?';
    if (targetLang === 'hi') return 'क्या मुझे एक और कंबल या तौलिया मिल सकता है?';
    if (targetLang === 'ne') return 'मलाई अर्को कम्बल वा तौलिया दिन सक्नुहुन्छ?';
    if (targetLang === 'bn') return 'আমি কি আরেকটি কম্বল বা তোয়ালে পেতে পারি?';
  }

  // 4. Breakfast / Meal timing
  if (t.includes('breakfast') || t.includes('नाश्ता') || t.includes('खाजा') || t.includes('নাস্তা')) {
    if (targetLang === 'en') return 'What time is breakfast?';
    if (targetLang === 'hi') return 'नाश्ता किस समय मिलेगा?';
    if (targetLang === 'ne') return 'बिहानको खाजा कति बजे हुन्छ?';
    if (targetLang === 'bn') return 'সকালের নাস্তা কখন হবে?';
  }

  // 5. Drinking water
  if (t.includes('drinking water') || t.includes('water') || t.includes('पानी') || t.includes('জল')) {
    if (targetLang === 'en') return 'I need drinking water.';
    if (targetLang === 'hi') return 'मुझे पीने का पानी चाहिए।';
    if (targetLang === 'ne') return 'मलाई पिउने पानी चाहिन्छ।';
    if (targetLang === 'bn') return 'আমার খাবার জল দরকার।';
  }

  // 6. Wi-Fi
  if (t.includes('wifi') || t.includes('wi-fi') || t.includes('वाई-फाई') || t.includes('वाइ-फाइ') || t.includes('ওয়াই-ফাই')) {
    if (targetLang === 'en') return 'What is the Wi-Fi password?';
    if (targetLang === 'hi') return 'वाई-फाई का पासवर्ड क्या है?';
    if (targetLang === 'ne') return 'वाइ-फाइको पासवर्ड के हो?';
    if (targetLang === 'bn') return 'ওয়াই-ফাই পাসওয়ার্ড কি?';
  }

  // 7. Bathroom / washroom
  if (t.includes('bathroom') || t.includes('washroom') || t.includes('toilet') || t.includes('बाथरूम') || t.includes('शौचालय') || t.includes('বাথরুম')) {
    if (targetLang === 'en') return 'Where is the bathroom?';
    if (targetLang === 'hi') return 'बाथरूम कहाँ है?';
    if (targetLang === 'ne') return 'शौचालय कहाँ छ?';
    if (targetLang === 'bn') return 'বাথরুম কোথায়?';
  }

  // 8. Clean room
  if (t.includes('clean') || t.includes('सफा') || t.includes('साफ') || t.includes('পরিষ্কার')) {
    if (targetLang === 'en') return 'Please clean the room.';
    if (targetLang === 'hi') return 'कृपया कमरा साफ कर दीजिए।';
    if (targetLang === 'ne') return 'कृपया कोठा सफा गरिदिनुहोस्।';
    if (targetLang === 'bn') return 'অনুগ্রহ করে ঘরটি পরিষ্কার করে দিন।';
  }

  // 9. Tea queries
  if (t.includes('tea') || t.includes('चिया') || t.includes('चाय') || t.includes('চা')) {
    if (targetLang === 'en') return 'Would you like some tea?';
    if (targetLang === 'hi') return 'क्या आप थोड़ी चाय लेना चाहेंगे?';
    if (targetLang === 'ne') return 'तपाईंलाई चिया चाहिन्छ?';
    if (targetLang === 'bn') return 'আপনি কি একটু চা খাবেন?';
  }

  // 10. Bill / Payment
  if (t.includes('bill') || t.includes('payment') || t.includes('बिल') || t.includes('पैसा') || t.includes('টাকা') || t.includes('বিল')) {
    if (targetLang === 'en') return 'How much is the bill?';
    if (targetLang === 'hi') return 'बिल कितना हुआ?';
    if (targetLang === 'ne') return 'बिल कति भयो?';
    if (targetLang === 'bn') return 'বিল কত হয়েছে?';
  }

  // 11. Thank you
  if (t.includes('thank') || t.includes('धन्यवाद') || t.includes('ধন্যবাদ')) {
    if (targetLang === 'en') return 'Thank you very much.';
    if (targetLang === 'hi') return 'आपका बहुत-बहुत धन्यवाद।';
    if (targetLang === 'ne') return 'यहाँलाई धेरै धेरै धन्यवाद।';
    if (targetLang === 'bn') return 'আপনাকে অনেক ধন্যবাদ।';
  }

  // 12. Welcome
  if (t.includes('welcome') || t.includes('hello') || t.includes('namaste') || t.includes('नमस्ते') || t.includes('स्वागत') || t.includes('স্বাগতম')) {
    if (targetLang === 'en') return 'Welcome to our homestay.';
    if (targetLang === 'hi') return 'हमारे होमस्टे में आपका स्वागत है।';
    if (targetLang === 'ne') return 'हाम्रो होमस्टेमा यहाँलाई स्वागत छ।';
    if (targetLang === 'bn') return 'আমাদের হোমস্টেতে আপনাকে স্বাগতম।';
  }

  // 13. Good morning
  if (t.includes('good morning') || t.includes('सुप्रभात') || t.includes('शुभ प्रभात') || t.includes('সুপ্রভাত')) {
    if (targetLang === 'en') return 'Good morning.';
    if (targetLang === 'hi') return 'शुभ प्रभात।';
    if (targetLang === 'ne') return 'शुभ प्रभात।';
    if (targetLang === 'bn') return 'সুপ্রভাত।';
  }

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
