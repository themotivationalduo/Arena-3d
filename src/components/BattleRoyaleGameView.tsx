import React, { useEffect, useRef, useState } from 'react';
import { updateMissionProgress, saveMatchResults, updateCurrency } from '../services/userService';
import { PostGameSummaryModal, PostGameSummaryData } from './PostGameSummaryModal';

interface BattleRoyaleGameViewProps {
  onExitToLobby: () => void;
}

export const BattleRoyaleGameView: React.FC<BattleRoyaleGameViewProps> = ({ onExitToLobby }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const minimapRef = useRef<HTMLCanvasElement | null>(null);

  // HUD states
  const [hp, setHp] = useState(200);
  const [maxHp] = useState(200);
  const [ammo, setAmmo] = useState(30);
  const [maxAmmo] = useState(90);
  const [kills, setKills] = useState(0);
  const [alive, setAlive] = useState(25);
  const [weaponName, setWeaponName] = useState('M4A1 RIFLE');
  const [isReloading, setIsReloading] = useState(false);
  const [summary, setSummary] = useState<PostGameSummaryData | null>(null);

  // Joystick & action refs
  const joystickRef = useRef({ active: false, x: 0, y: 0, dx: 0, dy: 0, id: null as number | null });
  const stickPosRef = useRef({ x: 0, y: 0 });
  const playerRef = useRef({
    x: 1000,
    y: 1000,
    radius: 18,
    angle: 0,
    speed: 3.8,
    hp: 200,
    maxHp: 200,
    ammo: 30,
    maxAmmo: 90,
    isReloading: false,
  });

  const gameLoopRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const minimapCanvas = minimapRef.current;
    const minictx = minimapCanvas ? minimapCanvas.getContext('2d') : null;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      if (minimapCanvas) {
        minimapCanvas.width = minimapCanvas.offsetWidth || 96;
        minimapCanvas.height = minimapCanvas.offsetHeight || 96;
      }
    };
    window.addEventListener('resize', resize);
    resize();

    const WORLD_SIZE = 2000;
    const player = playerRef.current;
    player.x = WORLD_SIZE / 2;
    player.y = WORLD_SIZE / 2;

    let bullets: Array<{ x: number; y: number; dx: number; dy: number; fromPlayer: boolean; life: number }> = [];
    let enemies: Array<{ x: number; y: number; radius: number; angle: number; speed: number; hp: number; state: string; timer: number }> = [];
    let obstacles: Array<{ x: number; y: number; width: number; height: number; type: string }> = [];
    let localKills = 0;
    let localAlive = 25;
    let matchStartTime = performance.now();

    // Generate Obstacles
    for (let i = 0; i < 22; i++) {
      obstacles.push({
        x: Math.random() * (WORLD_SIZE - 300) + 150,
        y: Math.random() * (WORLD_SIZE - 300) + 150,
        width: Math.random() * 90 + 60,
        height: Math.random() * 90 + 60,
        type: Math.random() > 0.4 ? 'building' : 'tree',
      });
    }

    // Generate AI Bots
    for (let i = 0; i < 24; i++) {
      enemies.push({
        x: Math.random() * (WORLD_SIZE - 200) + 100,
        y: Math.random() * (WORLD_SIZE - 200) + 100,
        radius: 18,
        angle: Math.random() * Math.PI * 2,
        speed: 2 + Math.random() * 1.5,
        hp: 100,
        state: 'wandering',
        timer: 0,
      });
    }

    const update = () => {
      // Move Player
      if (joystickRef.current.active) {
        player.x += joystickRef.current.dx * player.speed;
        player.y += joystickRef.current.dy * player.speed;
        player.angle = Math.atan2(joystickRef.current.dy, joystickRef.current.dx);
      }

      player.x = Math.max(30, Math.min(WORLD_SIZE - 30, player.x));
      player.y = Math.max(30, Math.min(WORLD_SIZE - 30, player.y));

      // Update Bullets
      for (let i = bullets.length - 1; i >= 0; i--) {
        let b = bullets[i];
        b.x += b.dx;
        b.y += b.dy;
        b.life--;

        if (b.life <= 0) {
          bullets.splice(i, 1);
          continue;
        }

        if (b.fromPlayer) {
          for (let j = enemies.length - 1; j >= 0; j--) {
            let e = enemies[j];
            let dist = Math.hypot(b.x - e.x, b.y - e.y);
            if (dist < e.radius) {
              e.hp -= 35;
              bullets.splice(i, 1);
              if (e.hp <= 0) {
                enemies.splice(j, 1);
                localKills++;
                localAlive = Math.max(1, localAlive - 1);
                setKills(localKills);
                setAlive(localAlive);
                updateMissionProgress('kill_50_bots', 1);
                updateCurrency(15);

                if (localAlive === 1 || enemies.length === 0) {
                  const elapsedSec = Math.floor((performance.now() - matchStartTime) / 1000);
                  const mins = Math.floor(elapsedSec / 60);
                  const secs = elapsedSec % 60;
                  const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
                  const earned = localKills * 20 + 200;
                  saveMatchResults(localKills * 300 + 1000, 5, localKills);

                  setSummary({
                    type: 'wave_complete',
                    wave: 5,
                    totalKills: localKills,
                    currencyEarned: earned,
                    damage: localKills * 120,
                    survivalTime: timeStr,
                    isVictory: true,
                    score: localKills * 300 + 1000,
                  });
                }
              }
              break;
            }
          }
        }
      }

      // Update Enemies
      for (let e of enemies) {
        let distToPlayer = Math.hypot(player.x - e.x, player.y - e.y);
        if (distToPlayer < 400) {
          e.angle = Math.atan2(player.y - e.y, player.x - e.x);
          e.x += Math.cos(e.angle) * e.speed;
          e.y += Math.sin(e.angle) * e.speed;

          if (Math.random() < 0.015 && distToPlayer < 280) {
            bullets.push({
              x: e.x,
              y: e.y,
              dx: Math.cos(e.angle) * 8,
              dy: Math.sin(e.angle) * 8,
              fromPlayer: false,
              life: 60,
            });
          }
        } else {
          e.timer++;
          if (e.timer > 100) {
            e.angle += (Math.random() - 0.5) * 2;
            e.timer = 0;
          }
          e.x += Math.cos(e.angle) * (e.speed * 0.5);
          e.y += Math.sin(e.angle) * (e.speed * 0.5);
        }

        // Player damage
        for (let i = bullets.length - 1; i >= 0; i--) {
          let b = bullets[i];
          if (!b.fromPlayer) {
            let hitDist = Math.hypot(b.x - player.x, b.y - player.y);
            if (hitDist < player.radius) {
              player.hp -= 12;
              bullets.splice(i, 1);
              setHp(Math.max(0, player.hp));
              if (player.hp <= 0) {
                const elapsedSec = Math.floor((performance.now() - matchStartTime) / 1000);
                const mins = Math.floor(elapsedSec / 60);
                const secs = elapsedSec % 60;
                const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
                const earned = localKills * 10 + 50;
                saveMatchResults(localKills * 150 + 200, 1, localKills);

                setSummary({
                  type: 'player_died',
                  wave: 1,
                  totalKills: localKills,
                  currencyEarned: earned,
                  damage: localKills * 80,
                  survivalTime: timeStr,
                  isVictory: false,
                  score: localKills * 150 + 200,
                });
              }
            }
          }
        }
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.translate(canvas.width / 2 - player.x, canvas.height / 2 - player.y);

      // Ground
      ctx.fillStyle = '#2d5a27';
      ctx.fillRect(0, 0, WORLD_SIZE, WORLD_SIZE);

      // Grid Lines
      ctx.strokeStyle = '#356d2f';
      ctx.lineWidth = 2;
      for (let x = 0; x < WORLD_SIZE; x += 120) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, WORLD_SIZE); ctx.stroke();
      }
      for (let y = 0; y < WORLD_SIZE; y += 120) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WORLD_SIZE, y); ctx.stroke();
      }

      // Obstacles
      for (let obs of obstacles) {
        if (obs.type === 'building') {
          ctx.fillStyle = '#7a7a7a';
          ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
          ctx.strokeStyle = '#444';
          ctx.lineWidth = 4;
          ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
        } else {
          ctx.fillStyle = '#1e3f1c';
          ctx.beginPath();
          ctx.arc(obs.x + obs.width / 2, obs.y + obs.height / 2, obs.width / 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#122611';
          ctx.lineWidth = 3;
          ctx.stroke();
        }
      }

      // Enemies
      for (let e of enemies) {
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.rotate(e.angle);
        ctx.fillStyle = '#dc2626';
        ctx.beginPath(); ctx.arc(0, 0, e.radius, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#111';
        ctx.fillRect(5, -4, 16, 6);
        ctx.restore();
      }

      // Bullets
      ctx.fillStyle = '#fef08a';
      for (let b of bullets) {
        ctx.beginPath();
        ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Player
      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.rotate(player.angle);
      ctx.fillStyle = '#451a03';
      ctx.fillRect(-14, -10, 10, 20);
      ctx.fillStyle = '#f97316';
      ctx.beginPath(); ctx.arc(0, 0, player.radius, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#374151';
      ctx.beginPath(); ctx.arc(4, 0, player.radius * 0.6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1f2937';
      ctx.fillRect(6, -5, 22, 7);
      ctx.restore();

      ctx.restore();

      // Minimap
      if (minictx && minimapCanvas) {
        minictx.clearRect(0, 0, minimapCanvas.width, minimapCanvas.height);
        const scaleX = minimapCanvas.width / WORLD_SIZE;
        const scaleY = minimapCanvas.height / WORLD_SIZE;

        minictx.fillStyle = '#38bdf8';
        minictx.beginPath();
        minictx.arc(player.x * scaleX, player.y * scaleY, 3.5, 0, Math.PI * 2);
        minictx.fill();

        minictx.fillStyle = '#ef4444';
        for (let e of enemies) {
          minictx.beginPath();
          minictx.arc(e.x * scaleX, e.y * scaleY, 2, 0, Math.PI * 2);
          minictx.fill();
        }
      }
    };

    const loop = () => {
      update();
      draw();
      gameLoopRef.current = requestAnimationFrame(loop);
    };
    gameLoopRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(gameLoopRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  // Joystick touch handlers
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.changedTouches[0];
    const zone = e.currentTarget;
    const rect = zone.getBoundingClientRect();
    joystickRef.current.active = true;
    joystickRef.current.id = touch.identifier;
    joystickRef.current.x = rect.left + rect.width / 2;
    joystickRef.current.y = rect.top + rect.height / 2;
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (joystickRef.current.active && touch.identifier === joystickRef.current.id) {
        let dx = touch.clientX - joystickRef.current.x;
        let dy = touch.clientY - joystickRef.current.y;
        let dist = Math.hypot(dx, dy);
        let maxDist = 45;
        if (dist > maxDist) {
          dx = (dx / dist) * maxDist;
          dy = (dy / dist) * maxDist;
        }
        stickPosRef.current = { x: dx, y: dy };
        joystickRef.current.dx = dx / maxDist;
        joystickRef.current.dy = dy / maxDist;
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (joystickRef.current.active && touch.identifier === joystickRef.current.id) {
        joystickRef.current.active = false;
        joystickRef.current.dx = 0;
        joystickRef.current.dy = 0;
        stickPosRef.current = { x: 0, y: 0 };
      }
    }
  };

  const handleShoot = () => {
    const player = playerRef.current;
    if (player.isReloading || player.ammo <= 0) return;
    player.ammo--;
    setAmmo(player.ammo);
  };

  const handleReload = () => {
    const player = playerRef.current;
    if (player.isReloading || player.ammo >= 30) return;
    player.isReloading = true;
    setWeaponName('RELOADING...');
    setIsReloading(true);
    setTimeout(() => {
      player.ammo = 30;
      setAmmo(30);
      setWeaponName('M4A1 RIFLE');
      player.isReloading = false;
      setIsReloading(false);
    }, 1200);
  };

  const handleJump = () => {
    const player = playerRef.current;
    player.x += Math.cos(player.angle) * 45;
    player.y += Math.sin(player.angle) * 45;
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#1a1a1a] text-white select-none">
      {/* Game Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block touch-none" />

      {/* Top HUD */}
      <div className="absolute top-3 left-3 right-3 flex justify-between items-start pointer-events-none z-10">
        {/* Minimap */}
        <div className="w-24 h-24 bg-black/60 border-2 border-cyan-500/50 rounded-full relative overflow-hidden shadow-lg">
          <canvas ref={minimapRef} className="w-full h-full" />
          <div className="absolute bottom-1 left-0 right-0 text-center text-[9px] font-bold tracking-wider text-cyan-400">
            RADAR
          </div>
        </div>

        {/* Match Stats */}
        <div className="flex gap-2">
          <div className="bg-black/70 backdrop-blur border border-white/10 px-3 py-1.5 rounded-lg text-center shadow">
            <div className="text-[10px] text-gray-400 font-bold uppercase">Alive</div>
            <div className="text-lg font-extrabold text-white">{alive}</div>
          </div>
          <div className="bg-black/70 backdrop-blur border border-white/10 px-3 py-1.5 rounded-lg text-center shadow">
            <div className="text-[10px] text-gray-400 font-bold uppercase">Kills</div>
            <div className="text-lg font-extrabold text-yellow-400">{kills}</div>
          </div>
        </div>

        {/* Weapon Info */}
        <div className="bg-black/70 backdrop-blur border border-white/10 px-3 py-1.5 rounded-lg shadow min-w-[110px] text-right">
          <div className="text-xs font-bold text-cyan-300">{weaponName}</div>
          <div className="text-base font-extrabold text-white">
            {ammo} <span className="text-xs text-gray-400">/ {maxAmmo}</span>
          </div>
        </div>

        {/* Exit to Lobby */}
        <button
          onClick={onExitToLobby}
          className="pointer-events-auto px-3 py-1.5 rounded-lg bg-black/85 border border-slate-700 text-xs font-bold text-slate-300 hover:text-white"
        >
          ✕ Exit
        </button>
      </div>

      {/* Bottom Health & EP Bars */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-80 max-w-[90vw] pointer-events-none z-10 bg-black/60 backdrop-blur border border-white/10 p-2 rounded-xl shadow-xl">
        <div className="flex justify-between text-[10px] font-bold text-gray-300 mb-0.5">
          <span>EP</span>
          <span>100 / 200</span>
        </div>
        <div className="w-full h-1.5 bg-gray-700 rounded-full mb-1.5 overflow-hidden">
          <div className="w-1/2 h-full bg-amber-400 rounded-full" />
        </div>
        <div className="flex justify-between text-[10px] font-bold text-gray-300 mb-0.5">
          <span>HP</span>
          <span>
            {hp} / {maxHp}
          </span>
        </div>
        <div className="w-full h-2.5 bg-gray-700 rounded-full overflow-hidden flex">
          <div
            className="h-full bg-emerald-500 transition-all duration-200"
            style={{ width: `${(hp / maxHp) * 100}%` }}
          />
        </div>
        <div className="flex justify-between text-[9px] text-gray-400 mt-1">
          <span>🛡️ Vest: 100%</span>
          <span>🪖 Helmet: 100%</span>
        </div>
      </div>

      {/* Touch Controls Layer */}
      {/* Left Joystick Zone */}
      <div
        className="absolute bottom-4 left-4 w-36 h-36 rounded-full border border-white/10 bg-white/5 pointer-events-auto flex items-center justify-center z-20 touch-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="w-14 h-14 bg-white/30 rounded-full absolute shadow-md transition-transform duration-75 pointer-events-none"
          style={{ transform: `translate(${stickPosRef.current.x}px, ${stickPosRef.current.y}px)` }}
        />
      </div>

      {/* Right Action Buttons */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-3 pointer-events-auto z-20">
        <div className="flex gap-3 justify-end">
          <button
            onClick={handleReload}
            disabled={isReloading}
            className="w-14 h-14 bg-gray-800/80 border border-white/20 rounded-full flex flex-col items-center justify-center shadow-lg active:scale-95 text-white text-[10px] font-bold"
          >
            🔄 RELOAD
          </button>
          <button
            onClick={handleJump}
            className="w-14 h-14 bg-gray-800/80 border border-white/20 rounded-full flex flex-col items-center justify-center shadow-lg active:scale-95 text-white text-[10px] font-bold"
          >
            🏃 JUMP
          </button>
        </div>
        <button
          onClick={handleShoot}
          className="w-24 h-24 bg-gradient-to-tr from-amber-600 to-orange-500 border-4 border-white/30 rounded-full flex items-center justify-center shadow-2xl active:scale-95 text-white font-extrabold tracking-wider text-sm"
        >
          FIRE
        </button>
      </div>

      {/* Post-Game Summary Modal */}
      {summary && (
        <PostGameSummaryModal
          summary={summary}
          onPlayAgain={() => {
            setSummary(null);
            setHp(200);
            setKills(0);
            setAlive(25);
          }}
          onReturnToLobby={onExitToLobby}
        />
      )}
    </div>
  );
};
