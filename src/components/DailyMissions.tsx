import { useEffect, useState } from 'react';
import { db, auth } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import {
  DEFAULT_MISSIONS,
  MissionData,
  getLocalMissions,
  updateMissionProgress,
  seedMissions,
} from '../services/userService';

interface DailyMissionsProps {
  onClose?: () => void;
}

export const DailyMissions = ({ onClose }: DailyMissionsProps) => {
  const [missions, setMissions] = useState<MissionData[]>(getLocalMissions);
  const [isAuthenticated, setIsAuthenticated] = useState(!!auth.currentUser);

  useEffect(() => {
    // Refresh local missions immediately
    setMissions(getLocalMissions());

    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      setIsAuthenticated(!!user);
      if (user) {
        // Seed cloud missions for user if needed
        await seedMissions(user.uid);

        // Only attach onSnapshot if user is authenticated
        const colRef = collection(db, 'users', user.uid, 'missions');
        const unsubscribeSnapshot = onSnapshot(
          colRef,
          (snapshot) => {
            if (!snapshot.empty) {
              const data = snapshot.docs.map(
                (doc) =>
                  ({
                    id: doc.id,
                    ...doc.data(),
                  }) as MissionData
              );
              setMissions(data);
            }
          },
          () => {
            // Silently fall back to local
            setMissions(getLocalMissions());
          }
        );
        return () => unsubscribeSnapshot();
      } else {
        setMissions(getLocalMissions());
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const handleProgress = async (missionId: string) => {
    await updateMissionProgress(missionId, 5);
    setMissions((prev) =>
      prev.map((m) =>
        m.id === missionId ? { ...m, current: Math.min(m.target, m.current + 5) } : m
      )
    );
  };

  return (
    <div className="bg-zinc-950/95 border border-slate-700/80 rounded-2xl p-5 text-white shadow-2xl backdrop-blur-md flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-bold">
            🎯
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold font-tactical uppercase tracking-wider text-white">
                Daily Combat Directives
              </h2>
              <span
                className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                  isAuthenticated
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                {isAuthenticated ? 'Cloud Synced' : 'Offline / Local'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Complete combat milestones to earn rare weapon skins
            </p>
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

      <div className="flex flex-col gap-3">
        {missions.map((m) => {
          const pct = Math.min(100, Math.round((m.current / m.target) * 100));
          const isDone = m.current >= m.target;

          return (
            <div
              key={m.id}
              className={`p-3.5 rounded-xl border transition-all ${
                isDone
                  ? 'bg-emerald-950/30 border-emerald-500/40'
                  : 'bg-black/50 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex justify-between items-start gap-2 mb-2">
                <div>
                  <div className="text-sm font-semibold text-white flex items-center gap-2">
                    <span>{m.description}</span>
                    {isDone && (
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold">
                        COMPLETED
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-amber-400/90 font-medium flex items-center gap-1 mt-0.5">
                    <span>Reward:</span>
                    <span className="text-slate-300 font-tactical">{m.reward}</span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xs font-tactical font-bold tabular-nums text-cyan-400">
                    {m.current} / {m.target}
                  </span>
                  <span className="text-[10px] text-slate-500 block">{pct}%</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700/50">
                <div
                  className={`h-full transition-all duration-300 ${
                    isDone ? 'bg-emerald-500' : 'bg-gradient-to-r from-amber-500 to-orange-500'
                  }`}
                  style={{ width: `${pct}%` }}
                ></div>
              </div>

              {/* Practice button */}
              <div className="mt-2.5 flex justify-end">
                <button
                  disabled={isDone}
                  onClick={() => handleProgress(m.id)}
                  className={`text-[11px] font-tactical font-semibold px-2.5 py-1 rounded-lg transition ${
                    isDone
                      ? 'bg-emerald-900/40 text-emerald-400 cursor-default'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-slate-300 active:scale-95'
                  }`}
                >
                  {isDone ? 'Claimed' : '+5 Combat Simulation'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
