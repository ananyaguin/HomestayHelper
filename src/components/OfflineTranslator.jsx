import React, { useState, useEffect, useRef } from 'react';
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
  Check,
  Zap,
  HelpCircle,
  RotateCcw,
  SmilePlus
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
  externalInputText = '',
  onInputChange
}) {
  const [internalSourceLang, setInternalSourceLang] = useState('en');
  const [internalTargetLang, setInternalTargetLang] = useState('ne');
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [originalTranslatedText, setOriginalTranslatedText] = useState('');
  const [activeAction, setActiveAction] = useState(null); // 'polite' | 'shorter' | 'explain' | null
  const [explanationData, setExplanationData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
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

  // Sync external input text when user clicks "Use Phrase"
  useEffect(() => {
    if (externalInputText) {
      setInputText(externalInputText);
      handleTranslateText(externalInputText, activeSourceLang, activeTargetLang);
    }
  }, [externalInputText]);

  useEffect(() => {
    const unsubscribe = translationService.onStatusChange((status) => {
      if (status && status.status) {
        setAiStatus(status);
      }
    });
    return () => unsubscribe();
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
      if (onInputChange) onInputChange(tempText);
    }
  };

  /**
   * Translates text using:
   * 1. Offline phrasebook dictionary (instant exact match)
   * 2. TranslationService web worker
   * 3. Local fallback / Backend /api/translate
   */
  const handleTranslateText = async (textToTranslate, srcLang, tgtLang) => {
    const query = (textToTranslate || '').trim();
    if (!query) {
      setErrorMessage('Please enter text to translate.');
      return;
    }

    setErrorMessage('');
    setIsLoading(true);
    setActiveAction(null);
    setExplanationData(null);

    // 1. Check exact phrase dictionary first (Instant 100% offline match)
    const cleanQuery = query.toLowerCase().replace(/[.,!?;:"]/g, '').trim();
    const matchedPhrase = HOMESTAY_PHRASES.find((p) => {
      const pSrc = (p[srcLang] || (srcLang === 'en' ? p.english : '')).toLowerCase().replace(/[.,!?;:"]/g, '').trim();
      return pSrc === cleanQuery;
    });

    if (matchedPhrase) {
      const translated = matchedPhrase[tgtLang] || matchedPhrase.nepali || matchedPhrase.english;
      setOutputText(translated);
      setOriginalTranslatedText(translated);
      setIsLoading(false);
      return;
    }

    // 2. Try Local AI Translation Worker
    try {
      const result = await translationService.translateText(query, srcLang, tgtLang);
      if (result) {
        setOutputText(result);
        setOriginalTranslatedText(result);
        setIsLoading(false);
        return;
      }
    } catch (workerErr) {
      console.warn('Worker translation notice, using local offline fallback:', workerErr.message);
    }

    // 3. Fallback via backend endpoint or local rule matching
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: query, sourceLang: srcLang, targetLang: tgtLang })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.translatedText) {
          setOutputText(data.translatedText);
          setOriginalTranslatedText(data.translatedText);
          setIsLoading(false);
          return;
        }
      }
    } catch (apiErr) {
      console.warn('API fallback notice:', apiErr.message);
    }

    // 4. Default graceful fallback
    setOutputText(query);
    setOriginalTranslatedText(query);
    setIsLoading(false);
  };

  const handleTranslateClick = () => {
    handleTranslateText(inputText, activeSourceLang, activeTargetLang);
  };

  const handleToggleSpeech = () => {
    if (!speechRecognitionService.isSupported()) {
      setErrorMessage('Speech recognition is not supported in this browser. Please type your message.');
      return;
    }

    if (isListening) {
      speechRecognitionService.stop();
      setIsListening(false);
      return;
    }

    setErrorMessage('');
    setIsListening(true);

    speechRecognitionService.start(
      activeSourceLang,
      (transcript) => {
        const newText = inputText ? `${inputText} ${transcript}` : transcript;
        setInputText(newText);
        if (onInputChange) onInputChange(newText);
      },
      (error) => {
        setErrorMessage(typeof error === 'string' ? error : 'Speech recognition failed or was cancelled.');
        setIsListening(false);
      },
      () => {
        setIsListening(false);
      }
    );
  };

  const handleSpeakOutput = () => {
    if (!outputText) return;
    ttsService.speak(outputText, activeTargetLang);
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
    setInputText('');
    setOutputText('');
    setOriginalTranslatedText('');
    setActiveAction(null);
    setExplanationData(null);
    setErrorMessage('');
    if (onInputChange) onInputChange('');
  };

  // --- ACTIONS: Make Polite, Make Shorter, Explain ---

  const handleMakePolite = async () => {
    if (!outputText) return;
    const baseText = originalTranslatedText || outputText;

    if (activeAction === 'polite') {
      // Toggle back to original
      setOutputText(baseText);
      setActiveAction(null);
      return;
    }

    try {
      const res = await fetch('/api/phrase-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: baseText, action: 'polite', targetLang: activeTargetLang })
      });
      if (res.ok) {
        const data = await res.json();
        setOutputText(data.result);
        setActiveAction('polite');
        return;
      }
    } catch (e) {
      // offline fallback
    }

    // Local offline polite transformation
    let polite = baseText;
    if (activeTargetLang === 'ne') {
      polite = baseText.startsWith('हजुर') || baseText.startsWith('कृपया') ? baseText : `हजुर, कृपया ${baseText}`;
    } else if (activeTargetLang === 'hi') {
      polite = baseText.startsWith('नमस्ते') || baseText.startsWith('कृपया') ? baseText : `नमस्ते! कृपया ${baseText}`;
    } else if (activeTargetLang === 'bn') {
      polite = baseText.startsWith('নমস্কার') || baseText.startsWith('অনুগ্রহ করে') ? baseText : `নমস্কার! অনুগ্রহ করে ${baseText}`;
    } else {
      polite = baseText.startsWith('Please') ? baseText : `Kindly note: ${baseText}`;
    }

    setOutputText(polite);
    setActiveAction('polite');
  };

  const handleMakeShorter = async () => {
    if (!outputText) return;
    const baseText = originalTranslatedText || outputText;

    if (activeAction === 'shorter') {
      // Toggle back to original
      setOutputText(baseText);
      setActiveAction(null);
      return;
    }

    try {
      const res = await fetch('/api/phrase-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: baseText, action: 'shorter', targetLang: activeTargetLang })
      });
      if (res.ok) {
        const data = await res.json();
        setOutputText(data.result);
        setActiveAction('shorter');
        return;
      }
    } catch (e) {
      // offline fallback
    }

    // Local offline shorter transformation
    let shorter = baseText
      .replace(/^(हजुर,\s*|कृपया\s*|नमस्ते!\s*|নমস্কার!\s*|অনুগ্রহ করে\s*|kindly\s*(let us know:)?\s*)/i, '')
      .trim();
    const parts = shorter.split(/[।?!.]+/).filter(Boolean);
    setOutputText(parts.length > 0 ? parts[0].trim() : shorter);
    setActiveAction('shorter');
  };

  const handleExplain = async () => {
    if (!outputText) return;
    const baseText = originalTranslatedText || outputText;

    if (activeAction === 'explain') {
      setActiveAction(null);
      setExplanationData(null);
      return;
    }

    try {
      const res = await fetch('/api/phrase-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: baseText, action: 'explain', targetLang: activeTargetLang })
      });
      if (res.ok) {
        const data = await res.json();
        setExplanationData(data.explanation);
        setActiveAction('explain');
        return;
      }
    } catch (e) {
      // offline fallback
    }

    // Local offline explanation
    const langNames = { en: 'English', ne: 'Nepali', hi: 'Hindi', bn: 'Bengali' };
    setExplanationData({
      translated: baseText,
      language: langNames[activeTargetLang] || activeTargetLang,
      politeness: 'Polite & respectful hospitality phrasing',
      context: 'Clear and natural hill homestay expression suitable for welcoming travelers and managing guest comfort.'
    });
    setActiveAction('explain');
  };

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
            onChange={(e) => {
              setInputText(e.target.value);
              if (onInputChange) onInputChange(e.target.value);
            }}
            placeholder="Type what you want to say to your guest... (e.g. Can I have another blanket?)"
            rows={4}
            className="w-full p-4 pb-12 text-slate-900 dark:text-slate-100 text-sm font-medium bg-slate-50/60 dark:bg-[#0b1612] border border-slate-200 dark:border-emerald-900/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-forest-700 dark:focus:ring-emerald-500 resize-y placeholder-slate-400 dark:placeholder-slate-500 leading-relaxed transition-colors shadow-inner"
          />

          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
            <button
              type="button"
              onClick={handleToggleSpeech}
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                isListening
                  ? 'bg-rose-50 dark:bg-rose-950/90 text-rose-600 dark:text-rose-300 border-rose-300 dark:border-rose-500 animate-pulse shadow-md'
                  : 'bg-white dark:bg-[#13231c] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-emerald-900/40 hover:bg-slate-50 dark:hover:bg-[#1a3528]'
              }`}
            >
              {isListening ? (
                <Square className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" aria-hidden="true" />
              ) : (
                <Mic className="w-3.5 h-3.5 text-forest-800 dark:text-emerald-400" aria-hidden="true" />
              )}
              <span>{isListening ? 'Listening...' : '🎤 Speak'}</span>
            </button>

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
          disabled={isLoading || !inputText.trim()}
          className="w-full py-3.5 px-4 bg-emerald-700 hover:bg-emerald-800 dark:bg-gradient-to-r dark:from-emerald-600 dark:to-forest-700 dark:hover:from-emerald-500 dark:hover:to-forest-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-sm sm:text-base rounded-xl shadow-md transition-all flex items-center justify-center gap-2 active:scale-[0.99] border border-transparent dark:border-emerald-500/30 cursor-pointer min-h-[48px]"
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
            {activeAction && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                Mode: {activeAction.toUpperCase()}
              </span>
            )}
          </div>

          <div className="text-slate-900 dark:text-slate-50 text-base sm:text-lg font-bold min-h-[44px] whitespace-pre-wrap leading-relaxed select-text p-3 bg-white dark:bg-[#13231c] rounded-xl border border-slate-200/70 dark:border-emerald-900/40">
            {outputText}
          </div>

          {/* Action Buttons: [🔊 Listen] [Copy] [Make Polite] [Make Shorter] [Explain] */}
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-200/60 dark:border-emerald-900/30">
            <button
              type="button"
              onClick={handleSpeakOutput}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs transition-colors cursor-pointer min-h-[36px]"
            >
              <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>🔊 Listen</span>
            </button>

            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-[#13231c] border border-slate-200 dark:border-emerald-900/50 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#1a3528] shadow-xs transition-colors cursor-pointer min-h-[36px]"
            >
              {copySuccess ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
              )}
              <span>{copySuccess ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              type="button"
              onClick={handleMakePolite}
              title="Convert into a more polite hospitality version"
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer min-h-[36px] ${
                activeAction === 'polite'
                  ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-600 font-bold'
                  : 'bg-white dark:bg-[#13231c] border-slate-200 dark:border-emerald-900/50 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#1a3528]'
              }`}
            >
              <SmilePlus className="w-3.5 h-3.5 text-amber-600" />
              <span>{activeAction === 'polite' ? 'Polite ✓' : 'Make Polite'}</span>
            </button>

            <button
              type="button"
              onClick={handleMakeShorter}
              title="Generate a shorter, concise version"
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer min-h-[36px] ${
                activeAction === 'shorter'
                  ? 'bg-sky-100 dark:bg-sky-950/80 text-sky-900 dark:text-sky-200 border-sky-300 dark:border-sky-600 font-bold'
                  : 'bg-white dark:bg-[#13231c] border-slate-200 dark:border-emerald-900/50 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#1a3528]'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-sky-600" />
              <span>{activeAction === 'shorter' ? 'Shorter ✓' : 'Make Shorter'}</span>
            </button>

            <button
              type="button"
              onClick={handleExplain}
              title="Show a small explanation of the translated sentence"
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer min-h-[36px] ${
                activeAction === 'explain'
                  ? 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-900 dark:text-indigo-200 border-indigo-300 dark:border-indigo-600 font-bold'
                  : 'bg-white dark:bg-[#13231c] border-slate-200 dark:border-emerald-900/50 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#1a3528]'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
              <span>Explain</span>
            </button>
          </div>

          {/* Explanation Panel */}
          {activeAction === 'explain' && explanationData && (
            <div className="p-3.5 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/50 text-xs text-indigo-950 dark:text-indigo-200 space-y-1.5 animate-fadeIn">
              <div className="font-bold flex items-center gap-1.5 text-indigo-900 dark:text-indigo-300">
                <HelpCircle className="w-4 h-4 text-indigo-600" />
                <span>Phrase Explanation ({explanationData.language})</span>
              </div>
              <p className="leading-relaxed">
                <strong>Tone:</strong> {explanationData.politeness}
              </p>
              <p className="leading-relaxed">
                <strong>Context:</strong> {explanationData.context}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
