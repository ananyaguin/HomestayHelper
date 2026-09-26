// Text-To-Speech & Audio Engine for Homestay Communicator
class AudioTTS {
  constructor() {
    this.synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
    this.voices = [];
    this.currentUtteranceId = 0;
    if (this.synth) {
      this._loadVoices();
      if (typeof window !== 'undefined' && window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => this._loadVoices();
      }
    }
  }

  _loadVoices() {
    if (this.synth) {
      this.voices = this.synth.getVoices() || [];
    }
  }

  speak(text, lang = 'en', onStart = null, onEnd = null) {
    if (!this.synth) {
      if (onEnd) onEnd();
      return;
    }

    const cleanText = (text || '').trim();
    if (!cleanText) {
      if (onEnd) onEnd();
      return;
    }

    // Cancel any ongoing speech immediately before starting new utterance
    try {
      this.synth.cancel();
    } catch (e) {
      console.warn('[TTS] Synth cancel notice:', e);
    }

    const utteranceId = ++this.currentUtteranceId;
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 0.9; // Slightly slower for clarity
    utterance.pitch = 1.0;

    // Standard language code mappings
    const LANG_MAP = {
      en: 'en-IN',
      hi: 'hi-IN',
      bn: 'bn-IN',
      ne: 'ne-NP'
    };

    const targetCode = LANG_MAP[lang] || lang;
    utterance.lang = targetCode;

    if (this.voices.length === 0) {
      this._loadVoices();
    }

    // Match exact voice or prefix, with graceful fallback for Indic scripts
    let matchedVoice = this.voices.find(v => v.lang === targetCode || v.lang.replace('_', '-') === targetCode);
    if (!matchedVoice) {
      matchedVoice = this.voices.find(v => v.lang.startsWith(targetCode.substring(0, 2)));
    }
    // Nepali fallback to Hindi voice if ne-NP voice is not installed in OS
    if (!matchedVoice && targetCode === 'ne-NP') {
      matchedVoice = this.voices.find(v => v.lang.startsWith('hi'));
    }

    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    utterance.onstart = () => {
      if (this.currentUtteranceId === utteranceId && onStart) {
        onStart();
      }
    };

    utterance.onend = () => {
      if (this.currentUtteranceId === utteranceId && onEnd) {
        onEnd();
      }
    };

    utterance.onerror = (err) => {
      if (this.currentUtteranceId === utteranceId && onEnd) {
        onEnd();
      }
    };

    try {
      this.synth.speak(utterance);
    } catch (err) {
      console.warn('[TTS] Speak error:', err);
      if (onEnd) onEnd();
    }
  }

  stop() {
    this.currentUtteranceId++;
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
