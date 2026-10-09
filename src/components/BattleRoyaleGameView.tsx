import React, { useEffect, useRef, useState } from 'react';
import { BattleRoyale2D, WeaponDef, WEAPON_REGISTRY } from '../game/BattleRoyale2D';

interface BattleRoyaleGameViewProps {
  onExitToLobby: () => void;
}

export const BattleRoyaleGameView: React.FC<BattleRoyaleGameViewProps> = ({ onExitToLobby }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef<BattleRoyale2D | null>(null);

  // Live HUD States matching Free Fire
  const [hp, setHp] = useState(200);
  const [ep, setEp] = useState(100);
  const [armor, setArmor] = useState(100);
  const [helmet, setHelmet] = useState(100);
  const [alive, setAlive] = useState(25);
  const [kills, setKills] = useState(0);
  const [weapon, setWeapon] = useState<WeaponDef>(WEAPON_REGISTRY.m4a1);
  const [ammo, setAmmo] = useState(30);
  const [reserve, setReserve] = useState(180);
  const [zoneTimer, setZoneTimer] = useState(45);
  const [zoneShrinking, setZoneShrinking] = useState(false);
  const [isReloading, setIsReloading] = useState(false);
  const [isScoping, setIsScoping] = useState(false);
  const [isSprinting, setIsSprinting] = useState(false);

  // Match Over States
  const [matchResult, setMatchResult] = useState<{
    victory: boolean;
    kills: number;
    damage: number;
    rank: number;
  } | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const game = new BattleRoyale2D(canvasRef.current);
    gameRef.current = game;

    game.onStateUpdate = (st) => {
      setHp(st.hp);
      setEp(st.ep);
      setArmor(st.armor);
      setHelmet(st.helmet);
      setAlive(st.alive);
      setKills(st.kills);
      setWeapon(st.weapon);
      setAmmo(st.ammo);
      setReserve(st.reserve);
      setZoneTimer(st.zoneTimer);
      setZoneShrinking(st.zoneShrinking);
      setIsReloading(st.isReloading);
      setIsScoping(st.isScoping);
    };

    game.onMatchEnd = (res) => {
      setMatchResult(res);
    };

    game.start();

    return () => {
      game.stop();
    };
  }, []);

  // Mobile Touch Handlers
  const handleJoystickTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!gameRef.current) return;
    const t = e.touches[0];
    gameRef.current.touchMove.active = true;
    gameRef.current.touchMove.startX = t.clientX;
    gameRef.current.touchMove.startY = t.clientY;
    gameRef.current.touchMove.curX = t.clientX;
    gameRef.current.touchMove.curY = t.clientY;
  };

  const handleJoystickTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!gameRef.current || !gameRef.current.touchMove.active) return;
    const t = e.touches[0];
    gameRef.current.touchMove.curX = t.clientX;
    gameRef.current.touchMove.curY = t.clientY;
  };

  const handleJoystickTouchEnd = () => {
    if (!gameRef.current) return;
    gameRef.current.touchMove.active = false;
  };

  const handleFireTouchStart = () => {
    if (!gameRef.current) return;
    gameRef.current.isTouchFiring = true;
  };

  const handleFireTouchEnd = () => {
    if (!gameRef.current) return;
    gameRef.current.isTouchFiring = false;
  };

  const handleSprintToggle = () => {
    if (!gameRef.current) return;
    const next = !isSprinting;
    setIsSprinting(next);
    gameRef.current.player.isSprinting = next;
  };

  const handleScopeToggle = () => {
    if (!gameRef.current) return;
    const next = !isScoping;
    setIsScoping(next);
    gameRef.current.player.isScoping = next;
  };

  const handleReload = () => {
    if (!gameRef.current) return;
    gameRef.current.reload(gameRef.current.player);
  };

  const handleUseMedkit = () => {
    if (!gameRef.current) return;
    gameRef.current.useMedkit(gameRef.current.player);
  };

  const handleWeaponSwitch = (id: string) => {
    if (!gameRef.current) return;
    gameRef.current.switchWeapon(gameRef.current.player, id);
  };

  const handleRestartMatch = () => {
    setMatchResult(null);
    if (gameRef.current) {
      gameRef.current.initWorld();
      gameRef.current.isGameOver = false;
      gameRef.current.isVictory = false;
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden select-none bg-black text-white font-sans">
      {/* 2D Battle Royale Canvas Layer */}
      <canvas ref={canvasRef} className="w-full h-full block cursor-crosshair" />

      {/* FREE FIRE HUD OVERLAY */}
      {/* Top Left: Location tag & Ping */}
      <div className="absolute top-3 left-32 pointer-events-none flex items-center gap-2">
        <div className="px-2.5 py-1 rounded-lg bg-black/60 border border-slate-700/60 backdrop-blur-md flex items-center gap-1.5 text-[11px] font-tactical font-semibold text-white">
          <span className="text-amber-400">📍</span>
          <span>Clock Tower</span>
        </div>
        <div className="px-2 py-1 rounded-lg bg-black/60 border border-slate-700/60 backdrop-blur-md text-[10px] font-mono text-emerald-400">
          📶 42ms
        </div>
      </div>

      {/* Top Center: Safe Zone Alert Banner (Exact from Image 1 & 3) */}
      <div className="absolute top-11 left-1/2 -translate-x-1/2 pointer-events-none flex flex-col items-center">
        <div className="px-4 py-1.5 rounded-lg bg-black/75 border border-amber-500/50 backdrop-blur-md flex items-center gap-2 shadow-lg shadow-amber-950/20">
          <span className="text-amber-400 text-xs">⚠️</span>
          <span className="text-xs font-tactical font-bold uppercase tracking-wider text-amber-300">
            {zoneShrinking
              ? 'Safe zone is shrinking now!'
              : `Safe zone will shrink in 00:${String(zoneTimer).padStart(2, '0')}`}
          </span>
        </div>
      </div>

      {/* Top Right: ALIVE & KILL Count + Weapon Ammo Card (Exact from Image 1) */}
      <div className="absolute top-3 right-3 flex flex-col items-end gap-2 pointer-events-auto">
        <div className="flex items-center gap-2">
          {/* Alive Count */}
          <div className="px-3 py-1.5 rounded-xl bg-black/80 border border-cyan-500/50 backdrop-blur-md flex items-center gap-1.5 shadow-md">
            <span className="text-[10px] text-slate-400 uppercase font-bold font-tactical">ALIVE</span>
            <span className="text-base font-tactical font-bold text-white tabular-nums">{alive}</span>
          </div>

          {/* Kill Count */}
          <div className="px-3 py-1.5 rounded-xl bg-black/80 border border-red-500/50 backdrop-blur-md flex items-center gap-1.5 shadow-md">
            <span className="text-red-400 text-xs">💀</span>
            <span className="text-[10px] text-slate-400 uppercase font-bold font-tactical">KILL</span>
            <span className="text-base font-tactical font-bold text-amber-400 tabular-nums">{kills}</span>
          </div>

          {/* Exit to Lobby Button */}
          <button
            onClick={onExitToLobby}
            className="w-8 h-8 rounded-xl bg-black/80 hover:bg-zinc-800 border border-slate-700 text-slate-300 flex items-center justify-center text-xs font-bold transition shadow"
            title="Leave Match"
          >
            ✕
          </button>
        </div>

        {/* Primary Weapon & Ammo Display Card */}
        <div className="px-3.5 py-2 rounded-xl bg-black/85 border border-slate-700/80 backdrop-blur-md flex items-center gap-3 shadow-xl">
          <div className="flex flex-col">
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-tactical font-bold text-white tabular-nums">{ammo}</span>
              <span className="text-xs font-tactical text-slate-400">/{reserve}</span>
            </div>
            <span className="text-[9px] font-tactical uppercase tracking-wider text-cyan-400 font-semibold">
              {isReloading ? 'RELOADING...' : weapon.name}
            </span>
          </div>

          <button
            onClick={handleReload}
            disabled={isReloading}
            className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-[10px] font-tactical font-bold uppercase text-slate-200 transition border border-slate-600"
          >
            Quick Reload
          </button>
        </div>

        {/* Secondary Weapon Slots Selector (Like in Image 1 & 3) */}
        <div className="flex gap-1.5 mt-0.5">
          {[
            { id: 'm4a1', label: 'RIFLE', icon: '🔫' },
            { id: 'ump', label: 'SMG', icon: '⚡' },
            { id: 'shotgun', label: 'SHOTGUN', icon: '💥' },
            { id: 'awm', label: 'SNIPER', icon: '🎯' },
          ].map((wItem) => (
            <button
              key={wItem.id}
              onClick={() => handleWeaponSwitch(wItem.id)}
              className={`px-2 py-1 rounded-lg text-[10px] font-tactical font-bold uppercase transition flex items-center gap-1 ${
                weapon.id === wItem.id
                  ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                  : 'bg-black/60 hover:bg-black/80 text-slate-300 border border-slate-800'
              }`}
            >
              <span>{wItem.icon}</span>
              <span className="hidden sm:inline">{wItem.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Center: Free Fire HP 200/200 & EP 100/200 Status Bars (Exact from Image 1 & 2) */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 pointer-events-auto">
        <div className="w-72 sm:w-80 flex flex-col gap-1 p-2.5 rounded-2xl bg-black/80 border border-slate-800 backdrop-blur-md shadow-2xl">
          {/* Energy EP Bar */}
          <div className="flex items-center justify-between text-[10px] font-tactical font-bold text-amber-400 px-1">
            <span>EP</span>
            <span>{ep}/200</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-200"
              style={{ width: `${(ep / 200) * 100}%` }}
            />
          </div>

          {/* Health HP Bar */}
          <div className="flex items-center justify-between text-[11px] font-tactical font-bold text-white px-1 mt-0.5">
            <div className="flex items-center gap-2">
              <span>HP</span>
              <span className="text-[10px] text-slate-400 font-normal">
                🛡️ Armor: {armor}% · 🪖 Helmet: {helmet}%
              </span>
            </div>
            <span className={hp < 60 ? 'text-red-400 font-bold animate-pulse' : 'text-white'}>
              {hp}/200
            </span>
          </div>
          <div className="w-full h-3 rounded-full bg-slate-900 border border-slate-700/60 overflow-hidden">
            <div
              className={`h-full transition-all duration-200 ${
                hp < 60
                  ? 'bg-red-500'
                  : hp < 120
                  ? 'bg-amber-400'
                  : 'bg-gradient-to-r from-emerald-500 to-lime-400'
              }`}
              style={{ width: `${Math.max(0, (hp / 200) * 100)}%` }}
            />
          </div>
        </div>

        {/* Medkit Action Button */}
        <button
          onClick={handleUseMedkit}
          className="px-4 py-1.5 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 active:scale-95 text-white text-xs font-tactical font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-lg transition border border-emerald-400/40"
        >
          <span>➕</span>
          <span>Use Medkit (+75 HP)</span>
        </button>
      </div>

      {/* Left Touch Virtual Joystick (Mobile) */}
      <div
        className="absolute bottom-8 left-8 w-32 h-32 rounded-full border-2 border-white/20 bg-black/30 backdrop-blur-xs flex items-center justify-center touch-none select-none"
        onTouchStart={handleJoystickTouchStart}
        onTouchMove={handleJoystickTouchMove}
        onTouchEnd={handleJoystickTouchEnd}
      >
        <div className="w-12 h-12 rounded-full bg-white/50 border border-white/80 shadow-md pointer-events-none" />

        {/* Sprint Lock Button above joystick */}
        <button
          onClick={handleSprintToggle}
          className={`absolute -top-12 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full border flex items-center justify-center text-sm shadow-lg transition ${
            isSprinting
              ? 'bg-amber-500 text-slate-950 border-amber-300 font-bold scale-110'
              : 'bg-black/60 border-white/30 text-white'
          }`}
          title="Toggle Sprint"
        >
          🏃
        </button>
      </div>

      {/* Right Touch Controls: Fire Button, Scope, Reload (Exact from Image 1 & 4) */}
      <div className="absolute bottom-8 right-8 flex items-center gap-3 touch-none select-none">
        {/* Scope ADS Button */}
        <button
          onClick={handleScopeToggle}
          className={`w-14 h-14 rounded-full border flex items-center justify-center text-xl shadow-lg transition active:scale-95 ${
            isScoping
              ? 'bg-cyan-500 text-slate-950 border-cyan-300 scale-105'
              : 'bg-black/60 border-white/30 text-white'
          }`}
          title="Scope (ADS)"
        >
          🎯
        </button>

        {/* Big Free Fire Primary Fire Button (Bullet with muzzle streaks) */}
        <button
          onTouchStart={handleFireTouchStart}
          onTouchEnd={handleFireTouchEnd}
          onMouseDown={handleFireTouchStart}
          onMouseUp={handleFireTouchEnd}
          className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-500 to-orange-600 active:from-amber-400 active:to-orange-500 border-2 border-white/60 shadow-2xl flex flex-col items-center justify-center text-white active:scale-95 transition"
          title="Shoot Weapon"
        >
          <svg className="w-8 h-8 text-white drop-shadow" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L15 8H9L12 2Z" />
            <rect x="9" y="8" width="6" height="12" rx="1" />
            <path d="M7 11L4 12L7 13V11Z" />
            <path d="M17 11L20 12L17 13V11Z" />
          </svg>
          <span className="text-[9px] font-tactical font-black uppercase tracking-wider text-slate-950">
            FIRE
          </span>
        </button>
      </div>

      {/* VICTORY OVERLAY: Exact "BOOYAH !" styling from Image 2 */}
      {matchResult?.victory && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
          {/* Golden Ribbon Banner */}
          <div className="w-full max-w-lg bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 py-6 px-8 rounded-2xl shadow-[0_0_50px_rgba(245,158,11,0.5)] border-2 border-yellow-200 text-center flex flex-col items-center">
            <h1 className="text-5xl sm:text-6xl font-tactical font-black italic tracking-wider text-slate-950 drop-shadow-md">
              BOOYAH !
            </h1>
            <p className="text-base sm:text-lg font-tactical font-bold text-slate-900 uppercase tracking-widest mt-1">
              Showtime! Match Victory
            </p>
          </div>

          {/* Match Statistics Card */}
          <div className="w-full max-w-sm mt-6 p-5 rounded-2xl bg-zinc-950/90 border border-slate-700/80 flex flex-col gap-3 text-center shadow-2xl">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-black/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-tactical">Eliminations</span>
                <span className="text-2xl font-tactical font-bold text-amber-400 block mt-0.5">
                  {matchResult.kills}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-black/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-tactical">Total Damage</span>
                <span className="text-2xl font-tactical font-bold text-cyan-400 block mt-0.5">
                  {matchResult.damage}
                </span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-400 text-xs font-tactical font-bold">
              RANK #1 SURVIVOR · REWARDS CREDITED
            </div>

            <div className="flex gap-2.5 mt-2">
              <button
                onClick={handleRestartMatch}
                className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-tactical font-bold text-xs uppercase tracking-wider transition shadow"
              >
                Play Again
              </button>
              <button
                onClick={onExitToLobby}
                className="flex-1 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-slate-200 font-tactical font-bold text-xs uppercase tracking-wider transition border border-slate-700"
              >
                Back (Lobby)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DEFEAT OVERLAY: BATTLE REPORT */}
      {matchResult && !matchResult.victory && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="w-full max-w-sm p-6 rounded-2xl bg-zinc-950/95 border border-red-500/40 shadow-2xl flex flex-col gap-4 text-center">
            <div>
              <div className="w-12 h-12 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-xl mx-auto mb-2 text-red-400">
                💀
              </div>
              <h2 className="text-2xl font-tactical font-bold uppercase tracking-wider text-white">
                Battle Report
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Eliminated in Combat</p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="p-2.5 rounded-xl bg-black/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-tactical">Rank</span>
                <span className="text-lg font-tactical font-bold text-white block">#{matchResult.rank}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-black/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-tactical">Kills</span>
                <span className="text-lg font-tactical font-bold text-amber-400 block">
                  {matchResult.kills}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-black/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-tactical">Damage</span>
                <span className="text-lg font-tactical font-bold text-cyan-400 block">
                  {matchResult.damage}
                </span>
              </div>
            </div>

            <div className="flex gap-2.5 mt-2">
              <button
                onClick={handleRestartMatch}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-tactical font-bold text-xs uppercase tracking-wider transition shadow"
              >
                Deploy Again
              </button>
              <button
                onClick={onExitToLobby}
                className="flex-1 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-slate-200 font-tactical font-bold text-xs uppercase tracking-wider transition border border-slate-700"
              >
                Return to Lobby
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
