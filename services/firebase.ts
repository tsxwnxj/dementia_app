import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCoYYGzeB-nEitYiUiqy7TLgkOxXhMdMIY",
  authDomain: "dementia-app-66666.firebaseapp.com",
  projectId: "dementia-app-66666",
  storageBucket: "dementia-app-66666.firebasestorage.app",
  messagingSenderId: "381761400205",
  appId: "1:381761400205:ios:8f9ca12fc7906a4858a1c4",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app);
