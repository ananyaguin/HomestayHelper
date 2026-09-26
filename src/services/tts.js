// Text-To-Speech & Audio Engine for Homestay Communicator

export const TTS_LANGUAGES = {
  en: {
    targetCode: 'en-IN',
    fallbacks: ['en-IN', 'en-US', 'en-GB', 'en-AU', 'en'],
    prefix: 'en',
    label: 'English'
  },
  hi: {
    targetCode: 'hi-IN',
    fallbacks: ['hi-IN', 'hi'],
    prefix: 'hi',
    label: 'Hindi'
  },
  bn: {
    targetCode: 'bn-IN',
    fallbacks: ['bn-IN', 'bn-BD', 'bn'],
    prefix: 'bn',
    label: 'Bengali'
  },
  ne: {
    targetCode: 'ne-NP',
    fallbacks: ['ne-NP', 'ne'],
    // Nepali uses Devanagari script; if OS has no ne-NP voice, Hindi voice pronounces Devanagari accurately
    scriptFallbacks: ['hi-IN', 'hi'],
    prefix: 'ne',
    label: 'Nepali'
  }
};

export class AudioTTS {
  constructor() {
    this.synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
    this.voices = [];
    this.currentUtteranceId = 0;
    this.activeUtterance = null; // Store reference to prevent V8 garbage-collection bug

    if (this.synth) {
      this._loadVoices();
      // Handle both modern addEventListener and onvoiceschanged
      if (this.synth.addEventListener) {
        this.synth.addEventListener('voiceschanged', () => this._loadVoices());
      } else if (typeof window !== 'undefined' && 'onvoiceschanged' in window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = () => this._loadVoices();
      }
    }
  }

  _loadVoices() {
    if (!this.synth) return;
    try {
      const v = this.synth.getVoices();
      if (v && v.length > 0) {
        this.voices = v;
      }
    } catch (e) {
      console.warn('[TTS] Failed to getVoices:', e);
    }
  }

  getBestVoice(lang = 'en') {
    if (!this.synth) return null;
    if (this.voices.length === 0) {
      this._loadVoices();
    }
    const voices = this.voices || [];
    if (voices.length === 0) return null;

    const norm = (code) => String(code || '').replace('_', '-').toLowerCase();
    const config = TTS_LANGUAGES[lang] || {
      targetCode: lang,
      fallbacks: [lang],
      prefix: lang.split('-')[0]
    };

    // 1. Exact match for primary target code (e.g. 'ne-NP', 'hi-IN', 'bn-IN', 'en-IN')
    let match = voices.find(v => norm(v.lang) === norm(config.targetCode));
    if (match) return match;

    // 2. Exact match for specific fallback codes (e.g. 'en-US', 'bn-BD', 'ne')
    if (config.fallbacks) {
      for (const fb of config.fallbacks) {
        match = voices.find(v => norm(v.lang) === norm(fb));
        if (match) return match;
      }
    }

    // 3. Same language prefix match (e.g. starts with 'ne-', 'hi-', 'bn-', 'en-')
    match = voices.find(v => {
      const vNorm = norm(v.lang);
      return vNorm.startsWith(config.prefix + '-') || vNorm === config.prefix;
    });
    if (match) return match;

    // 4. Suitable script / phonetic fallback (e.g. Hindi voice for Nepali Devanagari)
    if (config.scriptFallbacks) {
      for (const sf of config.scriptFallbacks) {
        match = voices.find(v => {
          const vNorm = norm(v.lang);
          return vNorm.startsWith(sf + '-') || vNorm === sf;
        });
        if (match) return match;
      }
    }

    return null;
  }

  isVoiceAvailable(lang = 'en') {
    if (!this.synth) return false;
    if (this.voices.length === 0) {
      this._loadVoices();
    }
    // If voices haven't loaded yet, return true to allow browser attempt
    if (this.voices.length === 0) return true;
    return Boolean(this.getBestVoice(lang));
  }

  speak(text, lang = 'en', onStart = null, onEnd = null, onError = null) {
    if (!this.synth) {
      if (onError) onError('Speech synthesis is not supported in this browser.');
      if (onEnd) onEnd();
      return;
    }

    const cleanText = (text || '').trim();
    if (!cleanText) {
      if (onEnd) onEnd();
      return;
    }

    // Stop any ongoing speech immediately before starting new utterance
    this.stop();

    if (this.voices.length === 0) {
      this._loadVoices();
    }

    const config = TTS_LANGUAGES[lang] || {
      targetCode: lang,
      fallbacks: [lang],
      prefix: lang.split('-')[0]
    };

    const matchedVoice = this.getBestVoice(lang);

    // If voices have loaded in the browser, but absolutely no voice matches the language
    if (this.voices.length > 0 && !matchedVoice) {
      const errorMsg = 'Speech voice for this language is not available in your browser.';
      console.warn(`[TTS] ${errorMsg} (${lang})`);
      if (onError) onError(errorMsg);
      if (onEnd) onEnd();
      return;
    }

    const utteranceId = ++this.currentUtteranceId;
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 0.9; // Slightly slower for clarity
    utterance.pitch = 1.0;

    if (matchedVoice) {
      utterance.voice = matchedVoice;
      utterance.lang = matchedVoice.lang || config.targetCode;
    } else {
      utterance.lang = config.targetCode;
    }

    // Retain utterance reference to avoid premature garbage-collection in Chrome
    this.activeUtterance = utterance;

    utterance.onstart = () => {
      if (this.currentUtteranceId === utteranceId && onStart) {
        onStart();
      }
    };

    utterance.onend = () => {
      if (this.currentUtteranceId === utteranceId) {
        this.activeUtterance = null;
        if (onEnd) onEnd();
      }
    };

    utterance.onerror = (event) => {
      // Ignore user-initiated cancellation or interruption
      if (event.error === 'canceled' || event.error === 'interrupted') {
        return;
      }
      console.warn('[TTS] Speech synthesis error:', event.error);
      if (this.currentUtteranceId === utteranceId) {
        this.activeUtterance = null;
        if (onError) {
          if (event.error === 'language-unavailable' || event.error === 'voice-unavailable') {
            onError('Speech voice for this language is not available in your browser.');
          } else {
            onError('Speech synthesis encountered an issue in your browser.');
          }
        }
        if (onEnd) onEnd();
      }
    };

    try {
      this.synth.speak(utterance);
    } catch (err) {
      console.warn('[TTS] Synth speak error:', err);
      this.activeUtterance = null;
      if (onError) onError('Speech synthesis encountered an issue in your browser.');
      if (onEnd) onEnd();
    }
  }

  stop() {
    this.currentUtteranceId++;
    this.activeUtterance = null;
    if (this.synth) {
      try {
        this.synth.cancel();
      } catch (e) {
        // Ignore
      }
    }
  }
}

export const appTTS = new AudioTTS();
export const ttsService = appTTS;
export default appTTS;
