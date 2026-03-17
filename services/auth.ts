import { auth } from './firebase';
import { signInAnonymously, signOut as firebaseSignOut, onAuthStateChanged, User } from 'firebase/auth';
import * as SecureStore from 'expo-secure-store';

export const signInAnon = async () => {
  const result = await signInAnonymously(auth);
  await SecureStore.setItemAsync('user_uid', result.user.uid);
  return result.user;
};

export const signOut = async () => {
  await SecureStore.deleteItemAsync('user_uid');
  await firebaseSignOut(auth);
};

export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

export const onAuthChanged = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};
