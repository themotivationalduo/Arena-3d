import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  arrayUnion,
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';

export interface UserProfileData {
  username: string;
  currency: number;
  highScore: number;
  highWave: number;
  equippedSkin?: string;
  ownedSkins?: string[];
  purchasedSkins?: string[];
}

export interface MissionData {
  id: string;
  description: string;
  target: number;
  current: number;
  reward: string;
  completed?: boolean;
}

export const getEffectiveUserId = (): string | null => {
  return auth.currentUser ? auth.currentUser.uid : null;
};

const LOCAL_STORAGE_KEY = 'arena_strike_local_profile';
const LOCAL_MISSIONS_KEY = 'arena_strike_local_missions';

export const getLocalProfile = (): UserProfileData => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    username: 'Soldier',
    currency: 150,
    highScore: 0,
    highWave: 1,
    equippedSkin: 'default',
    ownedSkins: ['default'],
    purchasedSkins: ['default'],
  };
};

export const saveLocalProfile = (data: Partial<UserProfileData>): UserProfileData => {
  try {
    const current = getLocalProfile();
    const updated = { ...current, ...data };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch {}
  return getLocalProfile();
};

export const getLocalMissions = (): MissionData[] => {
  try {
    const raw = localStorage.getItem(LOCAL_MISSIONS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [...DEFAULT_MISSIONS];
};

export const saveLocalMissions = (missions: MissionData[]) => {
  try {
    localStorage.setItem(LOCAL_MISSIONS_KEY, JSON.stringify(missions));
  } catch {}
};

export const getUserProfile = async (targetUid?: string): Promise<UserProfileData> => {
  const currentUid = targetUid || getEffectiveUserId();

  // If not authenticated, run entirely in Guest mode without hitting Firestore
  if (!currentUid) {
    return getLocalProfile();
  }

  const userRef = doc(db, 'users', currentUid);
  try {
    const docSnap = await getDoc(userRef);
    if (docSnap.exists()) {
      const data = docSnap.data() as UserProfileData;
      saveLocalProfile(data);
      return {
        username: data.username || 'Soldier',
        currency: data.currency ?? 0,
        highScore: data.highScore ?? 0,
        highWave: data.highWave ?? 1,
        equippedSkin: data.equippedSkin || 'default',
        ownedSkins: data.ownedSkins || data.purchasedSkins || ['default'],
        purchasedSkins: data.purchasedSkins || data.ownedSkins || ['default'],
      };
    } else {
      const localData = getLocalProfile();
      const defaultProfile: UserProfileData = {
        username: auth.currentUser?.displayName || localData.username || 'Soldier',
        currency: localData.currency || 150,
        highScore: localData.highScore || 0,
        highWave: localData.highWave || 1,
        equippedSkin: localData.equippedSkin || 'default',
        ownedSkins: localData.ownedSkins || ['default'],
        purchasedSkins: localData.purchasedSkins || ['default'],
      };
      try {
        await setDoc(userRef, defaultProfile, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${currentUid}`);
      }
      return defaultProfile;
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `users/${currentUid}`);
    return getLocalProfile();
  }
};

export const updateCurrency = async (amount: number) => {
  const local = saveLocalProfile({
    currency: Math.max(0, (getLocalProfile().currency || 0) + amount),
  });

  const currentUid = getEffectiveUserId();
  if (!currentUid) {
    return local;
  }

  const userRef = doc(db, 'users', currentUid);
  try {
    await updateDoc(userRef, {
      currency: increment(amount),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${currentUid}`);
  }
  return local;
};

export const purchaseSkin = async (skinId: string, cost: number) => {
  const local = getLocalProfile();
  const currentOwned = new Set([...(local.ownedSkins || []), ...(local.purchasedSkins || [])]);
  currentOwned.add(skinId);
  const updatedOwned = Array.from(currentOwned);
  saveLocalProfile({
    currency: Math.max(0, local.currency - cost),
    ownedSkins: updatedOwned,
    purchasedSkins: updatedOwned,
  });

  const currentUid = getEffectiveUserId();
  if (!currentUid) {
    return;
  }

  const userRef = doc(db, 'users', currentUid);
  try {
    await updateDoc(userRef, {
      currency: increment(-cost),
      ownedSkins: arrayUnion(skinId),
      purchasedSkins: arrayUnion(skinId),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${currentUid}`);
  }
};

export const equipSkin = async (skinId: string) => {
  saveLocalProfile({ equippedSkin: skinId });

  const currentUid = getEffectiveUserId();
  if (currentUid) {
    const userRef = doc(db, 'users', currentUid);
    try {
      await updateDoc(userRef, {
        equippedSkin: skinId,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${currentUid}`);
    }
  }

  // Notify game engine
  window.dispatchEvent(new CustomEvent('equipSkin', { detail: { skinId } }));
};

export const DEFAULT_MISSIONS: MissionData[] = [
  {
    id: 'kill_50_bots',
    description: 'Eliminate 50 bots in the arena',
    target: 50,
    current: 0,
    reward: 'Desert Camo (+50 XP)',
  },
  {
    id: 'survive_10_waves',
    description: 'Survive 10 waves of relentless assault',
    target: 10,
    current: 0,
    reward: 'Gold Plated Skin',
  },
  {
    id: 'score_5000',
    description: 'Achieve a combat score of 5,000 pts',
    target: 5000,
    current: 0,
    reward: 'Tactical Recon Badge',
  },
];

export const seedMissions = async (targetUid?: string) => {
  // Always seed local missions first
  const existingLocal = getLocalMissions();
  if (!existingLocal || existingLocal.length === 0) {
    saveLocalMissions(DEFAULT_MISSIONS);
  }

  const currentUid = targetUid || getEffectiveUserId();
  // Only sync to Firestore if authenticated
  if (!currentUid) {
    return;
  }

  for (const m of DEFAULT_MISSIONS) {
    const missionRef = doc(db, 'users', currentUid, 'missions', m.id);
    try {
      await setDoc(missionRef, m, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${currentUid}/missions/${m.id}`);
    }
  }
};

export const updateMissionProgress = async (
  missionIdOrUserId: string,
  progressIncrementOrMissionId?: string | number,
  maybeIncrement?: number
) => {
  let mId = missionIdOrUserId;
  let inc = 1;

  if (typeof progressIncrementOrMissionId === 'string') {
    mId = progressIncrementOrMissionId;
    inc = typeof maybeIncrement === 'number' ? maybeIncrement : 1;
  } else if (typeof progressIncrementOrMissionId === 'number') {
    inc = progressIncrementOrMissionId;
  }

  // Update in localStorage
  try {
    const localMissions = getLocalMissions();
    const target = localMissions.find((m) => m.id === mId);
    if (target) {
      target.current = Math.min(target.target, target.current + inc);
      saveLocalMissions(localMissions);
    }
  } catch {}

  const currentUid = getEffectiveUserId();
  // Only update Firestore if authenticated
  if (!currentUid) {
    return;
  }

  const missionRef = doc(db, 'users', currentUid, 'missions', mId);
  try {
    await updateDoc(missionRef, {
      current: increment(inc),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${currentUid}/missions/${mId}`);
  }
};

export const saveMatchResults = async (score: number, wave: number, kills: number) => {
  const profile = getLocalProfile();
  const newHighScore = Math.max(profile.highScore || 0, score);
  const newHighWave = Math.max(profile.highWave || 1, wave);
  const earnedCurrency = Math.floor(score / 20) + kills * 5;

  saveLocalProfile({
    highScore: newHighScore,
    highWave: newHighWave,
    currency: (profile.currency || 0) + earnedCurrency,
  });

  const currentUid = getEffectiveUserId();
  if (currentUid) {
    const userRef = doc(db, 'users', currentUid);
    try {
      await updateDoc(userRef, {
        highScore: newHighScore,
        highWave: newHighWave,
        currency: increment(earnedCurrency),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${currentUid}`);
    }
  }

  // Progress missions based on match stats
  if (kills > 0) {
    await updateMissionProgress('kill_50_bots', kills);
  }
  if (wave > 1) {
    await updateMissionProgress('survive_10_waves', wave);
  }
  if (score > 0) {
    await updateMissionProgress('score_5000', score);
  }

  return { earnedCurrency, newHighScore, newHighWave };
};

// Global arena strike bridge exposed to window for index.html Three.js engine
if (typeof window !== 'undefined') {
  (window as unknown as { arenaStrikeAPI: unknown }).arenaStrikeAPI = {
    onBotKilled: (enemyType: string) => {
      updateMissionProgress('kill_50_bots', 1);
      updateCurrency(enemyType === 'tank' ? 15 : enemyType === 'fast' ? 10 : 5);
    },
    onWaveCleared: (waveNumber: number) => {
      updateMissionProgress('survive_10_waves', 1);
      updateCurrency(25 * waveNumber);
    },
    onMatchFinished: (score: number, wave: number, kills: number) => {
      return saveMatchResults(score, wave, kills);
    },
    getEquippedSkin: () => {
      return getLocalProfile().equippedSkin || 'default';
    },
  };
}
