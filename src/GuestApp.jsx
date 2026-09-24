import React from 'react';
import { useParams } from 'react-router-dom';

export default function GuestApp() {
  const { token } = useParams();

  return (
    <div className="min-h-screen bg-[#f4f7f5] dark:bg-[#080f0c] text-slate-800 dark:text-slate-100 p-8 flex flex-col items-center justify-center">
      <div className="bg-white dark:bg-[#0f1d17] p-6 rounded-2xl border border-slate-200 dark:border-emerald-900/40 shadow-xl max-w-md w-full text-center">
        <h1 className="text-xl font-bold text-forest-800 dark:text-emerald-300 mb-3">
          Guest PWA placeholder
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Token: <span className="font-mono font-bold text-amberGold">{token}</span>
        </p>
      </div>
    </div>
  );
}
