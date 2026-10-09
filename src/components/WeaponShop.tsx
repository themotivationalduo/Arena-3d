import { useState, useEffect } from 'react';
import {
  getUserProfile,
  purchaseSkin,
  equipSkin,
  UserProfileData,
} from '../services/userService';

export interface WeaponSkinItem {
  id: string;
  name: string;
  cost: number;
  description: string;
  colorHex: string;
  previewClass: string;
}

export const AVAILABLE_SKINS: WeaponSkinItem[] = [
  {
    id: 'default',
    name: 'Standard Military',
    cost: 0,
    description: 'Factory issue tactical matte black finish',
    colorHex: '#374151',
    previewClass: 'from-slate-700 to-zinc-900',
  },
  {
    id: 'skin1',
    name: 'Desert Camo',
    cost: 100,
    description: 'Arid climate stealth camo pattern with bronze dust finish',
    colorHex: '#d4a373',
    previewClass: 'from-amber-700 to-yellow-900',
  },
  {
    id: 'skin2',
    name: 'Gold Plated',
    cost: 500,
    description: '24-Karat mirror polished gold finish for elite operators',
    colorHex: '#ffd700',
    previewClass: 'from-yellow-400 to-amber-600',
  },
  {
    id: 'skin3',
    name: 'Cyber Neon',
    cost: 750,
    description: 'Bioluminescent cyan carbon fiber weave',
    colorHex: '#06b6d4',
    previewClass: 'from-cyan-500 to-blue-700',
  },
];

interface WeaponShopProps {
  onClose?: () => void;
}

export const WeaponShop = ({ onClose }: WeaponShopProps) => {
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [purchasingSkinId, setPurchasingSkinId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const loadData = async () => {
    const data = await getUserProfile();
    setProfile(data);
  };

  useEffect(() => {
    loadData();
  }, []);

  const currency = profile?.currency ?? 0;
  const ownedSkins = profile?.ownedSkins || profile?.purchasedSkins || ['default'];
  const equippedSkin = profile?.equippedSkin || 'default';

  const handleEquip = async (skinId: string) => {
    await equipSkin(skinId);
    setProfile((prev) => (prev ? { ...prev, equippedSkin: skinId } : null));
    setStatusMessage(`Equipped ${AVAILABLE_SKINS.find((s) => s.id === skinId)?.name}!`);
    setTimeout(() => setStatusMessage(null), 2500);
  };

  const handlePurchase = async (skin: WeaponSkinItem) => {
    if (currency >= skin.cost && !ownedSkins.includes(skin.id)) {
      setPurchasingSkinId(skin.id);
      await purchaseSkin(skin.id, skin.cost);
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              currency: prev.currency - skin.cost,
              ownedSkins: [...(prev.ownedSkins || []), skin.id],
            }
          : null
      );
      setPurchasingSkinId(null);
      setStatusMessage(`Unlocked ${skin.name}!`);
      setTimeout(() => setStatusMessage(null), 2500);
    }
  };

  return (
    <div className="bg-zinc-950/95 border border-slate-700/80 rounded-2xl p-5 text-white shadow-2xl backdrop-blur-md flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400 font-bold">
            ⚔️
          </div>
          <div>
            <h2 className="text-lg font-bold font-tactical uppercase tracking-wider text-white">
              Tactical Armory
            </h2>
            <p className="text-xs text-slate-400">Unlock custom weapon finishes and loadouts</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-3 py-1 rounded-xl bg-black/60 border border-slate-800 flex items-center gap-1.5 text-xs font-tactical">
            <span className="text-slate-400">BALANCE:</span>
            <span className="text-amber-400 font-bold tabular-nums">🪙 {currency}</span>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {statusMessage && (
        <div className="text-xs text-center py-1.5 px-3 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-semibold animate-pulse">
          {statusMessage}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {AVAILABLE_SKINS.map((skin) => {
          const isOwned = ownedSkins.includes(skin.id) || skin.cost === 0;
          const isEquipped = equippedSkin === skin.id;
          const canAfford = currency >= skin.cost;

          return (
            <div
              key={skin.id}
              className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all ${
                isEquipped
                  ? 'bg-amber-950/20 border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                  : isOwned
                  ? 'bg-black/60 border-slate-800'
                  : 'bg-black/40 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <div>
                {/* Visual Preview Swatch */}
                <div
                  className={`h-14 w-full rounded-lg bg-gradient-to-r ${skin.previewClass} mb-2.5 flex items-center justify-center shadow-inner relative overflow-hidden border border-white/10`}
                >
                  <div className="text-xs font-tactical font-bold text-white drop-shadow px-2 py-0.5 rounded bg-black/40">
                    {skin.name}
                  </div>
                  {isEquipped && (
                    <span className="absolute top-1.5 right-1.5 text-[9px] font-bold bg-amber-500 text-slate-950 px-1.5 py-0.5 rounded font-tactical uppercase">
                      EQUIPPED
                    </span>
                  )}
                </div>

                <div className="flex justify-between items-start mb-1">
                  <span className="font-semibold text-sm text-white">{skin.name}</span>
                  {!isOwned && (
                    <span className="font-tactical font-bold text-xs text-amber-400">
                      🪙 {skin.cost}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mb-3">{skin.description}</p>
              </div>

              <div className="flex gap-2 mt-auto">
                {isOwned ? (
                  <button
                    disabled={isEquipped}
                    onClick={() => handleEquip(skin.id)}
                    className={`w-full py-2 rounded-lg text-xs font-tactical font-bold tracking-wider uppercase transition ${
                      isEquipped
                        ? 'bg-slate-800/60 text-slate-400 cursor-default'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow active:scale-95'
                    }`}
                  >
                    {isEquipped ? 'Currently Active' : 'Equip Skin'}
                  </button>
                ) : (
                  <button
                    disabled={!canAfford || purchasingSkinId === skin.id}
                    onClick={() => handlePurchase(skin)}
                    className={`w-full py-2 rounded-lg text-xs font-tactical font-bold tracking-wider uppercase transition ${
                      canAfford
                        ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 shadow-md active:scale-95'
                        : 'bg-zinc-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    {purchasingSkinId === skin.id
                      ? 'Unlocking...'
                      : canAfford
                      ? `Unlock (🪙 ${skin.cost})`
                      : `Needs 🪙 ${skin.cost}`}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
