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
          className="w-full h-full object-cover opacity-60 filter brightness-90"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/80" />
      </div>

      {/* TOP HEADER: Free Fire Profile & Currencies (Exact from Image 5) */}
      <header className="relative z-10 p-3 sm:p-5 flex items-center justify-between gap-3 border-b border-white/10 backdrop-blur-md bg-black/40">
        {/* Left: Player ID Card */}
        <div className="flex items-center gap-3">
          <div className="relative w-12 h-12 rounded-xl overflow-hidden border-2 border-amber-400/80 shadow-lg shrink-0">
            <img src="/app-logo.png" alt="Operator" className="w-full h-full object-cover" />
            <span className="absolute bottom-0 right-0 bg-amber-500 text-slate-950 text-[9px] font-bold px-1 font-tactical">
              Lv.56
            </span>
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-tactical font-black text-sm sm:text-base text-white tracking-wide">
                K_HERO_IM
              </span>
              <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold font-tactical">
                HEROIC
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 font-tactical mt-0.5">
              <span>BR RANKED</span>
              <span>·</span>
              <span className="text-cyan-400">👍 2,233 Likes</span>
            </div>
          </div>
        </div>

        {/* Right: Currencies & Quick PWA install (Exact from Image 5) */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Gold Coins */}
          <div className="px-3 py-1.5 rounded-xl bg-black/60 border border-amber-500/40 flex items-center gap-1.5 text-xs font-tactical font-bold shadow-sm">
            <span className="text-amber-400">🪙</span>
            <span className="text-white tabular-nums">{currency.toLocaleString()}</span>
          </div>

          {/* Diamonds */}
          <div className="px-3 py-1.5 rounded-xl bg-black/60 border border-cyan-500/40 flex items-center gap-1.5 text-xs font-tactical font-bold shadow-sm">
            <span className="text-cyan-400">💎</span>
            <span className="text-white tabular-nums">103</span>
          </div>

          <PWAInstallButton variant="compact" />

          <button
            onClick={onOpenSettings}
            className="w-9 h-9 rounded-xl bg-zinc-900 border border-slate-700/80 flex items-center justify-center text-slate-300 hover:text-white transition shadow"
            title="Settings"
          >
            ⚙️
          </button>
        </div>
      </header>

      {/* CENTER STAGE: Character Showcase & Tactical Left Menu */}
      <div className="relative z-10 flex-1 flex items-center justify-between px-4 sm:px-12 py-4">
        {/* Left Side Menu (Exact from Image 5) */}
        <div className="hidden sm:flex flex-col gap-2 w-48">
          {[
            { id: 'overview', label: 'OVERVIEW', icon: '📋', action: () => setSelectedTab('overview') },
            { id: 'weapon', label: 'WEAPON ARMORY', icon: '⚔️', action: onOpenShop },
            { id: 'directives', label: 'DIRECTIVES', icon: '🎯', action: onOpenMissions },
            { id: 'profile', label: 'OPERATOR DOSSIER', icon: '👤', action: onOpenProfile },
          ].map((item) => (
            <button
              key={item.id}
              onClick={item.action}
              className={`w-full px-4 py-2.5 rounded-xl text-left font-tactical font-bold text-xs uppercase tracking-wider transition flex items-center gap-2.5 ${
                selectedTab === item.id
                  ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 shadow-lg shadow-orange-950/40'
                  : 'bg-black/50 hover:bg-black/80 border border-white/10 text-slate-300 hover:text-white'
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}

          {/* Record Stats Card */}
          <div className="mt-4 p-3.5 rounded-2xl bg-black/60 border border-slate-800 backdrop-blur-md flex flex-col gap-1.5">
            <span className="text-[10px] text-slate-400 font-tactical uppercase">High Combat Score</span>
            <span className="text-lg font-tactical font-bold text-cyan-400 tabular-nums">
              {highScore.toLocaleString()} PTS
            </span>
            <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1 border-t border-slate-800">
              <span>Max Survival:</span>
              <span className="text-emerald-400 font-bold font-tactical">Wave {highWave}</span>
            </div>
          </div>
        </div>

        {/* Center: Soldier Character on Illuminated Podium (Exact from Image 5 & 1) */}
        <div className="flex-1 flex flex-col items-center justify-center relative">
          {/* Glowing Circular Stage Podium */}
          <div className="relative flex flex-col items-center">
            <div className="w-56 h-12 sm:w-72 sm:h-16 rounded-[100%] bg-gradient-to-r from-cyan-500/20 via-amber-400/40 to-cyan-500/20 filter blur-xs border border-cyan-400/30 shadow-[0_0_50px_rgba(6,182,212,0.4)] absolute -bottom-4" />

            {/* Character Graphic */}
            <img
              src="/assets/soldier-sprite.jpg"
              alt="Soldier Character"
              className="h-80 sm:h-96 w-auto object-contain drop-shadow-[0_15px_30px_rgba(0,0,0,0.9)] animate-in fade-in duration-500 relative z-10"
            />
          </div>

          <div className="mt-4 px-3 py-1 rounded-full bg-black/70 border border-amber-400/40 backdrop-blur-md text-[11px] font-tactical font-semibold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
            <span>✨</span>
            <span>M4A1 Assault Operator · Elite Camo</span>
          </div>
        </div>

        {/* Right Quick Nav (Mobile friendly tabs) */}
        <div className="flex sm:hidden flex-col gap-2">
          <button
            onClick={onOpenShop}
            className="w-11 h-11 rounded-xl bg-black/70 border border-amber-500/50 flex items-center justify-center text-lg"
            title="Armory"
          >
            ⚔️
          </button>
          <button
            onClick={onOpenMissions}
            className="w-11 h-11 rounded-xl bg-black/70 border border-cyan-500/50 flex items-center justify-center text-lg"
            title="Missions"
          >
            🎯
          </button>
          <button
            onClick={onOpenProfile}
            className="w-11 h-11 rounded-xl bg-black/70 border border-emerald-500/50 flex items-center justify-center text-lg"
            title="Profile"
          >
            👤
          </button>
        </div>
      </div>

      {/* BOTTOM FOOTER: Big Deploy Match CTA Button */}
      <footer className="relative z-10 p-4 sm:p-6 border-t border-white/10 backdrop-blur-md bg-black/50 flex items-center justify-between">
        <div className="hidden sm:flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-xl bg-black/60 border border-slate-800 text-xs font-tactical text-slate-300">
            <span>Map: </span>
            <span className="text-white font-bold">Bermuda compound (2400m²)</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-black/60 border border-slate-800 text-xs font-tactical text-slate-300">
            <span>Match Mode: </span>
            <span className="text-amber-400 font-bold">Solo Battle Royale (25 Players)</span>
          </div>
        </div>

        {/* Primary START GAME BUTTON */}
        <button
          onClick={onStartGame}
          className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-orange-500 hover:from-amber-400 hover:to-orange-400 active:scale-[0.98] text-slate-950 font-tactical font-black text-lg uppercase tracking-wider shadow-[0_0_30px_rgba(245,158,11,0.5)] flex items-center justify-center gap-3 transition"
        >
          <svg className="w-6 h-6 fill-current" viewBox="0 0 20 20">
            <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
          </svg>
          <span>DEPLOY SOLDIER (START)</span>
        </button>
      </footer>
    </div>
  );
};
