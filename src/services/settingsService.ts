import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getEffectiveUserId } from './userService';

export interface UserSettingsData {
  graphicsQuality: 'low' | 'medium' | 'high';
  audioVolume: number;
}

const DEFAULT_SETTINGS: UserSettingsData = {
  graphicsQuality: 'high',
  audioVolume: 80,
};

const LOCAL_SETTINGS_KEY = 'arena_strike_local_settings';

export const getSettings = async (targetUid?: string): Promise<UserSettingsData> => {
  let localData = DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(LOCAL_SETTINGS_KEY);
    if (raw) localData = JSON.parse(raw);
  } catch {}

  const currentUid = targetUid || getEffectiveUserId();
  if (!currentUid) {
    return localData;
  }

  try {
    const docRef = doc(db, 'users', currentUid, 'settings', 'userSettings');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data() as UserSettingsData;
      localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(data));
      return data;
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `users/${currentUid}/settings/userSettings`);
  }
  return localData;
};

export const updateSettings = async (
  settings: Partial<UserSettingsData>,
  targetUid?: string
) => {
  const current = await getSettings();
  const updated = { ...current, ...settings };
  try {
    localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(updated));
  } catch {}

  const currentUid = targetUid || getEffectiveUserId();
  if (!currentUid) {
    return updated;
  }

  try {
    const docRef = doc(db, 'users', currentUid, 'settings', 'userSettings');
    await setDoc(docRef, updated, { merge: true });
    return updated;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${currentUid}/settings/userSettings`);
  }
  return updated;
};
