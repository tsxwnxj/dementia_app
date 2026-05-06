import { initializeApp, getApps } from 'firebase/app';
import { initializeAuth, getAuth } from 'firebase/auth';
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

// hot-reload 시 initializeAuth가 중복 호출되면 에러가 나므로 getAuth로 폴백
export const auth = (() => {
  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    return getAuth(app);
  }
})();

export const db = getFirestore(app);
