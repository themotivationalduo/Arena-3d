import React, { useState } from 'react';
import { PWAInstallButton } from './PWAInstallButton';

interface FreeFireLobbyViewProps {
  currency: number;
  highScore: number;
  highWave: number;
  onStartGame: () => void;
  onOpenShop: () => void;
  onOpenMissions: () => void;
  onOpenProfile: () => void;
  onOpenSettings: () => void;
}

export const FreeFireLobbyView: React.FC<FreeFireLobbyViewProps> = ({
  currency,
  highScore,
  highWave,
  onStartGame,
  onOpenShop,
  onOpenMissions,
  onOpenProfile,
  onOpenSettings,
}) => {
  const [selectedTab, setSelectedTab] = useState<'overview' | 'weapon' | 'directives' | 'profile'>('overview');

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black text-white select-none flex flex-col justify-between">
      {/* Background: 2D Free Fire Battlefield Landscape */}
      <div className="absolute inset-0 z-0">
        <img
          src="/assets/battlefield-bg.jpg"
          alt="Battlefield Environment"
          className="w-full h-full object-cover opacity-50 filter brightness-75"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/80" />
      </div>

      {/* TOP HEADER: Free Fire Profile & Currencies */}
      <header className="relative z-10 px-4 py-2 sm:px-6 sm:py-3 flex items-center justify-between gap-3 border-b border-white/10 backdrop-blur-md bg-black/60">
        {/* Left: Player ID Card */}
        <div className="flex items-center gap-2.5">
          <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl overflow-hidden border-2 border-amber-400/80 shadow-lg shrink-0">
            <img src="/app-logo.png" alt="Operator" className="w-full h-full object-cover" />
            <span className="absolute bottom-0 right-0 bg-amber-500 text-slate-950 text-[8px] font-bold px-1 font-tactical">
              Lv.56
            </span>
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-tactical font-black text-xs sm:text-sm text-white tracking-wide">
                K_HERO_IM
              </span>
              <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-bold font-tactical">
                HEROIC
              </span>
            </div>
            <div className="flex items-center gap-2 text-[10px] sm:text-xs text-slate-400 font-tactical mt-0.5">
              <span>BR RANKED</span>
              <span>·</span>
              <span className="text-cyan-400">👍 2,233 Likes</span>
            </div>
          </div>
        </div>

        {/* Right: Currencies & Quick PWA install */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="px-2.5 py-1 rounded-xl bg-black/70 border border-amber-500/40 flex items-center gap-1.5 text-xs font-tactical font-bold shadow-sm">
            <span className="text-amber-400">🪙</span>
            <span className="text-white tabular-nums">{currency.toLocaleString()}</span>
          </div>

          <div className="px-2.5 py-1 rounded-xl bg-black/70 border border-cyan-500/40 flex items-center gap-1.5 text-xs font-tactical font-bold shadow-sm">
            <span className="text-cyan-400">💎</span>
            <span className="text-white tabular-nums">103</span>
          </div>

          <PWAInstallButton variant="compact" />

          <button
            onClick={onOpenSettings}
            className="w-8 h-8 rounded-xl bg-zinc-900 border border-slate-700/80 flex items-center justify-center text-slate-300 hover:text-white transition shadow"
            title="Settings"
          >
            ⚙️
          </button>
        </div>
      </header>

      {/* CENTER STAGE: Character Showcase & Tactical Menu */}
      <div className="relative z-10 flex-1 flex items-center justify-between px-4 sm:px-10 py-2 gap-4 overflow-hidden">
        {/* Left Side Menu */}
        <div className="flex flex-col gap-1.5 w-40 sm:w-48 shrink-0">
          {[
            { id: 'overview', label: 'OVERVIEW', icon: '📋', action: () => setSelectedTab('overview') },
            { id: 'weapon', label: 'ARMORY', icon: '⚔️', action: onOpenShop },
            { id: 'directives', label: 'DIRECTIVES', icon: '🎯', action: onOpenMissions },
            { id: 'profile', label: 'DOSSIER', icon: '👤', action: onOpenProfile },
          ].map((item) => (
            <button
              key={item.id}
              onClick={item.action}
              className={`w-full px-3 py-2 rounded-xl text-left font-tactical font-bold text-[11px] uppercase tracking-wider transition flex items-center gap-2 ${
                selectedTab === item.id
                  ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 shadow-lg shadow-orange-950/40'
                  : 'bg-black/60 hover:bg-black/80 border border-white/10 text-slate-300 hover:text-white'
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}

          {/* Record Stats Card */}
          <div className="mt-2 p-2.5 rounded-xl bg-black/70 border border-slate-800 backdrop-blur-md flex flex-col gap-1">
            <span className="text-[9px] text-slate-400 font-tactical uppercase">High Combat Score</span>
            <span className="text-sm font-tactical font-bold text-cyan-400 tabular-nums">
              {highScore.toLocaleString()} PTS
            </span>
            <div className="flex justify-between items-center text-[9px] text-slate-400 pt-1 border-t border-slate-800">
              <span>Max Wave:</span>
              <span className="text-emerald-400 font-bold font-tactical">Wave {highWave}</span>
            </div>
          </div>
        </div>

        {/* Center: Soldier Character on Illuminated Podium (Checkerboard removed via blend mode) */}
        <div className="flex-1 flex flex-col items-center justify-center relative">
          <div className="relative flex flex-col items-center">
            <div className="w-48 h-8 sm:w-64 sm:h-12 rounded-[100%] bg-gradient-to-r from-cyan-500/20 via-amber-400/40 to-cyan-500/20 filter blur-xs border border-cyan-400/30 shadow-[0_0_40px_rgba(6,182,212,0.4)] absolute -bottom-2" />

            {/* Character Graphic with screen blend mode to eliminate checkerboard background */}
            <img
              src="/assets/soldier-sprite.jpg"
              alt="Soldier Character"
              style={{ mixBlendMode: 'screen' }}
              className="h-56 sm:h-72 w-auto object-contain drop-shadow-[0_15px_30px_rgba(0,0,0,0.9)] animate-in fade-in duration-500 relative z-10"
            />
          </div>

          <div className="mt-2 px-3 py-0.5 rounded-full bg-black/80 border border-amber-400/40 backdrop-blur-md text-[10px] font-tactical font-semibold text-amber-300 uppercase tracking-wider flex items-center gap-1.5 shadow">
            <span>✨</span>
            <span>M4A1 Assault Operator · Elite Camo</span>
          </div>
        </div>
      </div>

      {/* BOTTOM FOOTER: Deploy Match CTA Button */}
      <footer className="relative z-10 px-4 py-3 sm:px-6 sm:py-4 border-t border-white/10 backdrop-blur-md bg-black/70 flex items-center justify-between">
        <div className="hidden sm:flex items-center gap-3">
          <div className="px-3 py-1 rounded-xl bg-black/70 border border-slate-800 text-[11px] font-tactical text-slate-300">
            <span>Map: </span>
            <span className="text-white font-bold">Bermuda compound (2400m²)</span>
          </div>
        </div>

        {/* Primary START GAME BUTTON */}
        <button
          onClick={onStartGame}
          className="w-full sm:w-auto px-8 py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-orange-500 hover:from-amber-400 hover:to-orange-400 active:scale-[0.98] text-slate-950 font-tactical font-black text-sm sm:text-base uppercase tracking-wider shadow-[0_0_25px_rgba(245,158,11,0.5)] flex items-center justify-center gap-2.5 transition mx-auto sm:mx-0"
        >
          <svg className="w-5 h-5 fill-current" viewBox="0 0 20 20">
            <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
          </svg>
          <span>DEPLOY SOLDIER (START BATTLE)</span>
        </button>
      </footer>
    </div>
  );
};
