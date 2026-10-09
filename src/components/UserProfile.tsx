import { useEffect, useState } from 'react';
import { getUserProfile, UserProfileData, getEffectiveUserId } from '../services/userService';
import { auth } from '../firebase';
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';

interface UserProfileProps {
  onClose?: () => void;
}

export const UserProfile = ({ onClose }: UserProfileProps) => {
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const fetchProfile = async () => {
    setLoading(true);
    const data = await getUserProfile();
    setProfile(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchProfile();
    const unsub = auth.onAuthStateChanged(() => {
      fetchProfile();
    });
    return () => unsub();
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      setAuthError(null);
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      await fetchProfile();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign-in failed';
      setAuthError(msg);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      await fetchProfile();
    } catch {}
  };

  if (!profile && loading) {
    return (
      <div className="p-6 bg-zinc-950/90 border border-slate-700 rounded-2xl text-slate-400 text-center animate-pulse">
        Loading Combat Dossier...
      </div>
    );
  }

  const p = profile || {
    username: 'Soldier',
    currency: 0,
    highScore: 0,
    highWave: 1,
    equippedSkin: 'default',
  };

  const isGoogleUser = !!auth.currentUser;

  return (
    <div className="bg-zinc-950/95 border border-slate-700/80 rounded-2xl p-5 text-white shadow-2xl backdrop-blur-md flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold">
            👤
          </div>
          <div>
            <h2 className="text-lg font-bold font-tactical uppercase tracking-wider text-white">
              Tactical Dossier
            </h2>
            <p className="text-xs text-slate-400">Soldier operational records & stats</p>
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

      {/* User Card */}
      <div className="flex items-center justify-between bg-black/60 border border-slate-800 rounded-xl p-3.5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-amber-500/60 shadow-md shrink-0">
            <img
              src="/app-logo.png"
              alt="Operator Avatar"
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <div className="text-sm font-bold text-white flex items-center gap-2">
              <span>{isGoogleUser ? auth.currentUser?.displayName : p.username}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                isGoogleUser
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}>
                {isGoogleUser ? 'Cloud Synced' : 'Guest Mode'}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5 truncate max-w-[200px]">
              {isGoogleUser ? auth.currentUser?.email : 'ID: ' + getEffectiveUserId()}
            </p>
          </div>
        </div>

        <div>
          {isGoogleUser ? (
            <button
              onClick={handleSignOut}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg transition"
            >
              Sign Out
            </button>
          ) : (
            <button
              onClick={handleGoogleSignIn}
              className="text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white px-3 py-1.5 rounded-lg transition shadow-sm active:scale-95"
            >
              Sign in with Google
            </button>
          )}
        </div>
      </div>

      {authError && (
        <div className="text-xs text-red-400 bg-red-950/30 border border-red-500/30 p-2.5 rounded-lg">
          {authError}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-black/40 border border-slate-800/80 p-3 rounded-xl flex flex-col">
          <span className="text-[10px] text-slate-400 uppercase font-medium">Credits</span>
          <span className="text-base font-tactical font-bold text-amber-400 tabular-nums">
            🪙 {p.currency}
          </span>
        </div>
        <div className="bg-black/40 border border-slate-800/80 p-3 rounded-xl flex flex-col">
          <span className="text-[10px] text-slate-400 uppercase font-medium">High Score</span>
          <span className="text-base font-tactical font-bold text-cyan-400 tabular-nums">
            {p.highScore} PTS
          </span>
        </div>
        <div className="bg-black/40 border border-slate-800/80 p-3 rounded-xl flex flex-col">
          <span className="text-[10px] text-slate-400 uppercase font-medium">Max Wave</span>
          <span className="text-base font-tactical font-bold text-emerald-400 tabular-nums">
            Wave {p.highWave}
          </span>
        </div>
        <div className="bg-black/40 border border-slate-800/80 p-3 rounded-xl flex flex-col">
          <span className="text-[10px] text-slate-400 uppercase font-medium">Equipped Skin</span>
          <span className="text-xs font-tactical font-bold text-white capitalize truncate mt-1">
            {p.equippedSkin === 'skin2' ? 'Gold Plated' : p.equippedSkin === 'skin1' ? 'Desert Camo' : 'Standard'}
          </span>
        </div>
      </div>
    </div>
  );
};
