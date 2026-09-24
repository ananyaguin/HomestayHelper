import React, { useState } from 'react';
import { HOMESTAY_PHRASES } from '../data/phrases';
import { ttsService } from '../services/tts';
import OfflineTranslator from './OfflineTranslator';
import {
  MessageSquare,
  Sparkles,
  BedDouble,
  Utensils,
  Banknote,
  Car,
  Search,
  Volume2,
  VolumeX
} from 'lucide-react';

export default function GuestCommunicator() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [guestLang, setGuestLang] = useState('en');
  const [searchVal, setSearchVal] = useState('');
  const [activeSpeakingId, setActiveSpeakingId] = useState(null);

  const categories = [
    { id: 'all', label: 'All Phrases', Icon: Sparkles },
    { id: 'arrival', label: 'Arrival & Room', Icon: BedDouble },
    { id: 'meals', label: 'Meals & Tea', Icon: Utensils },
    { id: 'payments', label: 'Rates & Cash', Icon: Banknote },
    { id: 'transport', label: 'Travel & Sights', Icon: Car },
  ];

  const filteredPhrases = HOMESTAY_PHRASES.filter(p => {
    const matchCat = selectedCategory === 'all' || p.category === selectedCategory;
    const query = searchVal.toLowerCase();
    const matchSearch = !query ||
      p.en.toLowerCase().includes(query) ||
      p.ne.toLowerCase().includes(query) ||
      (p.ne_trans && p.ne_trans.toLowerCase().includes(query));
    return matchCat && matchSearch;
  });

  const handleSpeakPhrase = (phrase) => {
    const textToSpeak = phrase[guestLang] || phrase.en;
    setActiveSpeakingId(phrase.id);
    ttsService.speak(
      textToSpeak,
      guestLang,
      () => setActiveSpeakingId(phrase.id),
      () => setActiveSpeakingId(null)
    );
  };

  return (
    <div className="space-y-6">
      <OfflineTranslator />
      <div className="bg-white dark:bg-[#0f1d17] rounded-2xl p-5 border border-slate-200 dark:border-emerald-900/40 shadow-sm dark:shadow-xl transition-colors duration-200">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
          <span className="text-lg font-bold text-forest-800 dark:text-white flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-forest-50 dark:bg-emerald-950/80 border border-forest-200 dark:border-emerald-700/40 flex items-center justify-center text-forest-800 dark:text-emerald-400">
              <MessageSquare className="w-4 h-4 text-forest-800 dark:text-emerald-400" aria-hidden="true" />
            </div>
            <span>Quick Hospitality Phrases</span>
          </span>
          <span className="text-xs font-bold px-2.5 py-1 rounded-pill bg-forest-100 dark:bg-emerald-950/80 text-forest-800 dark:text-emerald-300 border border-forest-200 dark:border-emerald-500/30 uppercase tracking-wide">
            100% Offline Audio
          </span>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          Two-way phrasebook for tea garden homestays. Tap speak to play aloud in guest language.
        </p>

        {/* Language Controls Bar */}
        <div className="flex items-center justify-between bg-slate-50 dark:bg-[#0b1612] p-3 rounded-xl mb-4 border border-slate-200 dark:border-emerald-900/40 gap-3 flex-wrap transition-colors">
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Guest Language:
            </label>
            <select
              value={guestLang}
              onChange={(e) => setGuestLang(e.target.value)}
              className="border border-slate-300 dark:border-emerald-900/50 rounded-lg px-3 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-forest-700 dark:focus:ring-emerald-500 bg-white dark:bg-[#13231c] text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
            >
              <option value="en" className="bg-white dark:bg-[#0b1612]">English</option>
              <option value="hi" className="bg-white dark:bg-[#0b1612]">Hindi (हिंदी)</option>
              <option value="bn" className="bg-white dark:bg-[#0b1612]">Bengali (বাংলা)</option>
              <option value="ne" className="bg-white dark:bg-[#0b1612]">Nepali (नेपाली)</option>
            </select>
          </div>
          <div className="flex-1 max-w-xs relative">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-2.5 pointer-events-none" aria-hidden="true" />
            <input
              type="text"
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              placeholder="Search phrases (tea, key, rate)..."
              className="w-full border border-slate-300 dark:border-emerald-900/50 rounded-lg pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest-700 dark:focus:ring-emerald-500 bg-white dark:bg-[#13231c] text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 transition-colors"
            />
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none">
          {categories.map((cat) => {
            const CatIcon = cat.Icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-pill text-xs sm:text-sm font-semibold whitespace-nowrap transition-all border flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-forest-800 dark:bg-gradient-to-r dark:from-emerald-600 dark:to-forest-700 text-white border-forest-800 dark:border-emerald-500/50 shadow-md'
                    : 'bg-white dark:bg-[#13231c] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-emerald-900/40 hover:bg-slate-50 dark:hover:bg-[#1a3528] hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <CatIcon className={`w-3.5 h-3.5 ${isSelected ? 'text-amberGold' : 'text-slate-400'}`} aria-hidden="true" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Phrase Cards */}
        <div className="space-y-3">
          {filteredPhrases.length === 0 ? (
            <div className="text-center py-8 text-slate-400 dark:text-slate-500">
              <p>No matching phrases found.</p>
            </div>
          ) : (
            filteredPhrases.map((phrase) => {
              const guestText = phrase[guestLang] || phrase.en;
              const isSpeaking = activeSpeakingId === phrase.id;

              return (
                <div
                  key={phrase.id}
                  className="bg-white dark:bg-[#0b1612] rounded-xl p-4 border border-slate-200 dark:border-emerald-900/40 flex flex-col gap-2.5 transition-all hover:border-forest-700 dark:hover:border-emerald-600/60 shadow-sm dark:shadow-md"
                >
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-pill bg-forest-100 dark:bg-emerald-950/80 text-forest-800 dark:text-emerald-300 border border-forest-200 dark:border-emerald-800/40 uppercase tracking-wide">
                      {phrase.category}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 italic">
                      {phrase.ne_trans || ''}
                    </span>
                  </div>

                  <div className="text-base font-bold text-forest-800 dark:text-slate-100 leading-snug">
                    {phrase.ne}
                  </div>

                  <div className="text-sm text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-[#13231c] p-2.5 rounded-lg border-l-4 border-amberGold">
                    <strong className="text-slate-900 dark:text-amberGold">[{guestLang.toUpperCase()}]:</strong> {guestText}
                  </div>

                  <div className="flex items-center justify-end mt-1">
                    <button
                      onClick={() => handleSpeakPhrase(phrase)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill text-xs font-semibold transition-all cursor-pointer ${
                        isSpeaking
                          ? 'bg-amberGold text-white dark:text-forest-950 font-bold animate-pulse-custom shadow-md'
                          : 'bg-forest-100 dark:bg-emerald-950/80 text-forest-800 dark:text-emerald-300 border border-forest-200 dark:border-emerald-800/50 hover:bg-forest-800 hover:text-white dark:hover:bg-emerald-800 dark:hover:text-white'
                      }`}
                    >
                      {isSpeaking ? (
                        <>
                          <VolumeX className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Speaking...</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3.5 h-3.5 text-forest-800 dark:text-amberGold" aria-hidden="true" />
                          <span>Speak Guest Text</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
