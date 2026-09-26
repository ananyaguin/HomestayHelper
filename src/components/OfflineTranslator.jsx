import React, { useState, useEffect, useCallback, memo } from 'react';
import { translationService } from '../services/translation';
import { speechRecognitionService } from '../services/speechRecognition';
import { ttsService } from '../services/tts';
import { HOMESTAY_PHRASES } from '../data/phrases';
import {
  Globe2,
  ArrowLeftRight,
  Mic,
  Square,
  Sparkles,
  AlertTriangle,
  Volume2,
  Copy,
  Check
} from 'lucide-react';

const LANGUAGES = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
  { code: 'bn', label: 'Bengali', native: 'বাংলা' },
  { code: 'ne', label: 'Nepali', native: 'नेपाली' }
];

export default function OfflineTranslator({
  sourceLang = 'en',
  setSourceLang,
  targetLang = 'ne',
  setTargetLang,
  externalInputText = ''
}) {
  const [internalSourceLang, setInternalSourceLang] = useState('en');
  const [internalTargetLang, setInternalTargetLang] = useState('ne');
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeakToSpeakListening, setIsSpeakToSpeakListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechStatus, setSpeechStatus] = useState('idle'); // 'idle' | 'listening' | 'translating' | 'speaking'
  const [errorMessage, setErrorMessage] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [aiStatus, setAiStatus] = useState({
    status: 'READY',
    message: 'AI OFFLINE READY'
  });

  const activeSourceLang = setSourceLang ? sourceLang : internalSourceLang;
  const activeTargetLang = setTargetLang ? targetLang : internalTargetLang;

  const handleSourceLangChange = (val) => {
    if (setSourceLang) setSourceLang(val);
    else setInternalSourceLang(val);
  };

  const handleTargetLangChange = (val) => {
    if (setTargetLang) setTargetLang(val);
    else setInternalTargetLang(val);
  };

  // Sync external input text when user clicks "Use in Translator" without auto-translating
  useEffect(() => {
    if (externalInputText) {
      setInputText(externalInputText);
      setErrorMessage('');
    }
  }, [externalInputText]);

  // Subscribe to worker status updates and manage worker lifecycle
  useEffect(() => {
    translationService.acquire();
    const unsubscribe = translationService.onStatusChange((status) => {
      if (status && status.status) {
        setAiStatus(status);
      }
    });
    return () => {
      unsubscribe();
      translationService.release();
    };
  }, []);

  // Cleanup speech & TTS on unmount
  useEffect(() => {
    return () => {
      speechRecognitionService.stopListening();
      ttsService.stop();
    };
  }, []);

  const handleSwapLanguages = () => {
    const tempSrc = activeSourceLang;
    const tempTgt = activeTargetLang;
    handleSourceLangChange(tempTgt);
    handleTargetLangChange(tempSrc);

    if (outputText && !errorMessage) {
      const tempText = outputText;
      setOutputText(inputText);
      setInputText(tempText);
    }
  };

  /**
   * Core translation function supporting:
   * 1. TranslationService web worker (IndicTrans2 / ONNX neural model)
   * 2. Offline phrasebook dictionary fallback
   * 3. Backend endpoint fallback
   * 4. Graceful query fallback
   */
  const performTranslation = async (textToTranslate, srcLang, tgtLang) => {
    const query = (textToTranslate || '').trim();
    if (!query) return '';
    if (srcLang === tgtLang) return query;

    // 1. Primary: Local AI Translation Web Worker (IndicTrans2 / ONNX)
    try {
      const result = await translationService.translateText(query, srcLang, tgtLang);
      if (result) return result;
    } catch (workerErr) {
      console.warn('[Translator] Worker translation notice, trying fallback:', workerErr.message);
    }

    // Helper to get text in requested language
    const getPhraseText = (p, lang) => {
      if (!p) return '';
      if (lang === 'en') return p.en || p.english || '';
      if (lang === 'ne') return p.ne || p.nepali || '';
      if (lang === 'hi') return p.hi || p.hindi || '';
      if (lang === 'bn') return p.bn || p.bengali || '';
      return p[lang] || '';
    };

    const cleanStr = (s) =>
      String(s || '')
        .toLowerCase()
        .replace(/[.,!?;:"'।॥]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    // 2. Fallback: Instant match in HOMESTAY_PHRASES (<1ms offline phrasebook)
    const cleanQuery = cleanStr(query);
    const matchedPhrase = HOMESTAY_PHRASES.find((p) => {
      const pSrc = cleanStr(getPhraseText(p, srcLang));
      return pSrc === cleanQuery;
    });

    if (matchedPhrase) {
      return getPhraseText(matchedPhrase, tgtLang) || matchedPhrase.nepali || matchedPhrase.english;
    }

    // 3. Fallback via backend endpoint if available
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: query, sourceLang: srcLang, targetLang: tgtLang })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.translatedText) return data.translatedText;
      }
    } catch (apiErr) {
      console.warn('API fallback notice:', apiErr.message);
    }

    // 4. Default graceful fallback
    return query;
  };

  /**
   * Translates text ONLY when user presses Translate button
   */
  const handleTranslateClick = async () => {
    const query = inputText.trim();
    if (!query || isLoading) return;

    setErrorMessage('');
    setIsLoading(true);

    try {
      const translated = await performTranslation(query, activeSourceLang, activeTargetLang);
      setOutputText(translated);
    } catch (err) {
      console.error('Translation error:', err);
      setErrorMessage('Translation encountered an error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 1. Speak-to-Text Flow:
   * Captures user's voice in activeSourceLang and puts text into input box.
   * Does NOT automatically trigger translation.
   */
  const handleToggleSpeechToText = () => {
    if (isSpeaking) {
      ttsService.stop();
      setIsSpeaking(false);
    }

    if (!speechRecognitionService.isSupported()) {
      setErrorMessage('Speech recognition is not supported in this browser. Please type your message.');
      return;
    }

    if (isListening) {
      speechRecognitionService.stop();
      setIsListening(false);
      setSpeechStatus('idle');
      return;
    }

    if (isSpeakToSpeakListening) {
      speechRecognitionService.stop();
      setIsSpeakToSpeakListening(false);
    }

    setErrorMessage('');
    setIsListening(true);
    setSpeechStatus('listening');

    speechRecognitionService.start(
      activeSourceLang,
      (transcript) => {
        setIsListening(false);
        setSpeechStatus('idle');
        if (transcript && transcript.trim()) {
          setInputText(transcript.trim());
        }
      },
      (errorEvent) => {
        setIsListening(false);
        setSpeechStatus('idle');
        const errType = errorEvent?.error || errorEvent?.message || errorEvent;
        if (errType === 'not-allowed' || (typeof errType === 'string' && errType.includes('denied'))) {
          setErrorMessage('Microphone access was denied. Please allow microphone access in your browser settings.');
        } else if (errType === 'no-speech') {
          setErrorMessage('No speech detected. Please speak clearly into your microphone.');
        } else if (errType !== 'aborted') {
          setErrorMessage('Voice recognition encountered an issue. Please try again or type.');
        }
      },
      () => {
        setIsListening(false);
        setSpeechStatus('idle');
      }
    );
  };

  /**
   * 2. Speak-to-Speak Flow:
   * 🎤 User Speech (source) -> 📝 Speech-to-Text -> 🌐 Translation -> Target Text -> 🔊 Target Speech
   * Works bidirectionally for all supported language pairs.
   */
  const handleToggleSpeakToSpeak = () => {
    if (isSpeaking) {
      ttsService.stop();
      setIsSpeaking(false);
    }

    if (!speechRecognitionService.isSupported()) {
      setErrorMessage('Speech recognition is not supported in this browser. Please type your message.');
      return;
    }

    if (isSpeakToSpeakListening) {
      speechRecognitionService.stop();
      setIsSpeakToSpeakListening(false);
      setSpeechStatus('idle');
      return;
    }

    if (isListening) {
      speechRecognitionService.stop();
      setIsListening(false);
    }

    setErrorMessage('');
    setIsSpeakToSpeakListening(true);
    setSpeechStatus('listening');

    speechRecognitionService.start(
      activeSourceLang,
      async (transcript) => {
        setIsSpeakToSpeakListening(false);
        const cleanTranscript = (transcript || '').trim();
        if (!cleanTranscript) {
          setSpeechStatus('idle');
          return;
        }

        // 1 & 2. Display captured speech in input box
        setInputText(cleanTranscript);
        setSpeechStatus('translating');
        setIsLoading(true);

        try {
          // 3. Translate source text -> target language using existing translation system
          const translated = await performTranslation(cleanTranscript, activeSourceLang, activeTargetLang);

          // 4. Display the translated target-language text
          setOutputText(translated);
          setIsLoading(false);

          // 5. Automatically speak the translated target-language text
          if (translated) {
            setSpeechStatus('speaking');
            setIsSpeaking(true);
            ttsService.speak(
              translated,
              activeTargetLang,
              () => {
                setIsSpeaking(true);
                setSpeechStatus('speaking');
              },
              () => {
                setIsSpeaking(false);
                setSpeechStatus('idle');
              },
              (voiceError) => {
                setErrorMessage(voiceError);
                setIsSpeaking(false);
                setSpeechStatus('idle');
              }
            );
          } else {
            setSpeechStatus('idle');
          }
        } catch (err) {
          console.error('[Speak-to-Speak] Translation error:', err);
          setErrorMessage('Translation encountered an error. Please try again.');
          setIsLoading(false);
          setSpeechStatus('idle');
        }
      },
      (errorEvent) => {
        setIsSpeakToSpeakListening(false);
        setSpeechStatus('idle');
        const errType = errorEvent?.error || errorEvent?.message || errorEvent;
        if (errType === 'not-allowed' || (typeof errType === 'string' && errType.includes('denied'))) {
          setErrorMessage('Microphone access was denied. Please allow microphone access in your browser settings.');
        } else if (errType === 'no-speech') {
          setErrorMessage('No speech detected. Please speak clearly into your microphone.');
        } else if (errType !== 'aborted') {
          setErrorMessage('Voice recognition encountered an issue. Please try again or type.');
        }
      },
      () => {
        setIsSpeakToSpeakListening(false);
        setSpeechStatus((prev) => (prev === 'listening' ? 'idle' : prev));
      }
    );
  };

  /**
   * 3. Speak Translated Output Button:
   * Speaks output text in the active target language.
   * If clicked while speaking, stops previous speech and speaks latest output.
   */
  const handleSpeakOutput = () => {
    const textToSpeak = (outputText || '').trim();
    if (!textToSpeak) return;

    setErrorMessage('');
    setIsSpeaking(true);
    setSpeechStatus('speaking');

    // ttsService.speak stops any ongoing speech first (window.speechSynthesis.cancel()),
    // then immediately speaks latest output in activeTargetLang.
    ttsService.speak(
      textToSpeak,
      activeTargetLang,
      () => {
        setIsSpeaking(true);
        setSpeechStatus('speaking');
      },
      () => {
        setIsSpeaking(false);
        setSpeechStatus('idle');
      },
      (voiceError) => {
        setErrorMessage(voiceError);
        setIsSpeaking(false);
        setSpeechStatus('idle');
      }
    );
  };

  const handleCopy = async () => {
    if (!outputText) return;
    try {
      await navigator.clipboard.writeText(outputText);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const handleClear = () => {
    speechRecognitionService.stop();
    ttsService.stop();
    setIsListening(false);
    setIsSpeakToSpeakListening(false);
    setIsSpeaking(false);
    setSpeechStatus('idle');
    setInputText('');
    setOutputText('');
    setErrorMessage('');
  };

  const hasInputText = Boolean(inputText && inputText.trim());

  return (
    <div className="bg-white dark:bg-[#0f1d17] rounded-2xl shadow-sm dark:shadow-xl border border-slate-200/80 dark:border-emerald-900/40 p-5 sm:p-6 transition-colors duration-200">
      {/* Header with Title and AI Offline Badge */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-100 dark:border-emerald-900/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-forest-50 dark:bg-emerald-950/80 border border-forest-200 dark:border-emerald-700/40 flex items-center justify-center text-forest-800 dark:text-emerald-400 shadow-inner">
            <Globe2 className="w-5 h-5 text-forest-800 dark:text-emerald-400" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              Offline AI Translator
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Translate naturally and communicate with your guests, even with limited connectivity.
            </p>
          </div>
        </div>
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/40 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            AI OFFLINE READY
          </span>
        </div>
      </div>

      {/* Language Selector: FROM [Lang] ⇄ TO [Lang] */}
      <div className="grid grid-cols-1 sm:grid-cols-[1fr,auto,1fr] items-center gap-2.5 sm:gap-3 mb-4">
        <div>
          <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
            FROM:
          </label>
          <select
            value={activeSourceLang}
            onChange={(e) => handleSourceLangChange(e.target.value)}
            className="w-full bg-slate-50 dark:bg-[#0b1612] hover:bg-slate-100 dark:hover:bg-[#12221b] text-slate-900 dark:text-slate-100 font-semibold text-sm rounded-xl px-3.5 py-2.5 border border-slate-200 dark:border-emerald-900/50 focus:outline-none focus:ring-2 focus:ring-forest-700 dark:focus:ring-emerald-500 transition-colors cursor-pointer"
          >
            {LANGUAGES.map((lang) => (
              <option key={`src-${lang.code}`} value={lang.code}>
                {lang.label} ({lang.native})
              </option>
            ))}
          </select>
        </div>

        <div className="pt-0 sm:pt-5 flex justify-center">
          <button
            type="button"
            onClick={handleSwapLanguages}
            title="Swap Languages"
            aria-label="Swap Languages"
            className="p-2.5 rounded-xl border border-slate-200 dark:border-emerald-900/50 hover:border-slate-300 dark:hover:border-emerald-600 bg-white dark:bg-[#13231c] hover:bg-slate-50 dark:hover:bg-[#1a3528] text-slate-700 dark:text-emerald-300 active:scale-95 transition-all shadow-xs flex items-center justify-center cursor-pointer min-h-[42px] min-w-[42px]"
          >
            <ArrowLeftRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
            TO:
          </label>
          <select
            value={activeTargetLang}
            onChange={(e) => handleTargetLangChange(e.target.value)}
            className="w-full bg-slate-50 dark:bg-[#0b1612] hover:bg-slate-100 dark:hover:bg-[#12221b] text-slate-900 dark:text-slate-100 font-semibold text-sm rounded-xl px-3.5 py-2.5 border border-slate-200 dark:border-emerald-900/50 focus:outline-none focus:ring-2 focus:ring-forest-700 dark:focus:ring-emerald-500 transition-colors cursor-pointer"
          >
            {LANGUAGES.map((lang) => (
              <option key={`tgt-${lang.code}`} value={lang.code}>
                {lang.label} ({lang.native})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Large Text Input with [ 🎤 Speak ] and Clear */}
      <div className="mb-4">
        <div className="relative">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type what you want to say to your guest... (e.g. Can I have another blanket?)"
            rows={4}
            className="w-full p-4 pb-12 text-slate-900 dark:text-slate-100 text-sm font-medium bg-slate-50/60 dark:bg-[#0b1612] border border-slate-200 dark:border-emerald-900/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-forest-700 dark:focus:ring-emerald-500 resize-y placeholder-slate-400 dark:placeholder-slate-500 leading-relaxed transition-colors shadow-inner"
          />

          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              {/* 🎤 Speak-to-Text Button */}
              <button
                type="button"
                onClick={handleToggleSpeechToText}
                title="Dictate speech into input box"
                className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 sm:px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                  isListening
                    ? 'bg-rose-50 dark:bg-rose-950/90 text-rose-600 dark:text-rose-300 border-rose-300 dark:border-rose-500 animate-pulse shadow-md'
                    : 'bg-white dark:bg-[#13231c] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-emerald-900/40 hover:bg-slate-50 dark:hover:bg-[#1a3528]'
                }`}
              >
                {isListening ? (
                  <>
                    <Square className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" aria-hidden="true" />
                    <span>Listening...</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-3.5 h-3.5 text-forest-800 dark:text-emerald-400" aria-hidden="true" />
                    <span>🎤 Speak-to-Text</span>
                  </>
                )}
              </button>

              {/* 🗣️ Speak-to-Speak Button */}
              <button
                type="button"
                onClick={handleToggleSpeakToSpeak}
                title="Speak in source language and hear automatic target translation"
                className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 sm:px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                  isSpeakToSpeakListening
                    ? 'bg-rose-50 dark:bg-rose-950/90 text-rose-600 dark:text-rose-300 border-rose-300 dark:border-rose-500 animate-pulse shadow-md'
                    : speechStatus === 'translating'
                    ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-600'
                    : speechStatus === 'speaking'
                    ? 'bg-amber-50 dark:bg-amber-950/90 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-500 animate-pulse shadow-md'
                    : 'bg-emerald-50/80 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/70'
                }`}
              >
                {isSpeakToSpeakListening ? (
                  <>
                    <Square className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" aria-hidden="true" />
                    <span>Listening...</span>
                  </>
                ) : speechStatus === 'translating' ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                    </svg>
                    <span>Translating...</span>
                  </>
                ) : speechStatus === 'speaking' ? (
                  <>
                    <Volume2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                    <span>Speaking...</span>
                  </>
                ) : (
                  <>
                    <span className="text-sm">🗣️</span>
                    <span>Speak-to-Speak</span>
                  </>
                )}
              </button>
            </div>

            {inputText && (
              <button
                type="button"
                onClick={handleClear}
                className="text-xs font-medium text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 px-2 py-1 transition-colors cursor-pointer"
              >
                Clear text
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Large Full-Width Green Translate Button */}
      <div className="mb-5">
        <button
          type="button"
          onClick={handleTranslateClick}
          disabled={isLoading || !hasInputText}
          className={`w-full py-3.5 px-4 font-extrabold text-sm sm:text-base rounded-xl transition-all flex items-center justify-center gap-2 border min-h-[48px] ${
            !hasInputText
              ? 'bg-slate-200 dark:bg-[#13231c] text-slate-400 dark:text-slate-500 border-slate-300/40 dark:border-emerald-950 cursor-not-allowed opacity-60 shadow-none'
              : isLoading
              ? 'bg-emerald-700/80 dark:bg-emerald-700/80 text-white border-transparent cursor-wait shadow-md'
              : 'bg-emerald-700 hover:bg-emerald-800 dark:bg-gradient-to-r dark:from-emerald-600 dark:to-forest-700 dark:hover:from-emerald-500 dark:hover:to-forest-600 text-white shadow-md active:scale-[0.99] border-transparent dark:border-emerald-500/30 cursor-pointer'
          }`}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
              <span>Translating...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-amber-300 dark:text-amberGold" aria-hidden="true" />
              <span>✨ Translate</span>
            </>
          )}
        </button>
      </div>

      {/* Error / Notice State */}
      {errorMessage && (
        <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-600/50 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2 shadow-sm">
          <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex-1 font-medium">{errorMessage}</div>
        </div>
      )}

      {/* TRANSLATION RESULT CARD + ACTION BUTTONS */}
      {outputText && (
        <div className="p-4 sm:p-5 rounded-xl bg-slate-50 dark:bg-[#0b1612] border border-slate-200 dark:border-emerald-900/50 shadow-sm transition-all space-y-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold tracking-wider text-emerald-800 dark:text-emerald-400 uppercase">
              TRANSLATION ({activeTargetLang.toUpperCase()})
            </span>
          </div>

          <div className="text-slate-900 dark:text-slate-50 text-base sm:text-lg font-bold min-h-[44px] whitespace-pre-wrap leading-relaxed select-text p-3 bg-white dark:bg-[#13231c] rounded-xl border border-slate-200/70 dark:border-emerald-900/40">
            {outputText}
          </div>

          {/* Action Buttons: [🔊 Speak] [Copy] */}
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-200/60 dark:border-emerald-900/30">
            <button
              type="button"
              onClick={handleSpeakOutput}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer min-h-[36px] ${
                isSpeaking
                  ? 'bg-amber-600 hover:bg-amber-700 text-white animate-pulse'
                  : 'bg-emerald-700 hover:bg-emerald-800 text-white'
              }`}
            >
              <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{isSpeaking ? '🔊 Speaking...' : '🔊 Speak'}</span>
            </button>

            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-[#13231c] border border-slate-200 dark:border-emerald-900/50 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#1a3528] shadow-xs transition-colors cursor-pointer min-h-[36px]"
            >
              {copySuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                  <span>Copied ✓</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
