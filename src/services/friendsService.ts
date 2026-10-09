import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { getEffectiveUserId } from './userService';

export interface FriendData {
  id: string;
  userId: string;
  username: string;
}

export const searchUsers = async (username: string) => {
  const currentUid = getEffectiveUserId();
  if (!currentUid) {
    return [];
  }

  try {
    const q = query(collection(db, 'users'), where('username', '==', username));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'users');
    return [];
  }
};

export const addFriend = async (userId: string, friendId: string, friendUsername: string) => {
  const currentUid = getEffectiveUserId();
  if (!currentUid || currentUid !== userId) {
    return;
  }

  try {
    await setDoc(doc(db, 'users', userId, 'friends', friendId), {
      username: friendUsername,
      userId: friendId,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${userId}/friends/${friendId}`);
  }
};

export const removeFriend = async (userId: string, friendId: string) => {
  const currentUid = getEffectiveUserId();
  if (!currentUid || currentUid !== userId) {
    return;
  }

  try {
    await deleteDoc(doc(db, 'users', userId, 'friends', friendId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `users/${userId}/friends/${friendId}`);
  }
};
