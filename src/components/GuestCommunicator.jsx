import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { PHRASE_CATEGORIES, HOMESTAY_PHRASES } from '../data/phrases';
import { ttsService } from '../services/tts';
import { speechRecognitionService } from '../services/speechRecognition';
import { translationService } from '../services/translation';
import OfflineTranslator from './OfflineTranslator';
import {
  Volume2,
  VolumeX,
  Copy,
  Check,
  ArrowUpRight,
  ArrowLeft
} from 'lucide-react';

export default function GuestCommunicator() {
  const [activeCategoryView, setActiveCategoryView] = useState(null); // null = grid, or 'welcome', 'food-tea', etc.
  const [sourceLang, setSourceLang] = useState('en');
  const [targetLang, setTargetLang] = useState('ne');
  const [selectedPhrase, setSelectedPhrase] = useState('');
  const [activeSpeakingId, setActiveSpeakingId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const translatorRef = useRef(null);

  // Manage translation worker lifecycle and speech cleanup on unmount
  useEffect(() => {
    translationService.acquire();

    return () => {
      speechRecognitionService.stopListening();
      ttsService.stop();
      translationService.release();
    };
  }, []);

  // Active Category Object when viewing a specific category
  const currentCategory = useMemo(() => {
    return activeCategoryView
      ? PHRASE_CATEGORIES.find((c) => c.id === activeCategoryView) || PHRASE_CATEGORIES[0]
      : null;
  }, [activeCategoryView]);

  // Phrases for the active category view
  const categoryPhrases = useMemo(() => {
    return activeCategoryView
      ? HOMESTAY_PHRASES.filter(
          (p) => p.categoryId === activeCategoryView || p.category.toLowerCase() === currentCategory?.name.toLowerCase()
        )
      : [];
  }, [activeCategoryView, currentCategory]);

  const getLanguageNativeLabel = useCallback((code) => {
    switch (code) {
      case 'ne':
        return 'नेपाली (Nepali)';
      case 'hi':
        return 'हिन्दी (Hindi)';
      case 'bn':
        return 'বাংলা (Bengali)';
      default:
        return 'English';
    }
  }, []);

  /**
   * Speak phrase in the guest's selected target language (Section 7)
   */
  const handleSpeakPhrase = useCallback((phrase) => {
    const textToSpeak = targetLang === 'en' ? phrase.english : (phrase[targetLang] || phrase.nepali || phrase.english);

    if (activeSpeakingId === phrase.id) {
      ttsService.stop();
      setActiveSpeakingId(null);
      return;
    }

    setActiveSpeakingId(phrase.id);
    ttsService.speak(
      textToSpeak,
      targetLang,
      () => setActiveSpeakingId(phrase.id),
      () => setActiveSpeakingId(null)
    );
  }, [targetLang, activeSpeakingId]);

  // Copy phrase translation
  const handleCopyPhrase = useCallback(async (phrase) => {
    const textToCopy = targetLang === 'en' ? phrase.english : (phrase[targetLang] || phrase.nepali || phrase.english);
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedId(phrase.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (e) {
      console.error('Failed to copy phrase:', e);
    }
  }, [targetLang]);

  /**
   * Put phrase into the main translator input without auto-translating, and scroll up smoothly
   */
  const handleUsePhrase = useCallback((phrase) => {
    setSelectedPhrase(phrase.english);
    if (translatorRef.current) {
      translatorRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 animate-fadeIn">
      {/* ======================================================== */}
      {/* PART A: INTERACTIVE AI TRANSLATOR AT THE TOP             */}
      {/* ======================================================== */}
      <div ref={translatorRef}>
        <OfflineTranslator
          sourceLang={sourceLang}
          setSourceLang={setSourceLang}
          targetLang={targetLang}
          setTargetLang={setTargetLang}
          externalInputText={selectedPhrase}
        />
      </div>

      {/* ======================================================== */}
      {/* PART B: QUICK HOSPITALITY PHRASES (NATURE BACKGROUND)    */}
      {/* Nature background ONLY behind this section               */}
      {/* ======================================================== */}
      <div className="relative rounded-2xl overflow-hidden border border-emerald-900/20 dark:border-emerald-900/40 shadow-sm dark:shadow-xl transition-all p-5 sm:p-7">
        {/* Subtle, faded nature background layer */}
        <div
          className="absolute inset-0 bg-cover bg-center pointer-events-none opacity-20 dark:opacity-15"
          style={{ backgroundImage: `url('/images/tea_garden_bg.jpg')` }}
        />
        {/* Soft translucent overlay for maximum readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/90 via-emerald-50/80 to-white/95 dark:from-[#0f1d17]/92 dark:via-[#0c1a14]/92 dark:to-[#0f1d17]/96 pointer-events-none" />

        {/* Foreground Content */}
        <div className="relative z-10 space-y-5">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-emerald-900/10 dark:border-emerald-900/30 gap-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">🌿</span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                  Quick Hospitality Phrases
                </h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Tap a category to quickly find useful phrases for your guests.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-white/80 dark:bg-[#0b1612]/90 backdrop-blur-xs text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-emerald-900/40 flex items-center gap-1.5 shadow-2xs">
                <span>Guest Language:</span>
                <strong className="text-emerald-700 dark:text-emerald-400">
                  {targetLang.toUpperCase()} ({getLanguageNativeLabel(targetLang)})
                </strong>
              </span>
            </div>
          </div>

          {/* ---------------------------------------------------- */}
          {/* VIEW 1: COMPACT RESPONSIVE CATEGORY GRID / BOXES     */}
          {/* (Shown when activeCategoryView is null)              */}
          {/* ---------------------------------------------------- */}
          {!activeCategoryView ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 pt-1">
              {PHRASE_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategoryView(cat.id)}
                  className="p-4 rounded-xl bg-white/90 dark:bg-[#13231c]/90 backdrop-blur-sm border border-slate-200/80 dark:border-emerald-800/40 hover:border-emerald-600 dark:hover:border-emerald-500 hover:shadow-md transition-all text-center group cursor-pointer active:scale-98 flex flex-col items-center justify-center min-h-[110px]"
                >
                  <div className="text-2xl mb-1.5 group-hover:scale-110 transition-transform duration-150">
                    {cat.icon}
                  </div>
                  <div className="text-xs font-extrabold uppercase tracking-wide text-slate-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                    {cat.name}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {cat.subtitle}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            /* ---------------------------------------------------- */
            /* VIEW 2: DEDICATED SHORT CATEGORY PHRASES VIEW        */
            /* (Shown when user clicks a category card)             */
            /* ---------------------------------------------------- */
            <div className="space-y-4 pt-1 animate-fadeIn">
              {/* Back Button & Category Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-emerald-900/10 dark:border-emerald-900/30">
                <button
                  type="button"
                  onClick={() => setActiveCategoryView(null)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300 hover:text-emerald-900 dark:hover:text-emerald-200 px-3 py-1.5 rounded-lg bg-white/80 dark:bg-[#13231c]/80 backdrop-blur-xs border border-emerald-200/80 dark:border-emerald-800/50 shadow-2xs hover:bg-white dark:hover:bg-[#182e25] transition-all cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Hospitality Phrases</span>
                </button>

                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <span>{categoryPhrases.length} useful phrases</span>
                </div>
              </div>

              {/* Category Title Banner */}
              <div className="p-3.5 rounded-xl bg-white/85 dark:bg-[#13231c]/85 backdrop-blur-xs border border-emerald-100 dark:border-emerald-900/40 flex items-center gap-3 shadow-2xs">
                <span className="text-3xl">{currentCategory?.icon}</span>
                <div>
                  <h4 className="text-base font-extrabold text-slate-900 dark:text-white">
                    {currentCategory?.name}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Quick phrases for guests • {currentCategory?.subtitle}
                  </p>
                </div>
              </div>

              {/* 3-4 Phrases in a clean, uncluttered card list */}
              <div className="space-y-3">
                {categoryPhrases.map((phrase) => {
                  const translatedText = targetLang === 'en'
                    ? phrase.english
                    : (phrase[targetLang] || phrase.nepali || phrase.english);
                  const isSpeaking = activeSpeakingId === phrase.id;
                  const isCopied = copiedId === phrase.id;

                  return (
                    <div
                      key={phrase.id}
                      className="p-4 rounded-xl bg-white/90 dark:bg-[#13231c]/90 backdrop-blur-sm border border-slate-200/80 dark:border-emerald-900/40 shadow-xs hover:border-emerald-500/60 transition-all space-y-2.5"
                    >
                      {/* English Phrase */}
                      <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-snug">
                        "{phrase.english}"
                      </div>

                      {/* Translated target-language phrase */}
                      {targetLang !== 'en' && (
                        <div className="text-xs sm:text-sm font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50/70 dark:bg-[#07130e]/80 px-3 py-2 rounded-lg border border-emerald-100/80 dark:border-emerald-950/80 flex items-center justify-between gap-2">
                          <span className="leading-relaxed">{translatedText}</span>
                          <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                            {targetLang.toUpperCase()}
                          </span>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
                        <div className="flex items-center gap-2">
                          {/* Speak Button: Translates & speaks aloud immediately */}
                          <button
                            type="button"
                            onClick={() => handleSpeakPhrase(phrase)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer min-h-[34px] ${
                              isSpeaking
                                ? 'bg-amber-600 text-white animate-pulse shadow-sm'
                                : 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-2xs'
                            }`}
                          >
                            {isSpeaking ? (
                              <>
                                <VolumeX className="w-3.5 h-3.5" />
                                <span>Speaking...</span>
                              </>
                            ) : (
                              <>
                                <Volume2 className="w-3.5 h-3.5" />
                                <span>🔊 Speak</span>
                              </>
                            )}
                          </button>

                          {/* Copy Button */}
                          <button
                            type="button"
                            onClick={() => handleCopyPhrase(phrase)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-[#1c3328] dark:hover:bg-[#254436] text-slate-700 dark:text-slate-200 transition-colors cursor-pointer min-h-[34px]"
                          >
                            {isCopied ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Copied ✓</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* Use Phrase Button: Sends to top translator input */}
                        <button
                          type="button"
                          onClick={() => handleUsePhrase(phrase)}
                          title="Place into translator input above"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-[#1c3328] dark:hover:bg-[#254436] text-slate-800 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer min-h-[34px]"
                        >
                          <span>Use in Translator</span>
                          <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
