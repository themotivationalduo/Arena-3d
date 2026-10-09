import { useEffect, useState } from 'react';
import { getSettings, updateSettings, UserSettingsData } from '../services/settingsService';

interface SettingsModalProps {
  onClose?: () => void;
}

export const SettingsModal = ({ onClose }: SettingsModalProps) => {
  const [settings, setSettings] = useState<UserSettingsData>({
    graphicsQuality: 'high',
    audioVolume: 80,
  });

  useEffect(() => {
    getSettings().then(setSettings);
  }, []);

  const handleQualityChange = async (quality: 'low' | 'medium' | 'high') => {
    const updated = await updateSettings({ graphicsQuality: quality });
    setSettings(updated);
    // Notify 3D engine if needed
    window.dispatchEvent(new CustomEvent('graphicsQualityChanged', { detail: { quality } }));
  };

  const handleVolumeChange = async (vol: number) => {
    const updated = await updateSettings({ audioVolume: vol });
    setSettings(updated);
    window.dispatchEvent(new CustomEvent('audioVolumeChanged', { detail: { volume: vol } }));
  };

  return (
    <div className="bg-zinc-950/95 border border-slate-700/80 rounded-2xl p-5 text-white shadow-2xl backdrop-blur-md flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-bold">
            ⚙️
          </div>
          <div>
            <h2 className="text-lg font-bold font-tactical uppercase tracking-wider text-white">
              Tactical Settings
            </h2>
            <p className="text-xs text-slate-400">Configure visual fidelity and audio telemetry</p>
          </div>
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

      <div className="flex flex-col gap-4">
        {/* Graphics Quality */}
        <div className="bg-black/50 border border-slate-800 p-3.5 rounded-xl">
          <label className="text-xs font-tactical text-slate-300 font-semibold uppercase tracking-wider block mb-2">
            Rendering Performance
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['low', 'medium', 'high'] as const).map((q) => (
              <button
                key={q}
                onClick={() => handleQualityChange(q)}
                className={`py-2 px-3 rounded-lg text-xs font-tactical uppercase font-bold transition ${
                  settings.graphicsQuality === q
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'bg-zinc-900 border border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {q}
              </button>
            ))}
          </div>
          <span className="text-[10px] text-slate-500 mt-2 block">
            {settings.graphicsQuality === 'low'
              ? 'Low: Reduced shadows & particles for budget mobile devices.'
              : settings.graphicsQuality === 'medium'
              ? 'Medium: Balanced 45-60 FPS performance.'
              : 'High: Full anti-aliasing, dynamic shadows, and 60 FPS target.'}
          </span>
        </div>

        {/* Audio Volume */}
        <div className="bg-black/50 border border-slate-800 p-3.5 rounded-xl">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-tactical text-slate-300 font-semibold uppercase tracking-wider">
              Combat Audio Master
            </span>
            <span className="text-xs font-tactical text-cyan-400 font-bold tabular-nums">
              {settings.audioVolume}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={settings.audioVolume}
            onChange={(e) => handleVolumeChange(Number(e.target.value))}
            className="w-full accent-amber-400 h-2 bg-slate-800 rounded-lg cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
};
