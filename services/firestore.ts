import { db, auth } from './firebase';
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';

const getUid = () => {
  const user = auth.currentUser;
  if (!user) throw new Error('로그인이 필요합니다');
  return user.uid;
};

export const saveSession = async (data: {
  score: number;
  exerciseType: string;
  durationSeconds: number;
  feedback: string;
}) => {
  const uid = getUid();
  await addDoc(collection(db, `users/${uid}/sessions`), {
    ...data,
    completedAt: serverTimestamp(),
  });
};

export const getTodaySessionCount = async (): Promise<number> => {
  const uid = getUid();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const q = query(
    collection(db, `users/${uid}/sessions`),
    where('completedAt', '>=', Timestamp.fromDate(today))
  );
  const snapshot = await getDocs(q);
  return snapshot.size;
};

export const getUserProgress = async () => {
  const uid = getUid();
  const docRef = doc(db, `users/${uid}/progress/streak`);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? docSnap.data() : { streak: 0, badges: [] };
};
