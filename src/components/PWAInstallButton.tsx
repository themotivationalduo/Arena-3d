import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'button' | 'badge' | 'compact';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'button',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // Suppress if already running in standalone PWA mode
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    if (variant === 'compact') {
      return (
        <button
          onClick={install}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-tactical font-semibold text-xs tracking-wider uppercase shadow-md active:scale-95 transition ${className}`}
          title="Install Arena Strike App"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
          Install App
        </button>
      );
    }

    return (
      <button
        onClick={install}
        className={`flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 px-4 py-2.5 text-xs font-tactical font-bold text-white uppercase tracking-wider shadow-lg shadow-cyan-900/30 hover:brightness-110 active:scale-[0.98] transition border border-cyan-400/30 ${className}`}
      >
        <svg className="w-4 h-4 text-cyan-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
          />
        </svg>
        <span>Install PWA App</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className={`flex items-center justify-center gap-2 rounded-xl bg-zinc-900 border border-slate-700/80 px-3 py-1.5 text-xs font-tactical font-semibold text-slate-300 hover:text-white active:scale-95 transition ${className}`}
        >
          <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          Add to Home Screen
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <div className="w-full max-w-sm rounded-2xl bg-zinc-950 border border-slate-700 p-6 shadow-2xl text-white">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-tactical font-bold uppercase tracking-wider text-cyan-400">
                  Install on iOS Safari
                </h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="w-7 h-7 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
                >
                  ✕
                </button>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed mb-4">
                1. Tap the <strong className="text-cyan-400">Share button</strong> (square with arrow) at the bottom of Safari.<br />
                2. Scroll down the options and select <strong className="text-cyan-400">Add to Home Screen</strong>.<br />
                3. Launch Arena Strike from your home screen for full landscape immersion.
              </p>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full rounded-xl bg-amber-500 py-2.5 text-xs font-tactical font-bold uppercase tracking-wider text-slate-950 hover:bg-amber-400 transition"
              >
                Understood
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
