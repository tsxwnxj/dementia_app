import { initializeApp, getApps } from 'firebase/app';
import { initializeAuth } from 'firebase/auth';
// @ts-ignore — Firebase v12 React Native persistence path
import { getReactNativePersistence } from '@firebase/auth/dist/rn';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyCoYYGzeB-nEitYiUiqy7TLgkOxXhMdMIY",
  authDomain: "dementia-app-66666.firebaseapp.com",
  projectId: "dementia-app-66666",
  storageBucket: "dementia-app-66666.firebasestorage.app",
  messagingSenderId: "381761400205",
  appId: "1:381761400205:ios:8f9ca12fc7906a4858a1c4",
};

export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});
export const db = getFirestore(app);
