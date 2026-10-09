import React, { useEffect, useState } from 'react';

export interface PostGameSummaryData {
  type: 'wave_complete' | 'player_died';
  wave: number;
  totalKills: number;
  currencyEarned: number;
  damage: number;
  survivalTime: string;
  isVictory?: boolean;
  score?: number;
}

interface PostGameSummaryModalProps {
  summary: PostGameSummaryData;
  onPlayAgain: () => void;
  onNextWave?: () => void;
  onReturnToLobby: () => void;
}

export const PostGameSummaryModal: React.FC<PostGameSummaryModalProps> = ({
  summary,
  onPlayAgain,
  onNextWave,
  onReturnToLobby,
}) => {
  const isWaveComplete = summary.type === 'wave_complete';
  const [animatedCoins, setAnimatedCoins] = useState(0);

  // Animated currency counter on mount
  useEffect(() => {
    let start = 0;
    const end = summary.currencyEarned;
    const duration = 600;
    const startTime = performance.now();

    const frame = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      setAnimatedCoins(Math.floor(progress * end));
      if (progress < 1) {
        requestAnimationFrame(frame);
      }
    };
    requestAnimationFrame(frame);
  }, [summary.currencyEarned]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
      <div className="w-full max-w-md bg-zinc-950/95 border border-slate-700/80 rounded-3xl p-6 sm:p-7 shadow-2xl flex flex-col gap-5 text-center relative overflow-hidden">
        {/* Glow ambient background banner */}
        <div
          className={`absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-40 rounded-full blur-3xl pointer-events-none opacity-40 ${
            isWaveComplete ? 'bg-amber-500' : 'bg-red-600'
          }`}
        />

        {/* Modal Header */}
        <div className="relative z-10 flex flex-col items-center">
          {/* Status Icon */}
          <div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-3 shadow-xl border ${
              isWaveComplete
                ? 'bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 border-amber-300 shadow-amber-500/30'
                : 'bg-red-500/20 text-red-400 border-red-500/40 shadow-red-500/20'
            }`}
          >
            {isWaveComplete ? '🏆' : '💀'}
          </div>

          <h2 className="text-2xl sm:text-3xl font-tactical font-black uppercase tracking-wider text-white">
            {isWaveComplete
              ? summary.isVictory
                ? 'BOOYAH ! SHOWTIME'
                : `WAVE ${summary.wave} CLEARED!`
              : 'OPERATOR DOWN'}
          </h2>

          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {isWaveComplete
              ? summary.isVictory
                ? 'Grand Victory! Sector completely pacified.'
                : `Hostiles eliminated. Sector ${summary.wave} secured.`
              : `Combat mission terminated in Wave ${summary.wave}.`}
          </p>
        </div>

        {/* Highlight Stats Grid */}
        <div className="relative z-10 grid grid-cols-2 gap-3">
          {/* Total Kills */}
          <div className="p-3.5 rounded-2xl bg-black/60 border border-slate-800 flex flex-col items-center shadow-inner">
            <span className="text-[11px] font-tactical uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <span>🎯</span>
              <span>Total Kills</span>
            </span>
            <span className="text-3xl font-tactical font-black text-white mt-1 tabular-nums">
              {summary.totalKills}
            </span>
            <span className="text-[10px] text-slate-500 mt-0.5">Hostiles Eliminated</span>
          </div>

          {/* Currency Earned */}
          <div className="p-3.5 rounded-2xl bg-black/60 border border-amber-500/30 flex flex-col items-center shadow-inner relative overflow-hidden">
            <div className="absolute inset-0 bg-amber-500/5 pointer-events-none" />
            <span className="text-[11px] font-tactical uppercase tracking-wider text-amber-400 flex items-center gap-1">
              <span>🪙</span>
              <span>Currency Earned</span>
            </span>
            <span className="text-3xl font-tactical font-black text-amber-400 mt-1 tabular-nums drop-shadow-sm">
              +{animatedCoins}
            </span>
            <span className="text-[10px] text-amber-500/80 mt-0.5 font-semibold">Credits Credited</span>
          </div>

          {/* Total Damage */}
          <div className="p-3 rounded-xl bg-black/50 border border-slate-800 flex flex-col items-center">
            <span className="text-[10px] font-tactical uppercase text-slate-400">Total Damage</span>
            <span className="text-xl font-tactical font-bold text-cyan-400 mt-0.5 tabular-nums">
              {summary.damage.toLocaleString()}
            </span>
          </div>

          {/* Survival Time */}
          <div className="p-3 rounded-xl bg-black/50 border border-slate-800 flex flex-col items-center">
            <span className="text-[10px] font-tactical uppercase text-slate-400">Survival Time</span>
            <span className="text-xl font-tactical font-bold text-emerald-400 mt-0.5 tabular-nums">
              {summary.survivalTime}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="relative z-10 flex flex-col gap-2.5 pt-2">
          {/* Next Wave Button (if wave completed and not grand victory) */}
          {isWaveComplete && onNextWave && !summary.isVictory && (
            <button
              onClick={onNextWave}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-[0.98] text-slate-950 font-tactical font-black text-sm uppercase tracking-wider shadow-lg shadow-emerald-950/40 transition flex items-center justify-center gap-2"
            >
              <span>⚡</span>
              <span>Deploy Next Wave (Wave {summary.wave + 1})</span>
            </button>
          )}

          {/* Play Again Button (Required Primary CTA) */}
          <button
            onClick={onPlayAgain}
            className={`w-full py-3.5 px-6 rounded-2xl active:scale-[0.98] font-tactical font-black text-sm uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-lg ${
              isWaveComplete && onNextWave && !summary.isVictory
                ? 'bg-zinc-800 hover:bg-zinc-700 text-white border border-slate-700'
                : 'bg-gradient-to-r from-amber-500 via-yellow-400 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-amber-950/40'
            }`}
          >
            <span>🔄</span>
            <span>Play Again</span>
          </button>

          {/* Return to Lobby Button */}
          <button
            onClick={onReturnToLobby}
            className="w-full py-2.5 px-4 rounded-xl bg-transparent hover:bg-zinc-900 text-slate-400 hover:text-slate-200 text-xs font-tactical font-semibold uppercase tracking-wider transition"
          >
            Return to Lobby
          </button>
        </div>
      </div>
    </div>
  );
};
