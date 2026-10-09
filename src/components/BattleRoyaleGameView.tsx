import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { WeaponDef, WEAPON_REGISTRY } from '../game/BattleRoyale2D';
import { updateMissionProgress, saveMatchResults, updateCurrency } from '../services/userService';
import { PostGameSummaryModal, PostGameSummaryData } from './PostGameSummaryModal';

interface BattleRoyaleGameViewProps {
  onExitToLobby: () => void;
}

export const BattleRoyaleGameView: React.FC<BattleRoyaleGameViewProps> = ({ onExitToLobby }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Live HUD States
  const [hp, setHp] = useState(200);
  const [ep, setEp] = useState(100);
  const [armor, setArmor] = useState(100);
  const [helmet, setHelmet] = useState(100);
  const [alive, setAlive] = useState(25);
  const [kills, setKills] = useState(0);
  const [weapon, setWeapon] = useState<WeaponDef>(WEAPON_REGISTRY.m4a1);
  const [ammo, setAmmo] = useState(30);
  const [reserve, setReserve] = useState(180);
  const [isReloading, setIsReloading] = useState(false);
  const [summary, setSummary] = useState<PostGameSummaryData | null>(null);

  // Touch and Input Refs
  const inputRef = useRef({
    moveX: 0,
    moveY: 0,
    lookX: 0,
    lookY: 0,
    isFiring: false,
    isJumping: false,
    isCrouching: false,
    isReloading: false,
  });

  const gameEngineRef = useRef<{
    playerMesh: THREE.Group;
    playerVelocity: THREE.Vector3;
    cameraAngleX: number;
    cameraAngleY: number;
    bots: Array<{ mesh: THREE.Group; hp: number; isDead: boolean; velocity: THREE.Vector3 }>;
    bullets: Array<{ mesh: THREE.Mesh; velocity: THREE.Vector3; owner: string; life: number }>;
    scene: THREE.Scene;
    renderer: THREE.WebGLRenderer;
    camera: THREE.PerspectiveCamera;
    animate: () => void;
  } | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb); // Daytime sky
    scene.fog = new THREE.FogExp2(0x87ceeb, 0.0035);

    const camera = new THREE.PerspectiveCamera(65, width / height, 0.5, 3000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // 2. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfffaed, 1.2);
    sunLight.position.set(300, 600, 300);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 1500;
    const d = 400;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    scene.add(sunLight);

    // 3. Terrain Ground (Grassy Field)
    const groundGeo = new THREE.PlaneGeometry(3000, 3000, 64, 64);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x416d38,
      roughness: 0.9,
      metalness: 0.1,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // 4. Tactical Arena Elements (Buildings, Pylons, Trees, Cover Walls)
    const createBuilding = (x: number, z: number, w: number, h: number, d: number) => {
      const group = new THREE.Group();
      // Walls
      const wallMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.7 });
      const wallGeo = new THREE.BoxGeometry(w, h, d);
      const mesh = new THREE.Mesh(wallGeo, wallMat);
      mesh.position.set(0, h / 2, 0);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);

      // Roof
      const roofMat = new THREE.MeshStandardMaterial({ color: 0x334155 });
      const roofGeo = new THREE.BoxGeometry(w + 4, 3, d + 4);
      const roofMesh = new THREE.Mesh(roofGeo, roofMat);
      roofMesh.position.set(0, h + 1.5, 0);
      roofMesh.castShadow = true;
      group.add(roofMesh);

      group.position.set(x, 0, z);
      scene.add(group);
    };

    // Spawn Compounds
    createBuilding(-200, -200, 120, 70, 120);
    createBuilding(300, -350, 160, 80, 140);
    createBuilding(-300, 300, 140, 75, 140);
    createBuilding(250, 250, 130, 70, 130);

    // Low cover walls & trees
    const treeMat = new THREE.MeshStandardMaterial({ color: 0x1c3d18, roughness: 0.8 });
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4033 });
    for (let i = 0; i < 70; i++) {
      const tx = (Math.random() - 0.5) * 2400;
      const tz = (Math.random() - 0.5) * 2400;
      if (Math.hypot(tx, tz) > 150) {
        const treeGroup = new THREE.Group();
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(4, 6, 35, 8), trunkMat);
        trunk.position.set(0, 17.5, 0);
        trunk.castShadow = true;
        treeGroup.add(trunk);

        const foliage = new THREE.Mesh(new THREE.ConeGeometry(25, 60, 8), treeMat);
        foliage.position.set(0, 50, 0);
        foliage.castShadow = true;
        treeGroup.add(foliage);

        treeGroup.position.set(tx, 0, tz);
        scene.add(treeGroup);
      }
    }

    // 5. Player Character (3D Group: Helmet, Backpack, Jacket, Pants, Rifle)
    const createOperatorMesh = (isBot = false) => {
      const group = new THREE.Group();

      // Torso / Jacket
      const torsoMat = new THREE.MeshStandardMaterial({ color: isBot ? 0x3f3f46 : 0x1e293b });
      const torso = new THREE.Mesh(new THREE.BoxGeometry(14, 22, 8), torsoMat);
      torso.position.set(0, 25, 0);
      torso.castShadow = true;
      group.add(torso);

      // Backpack (Level 3 Tactical from Image 2)
      const bpMat = new THREE.MeshStandardMaterial({ color: isBot ? 0x1e293b : 0x78350f });
      const backpack = new THREE.Mesh(new THREE.BoxGeometry(12, 18, 10), bpMat);
      backpack.position.set(0, 26, -6);
      backpack.castShadow = true;
      group.add(backpack);

      // Helmet (Spetsnaz Level 3 Helmet with visor)
      const helmetMat = new THREE.MeshStandardMaterial({ color: isBot ? 0x475569 : 0x2e3a23, roughness: 0.4 });
      const helmet = new THREE.Mesh(new THREE.SphereGeometry(7, 12, 12), helmetMat);
      helmet.position.set(0, 40, 0);
      helmet.castShadow = true;
      group.add(helmet);

      const visorMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8, roughness: 0.2 });
      const visor = new THREE.Mesh(new THREE.BoxGeometry(8, 5, 4), visorMat);
      visor.position.set(0, 39, 4);
      group.add(visor);

      // Legs / Pants
      const pantsMat = new THREE.MeshStandardMaterial({ color: 0x382f2d });
      const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(5, 20, 5), pantsMat);
      leftLeg.position.set(-4, 10, 0);
      leftLeg.castShadow = true;
      group.add(leftLeg);

      const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(5, 20, 5), pantsMat);
      rightLeg.position.set(4, 10, 0);
      rightLeg.castShadow = true;
      group.add(rightLeg);

      // Rifle
      const gunMat = new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.8 });
      const rifle = new THREE.Mesh(new THREE.BoxGeometry(4, 4, 26), gunMat);
      rifle.position.set(7, 24, 6);
      group.add(rifle);

      return group;
    };

    const playerMesh = createOperatorMesh(false);
    playerMesh.position.set(0, 0, 0);
    scene.add(playerMesh);

    // 6. Spawn Enemy Bots
    const bots: Array<{ mesh: THREE.Group; hp: number; isDead: boolean; velocity: THREE.Vector3 }> = [];
    for (let i = 0; i < 24; i++) {
      const botMesh = createOperatorMesh(true);
      const bx = (Math.random() - 0.5) * 2000;
      const bz = (Math.random() - 0.5) * 2000;
      botMesh.position.set(bx, 0, bz);
      scene.add(botMesh);
      bots.push({
        mesh: botMesh,
        hp: 150,
        isDead: false,
        velocity: new THREE.Vector3(),
      });
    }

    // 7. Bullets Array
    const bullets: Array<{ mesh: THREE.Mesh; velocity: THREE.Vector3; owner: string; life: number }> = [];

    const bulletGeo = new THREE.SphereGeometry(1.5, 8, 8);
    const bulletMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });

    // Game Loop State
    const playerVelocity = new THREE.Vector3();
    let cameraAngleX = 0;
    let cameraAngleY = 0.3; // slightly above shoulder

    let currentHp = 200;
    let currentKills = 0;
    let currentAmmo = 30;
    let currentReserve = 180;
    let lastShotTime = 0;

    const engineState = {
      playerMesh,
      playerVelocity,
      cameraAngleX,
      cameraAngleY,
      bots,
      bullets,
      scene,
      renderer,
      camera,
      animate: () => {},
    };
    gameEngineRef.current = engineState;

    // Animation & Render Loop
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const dt = Math.min(0.1, clock.getDelta());

      const inp = inputRef.current;

      // 1. Player Movement based on camera angle
      const moveDir = new THREE.Vector3(inp.moveX, 0, inp.moveY);
      if (moveDir.lengthSq() > 0) {
        moveDir.normalize();
        // Rotate move direction by camera horizontal angle
        moveDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraAngleX);
        const speed = 120;
        playerVelocity.lerp(moveDir.multiplyScalar(speed), 0.2);
        playerMesh.position.addScaledVector(playerVelocity, dt);
        // Face player toward movement or camera
        playerMesh.rotation.y = cameraAngleX + Math.atan2(inp.moveX, inp.moveY);
      } else {
        playerVelocity.lerp(new THREE.Vector3(0, 0, 0), 0.3);
      }

      // Bound player to arena
      playerMesh.position.x = Math.max(-1400, Math.min(1400, playerMesh.position.x));
      playerMesh.position.z = Math.max(-1400, Math.min(1400, playerMesh.position.z));

      // 2. Camera Over-the-Shoulder Tracking (Smooth Orbit behind right shoulder)
      cameraAngleX += inp.lookX * 0.005;
      cameraAngleY = Math.max(-0.2, Math.min(1.2, cameraAngleY + inp.lookY * 0.005));
      inputRef.current.lookX = 0;
      inputRef.current.lookY = 0;

      const camDistance = 70;
      const camHeight = 35 + cameraAngleY * 20;
      const shoulderOffset = 18; // Right shoulder offset

      const targetCamX = playerMesh.position.x - Math.sin(cameraAngleX) * camDistance + Math.cos(cameraAngleX) * shoulderOffset;
      const targetCamZ = playerMesh.position.z - Math.cos(cameraAngleX) * camDistance - Math.sin(cameraAngleX) * shoulderOffset;
      const targetCamY = playerMesh.position.y + camHeight;

      camera.position.lerp(new THREE.Vector3(targetCamX, targetCamY, targetCamZ), 0.2);
      camera.lookAt(playerMesh.position.clone().add(new THREE.Vector3(0, 20, 0)));

      // 3. Firing
      const now = performance.now() / 1000;
      if (inp.isFiring && !isReloading && currentAmmo > 0 && now - lastShotTime > 0.12) {
        lastShotTime = now;
        currentAmmo--;
        setAmmo(currentAmmo);

        const bulletMesh = new THREE.Mesh(bulletGeo, bulletMat);
        bulletMesh.position.copy(playerMesh.position).add(new THREE.Vector3(0, 25, 0));
        scene.add(bulletMesh);

        const shootDir = new THREE.Vector3(Math.sin(playerMesh.rotation.y), 0, Math.cos(playerMesh.rotation.y)).normalize();
        bullets.push({
          mesh: bulletMesh,
          velocity: shootDir.multiplyScalar(1400),
          owner: 'player',
          life: 2.0,
        });
      }

      // 4. Update Bullets
      for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        b.mesh.position.addScaledVector(b.velocity, dt);
        b.life -= dt;

        if (b.life <= 0 || Math.abs(b.mesh.position.x) > 1500 || Math.abs(b.mesh.position.z) > 1500) {
          scene.remove(b.mesh);
          bullets.splice(i, 1);
          continue;
        }

        // Bullet hit detection against bots
        if (b.owner === 'player') {
          let hit = false;
          for (const bot of bots) {
            if (!bot.isDead && bot.mesh.position.distanceTo(b.mesh.position) < 20) {
              bot.hp -= 34;
              hit = true;
              if (bot.hp <= 0) {
                bot.isDead = true;
                scene.remove(bot.mesh);
                currentKills++;
                setKills(currentKills);
                updateMissionProgress('kill_50_bots', 1);
                updateCurrency(15);
              }
              break;
            }
          }
          if (hit) {
            scene.remove(b.mesh);
            bullets.splice(i, 1);
          }
        }
      }

      // 5. Bot AI Movement & Attack
      bots.forEach((bot) => {
        if (bot.isDead) return;
        const dir = playerMesh.position.clone().sub(bot.mesh.position);
        const dist = dir.length();
        if (dist > 15) {
          dir.normalize();
          bot.mesh.position.addScaledVector(dir, 55 * dt);
          bot.mesh.lookAt(playerMesh.position);
        } else {
          // Bot attacks player
          currentHp = Math.max(0, currentHp - 5 * dt);
          setHp(Math.round(currentHp));
          if (currentHp <= 0) {
            setSummary({
              type: 'player_died',
              wave: 1,
              totalKills: currentKills,
              currencyEarned: currentKills * 10 + 30,
              damage: currentKills * 100,
              survivalTime: '02:45',
              isVictory: false,
              score: currentKills * 150,
            });
            saveMatchResults(currentKills * 150, 1, currentKills);
          }
        }
      });

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Touch Drag Camera Look Handlers
  const touchLookRef = useRef({ active: false, lastX: 0, lastY: 0 });

  const handleTouchLookStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchLookRef.current = { active: true, lastX: t.clientX, lastY: t.clientY };
  };

  const handleTouchLookMove = (e: React.TouchEvent) => {
    if (!touchLookRef.current.active) return;
    const t = e.touches[0];
    const dx = t.clientX - touchLookRef.current.lastX;
    const dy = t.clientY - touchLookRef.current.lastY;
    inputRef.current.lookX = dx;
    inputRef.current.lookY = dy;
    touchLookRef.current.lastX = t.clientX;
    touchLookRef.current.lastY = t.clientY;
  };

  const handleTouchLookEnd = () => {
    touchLookRef.current.active = false;
  };

  // Joystick touch handlers
  const handleJoystickTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = t.clientX - cx;
    const dy = t.clientY - cy;
    const len = Math.hypot(dx, dy) || 1;
    inputRef.current.moveX = Math.max(-1, Math.min(1, dx / (rect.width / 2)));
    inputRef.current.moveY = Math.max(-1, Math.min(1, dy / (rect.height / 2)));
  };

  const handleJoystickTouchMove = (e: React.TouchEvent) => {
    handleJoystickTouchStart(e);
  };

  const handleJoystickTouchEnd = () => {
    inputRef.current.moveX = 0;
    inputRef.current.moveY = 0;
  };

  const handleReload = () => {
    if (isReloading || reserve <= 0) return;
    setIsReloading(true);
    setTimeout(() => {
      const needed = 30 - ammo;
      const take = Math.min(needed, reserve);
      setAmmo(ammo + take);
      setReserve(reserve - take);
      setIsReloading(false);
    }, 1500);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden select-none bg-black text-white font-sans">
      {/* 3D Three.js Viewport Container */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full cursor-crosshair" />

      {/* FREE FIRE MOBILE HUD OVERLAY */}
      {/* Top Left: Mini-map radar & Alive/Kills */}
      <div className="absolute top-3 left-3 flex items-center gap-3 pointer-events-auto">
        <div className="w-28 h-28 rounded-full bg-black/80 border-2 border-cyan-500/60 overflow-hidden relative shadow-lg flex items-center justify-center">
          <div className="absolute w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          <div className="w-3 h-3 rounded-full bg-amber-400 z-10 shadow" />
          <span className="absolute bottom-1 text-[9px] font-tactical font-bold text-cyan-400">
            RADAR 2D
          </span>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="px-3 py-1 rounded-xl bg-black/80 border border-cyan-500/50 backdrop-blur-md flex items-center gap-2">
            <span className="text-[10px] text-slate-400 font-tactical uppercase">ALIVE</span>
            <span className="text-sm font-tactical font-bold text-white tabular-nums">{alive}</span>
          </div>
          <div className="px-3 py-1 rounded-xl bg-black/80 border border-red-500/50 backdrop-blur-md flex items-center gap-2">
            <span className="text-[10px] text-slate-400 font-tactical uppercase">KILL</span>
            <span className="text-sm font-tactical font-bold text-amber-400 tabular-nums">{kills}</span>
          </div>
        </div>
      </div>

      {/* Top Right: Weapon Ammo & Quick Reload */}
      <div className="absolute top-3 right-3 flex items-center gap-3 pointer-events-auto">
        <div className="px-4 py-2 rounded-2xl bg-black/85 border border-slate-700/80 backdrop-blur-md flex items-center gap-3 shadow-xl">
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
            className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-xs font-tactical font-bold uppercase text-slate-200 transition border border-slate-600 shadow"
          >
            Reload
          </button>
        </div>

        <button
          onClick={onExitToLobby}
          className="w-10 h-10 rounded-xl bg-black/85 hover:bg-zinc-800 border border-slate-700 text-slate-300 flex items-center justify-center font-bold shadow"
          title="Exit to Lobby"
        >
          ✕
        </button>
      </div>

      {/* Bottom Center: HP & EP Status Bars */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 w-72 sm:w-80 flex flex-col gap-1 p-2.5 rounded-2xl bg-black/80 border border-slate-800 backdrop-blur-md shadow-2xl pointer-events-none">
        <div className="flex items-center justify-between text-[10px] font-tactical font-bold text-amber-400 px-1">
          <span>EP</span>
          <span>{ep}/200</span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
          <div className="h-full bg-amber-400" style={{ width: `${(ep / 200) * 100}%` }} />
        </div>
        <div className="flex items-center justify-between text-[11px] font-tactical font-bold text-white px-1 mt-0.5">
          <span>HP ({hp}/200)</span>
          <span className="text-[10px] text-slate-400">🛡️ {armor}% · 🪖 {helmet}%</span>
        </div>
        <div className="w-full h-3 rounded-full bg-slate-900 overflow-hidden border border-slate-700">
          <div className="h-full bg-emerald-500 transition-all" style={{ width: `${(hp / 200) * 100}%` }} />
        </div>
      </div>

      {/* LEFT SIDE: Floating Virtual Movement Joystick */}
      <div
        className="absolute bottom-8 left-8 w-36 h-36 rounded-full border-2 border-white/20 bg-black/30 backdrop-blur-xs flex items-center justify-center touch-none select-none pointer-events-auto"
        onTouchStart={handleJoystickTouchStart}
        onTouchMove={handleJoystickTouchMove}
        onTouchEnd={handleJoystickTouchEnd}
      >
        <div className="w-14 h-14 rounded-full bg-white/50 border border-white/80 shadow-md pointer-events-none" />
      </div>

      {/* RIGHT SIDE: Camera Drag Rotation Area & Touch Action Buttons (Fire, Jump, Crouch) */}
      <div
        className="absolute inset-y-0 right-0 w-1/2 touch-none select-none pointer-events-auto"
        onTouchStart={handleTouchLookStart}
        onTouchMove={handleTouchLookMove}
        onTouchEnd={handleTouchLookEnd}
      />

      <div className="absolute bottom-8 right-8 flex items-center gap-3 pointer-events-auto touch-none select-none">
        <div className="flex flex-col gap-2">
          <button
            onClick={() => {
              inputRef.current.isJumping = true;
              setTimeout(() => { inputRef.current.isJumping = false; }, 300);
            }}
            className="w-12 h-12 rounded-full bg-black/60 border border-white/30 text-white font-tactical font-bold text-xs flex items-center justify-center active:bg-cyan-500 shadow-lg"
          >
            JUMP
          </button>
          <button
            onClick={() => {
              inputRef.current.isCrouching = !inputRef.current.isCrouching;
            }}
            className="w-12 h-12 rounded-full bg-black/60 border border-white/30 text-white font-tactical font-bold text-xs flex items-center justify-center active:bg-cyan-500 shadow-lg"
          >
            CROUCH
          </button>
        </div>

        {/* Big Fire Button */}
        <button
          onTouchStart={() => { inputRef.current.isFiring = true; }}
          onTouchEnd={() => { inputRef.current.isFiring = false; }}
          onMouseDown={() => { inputRef.current.isFiring = true; }}
          onMouseUp={() => { inputRef.current.isFiring = false; }}
          className="w-24 h-24 rounded-full bg-gradient-to-tr from-amber-500 to-orange-600 active:scale-95 border-2 border-white/60 shadow-2xl flex flex-col items-center justify-center text-white transition"
        >
          <span className="font-tactical font-black text-sm tracking-wider text-slate-950">FIRE</span>
        </button>
      </div>

      {/* POST-GAME SUMMARY MODAL */}
      {summary && (
        <PostGameSummaryModal
          summary={summary}
          onPlayAgain={() => {
            setSummary(null);
            setHp(200);
            setKills(0);
          }}
          onReturnToLobby={onExitToLobby}
        />
      )}
    </div>
  );
};
