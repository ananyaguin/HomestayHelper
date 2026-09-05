import React, { useState, useEffect } from 'react';
import { translationService } from '../services/translation';
import { speechRecognitionService } from '../services/speechRecognition';
import { ttsService } from '../services/tts';
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

export default function OfflineTranslator() {
  const [sourceLang, setSourceLang] = useState('en');
  const [targetLang, setTargetLang] = useState('ne');
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [aiStatus, setAiStatus] = useState({
    status: 'UNAVAILABLE',
    message: 'Local AI translation model is not available yet.'
  });

  useEffect(() => {
    // Subscribe to translation service status
    const unsubscribe = translationService.onStatusChange((status) => {
      setAiStatus(status);
    });
    return () => unsubscribe();
  }, []);

  const handleSwapLanguages = () => {
    const temp = sourceLang;
    setSourceLang(targetLang);
    setTargetLang(temp);
    // Also swap text if both exist
    if (outputText && !errorMessage) {
      setInputText(outputText);
      setOutputText(inputText);
    }
  };

  const handleTranslate = async () => {
    if (!inputText.trim()) {
      setErrorMessage('Please enter text to translate.');
      return;
    }

    setErrorMessage('');
    setIsLoading(true);

    try {
      const result = await translationService.translateText(
        inputText.trim(),
        sourceLang,
        targetLang
      );
      setOutputText(result);
    } catch (err) {
      setErrorMessage(err.message || 'Translation failed');
      setOutputText('');
    } finally {
      setIsLoading(false);
    }
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
      sourceLang,
      (transcript) => {
        setInputText((prev) => (prev ? `${prev} ${transcript}` : transcript));
      },
      (error) => {
        setErrorMessage(error);
        setIsListening(false);
      },
      () => {
        setIsListening(false);
      }
    );
  };

  const handleSpeakOutput = () => {
    if (!outputText) return;
    ttsService.speak(outputText, targetLang);
  };

  const handleCopy = async () => {
    if (!outputText) return;
    try {
      await navigator.clipboard.writeText(outputText);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleClear = () => {
    setInputText('');
    setOutputText('');
    setErrorMessage('');
  };

  const getStatusBadge = () => {
    if (aiStatus.status === 'READY') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/40 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse"></span>
          AI READY
        </span>
      );
    }
    if (aiStatus.status === 'LOADING') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/40 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-amber-500 dark:bg-amber-400 animate-pulse"></span>
          LOADING AI MODEL
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-900/80 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 shadow-sm">
        <span className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-500"></span>
        AI UNAVAILABLE
      </span>
    );
  };

  return (
    <div className="bg-white dark:bg-[#0f1d17] rounded-2xl shadow-sm dark:shadow-xl border border-slate-200/80 dark:border-emerald-900/40 p-5 md:p-6 mb-6 transition-colors duration-200">
      {/* Header with Title and AI Model Status */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-100 dark:border-emerald-900/30">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-forest-50 dark:bg-emerald-950/80 border border-forest-200 dark:border-emerald-700/40 flex items-center justify-center text-forest-800 dark:text-emerald-400 shadow-inner">
            <Globe2 className="w-5 h-5 text-forest-800 dark:text-emerald-400" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight">Offline AI Translator</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Local on-device translation engine</p>
          </div>
        </div>
        <div>
          {getStatusBadge()}
        </div>
      </div>

      {/* Language Selection Row */}
      <div className="grid grid-cols-[1fr,auto,1fr] items-center gap-2 mb-4">
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
            FROM
          </label>
          <select
            value={sourceLang}
            onChange={(e) => setSourceLang(e.target.value)}
            className="w-full bg-slate-50 dark:bg-[#0b1612] hover:bg-slate-100 dark:hover:bg-[#12221b] text-slate-800 dark:text-slate-200 font-medium text-sm rounded-xl px-3 py-2.5 border border-slate-200 dark:border-emerald-900/50 focus:outline-none focus:ring-2 focus:ring-forest-700 dark:focus:ring-emerald-500 transition-colors"
          >
            {LANGUAGES.map((lang) => (
              <option key={`src-${lang.code}`} value={lang.code} className="bg-white dark:bg-[#0b1612] text-slate-800 dark:text-slate-200">
                {lang.label} ({lang.native})
              </option>
            ))}
          </select>
        </div>

        <div className="pt-6 flex justify-center">
          <button
            type="button"
            onClick={handleSwapLanguages}
            aria-label="Swap Languages"
            className="p-2.5 rounded-xl border border-slate-200 dark:border-emerald-900/50 hover:border-slate-300 dark:hover:border-emerald-600 bg-white dark:bg-[#13231c] hover:bg-slate-50 dark:hover:bg-[#1a3528] text-slate-600 dark:text-emerald-300 active:scale-95 transition-all shadow-sm flex items-center justify-center cursor-pointer"
          >
            <ArrowLeftRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
            TO
          </label>
          <select
            value={targetLang}
            onChange={(e) => setTargetLang(e.target.value)}
            className="w-full bg-slate-50 dark:bg-[#0b1612] hover:bg-slate-100 dark:hover:bg-[#12221b] text-slate-800 dark:text-slate-200 font-medium text-sm rounded-xl px-3 py-2.5 border border-slate-200 dark:border-emerald-900/50 focus:outline-none focus:ring-2 focus:ring-forest-700 dark:focus:ring-emerald-500 transition-colors"
          >
            {LANGUAGES.map((lang) => (
              <option key={`tgt-${lang.code}`} value={lang.code} className="bg-white dark:bg-[#0b1612] text-slate-800 dark:text-slate-200">
                {lang.label} ({lang.native})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Input Area */}
      <div className="mb-4">
        <div className="relative">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type your message..."
            rows={4}
            className="w-full p-3.5 pb-10 text-slate-800 dark:text-slate-100 text-sm bg-slate-50/50 dark:bg-[#0b1612] border border-slate-200 dark:border-emerald-900/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-forest-700 dark:focus:ring-emerald-500 resize-y placeholder-slate-400 dark:placeholder-slate-500 leading-relaxed transition-colors"
          />

          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
            <button
              type="button"
              onClick={handleToggleSpeech}
              className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer ${
                isListening
                  ? 'bg-rose-50 dark:bg-rose-950/90 text-rose-600 dark:text-rose-300 border-rose-300 dark:border-rose-500 animate-pulse shadow-md shadow-rose-950'
                  : 'bg-white dark:bg-[#13231c] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-emerald-900/40 hover:bg-slate-50 dark:hover:bg-[#1a3528]'
              }`}
            >
              {isListening ? (
                <Square className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" aria-hidden="true" />
              ) : (
                <Mic className="w-3.5 h-3.5 text-slate-600 dark:text-emerald-400" aria-hidden="true" />
              )}
              <span>{isListening ? 'Listening...' : 'Speak'}</span>
            </button>

            {inputText && (
              <button
                type="button"
                onClick={() => setInputText('')}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-2 py-1 transition-colors cursor-pointer"
              >
                Clear input
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Action Row: Translate Button */}
      <div className="mb-4">
        <button
          type="button"
          onClick={handleTranslate}
          disabled={isLoading || !inputText.trim()}
          className="w-full py-3 px-4 bg-forest-800 hover:bg-forest-700 dark:bg-gradient-to-r dark:from-emerald-600 dark:to-forest-700 dark:hover:from-emerald-500 dark:hover:to-forest-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-md dark:shadow-lg transition-all flex items-center justify-center gap-2 active:scale-[0.99] border border-transparent dark:border-emerald-500/30 cursor-pointer"
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
              <span>Translate</span>
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

      {/* Output / Result Card */}
      {(outputText || errorMessage) && (
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0b1612] border border-slate-200 dark:border-emerald-900/50 shadow-inner transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold tracking-wider text-slate-400 dark:text-emerald-400/90 uppercase">
              TRANSLATION
            </span>
            <div className="flex items-center gap-2">
              {outputText && (
                <>
                  <button
                    type="button"
                    onClick={handleSpeakOutput}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-white dark:bg-[#13231c] border border-slate-200 dark:border-emerald-900/50 text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#1a3528] shadow-sm transition-colors cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-forest-800 dark:text-amberGold" aria-hidden="true" />
                    <span>Speak</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-white dark:bg-[#13231c] border border-slate-200 dark:border-emerald-900/50 text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#1a3528] shadow-sm transition-colors cursor-pointer"
                  >
                    {copySuccess ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" aria-hidden="true" />
                    )}
                    <span>{copySuccess ? 'Copied' : 'Copy'}</span>
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={handleClear}
                className="inline-flex items-center px-2 py-1 text-xs font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="text-slate-800 dark:text-slate-100 text-base font-medium min-h-[48px] whitespace-pre-wrap leading-relaxed">
            {outputText || (
              <span className="text-slate-400 dark:text-slate-500 italic font-normal text-sm">
                No translation available yet.
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
