// Web Speech API Speech-to-Text Service
class SpeechRecognitionService {
  constructor() {
    this.recognition = null;
    this.isListening = false;
  }

  isSupported() {
    if (typeof window === 'undefined') return false;
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  _getRecognitionInstance() {
    if (typeof window === 'undefined') return null;
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) return null;
    try {
      const rec = new SpeechRec();
      rec.continuous = false;
      rec.interimResults = false;
      return rec;
    } catch (e) {
      console.warn('[STT] SpeechRecognition initialization failed:', e);
      return null;
    }
  }

  start(langOrOptions, onResult, onError, onEnd) {
    if (typeof langOrOptions === 'object' && langOrOptions !== null) {
      return this.startListening(langOrOptions);
    }
    return this.startListening({
      lang: langOrOptions || 'en',
      onResult,
      onError,
      onEnd
    });
  }

  stop() {
    this.stopListening();
  }

  startListening({ lang = 'en', onResult, onError, onEnd }) {
    if (!this.isSupported()) {
      if (onError) onError(new Error('Speech recognition is not supported in this browser. Please type your message.'));
      return false;
    }

    this.stopListening();

    this.recognition = this._getRecognitionInstance();
    if (!this.recognition) {
      if (onError) onError(new Error('Could not instantiate SpeechRecognition.'));
      return false;
    }

    const LANG_MAP = {
      en: 'en-IN',
      hi: 'hi-IN',
      bn: 'bn-IN',
      ne: 'ne-NP'
    };

    this.recognition.lang = LANG_MAP[lang] || lang;

    this.recognition.onresult = (event) => {
      const transcript = event.results && event.results[0] && event.results[0][0] && event.results[0][0].transcript;
      if (transcript && onResult) {
        onResult(transcript);
      }
    };

    this.recognition.onerror = (event) => {
      console.warn('[STT] Speech recognition error event:', event.error);
      if (onError) onError(event);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      if (onEnd) onEnd();
    };

    try {
      this.recognition.start();
      this.isListening = true;
      return true;
    } catch (err) {
      console.warn('[STT] Could not start speech recognition:', err);
      this.isListening = false;
      if (onError) onError(err);
      return false;
    }
  }

  stopListening() {
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {
        // Ignore if already stopped
      }
      this.recognition = null;
    }
    this.isListening = false;
  }
}

export const speechRecognitionService = new SpeechRecognitionService();
export default speechRecognitionService;
