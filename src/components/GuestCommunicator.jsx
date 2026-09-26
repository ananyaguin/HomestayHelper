import React, { useState, useRef } from 'react';
import { PHRASE_CATEGORIES, HOMESTAY_PHRASES } from '../data/phrases';
import { ttsService } from '../services/tts';
import OfflineTranslator from './OfflineTranslator';
import {
  MessageSquare,
  Sparkles,
  Volume2,
  VolumeX,
  Copy,
  Check,
  ArrowUpRight,
  Search,
  CheckCircle2
} from 'lucide-react';

export default function GuestCommunicator() {
  const [selectedCategory, setSelectedCategory] = useState('welcome');
  const [sourceLang, setSourceLang] = useState('en');
  const [targetLang, setTargetLang] = useState('ne');
  const [translatorInputText, setTranslatorInputText] = useState('');
  const [activeSpeakingId, setActiveSpeakingId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [searchVal, setSearchVal] = useState('');

  const translatorRef = useRef(null);

  // Active Category Object
  const currentCategory = PHRASE_CATEGORIES.find((c) => c.id === selectedCategory) || PHRASE_CATEGORIES[0];

  // Phrases for selected category
  const categoryPhrases = HOMESTAY_PHRASES.filter((p) => {
    const matchCat = p.categoryId === selectedCategory || p.category.toLowerCase() === currentCategory.name.toLowerCase();
    if (!searchVal.trim()) return matchCat;
    const q = searchVal.toLowerCase();
    const matchSearch =
      (p.english && p.english.toLowerCase().includes(q)) ||
      (p.nepali && p.nepali.toLowerCase().includes(q)) ||
      (p.hindi && p.hindi.toLowerCase().includes(q)) ||
      (p.bengali && p.bengali.toLowerCase().includes(q));
    return matchCat && matchSearch;
  });

  // Speak phrase in the guest's selected target language
  const handleSpeakPhrase = (phrase) => {
    // If targetLang is English, speak English; otherwise speak the target Indic text
    const textToSpeak = targetLang === 'en' ? phrase.english : (phrase[targetLang] || phrase.nepali || phrase.english);
    setActiveSpeakingId(phrase.id);

    ttsService.speak(
      textToSpeak,
      targetLang,
      () => setActiveSpeakingId(phrase.id),
      () => setActiveSpeakingId(null)
    );
  };

  // Copy phrase
  const handleCopyPhrase = async (phrase) => {
    const textToCopy = targetLang === 'en' ? phrase.english : (phrase[targetLang] || phrase.nepali || phrase.english);
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedId(phrase.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (e) {
      console.error('Failed to copy phrase:', e);
    }
  };

  /**
   * USE PHRASE FUNCTION (Section 8):
   * When host clicks "Use Phrase", put that phrase automatically into the main translator input
   * and smoothly scroll up to the translator.
   */
  const handleUsePhrase = (phrase) => {
    setTranslatorInputText(phrase.english);

    if (translatorRef.current) {
      translatorRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Render Category Nature / Hospitality SVG Visuals (Section 5)
  const renderCategoryVisual = (catId) => {
    switch (catId) {
      case 'welcome':
        return (
          <svg className="w-10 h-10 text-emerald-600 dark:text-emerald-400 drop-shadow-sm" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M24 6L6 20H12V40H36V20H42L24 6Z" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round"/>
            <path d="M20 40V26H28V40" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round"/>
            <circle cx="24" cy="17" r="3" fill="currentColor"/>
            <path d="M38 12L42 16M42 12L38 16" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        );
      case 'food-tea':
        return (
          <svg className="w-10 h-10 text-amber-600 dark:text-amber-400 drop-shadow-sm" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 20H34C34 29 27 36 18 36H16C12.6863 36 10 33.3137 10 30V20Z" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="2.5"/>
            <path d="M34 22H38C40.2091 22 42 23.7909 42 26C42 28.2091 40.2091 30 38 30H33" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
            <path d="M8 40H38" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
            <path d="M16 14C16 11 18 10 18 8" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round"/>
            <path d="M24 14C24 11 26 10 26 8" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
        );
      case 'room':
        return (
          <svg className="w-10 h-10 text-sky-600 dark:text-sky-400 drop-shadow-sm" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 34V16M6 28H42M42 34V22C42 19.7909 40.2091 18 38 18H26C23.7909 18 22 19.7909 22 22V28H6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
            <path d="M10 22C10 20.3431 11.3431 19 13 19H17C18.6569 19 20 20.3431 20 22V28H10V22Z" fill="currentColor" fillOpacity="0.25" stroke="currentColor" strokeWidth="2"/>
            <path d="M22 24H38V28H22V24Z" fill="currentColor" fillOpacity="0.15"/>
          </svg>
        );
      case 'directions':
        return (
          <svg className="w-10 h-10 text-teal-600 dark:text-teal-400 drop-shadow-sm" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="24" cy="24" r="18" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="2.5"/>
            <polygon points="24,10 29,22 24,19 19,22" fill="#ef4444"/>
            <polygon points="24,38 29,26 24,29 19,26" fill="currentColor"/>
            <circle cx="24" cy="24" r="2.5" fill="#f8fafc"/>
          </svg>
        );
      case 'payment':
        return (
          <svg className="w-10 h-10 text-emerald-600 dark:text-emerald-400 drop-shadow-sm" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="8" y="14" width="32" height="22" rx="4" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="2.5"/>
            <circle cx="24" cy="25" r="4.5" fill="currentColor" fillOpacity="0.3" stroke="currentColor" strokeWidth="2"/>
            <path d="M8 20H40" stroke="currentColor" strokeWidth="2"/>
            <path d="M14 28H18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        );
      case 'local-experience':
        return (
          <svg className="w-10 h-10 text-indigo-600 dark:text-indigo-400 drop-shadow-sm" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 38L20 16L30 30L34 24L42 38H6Z" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round"/>
            <circle cx="36" cy="14" r="4" fill="#f59e0b"/>
            <path d="M12 38C14 34 20 33 24 38" stroke="#10b981" strokeWidth="2" strokeLinecap="round"/>
            <path d="M22 38C24 35 28 34 32 38" stroke="#10b981" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        );
      case 'emergency':
        return (
          <svg className="w-10 h-10 text-rose-600 dark:text-rose-400 drop-shadow-sm" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M24 6L38 12V24C38 33 32 40 24 43C16 40 10 33 10 24V12L24 6Z" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round"/>
            <path d="M24 16V30M17 23H31" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
          </svg>
        );
      default:
        return <Sparkles className="w-8 h-8 text-emerald-600" />;
    }
  };

  const getLanguageNativeLabel = (code) => {
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
  };

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
          externalInputText={translatorInputText}
          onInputChange={(val) => setTranslatorInputText(val)}
        />
      </div>

      {/* ======================================================== */}
      {/* PART B: VISUAL QUICK HOSPITALITY PHRASES UNDERNEATH      */}
      {/* ======================================================== */}
      <div className="bg-white dark:bg-[#0f1d17] rounded-2xl p-5 sm:p-6 border border-slate-200/80 dark:border-emerald-900/40 shadow-sm dark:shadow-xl transition-colors space-y-5">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 dark:border-emerald-900/30 gap-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-700/50 flex items-center justify-center text-emerald-700 dark:text-emerald-400">
                <MessageSquare className="w-4 h-4" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                Quick Hospitality Phrases
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Tap a category to quickly find useful phrases for your guests.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-[#0b1612] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-emerald-900/40 flex items-center gap-1.5">
              <span>Display Language:</span>
              <strong className="text-emerald-700 dark:text-emerald-400">
                {targetLang.toUpperCase()} ({getLanguageNativeLabel(targetLang)})
              </strong>
            </span>
          </div>
        </div>

        {/* ---------------------------------------------------- */}
        {/* VISUAL CATEGORY CARDS (Section 4 & 5)                */}
        {/* Responsive Grid: 2 cols on mobile -> 7 on desktop   */}
        {/* ---------------------------------------------------- */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {PHRASE_CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`p-3.5 rounded-2xl border text-center transition-all flex flex-col items-center justify-between min-h-[128px] cursor-pointer group select-none relative overflow-hidden active:scale-95 ${
                  isSelected
                    ? 'bg-emerald-50/90 dark:bg-[#0e241b] border-emerald-600 dark:border-emerald-400 ring-2 ring-emerald-500/20 shadow-md transform -translate-y-0.5'
                    : 'bg-white dark:bg-[#0b1612] border-slate-200/80 dark:border-emerald-900/30 hover:border-emerald-500/50 hover:bg-slate-50/60 dark:hover:bg-[#13231c] shadow-xs'
                }`}
              >
                {/* Nature / Hospitality Cutout Visual */}
                <div className="h-11 w-full flex items-center justify-center transition-transform group-hover:scale-110 duration-200">
                  {renderCategoryVisual(cat.id)}
                </div>

                {/* Category Title & Subtitle */}
                <div className="w-full mt-1.5">
                  <span
                    className={`text-xs font-bold uppercase tracking-wider block truncate ${
                      isSelected
                        ? 'text-emerald-900 dark:text-emerald-300 font-extrabold'
                        : 'text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {cat.name}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate mt-0.5">
                    {cat.subtitle}
                  </span>
                </div>

                {/* Active indicator dot */}
                {isSelected && (
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400 mt-1" />
                )}
              </button>
            );
          })}
        </div>

        {/* ---------------------------------------------------- */}
        {/* EXPANDED PHRASE PANEL FOR SELECTED CATEGORY (Sec 6)  */}
        {/* ---------------------------------------------------- */}
        <div className="bg-slate-50 dark:bg-[#0b1612] rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-emerald-900/40 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-200/60 dark:border-emerald-900/30 gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-800 dark:text-emerald-300">
                {currentCategory.name} PHRASES
              </span>
              <span className="text-[11px] font-semibold text-slate-400">
                ({categoryPhrases.length} {categoryPhrases.length === 1 ? 'phrase' : 'phrases'})
              </span>
            </div>

            {/* Quick Search inside Category */}
            <div className="relative max-w-xs w-full sm:w-auto">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2 pointer-events-none" />
              <input
                type="text"
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
                placeholder="Filter phrases..."
                className="w-full sm:w-48 pl-8 pr-2.5 py-1 text-xs bg-white dark:bg-[#13231c] border border-slate-200 dark:border-emerald-900/50 rounded-lg text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Phrases List */}
          <div className="space-y-3">
            {categoryPhrases.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No matching phrases found for "{searchVal}".
              </div>
            ) : (
              categoryPhrases.map((phrase) => {
                const guestText = targetLang === 'en' ? phrase.english : (phrase[targetLang] || phrase.nepali || phrase.english);
                const isSpeaking = activeSpeakingId === phrase.id;
                const isCopied = copiedId === phrase.id;

                return (
                  <div
                    key={phrase.id}
                    className="p-4 rounded-xl bg-white dark:bg-[#13231c] border border-slate-200/80 dark:border-emerald-900/40 shadow-xs hover:border-emerald-500/50 transition-all space-y-2.5"
                  >
                    {/* English Phrase */}
                    <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-snug">
                      "{phrase.english}"
                    </div>

                    {/* Guest Language Translation based on Translator's selected TO language */}
                    <div className="p-2.5 rounded-lg bg-emerald-50/60 dark:bg-[#07130e] border border-emerald-100 dark:border-emerald-950 text-xs sm:text-sm font-semibold text-emerald-900 dark:text-emerald-200 flex items-center justify-between gap-2">
                      <div className="leading-relaxed">
                        <span className="text-[10px] uppercase font-extrabold text-emerald-700 dark:text-emerald-400 block mb-0.5">
                          {targetLang.toUpperCase()} ({getLanguageNativeLabel(targetLang)})
                        </span>
                        <span>{guestText}</span>
                      </div>
                    </div>

                    {/* Action Buttons: [ 🔊 Speak ] [ Copy ] [ Use Phrase ] */}
                    <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleSpeakPhrase(phrase)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            isSpeaking
                              ? 'bg-amber-500 text-white font-bold animate-pulse shadow-sm'
                              : 'bg-slate-100 hover:bg-slate-200 dark:bg-[#1c3328] dark:hover:bg-[#254436] text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          {isSpeaking ? (
                            <>
                              <VolumeX className="w-3.5 h-3.5" />
                              <span>Speaking...</span>
                            </>
                          ) : (
                            <>
                              <Volume2 className="w-3.5 h-3.5 text-forest-800 dark:text-amberGold" />
                              <span>🔊 Speak</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleCopyPhrase(phrase)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-[#1c3328] dark:hover:bg-[#254436] text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
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

                      {/* USE PHRASE BUTTON (Section 8) */}
                      <button
                        type="button"
                        onClick={() => handleUsePhrase(phrase)}
                        title="Put into translator input above"
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer min-h-[34px]"
                      >
                        <span>Use Phrase</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
